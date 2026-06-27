import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_INCOMING_PER_CYCLE,
  FLYWHEEL_INCOMING_WINDOW,
  FLYWHEEL_OUTGOING_STRENGTH,
  FLYWHEEL_OUTGOING_WINDOW,
  FlywheelEnergyNetwork,
  filterFlywheelEnergyTargets,
  getFlywheelEnergyVisibleWindow,
  sampleFlywheelEnergyArc,
  type FlywheelEnergyTarget,
} from '../scene/structures/flywheelEnergyNetwork';

const targets: FlywheelEnergyTarget[] = [
  {
    poiId: 'alpha',
    label: 'Alpha',
    floorId: 'ground',
    worldPosition: { x: 0, y: 0, z: 0 },
  },
  {
    poiId: 'beta',
    label: 'Beta',
    floorId: 'ground',
    worldPosition: { x: 2, y: 0, z: 0 },
  },
  {
    poiId: 'gamma',
    label: 'Gamma',
    floorId: 'ground',
    worldPosition: { x: 4, y: 0, z: 0 },
  },
  {
    poiId: 'flywheel-studio-flywheel',
    label: 'Flywheel',
    floorId: 'ground',
    worldPosition: { x: 6, y: 0, z: 0 },
  },
  {
    poiId: 'upper',
    label: 'Upper',
    floorId: 'upper',
    worldPosition: { x: 8, y: 4, z: 0 },
  },
];

function sequence(seed: string): string[] {
  const network = new FlywheelEnergyNetwork(seed);
  network.setTargets(targets);
  return Array.from({ length: 8 }, () => {
    const transfer = network.update(0.01);
    const id = `${transfer?.direction}:${transfer?.targetPoiId}`;
    network.update(10);
    return id;
  });
}

describe('FlywheelEnergyNetwork', () => {
  it('selects deterministic seeded target sequences without mutating input', () => {
    const before = structuredClone(targets);
    expect(sequence('same-seed')).toEqual(sequence('same-seed'));
    expect(sequence('same-seed')).not.toEqual(sequence('different-seed'));
    expect(targets).toEqual(before);
  });

  it('filters Flywheel and upper-floor targets', () => {
    expect(
      filterFlywheelEnergyTargets(targets).map((target) => target.poiId)
    ).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('runs exactly five incoming transfers before one stronger outgoing transfer', () => {
    const network = new FlywheelEnergyNetwork('cycle');
    network.setTargets(targets);
    const transfers = Array.from(
      { length: FLYWHEEL_INCOMING_PER_CYCLE + 1 },
      () => {
        const transfer = network.update(0.01);
        network.update(10);
        return transfer;
      }
    );
    expect(
      transfers
        .slice(0, 5)
        .every((transfer) => transfer?.direction === 'incoming')
    ).toBe(true);
    expect(transfers[5]?.direction).toBe('outgoing');
    expect(transfers[5]?.window).toBeGreaterThan(FLYWHEEL_INCOMING_WINDOW);
    expect(transfers[5]?.strength).toBe(FLYWHEEL_OUTGOING_STRENGTH);
    expect(transfers[5]?.window).toBe(FLYWHEEL_OUTGOING_WINDOW);
  });

  it('avoids immediate repeats when alternatives exist and progresses phase', () => {
    const network = new FlywheelEnergyNetwork('no-repeat');
    network.setTargets(targets);
    let previous: string | null = null;
    for (let i = 0; i < 6; i += 1) {
      const transfer = network.update(0.5);
      expect(transfer?.phase).toBeGreaterThan(0);
      expect(transfer?.targetPoiId).not.toBe(previous);
      previous = transfer?.targetPoiId ?? null;
      network.update(10);
    }
  });

  it('reports a short incoming visible window and samples raised parabolic arcs', () => {
    const network = new FlywheelEnergyNetwork('window');
    network.setTargets(targets);
    const transfer = network.update(0.5);
    expect(transfer?.window).toBeCloseTo(0.1);
    const visible = getFlywheelEnergyVisibleWindow(transfer!);
    expect(visible.end - visible.start).toBeLessThanOrEqual(0.11);
    const middle = sampleFlywheelEnergyArc(
      { x: 0, y: 0.5, z: 0 },
      { x: 4, y: 0.5, z: 0 },
      0.5
    );
    expect(middle.y).toBeGreaterThan(0.5);
  });
});
