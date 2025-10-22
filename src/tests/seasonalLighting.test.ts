import { Color, MeshStandardMaterial, PointLight } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LedPulseProgram } from '../scene/lighting/ledPulsePrograms';
import {
  applySeasonalLightingPreset,
  createSeasonallyAdjustedPrograms,
  DEFAULT_SEASONAL_LIGHTING_PRESETS,
  resolveSeasonalLightingPreset,
  resolveSeasonalLightingSchedule,
  type SeasonalLightingPreset,
} from '../scene/lighting/seasonalPresets';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveSeasonalLightingPreset', () => {
  it('returns the matching preset for the provided date', () => {
    const presets: SeasonalLightingPreset[] = [
      {
        id: 'spring-window',
        label: 'Spring Window',
        start: { month: 3, day: 1 },
        end: { month: 5, day: 15 },
      },
      {
        id: 'winter-wrap',
        label: 'Winter Wrap',
        start: { month: 12, day: 1 },
        end: { month: 1, day: 10 },
      },
    ];

    const spring = resolveSeasonalLightingPreset({
      date: new Date(Date.UTC(2024, 3, 10)),
      presets,
    });
    expect(spring?.id).toBe('spring-window');

    const winter = resolveSeasonalLightingPreset({
      date: new Date(Date.UTC(2024, 11, 25)),
      presets,
    });
    expect(winter?.id).toBe('winter-wrap');

    const january = resolveSeasonalLightingPreset({
      date: new Date(Date.UTC(2025, 0, 5)),
      presets,
    });
    expect(january?.id).toBe('winter-wrap');
  });

  it('returns null when no preset applies', () => {
    expect(
      resolveSeasonalLightingPreset({
        date: new Date(Date.UTC(2024, 6, 4)),
        presets: [],
      })
    ).toBeNull();
  });
});

describe('resolveSeasonalLightingSchedule', () => {
  it('returns active and next presets for the default calendar', () => {
    const schedule = resolveSeasonalLightingSchedule({
      date: new Date(Date.UTC(2024, 6, 10)),
    });
    expect(schedule.active?.id).toBe('summer-aurora');
    expect(schedule.next?.id).toBe('autumn-harvest');
    expect(schedule.nextStartDate?.toISOString().slice(0, 10)).toBe(
      '2024-09-15'
    );
  });

  it('wraps to the following year when the active preset spans new year', () => {
    const schedule = resolveSeasonalLightingSchedule({
      date: new Date(Date.UTC(2024, 11, 20)),
    });
    expect(schedule.active?.id).toBe('winter-holidays');
    expect(schedule.next?.id).toBe('spring-bloom');
    expect(schedule.nextStartDate?.toISOString().slice(0, 10)).toBe(
      '2025-03-15'
    );
  });

  it('falls back to null values when no presets are configured', () => {
    const schedule = resolveSeasonalLightingSchedule({
      date: new Date(Date.UTC(2024, 4, 1)),
      presets: [],
    });
    expect(schedule.active).toBeNull();
    expect(schedule.next).toBeNull();
    expect(schedule.nextStartDate).toBeNull();
  });

  it('normalizes month and day boundaries before resolving the schedule', () => {
    const schedule = resolveSeasonalLightingSchedule({
      date: new Date(Date.UTC(2024, 0, 2)),
      presets: [
        {
          id: 'normalized',
          label: 'Normalized Window',
          start: { month: 0, day: Number.NaN },
          end: { month: 16, day: 45 },
        },
      ],
    });

    expect(schedule.active?.id).toBe('normalized');
    expect(schedule.next?.id).toBe('normalized');
    expect(schedule.nextStartDate?.toISOString().slice(0, 10)).toBe(
      '2025-01-01'
    );
  });
});

