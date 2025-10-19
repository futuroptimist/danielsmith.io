import { Color, MeshStandardMaterial, PointLight } from 'three';

import type { LedPulseProgram } from './ledPulsePrograms';

export interface MonthDay {
  /** Month value using 1-indexed calendar semantics (January = 1). */
  month: number;
  /** Day of month value using 1-indexed semantics. */
  day: number;
}

export interface SeasonalLightingRoomOverride {
  tintHex?: string;
  tintStrength?: number;
  emissiveIntensityScale?: number;
  fillIntensityScale?: number;
  cycleScale?: number;
}

export interface SeasonalLightingPreset {
  id: string;
  label: string;
  start: MonthDay;
  end: MonthDay;
  tintHex?: string;
  tintStrength?: number;
  emissiveIntensityScale?: number;
  fillIntensityScale?: number;
  cycleScale?: number;
  roomOverrides?: Readonly<Record<string, SeasonalLightingRoomOverride>>;
}

export interface SeasonalLightingFillLightTarget {
  light: PointLight;
  baseIntensity: number;
}

export interface SeasonalLightingTarget {
  roomId: string;
  material: MeshStandardMaterial;
  baseEmissiveColor: Color;
  baseEmissiveIntensity: number;
  fillLights: readonly SeasonalLightingFillLightTarget[];
}

export interface SeasonalLightingContext {
  date?: Date;
  presets?: readonly SeasonalLightingPreset[];
}

const clamp01 = (value: number | undefined, fallback = 0): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return clamp01(fallback);
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

const clampScale = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }
  if (value <= 0) {
    return 0;
  }
  return value;
};

const toComparableDay = (date: MonthDay): number => {
  const month = Math.min(Math.max(Math.trunc(date.month), 1), 12);
  const day = Math.min(Math.max(Math.trunc(date.day), 1), 31);
  return month * 100 + day;
};

const isDateInRange = (
  candidate: MonthDay,
  start: MonthDay,
  end: MonthDay
): boolean => {
  const current = toComparableDay(candidate);
  const startValue = toComparableDay(start);
  const endValue = toComparableDay(end);
  if (startValue <= endValue) {
    return current >= startValue && current <= endValue;
  }
  return current >= startValue || current <= endValue;
};

const safeSetColor = (
  target: Color,
  value: string | undefined,
  fallback: Color
): boolean => {
  if (!value) {
    target.copy(fallback);
    return false;
  }
  try {
    target.set(value);
    return true;
  } catch {
    target.copy(fallback);
    return false;
  }
};

const lerpColors = (base: Color, tint: Color, strength: number): Color => {
  if (strength <= 0) {
    return base.clone();
  }
  if (strength >= 1) {
    return tint.clone();
  }
  return base.clone().lerp(tint, strength);
};

export const DEFAULT_SEASONAL_LIGHTING_PRESETS: readonly SeasonalLightingPreset[] =
  [
    {
      id: 'winter-holidays',
      label: 'Winter Holidays',
      start: { month: 12, day: 1 },
      end: { month: 1, day: 7 },
      tintHex: '#9bdcff',
      tintStrength: 0.6,
      emissiveIntensityScale: 1.15,
      fillIntensityScale: 1.2,
      cycleScale: 0.85,
      roomOverrides: {
        livingRoom: {
          tintHex: '#ffd1eb',
          tintStrength: 0.7,
        },
        studio: {
          tintHex: '#a4e4ff',
          tintStrength: 0.65,
        },
      },
    },
    {
      id: 'spring-bloom',
      label: 'Spring Bloom',
      start: { month: 3, day: 15 },
      end: { month: 4, day: 30 },
      tintHex: '#f0ffd2',
      tintStrength: 0.45,
      emissiveIntensityScale: 1.05,
      fillIntensityScale: 1.08,
      cycleScale: 1.1,
      roomOverrides: {
        kitchen: {
          tintHex: '#fff4d1',
          tintStrength: 0.5,
          cycleScale: 1.2,
        },
      },
    },
  ];

