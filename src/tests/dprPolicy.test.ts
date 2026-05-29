import { describe, expect, it } from 'vitest';

import { clampDprForQuality } from '../scene/graphics/dprPolicy';

describe('DPR policy', () => {
  it('caps normal hardware DPR below the old full-screen cinematic default', () => {
    expect(
      clampDprForQuality({ devicePixelRatio: 3, capabilityClass: 'hardware' })
    ).toBe(1.5);
  });

  it('allows explicit cinematic headroom but still bounds DPR', () => {
    expect(
      clampDprForQuality({
        devicePixelRatio: 3,
        capabilityClass: 'hardware',
        userRequestedCinematic: true,
      })
    ).toBe(2);
  });

  it('aggressively caps software and adaptive low-FPS paths', () => {
    expect(
      clampDprForQuality({ devicePixelRatio: 2, capabilityClass: 'software' })
    ).toBe(1);
    expect(
      clampDprForQuality({
        devicePixelRatio: 2,
        capabilityClass: 'hardware',
        adaptiveLimit: 0.75,
      })
    ).toBe(0.75);
  });
});
