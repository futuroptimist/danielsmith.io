import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
} from 'three';

export type EnvironmentLightEase = 'linear' | 'sine-in-out';

export interface EnvironmentLightKeyframe {
  /** Normalized timestamp within the animation cycle (0–1). */
  time: number;
  /** Multiplier applied to the ambient light intensity. Defaults to 1. */
  ambientIntensity?: number;
  /** Multiplier applied to the hemisphere light intensity. Defaults to 1. */
  hemisphericIntensity?: number;
  /** Multiplier applied to the directional light intensity. Defaults to 1. */
  directionalIntensity?: number;
  /** Seasonal tint blend for the ambient light. Defaults to 0. */
  ambientTintStrength?: number;
  /** Seasonal tint blend for hemisphere lights. Defaults to 0. */
  hemisphericTintStrength?: number;
  /** Seasonal tint blend for the directional light. Defaults to 0. */
  directionalTintStrength?: number;
  /** Easing function applied when interpolating to the next keyframe. */
  ease?: EnvironmentLightEase;
}

export interface EnvironmentLightAnimatorOptions {
  ambient: AmbientLight;
  hemisphere: HemisphereLight;
  directional: DirectionalLight;
  /** Duration of the animation cycle in seconds. */
  cycleSeconds?: number;
  /** Optional keyframes overriding the default dusk breathing profile. */
  keyframes?: readonly EnvironmentLightKeyframe[];
  /** Optional tint applied when keyframes request color blending. */
  tintColor?: Color | null;
  /** Multiplier applied to keyframe tint strengths. Defaults to 1. */
  tintStrengthScale?: number;
}

export interface EnvironmentLightAnimator {
  update(elapsedSeconds: number): void;
  captureBaseline(): void;
  /**
   * Restores the captured baseline hues on the scene lights. Useful when pausing the
   * animator (for example, while the lighting debug mode is active).
   */
  applyBaselineColors(): void;
}

interface PreparedKeyframe {
  time: number;
  ambientIntensity: number;
  hemisphericIntensity: number;
  directionalIntensity: number;
  ambientTintStrength: number;
  hemisphericTintStrength: number;
  directionalTintStrength: number;
  ease?: EnvironmentLightEase;
}

interface EnvironmentLightSample {
  ambientIntensity: number;
  hemisphericIntensity: number;
  directionalIntensity: number;
  ambientTintStrength: number;
  hemisphericTintStrength: number;
  directionalTintStrength: number;
}

const DEFAULT_TINT_COLOR = new Color('#ffe4c9');
const DEFAULT_CYCLE_SECONDS = 48;
const EPSILON = 1e-6;

const DEFAULT_KEYFRAMES: readonly EnvironmentLightKeyframe[] = [
  {
    time: 0,
    ambientIntensity: 1,
    hemisphericIntensity: 1,
    directionalIntensity: 1,
    ambientTintStrength: 0.28,
    hemisphericTintStrength: 0.34,
    directionalTintStrength: 0.26,
  },
  {
    time: 0.28,
    ambientIntensity: 0.92,
    hemisphericIntensity: 1.08,
    directionalIntensity: 1.14,
    ambientTintStrength: 0.36,
    hemisphericTintStrength: 0.42,
    directionalTintStrength: 0.38,
    ease: 'sine-in-out',
  },
  {
    time: 0.55,
    ambientIntensity: 1.06,
    hemisphericIntensity: 0.94,
    directionalIntensity: 0.9,
    ambientTintStrength: 0.24,
    hemisphericTintStrength: 0.3,
    directionalTintStrength: 0.32,
    ease: 'sine-in-out',
  },
  {
    time: 0.82,
    ambientIntensity: 0.98,
    hemisphericIntensity: 1.04,
    directionalIntensity: 1.18,
    ambientTintStrength: 0.4,
    hemisphericTintStrength: 0.48,
    directionalTintStrength: 0.45,
    ease: 'sine-in-out',
  },
  {
    time: 1,
    ambientIntensity: 1,
    hemisphericIntensity: 1,
    directionalIntensity: 1,
    ambientTintStrength: 0.28,
    hemisphericTintStrength: 0.34,
    directionalTintStrength: 0.26,
  },
];