export function resolveSeasonalLightingPreset({
  date = new Date(),
  presets = DEFAULT_SEASONAL_LIGHTING_PRESETS,
}: SeasonalLightingContext = {}): SeasonalLightingPreset | null {
  const candidate: MonthDay = {
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
  for (const preset of presets) {
    if (isDateInRange(candidate, preset.start, preset.end)) {
      return preset;
    }
  }
  return null;
}

const cloneProgram = (program: LedPulseProgram): LedPulseProgram => ({
  roomId: program.roomId,
  cycleSeconds: program.cycleSeconds,
  keyframes: program.keyframes.map((keyframe) => ({ ...keyframe })),
});

export function createSeasonallyAdjustedPrograms(
  basePrograms: readonly LedPulseProgram[],
  preset: SeasonalLightingPreset | null
): readonly LedPulseProgram[] {
  if (!preset) {
    return basePrograms.map(cloneProgram);
  }
  return basePrograms.map((program) => {
    const override = preset.roomOverrides?.[program.roomId];
    const cycleScale = clampScale(override?.cycleScale ?? preset.cycleScale);
    const clone = cloneProgram(program);
    clone.cycleSeconds = Math.max(program.cycleSeconds * cycleScale, 0.0001);
    return clone;
  });
}

export interface ApplySeasonalLightingOptions {
  preset: SeasonalLightingPreset | null;
  targets: Iterable<SeasonalLightingTarget>;
  documentElement?: HTMLElement;
  dataAttribute?: string;
}

export function applySeasonalLightingPreset({
  preset,
  targets,
  documentElement,
  dataAttribute = 'lightingSeason',
}: ApplySeasonalLightingOptions): void {
  if (documentElement) {
    if (preset) {
      documentElement.dataset[dataAttribute] = preset.id;
    } else {
      delete documentElement.dataset[dataAttribute];
    }
  }
  if (!preset) {
    for (const target of targets) {
      target.material.emissive.copy(target.baseEmissiveColor);
      target.material.emissiveIntensity = target.baseEmissiveIntensity;
      for (const entry of target.fillLights) {
        entry.light.color.copy(target.baseEmissiveColor);
        entry.light.intensity = entry.baseIntensity;
      }
    }
    return;
  }
  const globalTint = new Color();
  const globalTintFallback = new Color(0xffffff);
  const hasGlobalTint = safeSetColor(
    globalTint,
    preset.tintHex,
    globalTintFallback
  );

  for (const target of targets) {
    const override = preset.roomOverrides?.[target.roomId];
    const tintStrength = clamp01(
      override?.tintStrength,
      preset.tintStrength ?? 0
    );
    const overrideTint = new Color();
    const fallbackTint = hasGlobalTint ? globalTint : target.baseEmissiveColor;
    const appliedTint = safeSetColor(
      overrideTint,
      override?.tintHex ?? preset.tintHex,
      fallbackTint
    );
    const tintTargetColor = appliedTint
      ? overrideTint
      : target.baseEmissiveColor;
    const tintedColor =
      appliedTint && tintStrength > 0
        ? lerpColors(target.baseEmissiveColor, tintTargetColor, tintStrength)
        : target.baseEmissiveColor.clone();
    target.material.emissive.copy(tintedColor);
    const emissiveScale = clampScale(
      override?.emissiveIntensityScale ?? preset.emissiveIntensityScale
    );
    target.material.emissiveIntensity =
      target.baseEmissiveIntensity * emissiveScale;

    const fillScale = clampScale(
      override?.fillIntensityScale ?? preset.fillIntensityScale
    );
    for (const entry of target.fillLights) {
      entry.light.color.copy(tintedColor);
      entry.light.intensity = entry.baseIntensity * fillScale;
    }
  }
}

export type SeasonalLightingPresetId =
  (typeof DEFAULT_SEASONAL_LIGHTING_PRESETS)[number]['id'];
