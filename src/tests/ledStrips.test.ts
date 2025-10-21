import { AdditiveBlending, Color } from 'three';
import { describe, expect, it } from 'vitest';

import {
  LED_DIFFUSER_CLEARANCE,
  LED_DIFFUSER_COLOR_BLEND,
  LED_DIFFUSER_EMISSIVE_SCALE,
  LED_DIFFUSER_OPACITY,
  LED_DIFFUSER_OVERHANG,
  LED_DIFFUSER_THICKNESS,
  computeDiffuserVerticalOffset,
  createLedDiffuserGeometry,
  createLedDiffuserMaterial,
} from '../scene/lighting/ledStrips';

describe('LED strip diffusers', () => {
  it('creates additive diffuser materials with tinted color and emissive scaling', () => {
    const baseColor = new Color('#101623');
    const emissiveColor = new Color('#88c0ff');

    const material = createLedDiffuserMaterial({
      baseColor,
      emissiveColor,
      baseEmissiveIntensity: 1.2,
    });

    const expectedColor = baseColor
      .clone()
      .lerp(emissiveColor, LED_DIFFUSER_COLOR_BLEND);

    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(LED_DIFFUSER_OPACITY, 5);
    expect(material.depthWrite).toBe(false);
    expect(material.toneMapped).toBe(false);
    expect(material.blending).toBe(AdditiveBlending);
    expect(material.color.getHexString()).toBe(expectedColor.getHexString());
    expect(material.emissive.getHexString()).toBe(emissiveColor.getHexString());
    expect(material.emissiveIntensity).toBeCloseTo(
      1.2 * LED_DIFFUSER_EMISSIVE_SCALE,
      5
    );

    // Ensure the input colors remain unmodified for reuse in other materials.
    expect(baseColor.getHexString()).toBe('101623');
    expect(emissiveColor.getHexString()).toBe('88c0ff');
  });

  it('sanitizes invalid material configuration inputs', () => {
    const baseColor = new Color('#223344');
    const emissiveColor = new Color('#ffaa33');

    const material = createLedDiffuserMaterial({
      baseColor,
      emissiveColor,
      baseEmissiveIntensity: Number.NaN,
      opacity: -5,
      emissiveScale: -3,
      colorBlend: 42,
    });

    const expectedColor = baseColor
      .clone()
      .lerp(emissiveColor, LED_DIFFUSER_COLOR_BLEND);

    expect(material.opacity).toBeCloseTo(LED_DIFFUSER_OPACITY, 5);
    expect(material.color.getHexString()).toBe(expectedColor.getHexString());
    expect(material.emissiveIntensity).toBeCloseTo(
      LED_DIFFUSER_EMISSIVE_SCALE,
      5
    );
  });

  it('expands diffuser geometry to overhang strip dimensions', () => {
    const geometry = createLedDiffuserGeometry({
      stripWidth: 4,
      stripDepth: 2.5,
    });

    expect(geometry.parameters.width).toBeCloseTo(
      4 + LED_DIFFUSER_OVERHANG * 2,
      5
    );
    expect(geometry.parameters.depth).toBeCloseTo(
      2.5 + LED_DIFFUSER_OVERHANG * 2,
      5
    );
    expect(geometry.parameters.height).toBeCloseTo(LED_DIFFUSER_THICKNESS, 5);
  });

  it('clamps invalid geometry inputs to safe defaults', () => {
    const geometry = createLedDiffuserGeometry({
      stripWidth: -10,
      stripDepth: Number.NaN,
      overhang: -1,
      thickness: -0.01,
    });

    expect(geometry.parameters.width).toBeCloseTo(LED_DIFFUSER_OVERHANG * 2, 5);
    expect(geometry.parameters.depth).toBeCloseTo(LED_DIFFUSER_OVERHANG * 2, 5);
    expect(geometry.parameters.height).toBeCloseTo(LED_DIFFUSER_THICKNESS, 5);
  });

  it('computes diffuser drop distance from strip thickness with clearance', () => {
    expect(computeDiffuserVerticalOffset(0.12)).toBeCloseTo(
      0.12 / 2 + LED_DIFFUSER_CLEARANCE,
      5
    );
    expect(computeDiffuserVerticalOffset(Number.NaN, -2)).toBeCloseTo(
      LED_DIFFUSER_CLEARANCE,
      5
    );
  });
});
