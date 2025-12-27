import { MathUtils } from 'three';

import {
  getFlickerScale,
  getPulseScale,
} from '../../ui/accessibility/animationPreferences';

export interface LanternWaveStateOptions {
  elapsed: number;
  progression: number;
  offset?: number;
  pulseScale?: number;
  flickerScale?: number;
  direction?: 'forward' | 'reverse';
}

export interface LanternWaveState {
  beaconStrength: number;
  waveContribution: number;
  flickerBlend: number;
  waveProgress: number;
}

const sanitizeTime = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value;
};

const sanitizeProgression = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return MathUtils.euclideanModulo(value, 1);
};

const sanitizeOffset = (value: number | undefined): number => {
  if (!Number.isFinite(value ?? 0)) {
    return 0;
  }
  return value ?? 0;
};

const clampUnit = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value ?? fallback)) {
    return fallback;
  }
  return MathUtils.clamp(value ?? fallback, 0, 1);
};

export function computeLanternWaveState({
  elapsed,
  progression,
  offset,
  pulseScale,
  flickerScale,
  direction = 'forward',
}: LanternWaveStateOptions): LanternWaveState {
  const safeTime = sanitizeTime(elapsed);
  const normalizedProgression = sanitizeProgression(progression);
  const normalizedOffset = sanitizeOffset(offset);
  const clampedPulseScale = clampUnit(pulseScale, getPulseScale());
  const clampedFlickerScale = clampUnit(flickerScale, getFlickerScale());

  const steadyBase = MathUtils.lerp(0.6, 1, clampedFlickerScale);
  const waveSpeed = MathUtils.lerp(0.12, 0.22, clampedPulseScale);
  const waveSharpness = MathUtils.lerp(
    2.6,
    4.4,
    Math.max(clampedPulseScale, 0.2)
  );
  const travelDirection = direction === 'reverse' ? -1 : 1;
  const waveProgress = MathUtils.euclideanModulo(safeTime * waveSpeed, 1);
  const anchorProgression =
    travelDirection > 0 ? normalizedProgression : 1 - normalizedProgression;
  let distance = Math.abs(anchorProgression - waveProgress);
  if (distance > 0.5) {
    distance = 1 - distance;
  }
  const beaconStrength = Math.max(0, 1 - distance * waveSharpness);

  const baseWave = Math.sin(safeTime * 0.9) * 0.12;
  const flicker =
    0.84 +
    baseWave +
    Math.sin(safeTime * 1.7 + normalizedOffset) * 0.16 +
    Math.sin(safeTime * 2.4 + normalizedOffset * 0.8) * 0.08;
  const flickerBlend = MathUtils.lerp(
    steadyBase,
    Math.max(0.4, flicker),
    clampedFlickerScale
  );

  return {
    beaconStrength,
    waveContribution: beaconStrength * clampedPulseScale,
    flickerBlend,
    waveProgress,
  };
}