describe('createSeasonallyAdjustedPrograms', () => {
  const basePrograms: LedPulseProgram[] = [
    {
      roomId: 'livingRoom',
      cycleSeconds: 20,
      keyframes: [
        { time: 0, stripMultiplier: 1 },
        { time: 1, stripMultiplier: 1 },
      ],
    },
    {
      roomId: 'studio',
      cycleSeconds: 18,
      keyframes: [
        { time: 0, stripMultiplier: 1 },
        { time: 1, stripMultiplier: 1 },
      ],
    },
  ];

  it('returns clones when no preset is active', () => {
    const adjusted = createSeasonallyAdjustedPrograms(basePrograms, null);
    expect(adjusted).toHaveLength(basePrograms.length);
    adjusted.forEach((program, index) => {
      expect(program).not.toBe(basePrograms[index]);
      expect(program.keyframes[0]).not.toBe(basePrograms[index].keyframes[0]);
      expect(program.cycleSeconds).toBe(basePrograms[index].cycleSeconds);
    });
  });

  it('scales cycles using global and per-room overrides', () => {
    const preset: SeasonalLightingPreset = {
      id: 'winter-holidays',
      label: 'Winter Holidays',
      start: { month: 12, day: 1 },
      end: { month: 1, day: 7 },
      cycleScale: 0.8,
      roomOverrides: {
        studio: { cycleScale: 1.25 },
      },
    };
    const adjusted = createSeasonallyAdjustedPrograms(basePrograms, preset);
    expect(adjusted[0].cycleSeconds).toBeCloseTo(16, 5);
    expect(adjusted[1].cycleSeconds).toBeCloseTo(22.5, 5);
  });
});

