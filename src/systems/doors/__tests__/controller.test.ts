import { describe, expect, it } from 'vitest';

import { createExteriorDoorDefinitions } from '../../../scene/level/exteriorLayout';
import { createDoorController } from '../controller';

const definition = createExteriorDoorDefinitions(2)[0];
const outside = { x: 28, z: -15, radius: 0.75, floorId: 'ground' };
const occupied = { ...outside, x: 32 };

describe('source-backed door controller', () => {
  it('uses a single continuous progress for state, animation and collision', () => {
    const door = createDoorController(definition);
    expect(door.snapshot()).toMatchObject({
      state: 'closed',
      progress: 0,
      blocked: true,
    });
    door.request(1, outside);
    expect(door.update(0.425, outside)).toMatchObject({
      state: 'opening',
      progress: 0.5,
      blocked: true,
    });
    expect(door.update(0.425, outside)).toMatchObject({
      state: 'open',
      progress: 1,
      blocked: false,
    });
    door.request(0, outside);
    expect(door.update(0.425, outside)).toMatchObject({
      state: 'closing',
      progress: 0.5,
      blocked: true,
    });
    expect(door.update(0.425, outside)).toMatchObject({
      state: 'closed',
      progress: 0,
    });
  });
  it('coalesces same-target requests and reverses without jumping', () => {
    const door = createDoorController(definition);
    door.request(1, outside);
    door.update(0.3, outside);
    const progress = door.snapshot().progress;
    for (let i = 0; i < 20; i++) door.request(1, outside);
    expect(door.snapshot().progress).toBe(progress);
    door.toggle(outside);
    expect(door.snapshot()).toMatchObject({ target: 0, progress });
    expect(door.update(0.1, outside).progress).toBeLessThan(progress);
    door.toggle(outside);
    expect(door.update(0.1, outside).progress).toBeCloseTo(progress);
  });
  it.each([occupied, { ...occupied, x: 32.8 }, { ...occupied, z: -8 }])(
    'reopens occupied thresholds and panel sweeps before enabling a collider',
    (person) => {
      const door = createDoorController(definition);
      door.request(1, outside);
      door.update(1, outside);
      expect(door.request(0, person)).toMatchObject({
        target: 1,
        occupied: true,
        blocked: false,
      });
      expect(door.update(1, person)).toMatchObject({
        progress: 1,
        blocked: false,
      });
    }
  );
  it('checks occupancy again during closing, including reduced motion', () => {
    const door = createDoorController(definition);
    door.request(1, outside);
    door.update(1, outside);
    door.request(0, outside);
    expect(door.update(1, occupied, true)).toMatchObject({
      progress: 1,
      target: 1,
      blocked: false,
      occupied: true,
    });
    door.request(0, outside);
    expect(door.update(0, outside, true)).toMatchObject({
      progress: 0,
      blocked: true,
    });
  });
  it('requires the same floor and an approach within the actual aperture from either side', () => {
    const door = createDoorController(definition);
    expect(door.isInRange({ ...outside, x: 29 })).toBe(true);
    expect(door.isInRange({ ...outside, x: 35 })).toBe(true);
    expect(door.isInRange({ ...outside, x: 32, z: -7 })).toBe(false);
    expect(door.isInRange({ ...outside, floorId: 'basement' })).toBe(false);
  });
  it('clears an occupied announcement when the protected region is empty', () => {
    const door = createDoorController(definition);
    door.request(1, outside);
    door.update(1, outside);
    door.request(0, occupied);
    expect(door.snapshot().occupied).toBe(true);
    expect(door.update(0, outside).occupied).toBe(false);
  });
  it('rejects invalid timing and clamps interrupted/non-finite frame input', () => {
    expect(() =>
      createDoorController({ ...definition, duration: 0 })
    ).toThrow();
    const door = createDoorController(definition);
    door.request(1, outside);
    expect(door.update(Number.NaN, outside).progress).toBe(0);
    expect(door.update(-1, outside).progress).toBe(0);
    expect(door.update(300, outside).progress).toBe(1);
  });
});
