import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { describe, expect, it, vi } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../assets/floorPlan';
import {
  getSceneDetailPolicy,
  ORDERED_SCENE_DETAIL_LEVELS,
} from '../scene/graphics/sceneDetailPolicy';
import { FLOOR_TOP_ELEVATIONS } from '../scene/level/floorElevations';
import { createSourceSnapshot } from '../scene/miniature/sourceSnapshot';
import { getPoiDefinitions } from '../scene/poi/registry';
import { createGreenhouse } from '../scene/structures/greenhouse';
import {
  createLowerFloorFurnishings,
  createUpperFloorFurnishings,
} from '../scene/structures/lowerFloorFurnishings';
import {
  createMiniatureWorldTransform,
  createPortfolioMiniatureTable,
  createPortfolioTableShell,
} from '../scene/structures/portfolioMiniatureTable';
import { PORTFOLIO_MINIATURE_TABLE_DIMENSIONS as dimensions } from '../scene/structures/portfolioMiniatureTableContract';
import { STAIRCASE_CONFIG } from '../scene/structures/portfolioSceneLayout';
import { createStaircase } from '../scene/structures/staircase';

function sources() {
  return FLOOR_PLAN_LEVELS.map((level) => {
    const root = new Group();
    for (const room of level.plan.rooms) {
      const b = room.bounds;
      const slab = new Mesh(
        new BoxGeometry(b.maxX - b.minX, 0.1, b.maxZ - b.minZ),
        new MeshStandardMaterial({ color: room.ledColor })
      );
      slab.name = `SourceFloor:${room.id}`;
      slab.position.set(
        (b.minX + b.maxX) / 2,
        FLOOR_TOP_ELEVATIONS[level.id],
        (b.minZ + b.maxZ) / 2
      );
      root.add(slab);
    }
    if (level.id === 'ground')
      root.add(
        createLowerFloorFurnishings().group,
        createStaircase(STAIRCASE_CONFIG).group,
        createGreenhouse({ basePosition: new Vector3(14, 0, 25) }).group
      );
    if (level.id === 'upper')
      root.add(createUpperFloorFurnishings({ baseElevation: 5 }).group);
    return { floor: level.id, roots: [root] };
  });
}
function build() {
  const definition = getPoiDefinitions('en').find(
    (p) => p.id === 'danielsmith-portfolio-table'
  )!;
  return createPortfolioMiniatureTable({
    position: { x: -21.6, y: 0, z: 1.63 },
    orientationRadians: Math.PI / 4,
    poiDefinitions: [definition],
    poiPlacements: [
      {
        id: definition.id,
        position: { x: -21.6, y: 0, z: 1.63 },
        headingRadians: Math.PI / 4,
        floor: 'ground',
        roomId: definition.roomId,
        footprint: definition.footprint,
        definition,
        anchorKind: 'floor',
        placementSource: 'visual-model-anchor',
      },
    ],
    sourceVisuals: sources(),
  });
}

