import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_ENERGY_POI_ID,
  FLYWHEEL_INCOMING_DURATION,
  FLYWHEEL_INCOMING_PER_CYCLE,
  FLYWHEEL_INCOMING_WINDOW,
  createFlywheelEnergyNetwork,
  normalizeFlywheelEnergyTargets,
} from '../scene/structures/flywheelEnergyNetwork';

const targets = [
  { poiId: 'a', label: 'A', worldPosition: { x: 1, y: 0, z: 1 } },
  { poiId: 'b', label: 'B', worldPosition: { x: 2, y: 0, z: 2 } },
  { poiId: 'c', label: 'C', worldPosition: { x: 3, y: 0, z: 3 } },
  {
    poiId: FLYWHEEL_ENERGY_POI_ID,
    label: 'Flywheel',
    worldPosition: { x: 0, y: 0, z: 0 },
  },
];

function completeCurrent(
  network: ReturnType<typeof createFlywheelEnergyNetwork>
) {
  const duration = network.getActiveTransfer().duration;
  network.update(duration + 0.001);
}

describe('FlywheelEnergyNetworkState', () => {
  it('selects deterministic target sequences for the same seed', () => {
    const a = createFlywheelEnergyNetwork({ seed: 'same', targets });
    const b = createFlywheelEnergyNetwork({ seed: 'same', targets });
    const seqA: string[] = [];
    const seqB: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      seqA.push(a.getActiveTransfer().targetPoiId);
      seqB.push(b.getActiveTransfer().targetPoiId);
      completeCurrent(a);
      completeCurrent(b);
    }
    expect(seqA).toEqual(seqB);
  });

  it('uses different seeded orders when possible', () => {
    const a = createFlywheelEnergyNetwork({ seed: 'alpha', targets });
    const b = createFlywheelEnergyNetwork({ seed: 'beta', targets });
    const seqA: string[] = [];
    const seqB: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      seqA.push(a.getActiveTransfer().targetPoiId);
      seqB.push(b.getActiveTransfer().targetPoiId);
      completeCurrent(a);
      completeCurrent(b);
    }
    expect(seqA).not.toEqual(seqB);
  });

  it('runs exactly five incoming transfers before one stronger outgoing transfer', () => {
    const network = createFlywheelEnergyNetwork({ seed: 'cycle', targets });
    const directions: string[] = [];
    const windows: number[] = [];
    const strengths: number[] = [];
    for (let i = 0; i < FLYWHEEL_INCOMING_PER_CYCLE + 1; i += 1) {
      const transfer = network.getActiveTransfer();
      directions.push(transfer.direction);
      windows.push(transfer.window);
      strengths.push(transfer.strength);
      completeCurrent(network);
    }
    expect(directions).toEqual([
      'incoming',
      'incoming',
      'incoming',
      'incoming',
      'incoming',
      'outgoing',
    ]);
    expect(windows[0]).toBeCloseTo(FLYWHEEL_INCOMING_WINDOW);
    expect(windows[5]).toBeGreaterThan(windows[0]);
    expect(strengths[5]).toBeGreaterThan(strengths[0]);
    expect(network.getDebugState().incomingCompletedCount).toBe(0);
    expect(network.getDebugState().outgoingCompletedCount).toBe(1);
  });

  it('excludes Flywheel, avoids immediate repeats, progresses phase, and does not mutate inputs', () => {
    const original = structuredClone(targets);
    const normalized = normalizeFlywheelEnergyTargets(targets);
    expect(normalized.map((target) => target.poiId)).not.toContain(
      FLYWHEEL_ENERGY_POI_ID
    );

    const network = createFlywheelEnergyNetwork({ seed: 'repeats', targets });
    expect(network.getActiveTransfer().phase).toBe(0);
    network.update(FLYWHEEL_INCOMING_DURATION / 2);
    expect(network.getActiveTransfer().phase).toBeCloseTo(0.5);
    const ids: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      ids.push(network.getActiveTransfer().targetPoiId);
      completeCurrent(network);
    }
    for (let i = 1; i < ids.length; i += 1) {
      expect(ids[i]).not.toBe(ids[i - 1]);
    }
    expect(targets).toEqual(original);
  });
});
