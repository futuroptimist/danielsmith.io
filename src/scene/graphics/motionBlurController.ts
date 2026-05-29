import { Color, MathUtils } from 'three';
import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';

export interface MotionBlurControllerOptions {
  /**
   * Initial motion blur intensity between 0 (disabled) and 1 (maximum trail).
   */
  readonly intensity?: number;
  /**
   * Upper bound for the Afterimage dampening uniform. Defaults to 0.92 which
   * keeps optional trails visible without letting old frames dominate camera
   * changes. Three's AfterimagePass preserves more history as damp increases.
   */
  readonly maxDamp?: number;
}

export interface MotionBlurController {
  readonly pass: AfterimagePass;
  /** Returns the currently applied intensity between 0 and 1. */
  getIntensity(): number;
  /** Updates the motion blur intensity and corresponding pass uniforms. */
  setIntensity(intensity: number): void;
  /** Clears retained afterimage history before the next active render. */
  resetHistory(renderer?: WebGLRenderer): void;
  /** Disposes the underlying pass resources. */
  dispose(): void;
}

const DEFAULT_MAX_DAMP = 0.92;
const DISABLED_DAMP = 0;
const CLEAR_COLOR = new Color(0, 0, 0);

type RenderTargetRenderer = Pick<
  WebGLRenderer,
  | 'clear'
  | 'getClearAlpha'
  | 'getClearColor'
  | 'getRenderTarget'
  | 'setClearColor'
  | 'setRenderTarget'
>;

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

function resolveMaxDamp(maxDamp: number): number {
  return clamp01(maxDamp);
}

export function resolveDampValue(intensity: number, maxDamp: number): number {
  const clamped = clamp01(intensity);
  if (clamped <= 0) {
    return DISABLED_DAMP;
  }
  // AfterimagePass multiplies the previous frame by damp; higher values keep
  // more history. Keep intensity 0 as a true no-op and scale upward from there.
  return MathUtils.lerp(DISABLED_DAMP, resolveMaxDamp(maxDamp), clamped);
}

function clearRenderTargetHistory(
  renderer: RenderTargetRenderer,
  targets: readonly WebGLRenderTarget[]
) {
  const previousTarget = renderer.getRenderTarget();
  const previousColor = renderer.getClearColor(new Color());
  const previousAlpha = renderer.getClearAlpha();

  renderer.setClearColor(CLEAR_COLOR, 0);
  for (const target of targets) {
    renderer.setRenderTarget(target);
    renderer.clear(true, true, true);
  }
  renderer.setClearColor(previousColor, previousAlpha);
  renderer.setRenderTarget(previousTarget);
}

export function createMotionBlurController({
  intensity = 0,
  maxDamp = DEFAULT_MAX_DAMP,
}: MotionBlurControllerOptions = {}): MotionBlurController {
  const resolvedMaxDamp = resolveMaxDamp(maxDamp);
  const pass = new AfterimagePass(DISABLED_DAMP);
  const render = pass.render.bind(pass);
  let currentIntensity = 0;
  let resetPending = true;

  const resetHistory = (renderer?: WebGLRenderer) => {
    resetPending = true;
    if (renderer) {
      clearRenderTargetHistory(renderer, [pass.textureOld, pass.textureComp]);
      resetPending = false;
    }
  };

  pass.render = (renderer, writeBuffer, readBuffer, deltaTime, maskActive) => {
    if (resetPending) {
      clearRenderTargetHistory(renderer, [pass.textureOld, pass.textureComp]);
      resetPending = false;
    }
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  };

  const applyIntensity = (value: number) => {
    const nextIntensity = clamp01(value);
    const wasEnabled = pass.enabled;
    currentIntensity = nextIntensity;
    pass.uniforms.damp.value = resolveDampValue(
      currentIntensity,
      resolvedMaxDamp
    );
    pass.enabled = currentIntensity > 0;

    if (!pass.enabled || !wasEnabled) {
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
    dispose() {
      pass.dispose();
    },
  };
}