describe('source-backed recursive property table', () => {
  it('includes the complete property and every floor with production furnishings, stairs and solar frame', () => {
    const table = build();
    const records = table.sourceSnapshot.records;
    for (const level of FLOOR_PLAN_LEVELS)
      for (const room of level.plan.rooms)
        expect(
          records.some(
            (r) => r.floor === level.id && r.name === `SourceFloor:${room.id}`
          )
        ).toBe(true);
    expect(records.some((r) => r.name === 'StaircaseStep-9')).toBe(true);
    expect(records.some((r) => r.name === 'StaircaseLanding')).toBe(true);
    expect(records.some((r) => r.name === 'BackyardGalvanizedTub')).toBe(true);
    expect(
      records.some(
        (r) => r.floor === 'upper' && !r.name.startsWith('SourceFloor')
      )
    ).toBe(true);
    const bounds = table.sourceSnapshot.bounds;
    for (const corner of [bounds.min, bounds.max]) {
      const mapped = table.transform.mapWorldPosition(corner);
      expect(Math.abs(mapped.x)).toBeLessThanOrEqual(
        dimensions.bedWidth / 2 + 1e-6
      );
      expect(Math.abs(mapped.z)).toBeLessThanOrEqual(
        dimensions.bedDepth / 2 + 1e-6
      );
    }
    expect(table.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(table.triangleStats.total).toBeLessThan(40000);
    table.dispose();
  });
  it('maps the live avatar without clamping on every floor and at property corners', () => {
    const table = build();
    for (const floor of ['ground', 'upper', 'basement'] as const)
      for (const point of [
        new Vector3(68, 0, 35),
        new Vector3(-28, -5, -20),
        new Vector3(12.4, 5, -25),
      ]) {
        table.update({
          playerWorldPosition: point,
          playerYaw: 1.2,
          activeFloor: floor,
        });
        table.group.updateMatrixWorld(true);
        const mapped = table.group.worldToLocal(
          table.miniaturePlayer.getWorldPosition(new Vector3())
        );
        expect(
          mapped.distanceTo(table.transform.mapWorldPosition(point))
        ).toBeLessThan(1e-6);
        expect(
          table.transform.inverseMapPosition(mapped).distanceTo(point)
        ).toBeLessThan(1e-5);
        expect(table.miniaturePlayer.rotation.y).toBe(1.2);
        expect(
          table.sourceSnapshot.group.getObjectByName(
            `MiniatureSource:${floor}`
          )!.visible
        ).toBe(true);
      }
    table.dispose();
  });
  it('has exactly one model root and one player and terminates at the shared table shell', () => {
    const table = build();
    expect(
      table.group.getObjectsByProperty('name', 'MiniatureWorldRoot')
    ).toHaveLength(1);
    expect(
      table.group.getObjectsByProperty('name', 'MiniaturePlayer')
    ).toHaveLength(1);
    expect(
      table.selfProxy.getObjectByName('MiniatureWorldRoot')
    ).toBeUndefined();
    const shell = createPortfolioTableShell();
    expect(table.selfProxy.children.map((c) => c.name)).toEqual(
      shell.children.map((c) => c.name)
    );
    table.dispose();
  });
  it.each(ORDERED_SCENE_DETAIL_LEVELS)(
    'never drops the property when detail is %s',
    (level) => {
      const snapshot = createSourceSnapshot(
        sources(),
        getSceneDetailPolicy(level)
      );
      expect(
        snapshot.records.some((r) => r.name === 'SourceFloor:street')
      ).toBe(true);
      expect(
        snapshot.group.getObjectsByProperty('type', 'Mesh').length
      ).toBeLessThan(64);
      snapshot.dispose();
    }
  );
  it('copies exact box geometry, source colors and transformed placement without borrowing disposal ownership', () => {
    const mesh = new Mesh(
      new BoxGeometry(3, 2, 1),
      new MeshStandardMaterial({ color: 0x716759 })
    );
    mesh.position.set(15, 2, 8);
    mesh.rotation.y = 0.4;
    mesh.name = 'Furniture';
    const root = new Group();
    root.add(mesh);
    root.position.x = 2;
    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    const materialDispose = vi.spyOn(mesh.material, 'dispose');
    const snapshot = createSourceSnapshot([{ floor: 'ground', roots: [root] }]);
    expect(
      new Box3()
        .setFromObject(snapshot.group)
        .min.distanceTo(new Box3().setFromObject(root).min)
    ).toBeLessThan(1e-5);
    const projected = snapshot.group.getObjectsByProperty(
      'type',
      'Mesh'
    )[0] as Mesh;
    expect(projected.geometry.getAttribute('color').getX(0)).toBeCloseTo(
      mesh.material.color.r
    );
    expect(projected.geometry.getAttribute('position').count / 3).toBe(12);
    snapshot.dispose();
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
  });
  it('refuses to traverse an existing recursive model or clone lights and update callbacks', () => {
    const root = new Group();
    const recursive = new Group();
    recursive.name = 'MiniatureWorldRoot';
    recursive.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
    root.add(recursive);
    root.add(new Mesh(new BoxGeometry(2, 1, 2), new MeshStandardMaterial()));
    const snapshot = createSourceSnapshot([{ floor: 'ground', roots: [root] }]);
    expect(snapshot.records).toHaveLength(1);
    expect(snapshot.group.getObjectsByProperty('type', 'Light')).toHaveLength(
      0
    );
    snapshot.dispose();
  });
  it('uses all three axes to fit a property envelope', () => {
    const bounds = new Box3(new Vector3(-32, -5, -32), new Vector3(70, 11, 40));
    const transform = createMiniatureWorldTransform(0, bounds);
    expect(transform.uniformScale).toBeCloseTo(
      Math.min(dimensions.bedWidth / 102, dimensions.bedDepth / 72, 0.9 / 16)
    );
  });
  it('shares one stair snapshot between adjacent floors without duplicating triangles', () => {
    const stairs = createStaircase(STAIRCASE_CONFIG).group;
    const snapshot = createSourceSnapshot([
      {
        floor: 'ground',
        roots: [stairs],
        visibleOnFloors: ['ground', 'upper'],
      },
    ]);
    const count = snapshot.records.length;
    for (const floor of ['ground', 'upper'] as const) {
      snapshot.setFloor(floor);
      expect(snapshot.group.children[0].visible).toBe(true);
      expect(snapshot.records).toHaveLength(count);
    }
    snapshot.setFloor('basement');
    expect(snapshot.group.children[0].visible).toBe(false);
    snapshot.dispose();
  });
});
