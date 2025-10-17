import { MathUtils } from 'three';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';

export interface MotionBlurControllerOptions {
  /**
   * Initial motion blur intensity between 0 (disabled) and 1 (maximum trail).
   */
  readonly intensity?: number;
  /**
   * Upper bound for the Afterimage dampening uniform. Defaults to 0.92 which
   * matches the effect's stock configuration while leaving room for presets to
   * disable trails entirely.
   */
  readonly maxDamp?: number;
}

export interface MotionBlurController {
  readonly pass: AfterimagePass;
  /** Returns the currently applied intensity between 0 and 1. */
  getIntensity(): number;
  /** Updates the motion blur intensity and corresponding pass uniforms. */
  setIntensity(intensity: number): void;
  /** Disposes the underlying pass resources. */
  dispose(): void;
}

const DEFAULT_MAX_DAMP = 0.92;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function resolveDampValue(intensity: number, maxDamp: number): number {
  const clamped = clamp01(intensity);
  // Damp of 0 means no trail, whereas 0.92 approximates the stock blur.
  return MathUtils.lerp(0, maxDamp, clamped);
}

export function createMotionBlurController({
  intensity = 0.6,
  maxDamp = DEFAULT_MAX_DAMP,
}: MotionBlurControllerOptions = {}): MotionBlurController {
  const pass = new AfterimagePass(maxDamp);
  let currentIntensity = 0;

  const applyIntensity = (value: number) => {
    currentIntensity = clamp01(value);
    pass.uniforms.damp.value = resolveDampValue(currentIntensity, maxDamp);
  };

  applyIntensity(intensity);

  return {
    pass,
    getIntensity() {
      return currentIntensity;
    },
    setIntensity(value) {
      applyIntensity(value);
    },
    dispose() {
      pass.dispose();
    },
  };
}
