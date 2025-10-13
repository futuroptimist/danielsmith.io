import { Vector3 } from '../../node_modules/three/build/three.module.js';

/**
 * @typedef {Object} ShowcaseModeOptions
 * @property {number} [duration] Total animation time in seconds.
 * @property {import('three').Vector3} [lookAt] Static look-at target for the camera.
 * @property {import('three').Curve<import('three').Vector3>} [lookAtCurve] Dynamic look-at curve.
 * @property {(t: number) => number} [easing] Optional easing function that receives a 0–1 progress value.
 * @property {boolean} [respectReducedMotion] Skip the tour when users request reduced motion.
 * @property {HTMLElement|null} [skipButton] Optional DOM element bound to `skip()`.
 * @property {(status: 'tourSkipped' | 'tourCompleted', detail?: Record<string, unknown>) => void}
 * [analyticsLogger] Optional analytics callback fired on completion or skip.
 * @property {(context: { status: 'running' }) => void} [onStart]
 * @property {(context: { position: import('three').Vector3; target: import('three').Vector3; t: number }) => void}
 * [onUpdate]
 * @property {(context: { status: 'tourCompleted' }) => void} [onComplete]
 * @property {(context: { status: 'tourSkipped'; reason: ShowcaseSkipReason }) => void} [onSkip]
 */

/**
 * @typedef {'manual' | 'prefers-reduced-motion' | 'interrupted'} ShowcaseSkipReason
 */

const DEFAULT_LOOK_AT = new Vector3(0, 0, 0);

/**
 * Guided showcase camera tour built around Catmull-Rom splines.
 */
export class ShowcaseMode {
  /**
   * @param {import('three').Camera} camera
   * @param {import('three').Curve<import('three').Vector3>} curve
   * @param {ShowcaseModeOptions} [options]
   */
  constructor(camera, curve, options = {}) {
    if (!camera) throw new Error('ShowcaseMode requires a camera instance.');
    if (!curve) throw new Error('ShowcaseMode requires a Catmull-Rom curve.');

    /** @type {import('three').Camera} */
    this.camera = camera;
    /** @type {import('three').Curve<import('three').Vector3>} */
    this.curve = curve;

    this.options = {
      duration: 30,
      lookAt: DEFAULT_LOOK_AT,
      lookAtCurve: null,
      easing: (t) => t,
      respectReducedMotion: true,
      skipButton: null,
      analyticsLogger: null,
      onStart: null,
      onUpdate: null,
      onComplete: null,
      onSkip: null,
      ...options,
    };

    if (typeof this.options.duration !== 'number' || this.options.duration <= 0) {
      throw new Error('ShowcaseMode requires a positive duration value.');
    }

    /** @private */
    this._raf = /** @type {number|null} */ (null);
    /** @private */
    this._startTime = /** @type {number|null} */ (null);
    /** @private */
    this._isRunning = false;
    /** @private */
    this._resolve = /** @type {((result: ShowcaseResult) => void)|null} */ (null);
    /** @private */
    this._finalState = /** @type {ShowcaseResult|null} */ (null);

    /** @private */
    this._prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    /** @private */
    this._runPromise = /** @type {Promise<ShowcaseResult>|null} */ (null);

    /** @private */
    this._boundLoop = this._loop.bind(this);
    /** @private */
    this._boundMotionHandler = this._handleMotionPreferenceChange.bind(this);
    /** @private */
    this._boundSkip = this.skip.bind(this, 'manual');

    if (this.options.skipButton) {
      this.options.skipButton.addEventListener('click', this._boundSkip);
    }

    if (this.options.respectReducedMotion && this._prefersReducedMotion) {
      this._prefersReducedMotion.addEventListener('change', this._boundMotionHandler);
    }
  }

  /**
   * Starts the camera tour. Returns a promise that resolves once the tour completes or is skipped.
   * @returns {Promise<ShowcaseResult>}
   */
  start() {
    if (this._resolve) {
      return this._runPromise;
    }

    this._finalState = null;
    this._runPromise = new Promise((resolve) => {
      this._resolve = resolve;
    });

    if (this.options.respectReducedMotion && this._prefersReducedMotion?.matches) {
      this.skip('prefers-reduced-motion');
      return this._runPromise;
    }

    this._startTime = performance.now();
    this._isRunning = true;
    this.options.onStart?.({ status: 'running' });
    this._raf = requestAnimationFrame(this._boundLoop);

    return this._runPromise;
  }

  /**
   * Cancels the tour and resolves start() with a skipped state.
   * @param {ShowcaseSkipReason} [reason]
   */
  skip(reason = 'manual') {
    this._finalize({ status: 'tourSkipped', reason });
  }

  /**
   * Stops the animation loop and disposes listeners.
   */
  destroy() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    if (this.options.skipButton) {
      this.options.skipButton.removeEventListener('click', this._boundSkip);
    }

    if (this._prefersReducedMotion) {
      this._prefersReducedMotion.removeEventListener('change', this._boundMotionHandler);
    }

    this._resolve = null;
  }

  /** @private */
  _loop() {
    if (!this._isRunning || this._startTime === null) return;

    const elapsedSeconds = (performance.now() - this._startTime) / 1000;
    const progress = Math.min(elapsedSeconds / this.options.duration, 1);
    const easedProgress = clamp01(this.options.easing?.(progress) ?? progress);

    const position = this.curve.getPointAt(easedProgress);
    this.camera.position.copy(position);

    const target = this.options.lookAtCurve
      ? this.options.lookAtCurve.getPointAt(easedProgress)
      : this.options.lookAt ?? DEFAULT_LOOK_AT;

    this.camera.lookAt(target);
    this.options.onUpdate?.({ position, target, t: easedProgress });

    if (progress >= 1) {
      this._finalize({ status: 'tourCompleted' });
      return;
    }

    this._raf = requestAnimationFrame(this._boundLoop);
  }

  /**
   * @private
   * @param {MediaQueryListEvent} event
   */
  _handleMotionPreferenceChange(event) {
    if (this.options.respectReducedMotion && event.matches) {
      this.skip('prefers-reduced-motion');
    }
  }

  /**
   * @private
   * @param {ShowcaseResult} result
   */
  _finalize(result) {
    if (this._finalState) return;

    this._finalState = result;
    this._isRunning = false;

    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    if (result.status === 'tourCompleted') {
      this.options.onComplete?.({ status: 'tourCompleted' });
      this.options.analyticsLogger?.('tourCompleted');
    } else {
      this.options.onSkip?.({ status: 'tourSkipped', reason: result.reason ?? 'manual' });
      this.options.analyticsLogger?.('tourSkipped', { reason: result.reason });
    }

    this._resolve?.(result);
    this._resolve = null;
    this._runPromise = Promise.resolve(result);
  }
}

/**
 * @typedef {{ status: 'tourCompleted' } | { status: 'tourSkipped'; reason: ShowcaseSkipReason }}
 * ShowcaseResult
 */

/**
 * Clamp helper to ensure easing stays in [0, 1].
 * @param {number} value
 * @returns {number}
 */
function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}
