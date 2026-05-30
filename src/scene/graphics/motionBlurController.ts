import { MathUtils } from 'three';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';

export interface MotionBlurControllerOptions {
  /**
   * Initial motion blur intensity between 0 (disabled) and 1 (maximum trail).
   */
  readonly intensity?: number;
  /**
   * Upper bound for the Afterimage dampening uniform. Defaults to 0.92 which
   * matches a restrained afterimage while avoiding unbounded frame feedback.
   */
  readonly maxDamp?: number;
}

export interface MotionBlurControllerHistoryState {
  /** True when the next afterimage render will clear retained feedback. */
  readonly pendingReset: boolean;
  /** Number of times feedback clearing has been requested. */
  readonly resetRequestCount: number;
  /** Last damp value queued for clearing retained feedback. */
  readonly lastResetDamp: number | null;
}

export interface MotionBlurController {
  readonly pass: AfterimagePass;
  /** Returns the currently applied intensity between 0 and 1. */
  getIntensity(): number;
  /** Updates the motion blur intensity and corresponding pass uniforms. */
  setIntensity(intensity: number): void;
  /** Clears the afterimage feedback history on the next rendered pass. */
  resetHistory(): void;
  /** Returns renderer-level state for regression tests and diagnostics. */
  getHistoryState(): MotionBlurControllerHistoryState;
  /** Disposes the underlying pass resources. */
  dispose(): void;
}

const DEFAULT_MAX_DAMP = 0.92;
const CLEAR_HISTORY_DAMP = 0;

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

function resolveMaxDamp(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MAX_DAMP;
  }
  return clamp01(value);
}

function resolveDampValue(intensity: number, maxDamp: number): number {
  const clamped = clamp01(intensity);
  if (clamped === 0) {
    return CLEAR_HISTORY_DAMP;
  }

  // AfterimagePass preserves older frames longer as damp approaches 1. Intensity
  // therefore scales up from a clearing damp value instead of mapping 0 to 1.
  return MathUtils.lerp(CLEAR_HISTORY_DAMP, maxDamp, clamped);
}

export function createMotionBlurController({
  intensity = 0,
  maxDamp = DEFAULT_MAX_DAMP,
}: MotionBlurControllerOptions = {}): MotionBlurController {
  const resolvedMaxDamp = resolveMaxDamp(maxDamp);
  const pass = new AfterimagePass(CLEAR_HISTORY_DAMP);
  const renderWithAfterimage = pass.render.bind(pass);
  let currentIntensity = 0;
  let shouldResetHistory = true;
  let resetRequestCount = 0;
  let lastResetDamp: number | null = null;

  pass.render = (...args: Parameters<AfterimagePass['render']>) => {
    if (!shouldResetHistory) {
      renderWithAfterimage(...args);
      return;
    }

    const previousDamp = pass.uniforms.damp.value;
    pass.uniforms.damp.value = CLEAR_HISTORY_DAMP;
    try {
      renderWithAfterimage(...args);
    } finally {
      pass.uniforms.damp.value = previousDamp;
      shouldResetHistory = false;
      pass.enabled = currentIntensity > 0;
    }
  };

  const resetHistory = () => {
    shouldResetHistory = true;
    resetRequestCount += 1;
    lastResetDamp = CLEAR_HISTORY_DAMP;
  };

  const applyIntensity = (value: number) => {
    const previousIntensity = currentIntensity;
    currentIntensity = clamp01(value);
    pass.uniforms.damp.value = resolveDampValue(
      currentIntensity,
      resolvedMaxDamp
    );
    const transitionedAcrossDisabledState =
      (currentIntensity === 0) !== (previousIntensity === 0);
    pass.enabled = currentIntensity > 0 || transitionedAcrossDisabledState;

    if (currentIntensity === 0 || previousIntensity === 0) {
      resetHistory();
    }
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
    resetHistory,
    getHistoryState() {
      return {
        pendingReset: shouldResetHistory,
        resetRequestCount,
        lastResetDamp,
      };
    },
    dispose() {
      pass.dispose();
    },
  };
}
