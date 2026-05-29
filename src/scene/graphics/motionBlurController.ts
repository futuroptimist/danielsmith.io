import { MathUtils, type WebGLRenderer, type WebGLRenderTarget } from 'three';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';

export interface MotionBlurControllerOptions {
  /**
   * Initial motion blur intensity between 0 (disabled) and 1 (maximum trail).
   */
  readonly intensity?: number;
  /**
   * Upper bound for the Afterimage dampening uniform. Defaults to 0.92 which
   * keeps optional trails below the shader's fully persistent feedback state.
   */
  readonly maxDamp?: number;
}

export interface MotionBlurController {
  readonly pass: AfterimagePass;
  /** Returns the currently applied intensity between 0 and 1. */
  getIntensity(): number;
  /** Updates the motion blur intensity and corresponding pass uniforms. */
  setIntensity(intensity: number): void;
  /** Clears the afterimage feedback targets before the next active render. */
  reset(renderer?: WebGLRenderer): void;
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
  // AfterimageShader multiplies old pixels by damp, so 0 fully clears history
  // and larger values retain longer trails. Never map intensity 0 to damp 1.
  return MathUtils.lerp(0, maxDamp, clamped);
}

function clearRenderTarget(renderer: WebGLRenderer, target: WebGLRenderTarget) {
  renderer.setRenderTarget(target);
  renderer.clear(true, true, true);
}

export function createMotionBlurController({
  intensity = 0,
  maxDamp = DEFAULT_MAX_DAMP,
}: MotionBlurControllerOptions = {}): MotionBlurController {
  const safeMaxDamp = clamp01(maxDamp);
  const pass = new AfterimagePass(safeMaxDamp);
  const render = pass.render.bind(pass);
  let currentIntensity = 0;
  let pendingReset = true;

  const clearHistory = (renderer: WebGLRenderer) => {
    const previousTarget = renderer.getRenderTarget();
    clearRenderTarget(renderer, pass.textureOld);
    clearRenderTarget(renderer, pass.textureComp);
    renderer.setRenderTarget(previousTarget);
    pendingReset = false;
  };

  pass.render = (
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean
  ) => {
    if (pendingReset) {
      clearHistory(renderer);
    }
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  };

  const applyIntensity = (value: number) => {
    const nextIntensity = clamp01(value);
    const wasEnabled = pass.enabled;
    currentIntensity = nextIntensity;
    pass.uniforms.damp.value = resolveDampValue(currentIntensity, safeMaxDamp);
    pass.enabled = currentIntensity > 0;
    if (!pass.enabled || wasEnabled !== pass.enabled) {
      pendingReset = true;
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
    reset(renderer) {
      pendingReset = true;
      if (renderer) {
        clearHistory(renderer);
      }
    },
    dispose() {
      pass.dispose();
    },
  };
}
