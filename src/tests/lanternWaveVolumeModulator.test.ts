import { beforeEach, describe, expect, it } from 'vitest';

import { createLanternWaveVolumeModulator } from '../systems/audio/lanternWaveVolumeModulator';

const CONTEXT_BASE = {
  delta: 0.016,
  listenerPosition: { x: 0, z: 0 },
  baseVolume: 0.34,
} as const;

describe('createLanternWaveVolumeModulator', () => {
  beforeEach(() => {
    document.documentElement.dataset.accessibilityPulseScale = '1';
    document.documentElement.dataset.accessibilityFlickerScale = '1';
  });

  it('varies the returned scale as the lantern wave progresses', () => {
    const modulator = createLanternWaveVolumeModulator();
    const early = modulator({ ...CONTEXT_BASE, elapsed: 0 });
    const later = modulator({ ...CONTEXT_BASE, elapsed: 3.1 });
    expect(Math.abs(later - early)).toBeGreaterThan(0.01);
  });

  it('damps the returned scale when accessibility calm mode is enabled', () => {
    const modulator = createLanternWaveVolumeModulator();
    const energetic = modulator({ ...CONTEXT_BASE, elapsed: 2.4 });
    document.documentElement.dataset.accessibilityPulseScale = '0.15';
    document.documentElement.dataset.accessibilityFlickerScale = '0.25';
    const calm = modulator({ ...CONTEXT_BASE, elapsed: 2.4 });
    expect(calm).toBeLessThanOrEqual(energetic);
  });

  it('clamps results to the configured range even with extreme samples', () => {
    const modulator = createLanternWaveVolumeModulator({
      minimumScale: 0.8,
      maximumScale: 0.9,
      samples: [
        { progression: 0.2, offset: 0 },
        { progression: 0.4, offset: Math.PI / 2 },
        { progression: 0.6, offset: Math.PI },
      ],
    });
    document.documentElement.dataset.accessibilityPulseScale = '1';
    document.documentElement.dataset.accessibilityFlickerScale = '1';
    const scale = modulator({ ...CONTEXT_BASE, elapsed: 9.75 });
    expect(scale).toBeGreaterThanOrEqual(0.8);
    expect(scale).toBeLessThanOrEqual(0.9);
  });
});
