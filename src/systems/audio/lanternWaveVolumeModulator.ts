import { MathUtils } from 'three';

import {
  getFlickerScale,
  getPulseScale,
} from '../../ui/accessibility/animationPreferences';
import { computeLanternWaveState } from '../lighting/lanternWave';

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
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const flickerScale = MathUtils.clamp(getFlickerScale(), 0, 1);
    let flickerAccumulator = 0;
    let beaconAccumulator = 0;

    sanitizedSamples.forEach(({ progression, offset }) => {
      const waveState = computeLanternWaveState({
        elapsed,
        progression,
        offset,
        pulseScale,
        flickerScale,
      });
      flickerAccumulator += waveState.flickerBlend;
      beaconAccumulator += waveState.beaconStrength;
    });

    const sampleCount = sanitizedSamples.length;
    const averageBeacon = beaconAccumulator / sampleCount;
    const averageFlicker = flickerAccumulator / sampleCount;

    const intensityBoost =
      1 +
      averageBeacon *
        MathUtils.lerp(0.18, 0.6, Math.max(pulseScale, flickerScale));
    const scale = MathUtils.clamp(
      averageFlicker * intensityBoost,
      clampedMinimum,
      clampedMaximum
    );

    return scale;
  };
}
