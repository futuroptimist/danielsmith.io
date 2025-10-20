import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
} from 'three';
import { describe, expect, it } from 'vitest';

import { createEnvironmentLightAnimator } from '../scene/lighting/environmentAnimator';

describe('createEnvironmentLightAnimator', () => {
  it('maintains baseline values when no keyframes are provided', () => {
    const ambient = new AmbientLight(0xffaa66, 0.72);
    const hemisphere = new HemisphereLight(0x335577, 0x112233, 0.58);
    const directional = new DirectionalLight(0xffffff, 1.05);

    const animator = createEnvironmentLightAnimator({
      ambient,
      hemisphere,
      directional,
      keyframes: [],
      tintColor: null,
      tintStrengthScale: Number.NaN,
    });

    animator.update(120);

    expect(ambient.intensity).toBeCloseTo(0.72, 6);
    expect(hemisphere.intensity).toBeCloseTo(0.58, 6);
    expect(directional.intensity).toBeCloseTo(1.05, 6);
    expect(ambient.color.getHexString()).toBe(
      new Color(0xffaa66).getHexString()
    );
    expect(hemisphere.color.getHexString()).toBe(
      new Color(0x335577).getHexString()
    );
    expect(hemisphere.groundColor.getHexString()).toBe(
      new Color(0x112233).getHexString()
    );
    expect(directional.color.getHexString()).toBe(
      new Color(0xffffff).getHexString()
    );
  });

  it('applies a single keyframe directly when no interpolation is required', () => {
    const ambient = new AmbientLight(0xffffff, 0.6);
    const hemisphere = new HemisphereLight(0xffffff, 0xffffff, 0.4);
    const directional = new DirectionalLight(0xffffff, 1);

    const animator = createEnvironmentLightAnimator({
      ambient,
      hemisphere,
      directional,
      keyframes: [
        {
          time: 0,
          ambientIntensity: 0.8,
          hemisphericIntensity: 1.4,
          directionalIntensity: 1.2,
        },
      ],
      tintColor: null,
    });

    animator.update(15);

    expect(ambient.intensity).toBeCloseTo(0.48, 6);
    expect(hemisphere.intensity).toBeCloseTo(0.56, 6);
    expect(directional.intensity).toBeCloseTo(1.2, 6);
  });

  it('interpolates intensities with easing across the cycle', () => {
    const ambient = new AmbientLight(0xffffff, 0.8);
    const hemisphere = new HemisphereLight(0xffffff, 0xffffff, 0.6);
    const directional = new DirectionalLight(0xffffff, 1.2);

    const animator = createEnvironmentLightAnimator({
      ambient,
      hemisphere,
      directional,
      cycleSeconds: 10,
      keyframes: [
        {
          time: 0,
          ambientIntensity: 1,
          hemisphericIntensity: 1,
          directionalIntensity: 1,
          ease: 'sine-in-out',
        },
        {
          time: 1,
          ambientIntensity: 0.5,
          hemisphericIntensity: 1.5,
          directionalIntensity: 1.4,
        },
      ],
      tintColor: null,
    });

    const quarterCycleSeconds = 2.5;
    animator.update(quarterCycleSeconds);

    const easedAlpha = 0.5 - Math.cos(Math.PI * 0.25) / 2;
    expect(ambient.intensity).toBeCloseTo(
      0.8 * (1 + (0.5 - 1) * easedAlpha),
      6
    );
    expect(hemisphere.intensity).toBeCloseTo(
      0.6 * (1 + (1.5 - 1) * easedAlpha),
      6
    );
    expect(directional.intensity).toBeCloseTo(
      1.2 * (1 + (1.4 - 1) * easedAlpha),
      6
    );
  });

  it('wraps the cycle when the final keyframe occurs before t=1', () => {
    const ambient = new AmbientLight(0xffffff, 0.5);
    const hemisphere = new HemisphereLight(0xffffff, 0xffffff, 0.7);
    const directional = new DirectionalLight(0xffffff, 1.3);

    const animator = createEnvironmentLightAnimator({
      ambient,
      hemisphere,
      directional,
      cycleSeconds: 8,
      keyframes: [
        {
          time: 0,
          ambientIntensity: 1,
          hemisphericIntensity: 1,
          directionalIntensity: 1,
        },
        {
          time: 0.6,
          ambientIntensity: 0.5,
          hemisphericIntensity: 1.2,
          directionalIntensity: 0.8,
        },
      ],
      tintColor: null,
    });

    animator.update(7.2);

    const wrappedAlpha = (0.9 - 0.6) / (0 + 1 - 0.6);
    expect(ambient.intensity).toBeCloseTo(
      0.5 * (0.5 + (1 - 0.5) * wrappedAlpha),
      6
    );
    expect(hemisphere.intensity).toBeCloseTo(
      0.7 * (1.2 + (1 - 1.2) * wrappedAlpha),
      6
    );
    expect(directional.intensity).toBeCloseTo(
      1.3 * (0.8 + (1 - 0.8) * wrappedAlpha),
      6
    );
  });

  it('applies tint blending with the configured strength scale', () => {
    const ambient = new AmbientLight(0x223344, 0.9);
    const hemisphere = new HemisphereLight(0x334455, 0x112233, 0.5);
    const directional = new DirectionalLight(0x556677, 1.1);

    const tint = new Color('#ffeecc');

    const animator = createEnvironmentLightAnimator({
      ambient,
      hemisphere,
      directional,
      cycleSeconds: 12,
      keyframes: [
        {
          time: 0,
          ambientIntensity: 1,
          hemisphericIntensity: 1,
          directionalIntensity: 1,
          ambientTintStrength: 0.5,
          hemisphericTintStrength: 0.3,
          directionalTintStrength: 0.8,
        },
        {
          time: 1,
          ambientIntensity: 1,
          hemisphericIntensity: 1,
          directionalIntensity: 1,
          ambientTintStrength: 0.25,
          hemisphericTintStrength: 0.4,
          directionalTintStrength: 0.2,
        },
      ],
      tintColor: tint,
      tintStrengthScale: 0.5,
    });

    animator.update(Number.NaN);
    animator.update(0);

    const ambientExpected = new Color(0x223344).lerp(tint, 0.5 * 0.5);
    const hemisphereSkyExpected = new Color(0x334455).lerp(tint, 0.3 * 0.5);
    const hemisphereGroundExpected = new Color(0x112233).lerp(
      tint,
      0.3 * 0.5 * 0.85
    );
    const directionalExpected = new Color(0x556677).lerp(tint, 0.8 * 0.5);

    expect(ambient.color.getHexString()).toBe(ambientExpected.getHexString());
    expect(hemisphere.color.getHexString()).toBe(
      hemisphereSkyExpected.getHexString()
    );
    expect(hemisphere.groundColor.getHexString()).toBe(
      hemisphereGroundExpected.getHexString()
    );
    expect(directional.color.getHexString()).toBe(
      directionalExpected.getHexString()
    );
  });

  it('updates baselines when captureBaseline is invoked', () => {
    const ambient = new AmbientLight(0xffffff, 0.4);
    const hemisphere = new HemisphereLight(0xffffff, 0xffffff, 0.3);
    const directional = new DirectionalLight(0xffffff, 0.5);

    const animator = createEnvironmentLightAnimator({
      ambient,
      hemisphere,
      directional,
      tintColor: null,
    });

    animator.update(3);

    ambient.intensity = 0.25;
    hemisphere.intensity = 0.6;
    directional.intensity = 0.9;
    ambient.color.set('#112233');
    hemisphere.color.set('#223344');
    hemisphere.groundColor.set('#334455');
    directional.color.set('#445566');

    animator.captureBaseline();
    animator.update(0);

    expect(ambient.intensity).toBeCloseTo(0.25, 6);
    expect(hemisphere.intensity).toBeCloseTo(0.6, 6);
    expect(directional.intensity).toBeCloseTo(0.9, 6);
    expect(ambient.color.getHexString()).toBe('112233');
    expect(hemisphere.color.getHexString()).toBe('223344');
    expect(hemisphere.groundColor.getHexString()).toBe('334455');
    expect(directional.color.getHexString()).toBe('445566');
  });
});
