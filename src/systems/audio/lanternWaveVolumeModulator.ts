import { MathUtils } from 'three';

import {
  getFlickerScale,
  getPulseScale,
} from '../../ui/accessibility/animationPreferences';

import type { AmbientAudioVolumeModulator } from './ambientAudio';

export interface LanternWaveVolumeSample {
  progression: number;
  offset: number;
}

export interface LanternWaveVolumeModulatorOptions {
  samples?: ReadonlyArray<LanternWaveVolumeSample | null | undefined> | null;
  minimumScale?: number;
  maximumScale?: number;
}

const DEFAULT_SAMPLE: LanternWaveVolumeSample = {
  progression: 0.5,
  offset: 0,
};

const DEFAULT_MIN_SCALE = 0.45;
const DEFAULT_MAX_SCALE = 1.35;

const sanitizeProgression = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return MathUtils.euclideanModulo(value, 1);
};

const sanitizeOffset = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value;
};

export function createLanternWaveVolumeModulator({
  samples,
  minimumScale = DEFAULT_MIN_SCALE,
  maximumScale = DEFAULT_MAX_SCALE,
}: LanternWaveVolumeModulatorOptions = {}): AmbientAudioVolumeModulator {
  const sanitizedSamples = (samples ?? []).flatMap((sample) => {
    if (!sample) {
      return [];
    }
    return [
      {
        progression: sanitizeProgression(sample.progression),
        offset: sanitizeOffset(sample.offset),
      },
    ];
  });

  if (sanitizedSamples.length === 0) {
    sanitizedSamples.push({ ...DEFAULT_SAMPLE });
  }

  const clampedMinimum = Math.max(0, minimumScale);
  const clampedMaximum = Math.max(clampedMinimum, maximumScale);

  return ({ elapsed }) => {
    const time = Number.isFinite(elapsed) ? elapsed : 0;
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const flickerScale = MathUtils.clamp(getFlickerScale(), 0, 1);
    const waveSpeed = MathUtils.lerp(0.12, 0.22, pulseScale);
    const waveSharpness = MathUtils.lerp(2.6, 4.4, Math.max(pulseScale, 0.2));
    const steadyBase = MathUtils.lerp(0.6, 1, flickerScale);
    const waveProgress = MathUtils.euclideanModulo(time * waveSpeed, 1);
    const baseWave = Math.sin(time * 0.9) * 0.12;

    let flickerAccumulator = 0;
    let beaconAccumulator = 0;

    sanitizedSamples.forEach(({ progression, offset }) => {
      let distance = Math.abs(progression - waveProgress);
      if (distance > 0.5) {
        distance = 1 - distance;
      }
      const beaconStrength = Math.max(0, 1 - distance * waveSharpness);
      beaconAccumulator += beaconStrength;

      const flicker =
        0.84 +
        baseWave +
        Math.sin(time * 1.7 + offset) * 0.16 +
        Math.sin(time * 2.4 + offset * 0.8) * 0.08;
      flickerAccumulator += Math.max(0.4, flicker);
    });

    const sampleCount = sanitizedSamples.length;
    const averageBeacon = beaconAccumulator / sampleCount;
    const averageFlicker = flickerAccumulator / sampleCount;

    const intensityBoost =
      1 +
      averageBeacon *
        MathUtils.lerp(0.18, 0.6, Math.max(pulseScale, flickerScale));
    const flickerBlend = MathUtils.lerp(
      steadyBase,
      averageFlicker,
      flickerScale
    );
    const scale = MathUtils.clamp(
      flickerBlend * intensityBoost,
      clampedMinimum,
      clampedMaximum
    );

    return scale;
  };
}
