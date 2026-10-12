import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
} from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../src/assets/floorPlan';
import { EXTERIOR_LOCALE_COPY } from '../../src/assets/i18n/exterior';
import {
  getSceneDetailPolicy,
  ORDERED_SCENE_DETAIL_LEVELS,
} from '../../src/scene/graphics/sceneDetailPolicy';
import { PORTFOLIO_LEVEL } from '../../src/scene/level/portfolioLevel';
import { createResidentialStreet } from '../../src/scene/structures/residentialStreet';
import {
  auditExteriorGeometry,
  measureExteriorMeshes,
} from '../exteriorGeometryAudit';

afterEach(() => vi.restoreAllMocks());
const canvas = () =>
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

describe('exterior metric audit', () => {
  it('measures instances through parent transforms without phantom origin bounds', () => {
    const root = new Group();
    root.position.set(100, 20, 30);
    root.scale.set(2, 3, 4);
    const geometry = new BoxGeometry(2, 2, 2);
    const material = new MeshBasicMaterial();
    const mesh = new InstancedMesh(geometry, material, 2);
    mesh.userData.levelSourceId = 'fixture';
    mesh.setMatrixAt(0, new Matrix4().makeTranslation(5, 0, 0));
    mesh.setMatrixAt(1, new Matrix4().makeTranslation(-5, 0, 0));
    root.add(mesh);
    const result = measureExteriorMeshes(root);
    expect(result.map((part) => part.center)).toEqual([
      [110, 20, 30],
      [90, 20, 30],
    ]);
    expect(result.map((part) => part.size)).toEqual([
      [4, 6, 8],
      [4, 6, 8],
    ]);
    expect(result.map((part) => part.instance)).toEqual([0, 1]);
    mesh.dispose();
    geometry.dispose();
    material.dispose();
  });

  it('separates the EV envelope from measured parts and converts its anchor exactly once', () => {
    canvas();
    const a = auditExteriorGeometry(2);
    const b = auditExteriorGeometry(1);
    const anchor = (report: typeof a) =>
      report.anchors.find(
        (item) => item.sourceId === 'ground.street.parkedEv'
      )!;
    expect(anchor(a).world).toEqual({ x: 66, z: -20 });
    expect(anchor(b).world).toEqual({ x: 33, z: -10 });
    const parts = (report: typeof a) =>
      report.meshes.filter(
        (item) => item.sourceId === 'ground.street.parkedEv'
      );
    expect(parts(a)).toHaveLength(22);
    parts(a).forEach((part, i) => {
      part.size.forEach((value, axis) =>
        expect(value).toBeCloseTo(parts(b)[i].size[axis], 5)
      );
      expect(part.center[0] - parts(b)[i].center[0]).toBeCloseTo(33, 5);
      expect(part.center[2] - parts(b)[i].center[2]).toBeCloseTo(-10, 5);
    });
    const collider = a.declaredColliders.find(
      (item) => item.role === 'parked-sedan-body'
    )!;
    expect(collider.bounds).toEqual({
      minX: 63.7,
      maxX: 68.3,
      minZ: -24.6,
      maxZ: -15.4,
    });
    expect(collider.conservativePadding!.minX).toBeCloseTo(0.09, 5);
    expect(collider.conservativePadding!.maxZ).toBeCloseTo(0.41, 5);
    // Flush instance faces must not be reported as overruns due to Float32 noise.
    const poles = a.declaredColliders.filter((item) =>
      String(item.role).startsWith('lamp-pole-')
    );
    expect(poles).toHaveLength(4);
    poles.forEach((pole) =>
      expect(pole.conservativePadding).toEqual({
        minX: 0,
        maxX: 0,
        minZ: 0,
        maxZ: 0,
      })
    );
    // The cabinet's visible front detail really extends past its declared footprint.
    const cabinet = a.declaredColliders.find(
      (item) => item.role === 'garage.cabinet'
    )!;
    expect(cabinet.conservativePadding!.maxZ).toBeCloseTo(-0.05, 5);
    expect(
      a.declaredColliders.filter(
        (item) => item.sourceId === 'ground.busStop.shelter'
      )
    ).toHaveLength(5);
    expect(
      a.anchors.find((item) => item.sourceId === 'ground.busStop.shelter')!
        .centerOffsetFromAnchor.x
    ).toBeCloseTo(-2.2, 5);
    for (const route of a.reservedRoutes) {
      const r = route.worldBounds;
      for (const { bounds: solid } of a.declaredColliders)
        expect(
          solid.maxX <= r.minX ||
            solid.minX >= r.maxX ||
            solid.maxZ <= r.minZ ||
            solid.minZ >= r.maxZ
        ).toBe(true);
    }
  });

  it('preserves strict world-space cutaway and lighting boundaries across detail tiers', () => {
    canvas();
    const floor = PORTFOLIO_LEVEL.floors.find((item) => item.id === 'ground')!;
    const build = createResidentialStreet(
      floor,
      FLOOR_PLAN_SCALE,
      EXTERIOR_LOCALE_COPY.en
    );
    const before = measureExteriorMeshes(build.group);
    const roof = before.find((part) => part.mesh.endsWith(':roof:overhead'))!;
    const [centerX, , centerZ] = roof.center;
    const regions = build.getBehaviorRegions();
    expect(regions.shelterCutaway.minX).toBeCloseTo(centerX - 3.5, 5);
    expect(regions.shelterCutaway.maxZ).toBeCloseTo(centerZ + 6.5, 5);
    // Returned audit data must not be able to change runtime activation bounds.
    const copy = build.getBehaviorRegions();
    copy.shelterCutaway.minX = 0;
    copy.lightActivation.minX = 0;
    expect(build.getBehaviorRegions()).toEqual(regions);
    const region = regions.shelterCutaway;
    try {
      for (const tier of ORDERED_SCENE_DETAIL_LEVELS) {
        const policy = getSceneDetailPolicy(tier);
        for (const [x, z, inside] of [
          [region.minX, centerZ, false],
          [region.maxX, centerZ, false],
          [centerX, region.minZ, false],
          [centerX, region.maxZ, false],
          [centerX, centerZ, true],
        ] as const) {
          build.update(policy, { x, z, floorId: 'ground' });
          expect(build.getCutawaySourceIds()).toEqual(
            inside ? ['ground.busStop.shelter'] : []
          );
        }
        build.update(policy, {
          x: regions.lightActivation.minX,
          z: centerZ,
          floorId: 'ground',
        });
        expect(build.getSnapshot().lamps.every((lamp) => !lamp.active)).toBe(
          true
        );
        build.update(policy, {
          x: regions.lightActivation.minX + 0.001,
          z: centerZ,
          floorId: 'ground',
        });
        expect(
          build
            .getSnapshot()
            .lamps.every(
              (lamp) => lamp.active === policy.effects.dynamicPointLights
            )
        ).toBe(true);
        build.update(policy, { x: centerX, z: centerZ, floorId: 'upper' });
        expect(build.getCutawaySourceIds()).toEqual([]);
        expect(build.getSnapshot().lamps.every((lamp) => !lamp.active)).toBe(
          true
        );
        expect(measureExteriorMeshes(build.group)).toEqual(before);
      }
    } finally {
      build.dispose();
    }
    expect(build.getSnapshot().lifecycle.isDisposed).toBe(true);
  });
});
