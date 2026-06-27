import { describe, expect, it } from 'vitest';

import {
  createSeededFlywheelEnergyNetwork,
  getFlywheelEnergyVisibleWindow,
  sanitizeFlywheelEnergyTargets,
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
    worldPosition: { x: 4, y: 0, z: 0 },
  },
  {
    poiId: 'c',
    label: 'C',
    floorId: 'ground',
    worldPosition: { x: 0, y: 0, z: 4 },
  },
  {
    poiId: 'd',
    label: 'D',
    floorId: 'ground',
    worldPosition: { x: -4, y: 0, z: 0 },
  },
];

function collectSequence(seed: string) {
  const network = createSeededFlywheelEnergyNetwork({
    seed,
    incomingDuration: 1,
    outgoingDuration: 1,
  });
  network.setTargets(targets);
  const sequence: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const active = network.getActiveTransfer();
    if (active) sequence.push(`${active.direction}:${active.targetPoiId}`);
    network.update(1);
  }
  return sequence;
}

describe('flywheel energy network', () => {
  it('selects the same seeded target sequence and different seeds diverge', () => {
    expect(collectSequence('same')).toEqual(collectSequence('same'));
    expect(collectSequence('same')).not.toEqual(collectSequence('different'));
  });

  it('runs exactly five incoming transfers before one stronger outgoing transfer', () => {
    const network = createSeededFlywheelEnergyNetwork({
      seed: 'cycle',
      incomingDuration: 1,
      outgoingDuration: 1,
    });
    network.setTargets(targets);
    const directions: string[] = [];
    const windows: number[] = [];
    const strengths: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const active = network.getActiveTransfer();
      expect(active).not.toBeNull();
      directions.push(active?.direction ?? 'missing');
      windows.push(active?.window ?? 0);
      strengths.push(active?.strength ?? 0);
      network.update(1);
    }
    expect(directions).toEqual([
      'incoming',
      'incoming',
      'incoming',
      'incoming',
      'incoming',
      'outgoing',
    ]);
    expect(windows[0]).toBeCloseTo(0.1);
    expect(windows[5]).toBeGreaterThan(windows[0]);
    expect(strengths[5]).toBeGreaterThan(strengths[0]);
  });

  it('excludes flywheel and upper-floor targets without mutating input data', () => {
    const input: FlywheelEnergyTarget[] = [
      ...targets,
      {
        poiId: 'flywheel-studio-flywheel',
        label: 'Flywheel',
        floorId: 'ground',
        worldPosition: { x: 1, y: 2, z: 3 },
      },
      {
        poiId: 'upper',
        label: 'Upper',
        floorId: 'upper',
        worldPosition: { x: 9, y: 9, z: 9 },
      },
    ];
    const before = JSON.stringify(input);
    const sanitized = sanitizeFlywheelEnergyTargets(input);
    expect(sanitized.map((target) => target.poiId)).not.toContain(
      'flywheel-studio-flywheel'
    );
    expect(sanitized.map((target) => target.poiId)).not.toContain('upper');
    sanitized[0].worldPosition.x = 999;
    expect(JSON.stringify(input)).toBe(before);
  });

  it('avoids immediate repeats when multiple targets are eligible', () => {
    const sequence = collectSequence('repeat-check').map(
      (entry) => entry.split(':')[1]
    );
    for (let i = 1; i < sequence.length; i += 1) {
      expect(sequence[i]).not.toBe(sequence[i - 1]);
    }
  });

  it('progresses phase, reports a short visible window, and samples a parabolic arc', () => {
    const network = createSeededFlywheelEnergyNetwork({
      seed: 'phase',
      incomingDuration: 10,
    });
    network.setTargets(targets);
    const active = network.update(2);
    expect(active?.phase).toBeCloseTo(0.2);
    const window = getFlywheelEnergyVisibleWindow(active!);
    expect(window.end - window.start).toBeCloseTo(0.1);
    const start = sampleFlywheelEnergyArc(
      { x: 0, y: 1, z: 0 },
      { x: 4, y: 1, z: 0 },
      0,
      2
    );
    const middle = sampleFlywheelEnergyArc(
      { x: 0, y: 1, z: 0 },
      { x: 4, y: 1, z: 0 },
      0.5,
      2
    );
    expect(start).toEqual({ x: 0, y: 1, z: 0 });
    expect(middle.y).toBeGreaterThan(start.y);
  });
});
