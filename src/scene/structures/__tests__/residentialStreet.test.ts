import {
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  SpotLight,
} from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EXTERIOR_LOCALE_COPY } from '../../../assets/i18n/exterior';
import { getSceneDetailPolicy } from '../../graphics/sceneDetailPolicy';
import { PORTFOLIO_LEVEL } from '../../level/portfolioLevel';
import { createResidentialStreet } from '../residentialStreet';

const ground = PORTFOLIO_LEVEL.floors.find((floor) => floor.id === 'ground')!;
const make = () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: (text: string) => ({ width: text.length * 25 }),
      }) as unknown as CanvasRenderingContext2D
  );
  return createResidentialStreet(ground, 2, EXTERIOR_LOCALE_COPY.en);
};
afterEach(() => vi.restoreAllMocks());
describe('original residential street assets', () => {
  const streetCaseTitle1 =
    'uses only fully downward spotlights under opaque shared ' +
    'hoods and persistent shared ground pools';
  it(streetCaseTitle1, () => {
    const build = make();
    const lights: SpotLight[] = [];
    build.group.traverse((object) => {
      expect(object).not.toBeInstanceOf(PointLight);
      if (object instanceof SpotLight) lights.push(object);
    });
    expect(lights).toHaveLength(4);
    const hoods = build.group.getObjectByName(
      'Street:ground.street.lamps:metal:overhead'
    ) as InstancedMesh;
    expect(hoods).toBeDefined();
    expect((hoods.material as MeshStandardMaterial).emissive.getHex()).toBe(0);
    expect(
      hoods.userData.parts.filter(
        (part: { size: number[] }) => part.size[0] === 1.5
      )
    ).toHaveLength(4);

    build.update(getSceneDetailPolicy('cinematic'), {
      x: 55,
      z: 10,
      floorId: 'ground',
    });
    for (const lamp of build.getSnapshot().lamps) {
      expect(lamp.position.x).toBe(lamp.target.x);
      expect(lamp.position.z).toBe(lamp.target.z);
      expect(lamp.position.y).toBeGreaterThan(lamp.target.y);
      expect(lamp.angle).toBeLessThan(Math.PI / 2);
      expect(lamp).toMatchObject({
        castShadow: false,
        active: true,
        hoodOpaque: true,
      });
    }
    build.update(getSceneDetailPolicy('performance'), {
      x: 55,
      z: 10,
      floorId: 'ground',
    });
    expect(build.getSnapshot().lamps.every((lamp) => !lamp.active)).toBe(true);
    build.update(getSceneDetailPolicy('cinematic'), {
      x: 55,
      z: 10,
      floorId: 'basement',
    });
    expect(build.getSnapshot().lamps.every((lamp) => !lamp.active)).toBe(true);
    build.update(getSceneDetailPolicy('performance'), {
      x: 50,
      z: 32,
      floorId: 'ground',
    });
    expect(build.getCutawaySourceIds()).toEqual(['ground.busStop.shelter']);
    expect((hoods.material as MeshStandardMaterial).opacity).toBe(1);
    build.update(getSceneDetailPolicy('performance'), {
      x: 55,
      z: 32,
      floorId: 'ground',
    });
    expect(build.getCutawaySourceIds()).toEqual([]);
    build.dispose();
  });
  it('keeps every fixture and pool visible through approach, passing and departure', () => {
    const build = make();
    const pools = build.group.getObjectByName(
      'StreetLampDownwardPools'
    ) as InstancedMesh;
    expect(pools.count).toBe(4);
    // Cross the former x=45 replacement boundary in both directions, pass every
    // pole and enter/leave the shelter. Quality changes must not remove the pools.
    for (const level of [
      'cinematic',
      'balanced',
      'performance',
      'low',
      'micro',
    ] as const) {
      for (const [x, z] of [
        [44.9, -15],
        [45, -15],
        [45.1, -15],
        [55, -28],
        [55, -8],
        [55, 12],
        [55, 32],
        [50, 32],
        [55, 32],
        [55, 12],
        [55, -8],
        [55, -28],
        [45.1, -15],
        [45, -15],
        [44.9, -15],
      ]) {
        build.update(getSceneDetailPolicy(level), { x, z, floorId: 'ground' });
        expect(pools.visible).toBe(true);
        build.group.traverse((object) => {
          if (object.userData.levelSourceId === 'ground.street.lamps') {
            expect(object.visible).toBe(true);
            if (object instanceof Mesh) {
              const material = object.material as MeshStandardMaterial;
              expect(material.opacity).toBeGreaterThan(0);
            }
          }
        });
        for (const lamp of build.getSnapshot().lamps) {
          expect(lamp.groundPoolVisible).toBe(true);
          expect(lamp.hoodOpaque).toBe(true);
        }
      }
    }
    build.dispose();
  });
  const streetCaseTitle2 =
    'owns solid car, four pole bases, four shelter posts and ' +
    'bench without blocking the sidewalk';
  it(streetCaseTitle2, () => {
    const build = make();
    expect(build.solids).toHaveLength(10);
    expect(new Set(build.solids.map((solid) => solid.debugId)).size).toBe(10);
    build.solids.forEach((solid) => {
      expect(solid.debugId).toMatch(/^[0-9A-F]{6}$/);
      expect(solid.role.length).toBeGreaterThan(5);
    });
    expect(
      build.solids.filter((solid) => solid.definition.kind === 'street.lamps')
    ).toHaveLength(4);
    expect(
      build.solids.filter((solid) => solid.definition.kind === 'street.busStop')
    ).toHaveLength(5);
    for (const solid of build.solids) {
      expect(solid.collider.maxX < 54.25 || solid.collider.minX > 55.75).toBe(
        true
      );
      expect(solid.definition.colliderPolicy).toBeDefined();
    }
    build.group.traverse((object) => {
      if (object instanceof Mesh)
        expect(object.userData.levelSourceId).toBeDefined();
    });
    build.dispose();
  });
  const streetCaseTitle3 =
    'renders localized sign copy only on changes and disposes ' +
    'every shared asset and instance once';
  it(streetCaseTitle3, () => {
    const build = make();
    const geometries = new Set<Mesh['geometry']>();
    const materials = new Set<Mesh['material']>();
    const instanceDisposals: ReturnType<typeof vi.fn>[] = [];
    build.group.traverse((object) => {
      if (object instanceof Mesh) {
        geometries.add(object.geometry);
        materials.add(object.material);
      }
      if (object instanceof InstancedMesh) {
        const callback = vi.fn();
        object.addEventListener('dispose', callback);
        instanceDisposals.push(callback);
      }
    });
    expect(geometries.size).toBe(7);
    expect(materials.size).toBeLessThanOrEqual(11);
    const disposals = [...geometries].map((geometry) =>
      vi.spyOn(geometry, 'dispose')
    );
    for (const strings of Object.values(EXTERIOR_LOCALE_COPY)) {
      build.setStrings(strings);
      expect(build.getSnapshot().busStop.signText).toBe(
        `${strings.busStop} · ${strings.comingSoon}`
      );
    }
    expect(
      build.group.getObjectByName('BusStopComingSoonSign')!.position.z
    ).toBe(36.7);
    const texture = (
      build.group.getObjectByName('BusStopComingSoonSign') as Mesh
    ).material as { map: { dispose(): void; version: number } };
    const version = texture.map.version;
    build.setStrings(EXTERIOR_LOCALE_COPY['en-x-pseudo']);
    expect(texture.map.version).toBe(version);
    const textureDispose = vi.spyOn(texture.map, 'dispose');
    const materialDisposals = [...materials]
      .flatMap((material) => (Array.isArray(material) ? material : [material]))
      .map((material) => vi.spyOn(material, 'dispose'));
    const lightDisposals: ReturnType<typeof vi.spyOn>[] = [];
    build.group.traverse((object) => {
      if (object instanceof SpotLight)
        lightDisposals.push(vi.spyOn(object, 'dispose'));
    });

    build.dispose();
    build.dispose();
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    instanceDisposals.forEach((dispose) =>
      expect(dispose).toHaveBeenCalledTimes(1)
    );
    expect(textureDispose).toHaveBeenCalledTimes(1);
    materialDisposals.forEach((dispose) =>
      expect(dispose).toHaveBeenCalledTimes(1)
    );
    lightDisposals.forEach((dispose) =>
      expect(dispose).toHaveBeenCalledTimes(1)
    );

    expect(build.getSnapshot().lifecycle.isDisposed).toBe(true);
  });
});