describe('applySeasonalLightingPreset', () => {
  it('tints emissive materials and fill lights while recording the active season', () => {
    const documentElement = document.createElement('div');
    const material = new MeshStandardMaterial({
      emissive: new Color('#123456'),
      emissiveIntensity: 1.1,
    });
    const mainLight = new PointLight('#123456', 2.4);
    const cornerLight = new PointLight('#123456', 0.8);
    const preset: SeasonalLightingPreset = {
      id: 'festive',
      label: 'Festive Glow',
      start: { month: 12, day: 1 },
      end: { month: 1, day: 7 },
      tintHex: '#ff99ff',
      tintStrength: 0.5,
      emissiveIntensityScale: 1.2,
      fillIntensityScale: 1.3,
      roomOverrides: {
        livingRoom: {
          tintStrength: 0.75,
          emissiveIntensityScale: -4,
          fillIntensityScale: -3,
        },
      },
    };

    applySeasonalLightingPreset({
      preset,
      documentElement,
      targets: [
        {
          roomId: 'livingRoom',
          material,
          baseEmissiveColor: new Color('#123456'),
          baseEmissiveIntensity: 1.1,
          fillLights: [
            { light: mainLight, baseIntensity: 2.4 },
            { light: cornerLight, baseIntensity: 0.8 },
          ],
        },
      ],
    });

    expect(documentElement.dataset.lightingSeason).toBe('festive');
    const expectedTint = new Color('#123456').lerp(new Color('#ff99ff'), 0.75);
    expect(material.emissive.getHexString()).toBe(expectedTint.getHexString());
    expect(material.emissiveIntensity).toBeCloseTo(0, 5);
    expect(mainLight.intensity).toBeCloseTo(0, 5);
    expect(cornerLight.intensity).toBeCloseTo(0, 5);
    expect(mainLight.color.getHexString()).toBe(expectedTint.getHexString());
  });

  it('restores the default dataset and leaves lights untouched when no preset is active', () => {
    const documentElement = document.createElement('div');
    documentElement.dataset.lightingSeason = 'previous';
    const material = new MeshStandardMaterial({
      emissive: new Color('#abcdef'),
      emissiveIntensity: 1.5,
    });
    const light = new PointLight('#abcdef', 1.2);

    material.emissive.set('#654321');
    material.emissiveIntensity = 0.4;
    light.color.set('#654321');
    light.intensity = 0.5;

    applySeasonalLightingPreset({
      preset: null,
      documentElement,
      targets: [
        {
          roomId: 'studio',
          material,
          baseEmissiveColor: new Color('#abcdef'),
          baseEmissiveIntensity: 1.5,
          fillLights: [{ light, baseIntensity: 1.2 }],
        },
      ],
    });

    expect(documentElement.dataset.lightingSeason).toBeUndefined();
    expect(material.emissive.getHexString()).toBe(
      new Color('#abcdef').getHexString()
    );
    expect(material.emissiveIntensity).toBeCloseTo(1.5, 5);
    expect(light.intensity).toBeCloseTo(1.2, 5);
    expect(light.color.getHexString()).toBe(
      new Color('#abcdef').getHexString()
    );
  });

  it('records upcoming preset metadata on the document element when provided', () => {
    const documentElement = document.createElement('div');
    applySeasonalLightingPreset({
      preset: DEFAULT_SEASONAL_LIGHTING_PRESETS[0],
      nextPreset: DEFAULT_SEASONAL_LIGHTING_PRESETS[1],
      nextPresetStart: new Date(Date.UTC(2024, 2, 15)),
      documentElement,
      targets: [],
    });

    expect(documentElement.dataset.nextLightingSeason).toBe('spring-bloom');
    expect(documentElement.dataset.nextLightingSeasonStarts).toBe('2024-03-15');
  });

  it('omits the next start dataset when the provided date is invalid', () => {
    const documentElement = document.createElement('div');
    applySeasonalLightingPreset({
      preset: DEFAULT_SEASONAL_LIGHTING_PRESETS[0],
      nextPreset: DEFAULT_SEASONAL_LIGHTING_PRESETS[1],
      nextPresetStart: new Date(Number.NaN),
      documentElement,
      targets: [],
    });

    expect(documentElement.dataset.nextLightingSeason).toBe('spring-bloom');
    expect(documentElement.dataset.nextLightingSeasonStarts).toBeUndefined();
  });

  it('clears upcoming preset metadata when no next preset is supplied', () => {
    const documentElement = document.createElement('div');
    documentElement.dataset.nextLightingSeason = 'previous';
    documentElement.dataset.nextLightingSeasonStarts = '2024-01-01';

    applySeasonalLightingPreset({
      preset: null,
      nextPreset: null,
      nextPresetStart: null,
      documentElement,
      targets: [],
    });

    expect(documentElement.dataset.nextLightingSeason).toBeUndefined();
    expect(documentElement.dataset.nextLightingSeasonStarts).toBeUndefined();
  });

  it('falls back to the base emissive color when tint parsing throws', () => {
    const baseColor = new Color('#334455');
    const material = new MeshStandardMaterial({
      emissive: baseColor.clone(),
      emissiveIntensity: 1.3,
    });
    const light = new PointLight(baseColor.clone(), 1.1);
    const documentElement = document.createElement('div');
    const originalSet = Color.prototype.set;
    const setSpy = vi
      .spyOn(Color.prototype, 'set')
      .mockImplementation(function (
        this: Color,
        value: unknown,
        g?: number,
        b?: number
      ) {
        if (typeof value === 'string') {
          throw new Error('bad color');
        }
        return originalSet.call(
          this,
          value as number | Color,
          g as number,
          b as number
        );
      });

    applySeasonalLightingPreset({
      preset: {
        id: 'glitchy',
        label: 'Glitchy Season',
        start: { month: 8, day: 1 },
        end: { month: 8, day: 31 },
        tintHex: '#00ffaa',
        tintStrength: 0.6,
      },
      documentElement,
      targets: [
        {
          roomId: 'studio',
          material,
          baseEmissiveColor: baseColor.clone(),
          baseEmissiveIntensity: 1.3,
          fillLights: [{ light, baseIntensity: 1.1 }],
        },
      ],
    });

    expect(setSpy).toHaveBeenCalled();
    expect(material.emissive.getHexString()).toBe(baseColor.getHexString());
    expect(light.color.getHexString()).toBe(baseColor.getHexString());
  });
});
