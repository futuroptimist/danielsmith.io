import { describe, expect, it, vi } from 'vitest';

import { createAnalyticsGlowRhythm } from '../systems/hud/analyticsGlowRhythm';

describe('createAnalyticsGlowRhythm', () => {
  it('lerps toward the target emphasis and updates CSS variables', () => {
    const element = document.createElement('div');
    const rhythm = createAnalyticsGlowRhythm({
      element,
      smoothing: 12,
      pulseFrequency: 0,
    });

    rhythm.setTargetEmphasis(1);
    rhythm.update(0.1);

    const value = Number.parseFloat(
      element.style.getPropertyValue('--hud-analytics-glow')
    );
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  it('returns zero glow when emphasis is cleared', () => {
    const element = document.createElement('div');
    const rhythm = createAnalyticsGlowRhythm({ element, smoothing: 20 });

    rhythm.setTargetEmphasis(1);
    rhythm.update(0.2);
    rhythm.setTargetEmphasis(0);
    rhythm.update(0.2);
    rhythm.update(10);

    expect(rhythm.getValue()).toBeLessThanOrEqual(0.001);
    expect(rhythm.getWave()).toBeLessThanOrEqual(0.001);
    expect(
      Number.parseFloat(
        element.style.getPropertyValue('--hud-analytics-glow') || '0'
      )
    ).toBe(0);
  });

  it('suppresses pulse modulation when the accessibility pulse scale is zero', () => {
    const element = document.createElement('div');
    const getPulseScale = vi.fn(() => 0);
    const rhythm = createAnalyticsGlowRhythm({
      element,
      getPulseScale,
      pulseFrequency: 2,
      pulseStrength: 1,
    });

    rhythm.setTargetEmphasis(1);
    rhythm.update(0.1);
    const firstValue = rhythm.getValue();
    const firstWave = rhythm.getWave();
    const minGlow = 0.08;
    const glowRange = 0.92;
    expect(firstValue).toBeCloseTo(minGlow + glowRange * firstWave, 6);

    rhythm.update(0.5);
    const secondValue = rhythm.getValue();
    const secondWave = rhythm.getWave();
    expect(secondValue).toBeCloseTo(minGlow + glowRange * secondWave, 6);
    expect(secondWave).toBeGreaterThanOrEqual(firstWave);
  });

  it('rebinds elements and clears styles on dispose', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    const rhythm = createAnalyticsGlowRhythm({ element: first, smoothing: 10 });

    rhythm.setTargetEmphasis(0.75);
    rhythm.update(0.2);
    expect(first.style.getPropertyValue('--hud-analytics-glow')).not.toBe('');

    rhythm.setElement(second);
    expect(first.style.getPropertyValue('--hud-analytics-glow')).toBe('');

    rhythm.update(0.2);
    expect(second.style.getPropertyValue('--hud-analytics-glow')).not.toBe('');

    rhythm.dispose();
    expect(second.style.getPropertyValue('--hud-analytics-glow')).toBe('');
  });
});