const DEFAULT_SAMPLE: EnvironmentLightSample = Object.freeze({
  ambientIntensity: 1,
  hemisphericIntensity: 1,
  directionalIntensity: 1,
  ambientTintStrength: 0,
  hemisphericTintStrength: 0,
  directionalTintStrength: 0,
});

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

const clampNonNegative = (value: number | undefined, fallback = 1): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return clampNonNegative(fallback);
  }
  if (value <= 0) {
    return 0;
  }
  return value;
};

const applyEase = (
  alpha: number,
  ease: EnvironmentLightEase | undefined
): number => {
  switch (ease) {
    case 'sine-in-out':
      return 0.5 - Math.cos(Math.PI * alpha) / 2;
    default:
      return alpha;
  }
};

const normalizeKeyframe = (
  frame: EnvironmentLightKeyframe
): PreparedKeyframe => ({
  time: clamp01(frame.time),
  ambientIntensity: clampNonNegative(frame.ambientIntensity, 1),
  hemisphericIntensity: clampNonNegative(frame.hemisphericIntensity, 1),
  directionalIntensity: clampNonNegative(frame.directionalIntensity, 1),
  ambientTintStrength: clamp01(frame.ambientTintStrength, 0),
  hemisphericTintStrength: clamp01(frame.hemisphericTintStrength, 0),
  directionalTintStrength: clamp01(frame.directionalTintStrength, 0),
  ease: frame.ease,
});

const normalizeKeyframes = (
  frames: readonly EnvironmentLightKeyframe[]
): PreparedKeyframe[] => {
  if (!frames.length) {
    return [];
  }
  const prepared = frames.map(normalizeKeyframe);
  prepared.sort((a, b) => a.time - b.time);
  return prepared;
};

const mix = (a: number, b: number, alpha: number): number =>
  a + (b - a) * alpha;

const interpolate = (
  previous: PreparedKeyframe,
  next: PreparedKeyframe,
  alpha: number
): EnvironmentLightSample => ({
  ambientIntensity: mix(
    previous.ambientIntensity,
    next.ambientIntensity,
    alpha
  ),
  hemisphericIntensity: mix(
    previous.hemisphericIntensity,
    next.hemisphericIntensity,
    alpha
  ),
  directionalIntensity: mix(
    previous.directionalIntensity,
    next.directionalIntensity,
    alpha
  ),
  ambientTintStrength: mix(
    previous.ambientTintStrength,
    next.ambientTintStrength,
    alpha
  ),
  hemisphericTintStrength: mix(
    previous.hemisphericTintStrength,
    next.hemisphericTintStrength,
    alpha
  ),
  directionalTintStrength: mix(
    previous.directionalTintStrength,
    next.directionalTintStrength,
    alpha
  ),
});

const sampleFromFrame = (frame: PreparedKeyframe): EnvironmentLightSample => ({
  ambientIntensity: frame.ambientIntensity,
  hemisphericIntensity: frame.hemisphericIntensity,
  directionalIntensity: frame.directionalIntensity,
  ambientTintStrength: frame.ambientTintStrength,
  hemisphericTintStrength: frame.hemisphericTintStrength,
  directionalTintStrength: frame.directionalTintStrength,
});

const createSampler = (
  frames: PreparedKeyframe[],
  cycleSeconds: number
): ((elapsedSeconds: number) => EnvironmentLightSample) => {
  if (!frames.length) {
    return () => DEFAULT_SAMPLE;
  }
  if (frames.length === 1) {
    const only = sampleFromFrame(frames[0]);
    return () => only;
  }

  const cycle = cycleSeconds > EPSILON ? cycleSeconds : DEFAULT_CYCLE_SECONDS;

  return (elapsedSeconds: number): EnvironmentLightSample => {
    if (!Number.isFinite(elapsedSeconds)) {
      return DEFAULT_SAMPLE;
    }
    const normalized = (((elapsedSeconds / cycle) % 1) + 1) % 1;
    let previous = frames[frames.length - 1];
    let previousTime = previous.time - 1;

    for (const current of frames) {
      if (normalized <= current.time + EPSILON) {
        const span = current.time - previousTime;
        if (span <= EPSILON) {
          return sampleFromFrame(current);
        }
        const rawAlpha = (normalized - previousTime) / span;
        const easedAlpha = applyEase(
          MathUtils.clamp(rawAlpha, 0, 1),
          previous.ease
        );
        return interpolate(previous, current, easedAlpha);
      }
      previous = current;
      previousTime = current.time;
    }

    const first = frames[0];
    const last = frames[frames.length - 1];
    const span = first.time + 1 - last.time;
    if (span <= EPSILON) {
      return sampleFromFrame(first);
    }
    const rawAlpha = (normalized - last.time) / span;
    const easedAlpha = applyEase(MathUtils.clamp(rawAlpha, 0, 1), last.ease);
    return interpolate(last, first, easedAlpha);
  };
};

