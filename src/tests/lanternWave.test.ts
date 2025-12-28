import { describe, expect, it } from 'vitest';

import { computeLanternWaveState } from '../systems/lighting/lanternWave';

describe('computeLanternWaveState', () => {
  it('returns a bounded wave contribution and flicker blend', () => {
    const state = computeLanternWaveState({
      elapsed: 1.2,
      progression: 0.4,
      offset: Math.PI / 4,
      pulseScale: 0.9,
      flickerScale: 0.8,
    });

    expect(state.beaconStrength).toBeGreaterThanOrEqual(0);
    expect(state.beaconStrength).toBeLessThanOrEqual(1);
    expect(state.waveContribution).toBeGreaterThanOrEqual(0);
    expect(state.waveContribution).toBeLessThanOrEqual(1);
    expect(state.flickerBlend).toBeGreaterThan(0.3);
    expect(state.flickerBlend).toBeLessThan(1.8);
  });

  it('supports reversing the traveling wave direction', () => {
    const forward = computeLanternWaveState({
      elapsed: 1,
      progression: 0.4,
      pulseScale: 1,
      flickerScale: 1,
      direction: 'forward',
    });
    const reverse = computeLanternWaveState({
      elapsed: 1,
      progression: 0.4,
      pulseScale: 1,
      flickerScale: 1,
      direction: 'reverse',
    });

    const strengthDelta = Math.abs(
      forward.beaconStrength - reverse.beaconStrength
    );
    const contributionDelta = Math.abs(
      forward.waveContribution - reverse.waveContribution
    );

    expect(strengthDelta).toBeGreaterThan(0.05);
    expect(contributionDelta).toBeGreaterThan(0.05);
  });

  it('clamps invalid inputs to safe defaults', () => {
    const state = computeLanternWaveState({
      elapsed: Number.NaN,
      progression: Number.POSITIVE_INFINITY,
      offset: Number.NEGATIVE_INFINITY,
      pulseScale: -1,
      flickerScale: Number.NaN,
    });

    expect(state.beaconStrength).toBeGreaterThanOrEqual(0);
    expect(state.beaconStrength).toBeLessThanOrEqual(1);
    expect(state.waveContribution).toBe(0);
    expect(state.flickerBlend).toBeGreaterThan(0);
  });
});
