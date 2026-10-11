import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { getPoiDefinitions } from '../../poi/registry';
import { createAquiloopAquarium, AQUILOOP_POSITION } from '../aquiloopAquarium';
import {
  AQUILOOP,
  createAquiloopClock,
  sampleAquiloopCycle,
} from '../aquiloopCycle';
import { DEFAULT_LOWER_FLOOR_FURNISHINGS } from '../lowerFloorFurnishings';
import { countObjectTriangles } from '../triangleCount';

describe('Aquiloop visual cycle', () => {
  it.each([
    [0, 'idle', 150, 0, 3.75],
    [299.99, 'idle', 150, 0, 3.75],
    [300, 'drain', 150, 0, 3.75],
    [315, 'drain', 135, 1.875, 3.75],
    [330, 'refill', 120, 3.75, 3.75],
    [345, 'refill', 135, 3.75, 1.875],
    [360, 'replenish', 150, 3.75, 0],
    [375, 'replenish', 150, 1.875, 1.875],
    [390, 'idle', 150, 0, 3.75],
    [600, 'drain', 150, 0, 3.75],
  ])('samples phase boundary %s', (time, phase, tank, receiver, supply) => {
    const state = sampleAquiloopCycle(time as number);
    expect(state.phase).toBe(phase);
    expect(state.tankGallons).toBeCloseTo(tank as number);
    expect(state.receiverGallons).toBeCloseTo(receiver as number);
    expect(state.supplyGallons).toBeCloseTo(supply as number);
  });
  it('conserves visible volume, clamps 20%, and repeats without depleted banks', () => {
    for (let t = 0; t < 300 * 100; t += 0.73) {
      const state = sampleAquiloopCycle(t);
      expect(state.waterHeightFraction).toBeGreaterThanOrEqual(0.8);
      expect(state.waterHeightFraction).toBeLessThanOrEqual(1);
      expect(state.receiverGallons).toBeGreaterThanOrEqual(0);
      expect(state.receiverGallons).toBeLessThan(AQUILOOP.bucketCapacity);
      expect(state.supplyGallons).toBeGreaterThanOrEqual(0);
      expect(state.supplyGallons).toBeLessThan(AQUILOOP.bucketCapacity);
      expect(
        state.tankGallons + 8 * (state.receiverGallons + state.supplyGallons)
      ).toBeCloseTo(180);
    }
  });
  it('is continuous at all phase boundaries and rejects nonfinite time', () => {
    for (const t of [300, 330, 360, 390, 600]) {
      const before = sampleAquiloopCycle(t - 1e-7);
      const after = sampleAquiloopCycle(t);
      expect(after.tankGallons).toBeCloseTo(before.tankGallons);
      expect(after.receiverGallons).toBeCloseTo(before.receiverGallons);
      expect(after.supplyGallons).toBeCloseTo(before.supplyGallons);
    }
    expect(sampleAquiloopCycle(Infinity)).toEqual(sampleAquiloopCycle(0));
  });
  it('uses deterministic accelerated time and excludes pause/background/resume gaps', () => {
    const clock = createAquiloopClock();
    clock.sample(10);
    expect(clock.sample(340).tankGallons).toBe(120);
    clock.sample(350, false);
    clock.sample(10000, false);
    expect(clock.sample(20000).tankGallons).toBe(120);
    expect(clock.sample(20015).tankGallons).toBe(135);
    clock.suspend();
    expect(clock.sample(99999).tankGallons).toBe(135);
  });
});

describe('Aquiloop exhibit integration', () => {
  const position = { ...AQUILOOP_POSITION, y: 0 };
  it('does not count loading or text-mode time before its first running frame', () => {
    const build = createAquiloopAquarium(position);
    expect(build.update(10000).tankGallons).toBe(150);
    expect(build.update(10299).phase).toBe('idle');
    expect(build.update(10300).phase).toBe('drain');
    expect(build.update(10330).tankGallons).toBe(120);
    build.dispose();
  });
  it('registers the repository for immersive and text routing, preserving the NRL POI', () => {
    const definitions = getPoiDefinitions();
    const aquarium = definitions.find(
      (d) => d.id === 'aquiloop-living-room-aquarium'
    )!;
    expect(aquarium.links?.[0].href).toBe(
      'https://github.com/futuroptimist/aquiloop'
    );
    expect(aquarium.roomId).toBe('livingRoom');
    expect(definitions.some((d) => d.id === 'career-naval-research')).toBe(
      true
    );
  });
  it('keeps approach, furniture and stair corridors free while blocking tank and racks', () => {
    const build = createAquiloopAquarium(position);
    const blocked = (x: number, z: number) =>
      build.colliders.some(
        (c) => x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ
      );
    expect(blocked(0, -28)).toBe(true);
    expect(blocked(-1.6, -28)).toBe(true);
    expect(blocked(1.6, -28)).toBe(true);
    expect(blocked(2.65, -28)).toBe(true);
    for (let x = -7; x <= 7; x += 0.25) expect(blocked(x, -26)).toBe(false);
    for (const c of build.colliders) {
      expect(c.maxX).toBeLessThan(8.4); // Existing stair corridor begins here.
      for (const furnishing of DEFAULT_LOWER_FLOOR_FURNISHINGS) {
        const b = furnishing.solidBounds;
        if (b)
          expect(
            c.maxX <= b.minX ||
              c.minX >= b.maxX ||
              c.maxZ <= b.minZ ||
              c.minZ >= b.maxZ
          ).toBe(true);
      }
    }
    build.dispose();
  });
  it('bounds geometry and draw calls, culls updates, and freezes decorative motion', () => {
    const build = createAquiloopAquarium(position);
    const meshes: Mesh[] = [];
    build.group.traverse((o) => {
      if (o instanceof Mesh) meshes.push(o);
    });
    expect(meshes.length).toBeLessThan(35);
    expect(countObjectTriangles(build.group)).toBeLessThan(11000);
    const bounds = new Box3().setFromObject(build.group).getSize(new Vector3());
    expect(bounds.x).toBeLessThan(6.4);
    expect(bounds.y).toBeLessThan(2.7);
    const fish = build.group.getObjectByName('guppy')!;
    build.update(1, { reducedMotion: true });
    const initial = fish.position.clone();
    build.update(315, { reducedMotion: true, lowTier: true });
    expect(fish.position.equals(initial)).toBe(true);
    build.update(316, { visible: false });
    expect(fish.position.equals(initial)).toBe(true);
    build.dispose();
    build.dispose();
  });
});