const applyTint = (
  target: Color,
  base: Color,
  tint: Color | null,
  strength: number,
  strengthScale: number
): void => {
  target.copy(base);
  if (!tint || strengthScale <= 0) {
    return;
  }
  const scaled = MathUtils.clamp(strength * strengthScale, 0, 1);
  if (scaled <= 0) {
    return;
  }
  target.lerp(tint, scaled);
};

export function createEnvironmentLightAnimator({
  ambient,
  hemisphere,
  directional,
  cycleSeconds,
  keyframes = DEFAULT_KEYFRAMES,
  tintColor,
  tintStrengthScale = 1,
}: EnvironmentLightAnimatorOptions): EnvironmentLightAnimator {
  const preparedFrames = normalizeKeyframes(keyframes);
  const sample = createSampler(
    preparedFrames,
    cycleSeconds ?? DEFAULT_CYCLE_SECONDS
  );
  const tint =
    tintColor === null
      ? null
      : tintColor
        ? tintColor.clone()
        : DEFAULT_TINT_COLOR.clone();
  const tintScale = Math.max(
    Number.isFinite(tintStrengthScale) ? tintStrengthScale : 1,
    0
  );

  let baseAmbientIntensity = ambient.intensity;
  let baseHemisphereIntensity = hemisphere.intensity;
  let baseDirectionalIntensity = directional.intensity;
  const baseAmbientColor = ambient.color.clone();
  const baseHemisphereSkyColor = hemisphere.color.clone();
  const baseHemisphereGroundColor = hemisphere.groundColor.clone();
  const baseDirectionalColor = directional.color.clone();

  const captureBaseline = () => {
    baseAmbientIntensity = ambient.intensity;
    baseHemisphereIntensity = hemisphere.intensity;
    baseDirectionalIntensity = directional.intensity;
    baseAmbientColor.copy(ambient.color);
    baseHemisphereSkyColor.copy(hemisphere.color);
    baseHemisphereGroundColor.copy(hemisphere.groundColor);
    baseDirectionalColor.copy(directional.color);
  };

  captureBaseline();

  const applyBaselineColors = () => {
    // Re-apply the stored baseline colors so pausing the animator leaves the lights neutral.
    ambient.color.copy(baseAmbientColor);
    hemisphere.color.copy(baseHemisphereSkyColor);
    hemisphere.groundColor.copy(baseHemisphereGroundColor);
    directional.color.copy(baseDirectionalColor);
  };

  return {
    update(elapsedSeconds: number) {
      const sampleValues = sample(elapsedSeconds);
      ambient.intensity = Math.max(
        0,
        baseAmbientIntensity * sampleValues.ambientIntensity
      );
      hemisphere.intensity = Math.max(
        0,
        baseHemisphereIntensity * sampleValues.hemisphericIntensity
      );
      directional.intensity = Math.max(
        0,
        baseDirectionalIntensity * sampleValues.directionalIntensity
      );

      applyTint(
        ambient.color,
        baseAmbientColor,
        tint,
        sampleValues.ambientTintStrength,
        tintScale
      );
      applyTint(
        hemisphere.color,
        baseHemisphereSkyColor,
        tint,
        sampleValues.hemisphericTintStrength,
        tintScale
      );
      applyTint(
        hemisphere.groundColor,
        baseHemisphereGroundColor,
        tint,
        sampleValues.hemisphericTintStrength,
        tintScale * 0.85
      );
      applyTint(
        directional.color,
        baseDirectionalColor,
        tint,
        sampleValues.directionalTintStrength,
        tintScale
      );
    },
    captureBaseline,
    applyBaselineColors,
  };
}
