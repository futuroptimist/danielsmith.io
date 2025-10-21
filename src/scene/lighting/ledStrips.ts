import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  MeshStandardMaterial,
} from 'three';

export const LED_DIFFUSER_THICKNESS = 0.06;
export const LED_DIFFUSER_OVERHANG = 0.18;
export const LED_DIFFUSER_CLEARANCE = 0.03;
export const LED_DIFFUSER_EMISSIVE_SCALE = 0.45;
export const LED_DIFFUSER_OPACITY = 0.42;
export const LED_DIFFUSER_COLOR_BLEND = 0.58;

const MIN_DIMENSION = 0.01;

const clampNormalized = (
  value: number | undefined,
  fallback: number
): number => {
  if (!Number.isFinite(value)) {
    return clampNormalized(fallback, fallback);
  }
  if (value < 0) {
    return clampNormalized(fallback, fallback);
  }
  if (value === 0) {
    return 0;
  }
  if (value > 1) {
    return clampNormalized(fallback, fallback);
  }
  if (value === 1) {
    return 1;
  }
  return value;
};

const sanitizeNonNegative = (
  value: number | undefined,
  fallback: number
): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value < 0) {
    return 0;
  }
  return value;
};

const sanitizePositiveOrFallback = (
  value: number | undefined,
  fallback: number
): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value <= 0) {
    return fallback;
  }
  return value;
};

export interface LedDiffuserMaterialOptions {
  baseColor: Color;
  emissiveColor: Color;
  baseEmissiveIntensity: number;
  opacity?: number;
  emissiveScale?: number;
  colorBlend?: number;
}

export function createLedDiffuserMaterial({
  baseColor,
  emissiveColor,
  baseEmissiveIntensity,
  opacity,
  emissiveScale = LED_DIFFUSER_EMISSIVE_SCALE,
  colorBlend = LED_DIFFUSER_COLOR_BLEND,
}: LedDiffuserMaterialOptions): MeshStandardMaterial {
  const safeIntensity = sanitizeNonNegative(baseEmissiveIntensity, 1);
  const safeScale = sanitizePositiveOrFallback(
    emissiveScale,
    LED_DIFFUSER_EMISSIVE_SCALE
  );
  const safeOpacity = clampNormalized(opacity, LED_DIFFUSER_OPACITY);
  const blend = clampNormalized(colorBlend, LED_DIFFUSER_COLOR_BLEND);

  const tintedColor = baseColor.clone().lerp(emissiveColor, blend);

  const material = new MeshStandardMaterial({
    color: tintedColor,
    roughness: 0.8,
    metalness: 0.08,
    transparent: true,
    opacity: safeOpacity,
  });
  material.depthWrite = false;
  material.toneMapped = false;
  material.blending = AdditiveBlending;
  material.emissive.copy(emissiveColor);
  material.emissiveIntensity = safeIntensity * safeScale;
  material.name = 'LedDiffuserMaterial';
  return material;
}

export interface LedDiffuserGeometryOptions {
  stripWidth: number;
  stripDepth: number;
  overhang?: number;
  thickness?: number;
}

export function createLedDiffuserGeometry({
  stripWidth,
  stripDepth,
  overhang = LED_DIFFUSER_OVERHANG,
  thickness = LED_DIFFUSER_THICKNESS,
}: LedDiffuserGeometryOptions): BoxGeometry {
  const safeOverhang = sanitizePositiveOrFallback(
    overhang,
    LED_DIFFUSER_OVERHANG
  );
  const safeThickness = Math.max(
    sanitizePositiveOrFallback(thickness, LED_DIFFUSER_THICKNESS),
    MIN_DIMENSION
  );
  const safeWidth = Math.max(sanitizeNonNegative(stripWidth, 0), 0);
  const safeDepth = Math.max(sanitizeNonNegative(stripDepth, 0), 0);

  const totalWidth = Math.max(safeWidth + safeOverhang * 2, MIN_DIMENSION);
  const totalDepth = Math.max(safeDepth + safeOverhang * 2, MIN_DIMENSION);

  return new BoxGeometry(totalWidth, safeThickness, totalDepth);
}

export function computeDiffuserVerticalOffset(
  stripThickness: number,
  clearance = LED_DIFFUSER_CLEARANCE
): number {
  const safeThickness = sanitizeNonNegative(stripThickness, 0);
  const safeClearance = sanitizePositiveOrFallback(
    clearance,
    LED_DIFFUSER_CLEARANCE
  );
  return safeThickness / 2 + safeClearance;
}
