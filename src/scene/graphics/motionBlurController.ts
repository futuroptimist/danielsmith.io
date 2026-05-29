import { Color, MathUtils, WebGLRenderTarget, WebGLRenderer } from 'three';
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
  /** Renderer used to clear AfterimagePass feedback buffers when history is invalidated. */
  readonly renderer?: WebGLRenderer;
}

export interface MotionBlurController {
  readonly pass: AfterimagePass;
  /** Returns the currently applied intensity between 0 and 1. */
  getIntensity(): number;
  /** Returns whether the afterimage pass is active in the composer chain. */
  isEnabled(): boolean;
  /** Returns how many times the feedback buffers have been invalidated. */
  getResetCount(): number;
  /** Updates the motion blur intensity and corresponding pass uniforms. */
  setIntensity(intensity: number): void;
  /** Clears stale afterimage history after projection/camera changes. */
  resetHistory(): void;
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

function resolveMaxDamp(value: number): number {
  const clamped = clamp01(value);
  return clamped > 0 ? clamped : DEFAULT_MAX_DAMP;
}

function resolveDampValue(intensity: number, maxDamp: number): number {
  const clamped = clamp01(intensity);
  // AfterimageShader multiplies the old frame by damp before max(new, old).
  // Damp 0 clears history, while higher damp values preserve longer trails.
  return MathUtils.lerp(0, maxDamp, clamped);
}

function clearRenderTarget(renderer: WebGLRenderer, target: WebGLRenderTarget) {
  const previousTarget = renderer.getRenderTarget();
  const previousAlpha = renderer.getClearAlpha();
  const previousColor = renderer.getClearColor(new Color());

  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(target);
  renderer.clear(true, true, true);
  renderer.setRenderTarget(previousTarget);
  renderer.setClearColor(previousColor, previousAlpha);
}

export function createMotionBlurController({
  intensity = 0,
  maxDamp = DEFAULT_MAX_DAMP,
  renderer,
}: MotionBlurControllerOptions = {}): MotionBlurController {
  const resolvedMaxDamp = resolveMaxDamp(maxDamp);
  const pass = new AfterimagePass(resolvedMaxDamp);
  let currentIntensity = 0;
  let resetCount = 0;

  const resetHistory = () => {
    resetCount += 1;
    pass.uniforms.tOld.value = null;
    pass.uniforms.tNew.value = null;

    if (!renderer) {
      return;
    }

    clearRenderTarget(renderer, pass.textureOld);
    clearRenderTarget(renderer, pass.textureComp);
  };

  const applyIntensity = (value: number) => {
    const previousIntensity = currentIntensity;
    currentIntensity = clamp01(value);
    pass.uniforms.damp.value = resolveDampValue(
      currentIntensity,
      resolvedMaxDamp
    );
    pass.enabled = currentIntensity > 0;

    if (currentIntensity <= 0 || previousIntensity <= 0) {
      resetHistory();
    }
  };

  applyIntensity(intensity);

  return {
    pass,
    getIntensity() {
      return currentIntensity;
    },
    isEnabled() {
      return pass.enabled !== false;
    },
    getResetCount() {
      return resetCount;
    },
    setIntensity(value) {
      applyIntensity(value);
    },
    resetHistory,
    dispose() {
      pass.dispose();
    },
  };
}
