import { describe, expect, it } from 'vitest';

import {
  createFlywheelEnergyNetwork,
  getFlywheelEnergyVisibleWindow,
  resolveFlywheelEnergyTargets,
  sampleFlywheelEnergyArc,
  type FlywheelEnergyTarget,
} from '../scene/structures/flywheelEnergyNetwork';

const targets: FlywheelEnergyTarget[] = [
  {
    poiId: 'a',
    label: 'A',
    floorId: 'ground',
    worldPosition: { x: 0, y: 0, z: 0 },
  },
  {
    poiId: 'b',
    label: 'B',
    floorId: 'ground',
    worldPosition: { x: 2, y: 0, z: 0 },
  },
  {
    poiId: 'c',
    label: 'C',
    floorId: 'ground',
    worldPosition: { x: 4, y: 0, z: 0 },
  },
  {
    poiId: 'flywheel-studio-flywheel',
    label: 'Flywheel',
    floorId: 'ground',
    worldPosition: { x: 5, y: 0, z: 0 },
  },
  {
    poiId: 'upper',
    label: 'Upper',
    floorId: 'upper',
    worldPosition: { x: 6, y: 0, z: 0 },
  },
];

function finishOne(network: ReturnType<typeof createFlywheelEnergyNetwork>) {
  network.update(99);
  return network.getSnapshot();
}

describe('flywheel energy network', () => {
  it('selects deterministic target sequences for the same seed', () => {
    const first = createFlywheelEnergyNetwork(targets, { seed: 'same' });
    const second = createFlywheelEnergyNetwork(targets, { seed: 'same' });
    for (let i = 0; i < 8; i += 1) {
      finishOne(first);
      finishOne(second);
    }
    expect(first.getSnapshot().targetOrder).toEqual(
      second.getSnapshot().targetOrder
    );
  });

  it('uses different target order for different seeds', () => {
    const first = createFlywheelEnergyNetwork(targets, { seed: 'one' });
    const second = createFlywheelEnergyNetwork(targets, { seed: 'two' });
    for (let i = 0; i < 8; i += 1) {
      finishOne(first);
      finishOne(second);
    }
    expect(first.getSnapshot().targetOrder).not.toEqual(
      second.getSnapshot().targetOrder
    );
  });

  it('runs exactly five incoming transfers before one stronger outgoing transfer', () => {
    const network = createFlywheelEnergyNetwork(targets, { seed: 'cycle' });
    for (let i = 0; i < 5; i += 1) {
      expect(network.getActiveTransfer()?.direction).toBe('incoming');
      expect(network.getActiveTransfer()?.window).toBeCloseTo(0.1);
      finishOne(network);
    }
    const outgoing = network.getActiveTransfer();
    expect(outgoing?.direction).toBe('outgoing');
    expect(outgoing?.window).toBeGreaterThan(0.1);
    expect(outgoing?.strength).toBeGreaterThan(1);
    finishOne(network);
    expect(network.getSnapshot().incomingCompletedCount).toBe(0);
    expect(network.getSnapshot().outgoingCompletedCount).toBe(1);
  });

  it('excludes Flywheel and upper-floor targets and avoids immediate repeats', () => {
    const resolved = resolveFlywheelEnergyTargets(targets);
    expect(resolved.map((target) => target.poiId)).toEqual(['a', 'b', 'c']);
    const network = createFlywheelEnergyNetwork(targets, { seed: 'no-repeat' });
    for (let i = 0; i < 10; i += 1) finishOne(network);
    const order = network.getSnapshot().targetOrder;
    for (let i = 1; i < order.length; i += 1)
      expect(order[i]).not.toBe(order[i - 1]);
  });

  it('progresses phase, samples a lifted parabolic arc, and does not mutate inputs', () => {
    const original = structuredClone(targets);
    const network = createFlywheelEnergyNetwork(targets, { seed: 'phase' });
    network.update(0.7);
    expect(network.getSnapshot().phase).toBeGreaterThan(0);
    const window = getFlywheelEnergyVisibleWindow(0.5, 0.1);
    expect(window.end - window.start).toBeCloseTo(0.1);
    const mid = sampleFlywheelEnergyArc(
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      0.5
    );
    expect(mid.y).toBeGreaterThan(0);
    expect(targets).toEqual(original);
  });
});
