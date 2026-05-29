import type { GraphicsQualityLevel } from '../../scene/graphics/qualityManager';

export type AdaptiveQualityReason =
  | 'software-renderer'
  | 'sustained-low-fps'
  | 'manual'
  | 'startup';

export interface AdaptiveQualityFeatureState {
  forceLowDpr: boolean;
  disableComposer: boolean;
  disableBloom: boolean;
  throttleMirror: boolean;
  disableMirror: boolean;
  throttleDecorations: boolean;
}

export interface AdaptiveQualityState extends AdaptiveQualityFeatureState {
  downgradeCount: number;
  lastDowngradeReason: AdaptiveQualityReason | null;
  lastDowngradeAtMs: number | null;
}

export interface AdaptiveQualityControllerOptions {
  initialLevel: GraphicsQualityLevel;
  now?: () => number;
  cooldownMs?: number;
  minFps?: number;
  sustainedDurationMs?: number;
  onSetQualityLevel?: (
    level: GraphicsQualityLevel,
    reason: AdaptiveQualityReason
  ) => void;
  onChange?: (state: AdaptiveQualityState) => void;
}

export interface AdaptiveQualityController {
  recordFrame(deltaSeconds: number): boolean;
  forceDowngrade(reason: AdaptiveQualityReason): boolean;
  resetLowFpsWindow(): void;
  getState(): AdaptiveQualityState;
}

const QUALITY_LADDER: readonly GraphicsQualityLevel[] = [
  'cinematic',
  'balanced',
  'performance',
];

function cloneState(state: AdaptiveQualityState): AdaptiveQualityState {
  return { ...state };
}

export function createAdaptiveQualityController({
  initialLevel,
  now = () => performance.now(),
  cooldownMs = 4000,
  minFps = 30,
  sustainedDurationMs = 1400,
  onSetQualityLevel,
  onChange,
}: AdaptiveQualityControllerOptions): AdaptiveQualityController {
  let currentLevel = initialLevel;
  let lowFpsMs = 0;
  let state: AdaptiveQualityState = {
    forceLowDpr: false,
    disableComposer: currentLevel === 'performance',
    disableBloom: currentLevel === 'performance',
    throttleMirror: currentLevel !== 'cinematic',
    disableMirror: false,
    throttleDecorations: false,
    downgradeCount: 0,
    lastDowngradeReason: null,
    lastDowngradeAtMs: null,
  };

  function publish() {
    onChange?.(cloneState(state));
  }

  function canDowngrade(atMs: number): boolean {
    return (
      state.lastDowngradeAtMs === null ||
      atMs - state.lastDowngradeAtMs >= cooldownMs
    );
  }

  function markDowngrade(reason: AdaptiveQualityReason, atMs: number) {
    state = {
      ...state,
      downgradeCount: state.downgradeCount + 1,
      lastDowngradeReason: reason,
      lastDowngradeAtMs: atMs,
    };
    lowFpsMs = 0;
    publish();
  }

  function downgrade(reason: AdaptiveQualityReason): boolean {
    const atMs = now();
    if (!canDowngrade(atMs)) {
      return false;
    }

    const levelIndex = QUALITY_LADDER.indexOf(currentLevel);
    if (levelIndex >= 0 && levelIndex < QUALITY_LADDER.length - 1) {
      currentLevel = QUALITY_LADDER[levelIndex + 1];
      onSetQualityLevel?.(currentLevel, reason);
      state = {
        ...state,
        disableComposer:
          currentLevel === 'performance' || state.disableComposer,
        disableBloom: currentLevel === 'performance' || state.disableBloom,
        throttleMirror: currentLevel !== 'cinematic' || state.throttleMirror,
      };
      markDowngrade(reason, atMs);
      return true;
    }

    if (!state.forceLowDpr) {
      state = { ...state, forceLowDpr: true };
      markDowngrade(reason, atMs);
      return true;
    }
    if (!state.disableComposer || !state.disableBloom) {
      state = { ...state, disableComposer: true, disableBloom: true };
      markDowngrade(reason, atMs);
      return true;
    }
    if (!state.throttleMirror) {
      state = { ...state, throttleMirror: true };
      markDowngrade(reason, atMs);
      return true;
    }
    if (!state.disableMirror) {
      state = { ...state, disableMirror: true };
      markDowngrade(reason, atMs);
      return true;
    }
    if (!state.throttleDecorations) {
      state = { ...state, throttleDecorations: true };
      markDowngrade(reason, atMs);
      return true;
    }
    return false;
  }

  return {
    recordFrame(deltaSeconds) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
        return false;
      }
      const frameMs = deltaSeconds * 1000;
      const fps = 1000 / frameMs;
      if (fps >= minFps) {
        lowFpsMs = 0;
        return false;
      }
      lowFpsMs += frameMs;
      return lowFpsMs >= sustainedDurationMs
        ? downgrade('sustained-low-fps')
        : false;
    },
    forceDowngrade(reason) {
      return downgrade(reason);
    },
    resetLowFpsWindow() {
      lowFpsMs = 0;
    },
    getState() {
      return cloneState(state);
    },
  };
}
