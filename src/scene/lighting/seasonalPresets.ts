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

export interface SeasonalLightingSchedule {
  /** Preset currently active for the provided date (if any). */
  active: SeasonalLightingPreset | null;
  /** The next preset that will activate after the provided date (if any). */
  next: SeasonalLightingPreset | null;
  /** UTC timestamp corresponding to the next preset's start date (midnight). */
  nextStartDate: Date | null;
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

const clampMonth = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }
  const month = Math.trunc(value);
  if (month < 1) {
    return 1;
  }
  if (month > 12) {
    return 12;
  }
  return month;
};

const clampDayForMonth = (
  month: number,
  day: number | undefined,
  year: number
): number => {
  if (!Number.isFinite(day)) {
    return 1;
  }
  const normalizedDay = Math.max(Math.trunc(day ?? 1), 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(normalizedDay, daysInMonth);
};

const toUtcDate = (referenceYear: number, date: MonthDay): Date => {
  const month = clampMonth(date.month);
  const day = clampDayForMonth(month, date.day, referenceYear);
  return new Date(Date.UTC(referenceYear, month - 1, day));
};

const formatIsoDate = (date: Date | null): string | null => {
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
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
        backyard: {
          tintHex: '#8fd9ff',
          tintStrength: 0.6,
          emissiveIntensityScale: 1.2,
          fillIntensityScale: 1.2,
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
        backyard: {
          tintHex: '#ffe6bb',
          tintStrength: 0.55,
          emissiveIntensityScale: 1.1,
          fillIntensityScale: 1.1,
        },
      },
    },
    {
      id: 'summer-aurora',
      label: 'Summer Aurora',
      start: { month: 6, day: 15 },
      end: { month: 8, day: 31 },
      tintHex: '#ffdcb2',
      tintStrength: 0.42,
      emissiveIntensityScale: 1.08,
      fillIntensityScale: 1.12,
      cycleScale: 1.18,
      roomOverrides: {
        backyard: {
          tintHex: '#ffe8c6',
          tintStrength: 0.5,
          emissiveIntensityScale: 1.16,
          fillIntensityScale: 1.18,
          cycleScale: 1.24,
        },
        greenhouse: {
          tintHex: '#fff3d4',
          tintStrength: 0.52,
        },
      },
    },
    {
      id: 'autumn-harvest',
      label: 'Autumn Harvest',
      start: { month: 9, day: 15 },
      end: { month: 11, day: 10 },
      tintHex: '#ffcf9e',
      tintStrength: 0.48,
      emissiveIntensityScale: 1.12,
      fillIntensityScale: 1.15,
      cycleScale: 0.92,
      roomOverrides: {
        kitchen: {
          tintHex: '#ffd9b3',
          tintStrength: 0.55,
          emissiveIntensityScale: 1.18,
        },
        backyard: {
          tintHex: '#ffbfa1',
          tintStrength: 0.58,
          emissiveIntensityScale: 1.2,
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

export function resolveSeasonalLightingSchedule({
  date = new Date(),
  presets = DEFAULT_SEASONAL_LIGHTING_PRESETS,
}: SeasonalLightingContext = {}): SeasonalLightingSchedule {
  const active = resolveSeasonalLightingPreset({ date, presets });
  if (!presets.length) {
    return { active: null, next: null, nextStartDate: null };
  }

  const referenceYear = date.getUTCFullYear();
  const referenceTime = Date.UTC(
    referenceYear,
    date.getUTCMonth(),
    date.getUTCDate()
  );

  let next: SeasonalLightingPreset | null = null;
  let nextStartTime: number | null = null;

  for (const preset of presets) {
    const startThisYear = toUtcDate(referenceYear, preset.start).getTime();
    let delta = startThisYear - referenceTime;
    let startTime = startThisYear;
    if (delta <= 0) {
      const startNextYear = toUtcDate(
        referenceYear + 1,
        preset.start
      ).getTime();
      delta = startNextYear - referenceTime;
      startTime = startNextYear;
    }
    if (nextStartTime === null || delta < nextStartTime - referenceTime) {
      next = preset;
      nextStartTime = startTime;
    }
  }

  return {
    active,
    next,
    nextStartDate: nextStartTime === null ? null : new Date(nextStartTime),
  };
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
  nextPreset?: SeasonalLightingPreset | null;
  nextPresetAttribute?: string | null;
  nextPresetStart?: Date | null;
  nextPresetStartAttribute?: string | null;
}

export function applySeasonalLightingPreset({
  preset,
  targets,
  documentElement,
  dataAttribute = 'lightingSeason',
  nextPreset = null,
  nextPresetAttribute = 'nextLightingSeason',
  nextPresetStart = null,
  nextPresetStartAttribute = 'nextLightingSeasonStarts',
}: ApplySeasonalLightingOptions): void {
  if (documentElement) {
    if (preset) {
      documentElement.dataset[dataAttribute] = preset.id;
    } else {
      delete documentElement.dataset[dataAttribute];
    }
    if (nextPresetAttribute !== null) {
      if (nextPreset) {
        documentElement.dataset[nextPresetAttribute] = nextPreset.id;
      } else {
        delete documentElement.dataset[nextPresetAttribute];
      }
    }
    if (nextPresetStartAttribute !== null) {
      const formattedStart = formatIsoDate(nextPresetStart);
      if (nextPreset && formattedStart) {
        documentElement.dataset[nextPresetStartAttribute] = formattedStart;
      } else if (nextPresetStartAttribute) {
        delete documentElement.dataset[nextPresetStartAttribute];
      }
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
