import { describe, expect, it } from 'vitest';

import {
  computePoiEmphasis,
  computePoiHaloOpacity,
  computePoiLabelOpacity,
} from '../scene/poi/emphasis';

describe('computePoiEmphasis', () => {
  it('keeps emphasis at zero until activation enters the fade window', () => {
    expect(computePoiEmphasis(0.05, 0)).toBe(0);
  });

  it('ramps up with activation and smooths toward focus', () => {
    const midActivation = computePoiEmphasis(0.5, 0);
    expect(midActivation).toBeGreaterThan(0);
    expect(midActivation).toBeLessThan(1);
  });

  it('prefers focus strength when larger than activation', () => {
    expect(computePoiEmphasis(0, 0.7)).toBeCloseTo(0.7, 5);
  });
});

describe('computePoiLabelOpacity', () => {
  it('returns zero opacity when emphasis and visited strength are zero', () => {
    expect(computePoiLabelOpacity(0, 0)).toBe(0);
  });

  it('scales with emphasis when no visited strength is present', () => {
    expect(computePoiLabelOpacity(0.6, 0)).toBeCloseTo(0.6, 5);
  });

  it('maintains a visited baseline even when emphasis is zero', () => {
    expect(computePoiLabelOpacity(0, 1)).toBeCloseTo(0.48, 5);
  });

  it('never exceeds full opacity', () => {
    expect(computePoiLabelOpacity(1.2, 0.5)).toBeLessThanOrEqual(1);
  });
});

describe('computePoiHaloOpacity', () => {
  it('returns zero opacity when emphasis and visited strength are zero', () => {
    expect(computePoiHaloOpacity(0, 0)).toBe(0);
  });

  it('lerps toward the focus opacity as emphasis increases', () => {
    expect(computePoiHaloOpacity(0.5, 0)).toBeCloseTo(0.31, 5);
  });

  it('preserves a visited glow even when emphasis is zero', () => {
    expect(computePoiHaloOpacity(0, 1)).toBeCloseTo(0.3, 5);
  });

  it('caps at the configured focus opacity', () => {
    expect(computePoiHaloOpacity(10, 1)).toBeLessThanOrEqual(0.62);
  });
});
