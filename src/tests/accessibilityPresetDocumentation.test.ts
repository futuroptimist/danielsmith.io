import { describe, expect, it } from 'vitest';

import { ACCESSIBILITY_PRESETS } from '../ui/accessibility/presetManager';

describe('Accessibility Preset Documentation Sync', () => {
  it('documents the standard preset metrics correctly', () => {
    const standard = ACCESSIBILITY_PRESETS.find((p) => p.id === 'standard');
    expect(standard).toBeDefined();
    if (!standard) return;

    expect(standard.motion).toBe('default');
    expect(standard.contrast).toBe('standard');
    expect(standard.animation.pulseScale).toBe(1);
    expect(standard.animation.flickerScale).toBe(1);
    expect(standard.motionBlur.intensity).toBe(0.6);
    expect(standard.bloom.strengthScale).toBe(1);
    expect(standard.bloom.radiusScale).toBe(1);
    expect(standard.bloom.thresholdOffset).toBe(0);
    expect(standard.led.emissiveScale).toBe(1);
    expect(standard.led.lightScale).toBe(1);
    expect(standard.audio.volumeScale).toBe(1);
  });

  it('documents the calm preset metrics correctly', () => {
    const calm = ACCESSIBILITY_PRESETS.find((p) => p.id === 'calm');
    expect(calm).toBeDefined();
    if (!calm) return;

    expect(calm.motion).toBe('reduced');
    expect(calm.contrast).toBe('standard');
    expect(calm.animation.pulseScale).toBe(0.65);
    expect(calm.animation.flickerScale).toBe(0.55);
    expect(calm.motionBlur.intensity).toBe(0.25);
    expect(calm.bloom.strengthScale).toBe(0.6);
    expect(calm.bloom.radiusScale).toBe(0.9);
    expect(calm.bloom.thresholdOffset).toBe(0.02);
    expect(calm.led.emissiveScale).toBe(0.75);
    expect(calm.led.lightScale).toBe(0.8);
    expect(calm.audio.volumeScale).toBe(0.8);
  });

  it('documents the high-contrast preset metrics correctly', () => {
    const highContrast = ACCESSIBILITY_PRESETS.find(
      (p) => p.id === 'high-contrast'
    );
    expect(highContrast).toBeDefined();
    if (!highContrast) return;

    expect(highContrast.motion).toBe('default');
    expect(highContrast.contrast).toBe('high');
    expect(highContrast.animation.pulseScale).toBe(1);
    expect(highContrast.animation.flickerScale).toBe(1);
    expect(highContrast.motionBlur.intensity).toBe(0.6);
    expect(highContrast.bloom.strengthScale).toBe(1.1);
    expect(highContrast.bloom.radiusScale).toBe(1);
    expect(highContrast.bloom.thresholdOffset).toBe(-0.02);
    expect(highContrast.led.emissiveScale).toBe(1.15);
    expect(highContrast.led.lightScale).toBe(1.1);
    expect(highContrast.audio.volumeScale).toBe(1);
  });

  it('documents the photosensitive preset metrics correctly', () => {
    const photosensitive = ACCESSIBILITY_PRESETS.find(
      (p) => p.id === 'photosensitive'
    );
    expect(photosensitive).toBeDefined();
    if (!photosensitive) return;

    expect(photosensitive.motion).toBe('reduced');
    expect(photosensitive.contrast).toBe('high');
    expect(photosensitive.animation.pulseScale).toBe(0);
    expect(photosensitive.animation.flickerScale).toBe(0);
    expect(photosensitive.motionBlur.intensity).toBe(0);
    expect(photosensitive.bloom.enabled).toBe(false);
    expect(photosensitive.bloom.strengthScale).toBe(0);
    expect(photosensitive.bloom.radiusScale).toBe(1);
    expect(photosensitive.bloom.thresholdOffset).toBe(0.05);
    expect(photosensitive.led.emissiveScale).toBe(0.55);
    expect(photosensitive.led.lightScale).toBe(0.6);
    expect(photosensitive.audio.volumeScale).toBe(0.7);
  });

  it('includes all four expected presets', () => {
    expect(ACCESSIBILITY_PRESETS).toHaveLength(4);
    const ids = ACCESSIBILITY_PRESETS.map((p) => p.id);
    expect(ids).toContain('standard');
    expect(ids).toContain('calm');
    expect(ids).toContain('high-contrast');
    expect(ids).toContain('photosensitive');
  });

  it('provides labels and descriptions for all presets', () => {
    for (const preset of ACCESSIBILITY_PRESETS) {
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(typeof preset.label).toBe('string');
      expect(typeof preset.description).toBe('string');
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
    }
  });

  it('ensures all animation scales are within valid range', () => {
    for (const preset of ACCESSIBILITY_PRESETS) {
      expect(preset.animation.pulseScale).toBeGreaterThanOrEqual(0);
      expect(preset.animation.pulseScale).toBeLessThanOrEqual(1);
      expect(preset.animation.flickerScale).toBeGreaterThanOrEqual(0);
      expect(preset.animation.flickerScale).toBeLessThanOrEqual(1);
    }
  });

  it('ensures motion blur intensities are within valid range', () => {
    for (const preset of ACCESSIBILITY_PRESETS) {
      expect(preset.motionBlur.intensity).toBeGreaterThanOrEqual(0);
      expect(preset.motionBlur.intensity).toBeLessThanOrEqual(1);
    }
  });

  it('ensures audio volume scales are within valid range', () => {
    for (const preset of ACCESSIBILITY_PRESETS) {
      expect(preset.audio.volumeScale).toBeGreaterThanOrEqual(0);
      expect(preset.audio.volumeScale).toBeLessThanOrEqual(1);
    }
  });

  it('ensures bloom scales are non-negative', () => {
    for (const preset of ACCESSIBILITY_PRESETS) {
      expect(preset.bloom.strengthScale).toBeGreaterThanOrEqual(0);
      expect(preset.bloom.radiusScale).toBeGreaterThanOrEqual(0);
    }
  });

  it('ensures LED scales are non-negative', () => {
    for (const preset of ACCESSIBILITY_PRESETS) {
      expect(preset.led.emissiveScale).toBeGreaterThanOrEqual(0);
      expect(preset.led.lightScale).toBeGreaterThanOrEqual(0);
    }
  });

  it('ensures reduced motion presets have lower animation scales', () => {
    const reducedMotionPresets = ACCESSIBILITY_PRESETS.filter(
      (p) => p.motion === 'reduced'
    );
    const defaultMotionPresets = ACCESSIBILITY_PRESETS.filter(
      (p) => p.motion === 'default'
    );

    for (const reduced of reducedMotionPresets) {
      const avgDefault =
        defaultMotionPresets.reduce(
          (sum, p) => sum + p.animation.pulseScale,
          0
        ) / defaultMotionPresets.length;
      expect(reduced.animation.pulseScale).toBeLessThanOrEqual(avgDefault);
    }
  });

  it('ensures photosensitive preset has the most restrictive settings', () => {
    const photosensitive = ACCESSIBILITY_PRESETS.find(
      (p) => p.id === 'photosensitive'
    );
    expect(photosensitive).toBeDefined();
    if (!photosensitive) return;

    for (const preset of ACCESSIBILITY_PRESETS) {
      if (preset.id === 'photosensitive') continue;

      expect(photosensitive.animation.pulseScale).toBeLessThanOrEqual(
        preset.animation.pulseScale
      );
      expect(photosensitive.animation.flickerScale).toBeLessThanOrEqual(
        preset.animation.flickerScale
      );
      expect(photosensitive.motionBlur.intensity).toBeLessThanOrEqual(
        preset.motionBlur.intensity
      );
    }
  });
});
