import { describe, expect, it } from 'vitest';

import { getFlickerScale, getPulseScale } from '../accessibility/animationPreferences';

describe('animation accessibility preferences', () => {
  const restore = () => {
    delete document.documentElement.dataset.accessibilityPulseScale;
    delete document.documentElement.dataset.accessibilityFlickerScale;
  };

  it('returns default scales when no dataset attributes are set', () => {
    restore();
    expect(getPulseScale()).toBe(1);
    expect(getFlickerScale()).toBe(1);
  });

  it('parses scale attributes and clamps them to [0, 1]', () => {
    document.documentElement.dataset.accessibilityPulseScale = '0.45';
    document.documentElement.dataset.accessibilityFlickerScale = '1.25';

    expect(getPulseScale()).toBeCloseTo(0.45, 5);
    expect(getFlickerScale()).toBe(1);

    document.documentElement.dataset.accessibilityPulseScale = '-0.4';
    document.documentElement.dataset.accessibilityFlickerScale = 'foo';

    expect(getPulseScale()).toBe(0);
    expect(getFlickerScale()).toBe(1);

    restore();
  });

  it('prefers an explicit root when provided', () => {
    const host = document.createElement('div');
    host.dataset.accessibilityPulseScale = '0.2';
    host.dataset.accessibilityFlickerScale = '0.3';

    expect(getPulseScale(host)).toBeCloseTo(0.2, 5);
    expect(getFlickerScale(host)).toBeCloseTo(0.3, 5);
  });
});
