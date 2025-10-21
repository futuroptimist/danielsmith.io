import { MathUtils } from 'three';

const ACTIVATION_FADE_IN_START = 0.18;
const ACTIVATION_FADE_IN_END = 0.72;
const LABEL_VISITED_BASE_MAX = 0.48;
const HALO_VISITED_BASE_MAX = 0.3;
const HALO_FOCUS_OPACITY = 0.62;

export function computePoiEmphasis(activation: number, focus: number): number {
  const activationClamped = MathUtils.clamp(activation, 0, 1);
  const focusClamped = MathUtils.clamp(focus, 0, 1);
  const activationFade = MathUtils.smoothstep(
    activationClamped,
    ACTIVATION_FADE_IN_START,
    ACTIVATION_FADE_IN_END
  );
  return Math.max(activationFade, focusClamped);
}

export function computePoiLabelOpacity(
  emphasis: number,
  visitedStrength: number
): number {
  const emphasisClamped = MathUtils.clamp(emphasis, 0, 1);
  const visitedClamped = MathUtils.clamp(visitedStrength, 0, 1);
  const visitedBase = MathUtils.lerp(0, LABEL_VISITED_BASE_MAX, visitedClamped);
  return MathUtils.lerp(visitedBase, 1, emphasisClamped);
}

export function computePoiHaloOpacity(
  emphasis: number,
  visitedStrength: number
): number {
  const emphasisClamped = MathUtils.clamp(emphasis, 0, 1);
  const visitedClamped = MathUtils.clamp(visitedStrength, 0, 1);
  const visitedBase = MathUtils.lerp(0, HALO_VISITED_BASE_MAX, visitedClamped);
  return MathUtils.lerp(visitedBase, HALO_FOCUS_OPACITY, emphasisClamped);
}
