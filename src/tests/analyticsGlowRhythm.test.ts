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

    const phaseAfterReset = rhythm.getWave();
    expect(rhythm.getValue()).toBeLessThanOrEqual(0.001);
    expect(phaseAfterReset).toBeGreaterThanOrEqual(0);
    expect(phaseAfterReset).toBeLessThan(1);
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
      smoothing: 0,
    });

    rhythm.setTargetEmphasis(1);
    rhythm.update(0.1);
    const firstValue = rhythm.getValue();
    const firstPhase = rhythm.getWave();

    rhythm.update(0.3);
    const secondValue = rhythm.getValue();
    const secondPhase = rhythm.getWave();
    expect(secondValue).toBeCloseTo(firstValue, 6);
    expect(secondPhase).not.toBeCloseTo(firstPhase, 6);
  });

  it('exposes normalized phase separately from the blended glow intensity', () => {
    const element = document.createElement('div');
    const rhythm = createAnalyticsGlowRhythm({
      element,
      smoothing: 0,
      pulseFrequency: 0.25,
      pulseStrength: 1,
      minGlow: 0.3,
      maxGlow: 0.9,
    });

    rhythm.setTargetEmphasis(1);
    rhythm.update(0.1);

    const firstIntensity = rhythm.getValue();
    const firstPhase = rhythm.getWave();
    const cssValueAfterFirst = Number.parseFloat(
      element.style.getPropertyValue('--hud-analytics-glow')
    );

    expect(firstPhase).toBeGreaterThanOrEqual(0);
    expect(firstPhase).toBeLessThan(1);
    expect(cssValueAfterFirst).toBeCloseTo(0.3 + 0.6 * firstIntensity, 4);

    rhythm.setTargetEmphasis(0.2);
    rhythm.update(0.1);

    const secondIntensity = rhythm.getValue();
    const secondPhase = rhythm.getWave();
    const cssValueAfterSecond = Number.parseFloat(
      element.style.getPropertyValue('--hud-analytics-glow')
    );

    expect(secondPhase).toBeGreaterThan(firstPhase);
    expect(secondIntensity).not.toBeCloseTo(firstIntensity, 4);
    expect(cssValueAfterSecond).toBeCloseTo(0.3 + 0.6 * secondIntensity, 4);
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
