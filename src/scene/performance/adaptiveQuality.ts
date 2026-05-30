import type { GraphicsQualityLevel } from '../graphics/qualityManager';

export type AdaptiveQualityAction = 'downgrade' | 'recovery';

export interface AdaptiveQualityManagerLike {
  getLevel(): GraphicsQualityLevel;
  setLevel(level: GraphicsQualityLevel): void;
  setBasePixelRatio(pixelRatio: number): void;
}

export interface AdaptiveQualityControllerOptions {
  qualityManager: AdaptiveQualityManagerLike;
  getBasePixelRatio: () => number;
  setBasePixelRatio: (value: number) => void;
  fpsThreshold?: number;
  recoveryFpsThreshold?: number;
  downgradeAfterMs?: number;
  stableRecoveryAfterMs?: number;
  warmupMs?: number;
  sampleWindowMs?: number;
  cooldownMs?: number;
  minBasePixelRatio?: number;
  isSoftwareRenderer?: boolean;
  hasManualQualitySelection?: () => boolean;
  onDowngrade?: (event: AdaptiveQualityEvent) => void;
  onRecover?: (event: AdaptiveQualityEvent) => void;
}

export interface AdaptiveQualityEvent {
  action: AdaptiveQualityAction;
  step: string;
  level: GraphicsQualityLevel;
  basePixelRatio: number;
  reason: string;
  downgradeCount: number;
  recoveryCount: number;
  warmupElapsedMs: number;
}

export type AdaptiveQualityDowngradeEvent = AdaptiveQualityEvent;

export interface AdaptiveQualityPolicySnapshot {
  warmupElapsedMs: number;
  warmupDurationMs: number;
  isWarmingUp: boolean;
  lowFpsDurationMs: number;
  stableDurationMs: number;
  cooldownRemainingMs: number;
  downgradeCount: number;
  recoveryCount: number;
  lastAdaptiveAction: AdaptiveQualityAction | null;
  lastDowngradeReason: string | null;
  lastRecoveryReason: string | null;
  lastAdaptiveReason: string | null;
  isRecoveryAllowed: boolean;
  isSoftwareRenderer: boolean;
  sampleCount: number;
  medianFps: number;
  p95FrameMs: number;
}

export interface AdaptiveQualityController {
  update(deltaSeconds: number): AdaptiveQualityEvent | null;
  getDowngradeCount(): number;
  getRecoveryCount(): number;
  getLastReason(): string | null;
  getLastDowngradeReason(): string | null;
  getLastRecoveryReason(): string | null;
  getLastAction(): AdaptiveQualityAction | null;
  getSnapshot(): AdaptiveQualityPolicySnapshot;
  isExhausted(): boolean;
}

interface FrameSample {
  elapsedMs: number;
  frameMs: number;
}

function percentile(
  sorted: readonly number[],
  percentileValue: number
): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

function summarizeFrameWindow(samples: readonly FrameSample[]) {
  if (samples.length === 0) {
    return { averageFps: 0, medianFps: 0, p95FrameMs: 0 };
  }
  const frameMsValues = samples.map((sample) => sample.frameMs);
  const sorted = [...frameMsValues].sort((a, b) => a - b);
  const averageMs =
    frameMsValues.reduce((total, value) => total + value, 0) /
    frameMsValues.length;
  const medianMs = percentile(sorted, 50);
  return {
    averageFps: averageMs > 0 ? 1000 / averageMs : 0,
    medianFps: medianMs > 0 ? 1000 / medianMs : 0,
    p95FrameMs: percentile(sorted, 95),
  };
}

export function createAdaptiveQualityController({
  qualityManager,
  getBasePixelRatio,
  setBasePixelRatio,
  fpsThreshold = 30,
  recoveryFpsThreshold = 55,
  downgradeAfterMs = 1800,
  stableRecoveryAfterMs = 8000,
  warmupMs,
  sampleWindowMs = 2400,
  cooldownMs = 3500,
  minBasePixelRatio = 0.75,
  isSoftwareRenderer = false,
  hasManualQualitySelection = () => false,
  onDowngrade,
  onRecover,
}: AdaptiveQualityControllerOptions): AdaptiveQualityController {
  const effectiveWarmupMs = warmupMs ?? (isSoftwareRenderer ? 0 : 5000);
  let elapsedMs = 0;
  let lowFpsDurationMs = 0;
  let stableDurationMs = 0;
  let cooldownRemainingMs = 0;
  let downgradeCount = 0;
  let recoveryCount = 0;
  let lastAdaptiveReason: string | null = null;
  let lastDowngradeReason: string | null = null;
  let lastRecoveryReason: string | null = null;
  let lastAdaptiveAction: AdaptiveQualityAction | null = null;
  let pixelRatioStepApplied = false;
  const frameSamples: FrameSample[] = [];

  const emit = (
    action: AdaptiveQualityAction,
    step: string,
    reason: string
  ): AdaptiveQualityEvent => {
    if (action === 'downgrade') {
      downgradeCount += 1;
      lastDowngradeReason = reason;
    } else {
      recoveryCount += 1;
      lastRecoveryReason = reason;
    }
    lastAdaptiveAction = action;
    lastAdaptiveReason = reason;
    lowFpsDurationMs = 0;
    stableDurationMs = 0;
    cooldownRemainingMs = cooldownMs;
    const event = {
      action,
      step,
      level: qualityManager.getLevel(),
      basePixelRatio: getBasePixelRatio(),
      reason,
      downgradeCount,
      recoveryCount,
      warmupElapsedMs: Math.min(elapsedMs, effectiveWarmupMs),
    };
    if (action === 'downgrade') {
      onDowngrade?.(event);
    } else {
      onRecover?.(event);
    }
    return event;
  };

  const downgrade = (): AdaptiveQualityEvent | null => {
    const currentLevel = qualityManager.getLevel();
    if (currentLevel === 'cinematic') {
      qualityManager.setLevel('balanced');
      return emit(
        'downgrade',
        'quality-balanced',
        'sustained low FPS downgraded cinematic to balanced'
      );
    }
    if (currentLevel === 'balanced') {
      qualityManager.setLevel('performance');
      return emit(
        'downgrade',
        'quality-performance',
        'sustained low FPS downgraded balanced to performance'
      );
    }

    const currentRatio = getBasePixelRatio();
    if (!pixelRatioStepApplied && currentRatio > minBasePixelRatio + 0.01) {
      pixelRatioStepApplied = true;
      setBasePixelRatio(Math.max(minBasePixelRatio, currentRatio * 0.8));
      qualityManager.setBasePixelRatio(getBasePixelRatio());
      return emit(
        'downgrade',
        'pixel-ratio',
        'sustained low FPS reduced base DPR after performance preset'
      );
    }

    return null;
  };

  const recover = (): AdaptiveQualityEvent | null => {
    if (isSoftwareRenderer || hasManualQualitySelection()) {
      return null;
    }
    if (qualityManager.getLevel() !== 'performance') {
      return null;
    }
    qualityManager.setLevel('balanced');
    return emit(
      'recovery',
      'quality-balanced',
      'sustained stable FPS recovered performance to balanced'
    );
  };

  const updateSamples = (frameMs: number) => {
    frameSamples.push({ elapsedMs, frameMs });
    const oldestAllowedMs = elapsedMs - sampleWindowMs;
    while (
      frameSamples.length > 0 &&
      (frameSamples[0]?.elapsedMs ?? 0) < oldestAllowedMs
    ) {
      frameSamples.shift();
    }
  };

  const controller: AdaptiveQualityController = {
    update(deltaSeconds: number) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
        return null;
      }
      const frameMs = deltaSeconds * 1000;
      elapsedMs += frameMs;
      updateSamples(frameMs);

      if (cooldownRemainingMs > 0) {
        cooldownRemainingMs = Math.max(0, cooldownRemainingMs - frameMs);
        return null;
      }

      const summary = summarizeFrameWindow(frameSamples);
      const currentFps =
        frameMs > 0 ? 1000 / frameMs : Number.POSITIVE_INFINITY;
      const hasEnoughSamples = frameSamples.length >= 8;
      const lowFrameBudgetMs = 1000 / fpsThreshold;
      const lowWindow =
        hasEnoughSamples &&
        currentFps < fpsThreshold &&
        (summary.medianFps < fpsThreshold ||
          (summary.p95FrameMs > lowFrameBudgetMs * 1.4 &&
            summary.averageFps < fpsThreshold * 1.15));
      const stableFrameBudgetMs = 1000 / recoveryFpsThreshold;
      const stableWindow =
        hasEnoughSamples &&
        summary.medianFps >= recoveryFpsThreshold &&
        summary.averageFps >= recoveryFpsThreshold &&
        summary.p95FrameMs <= stableFrameBudgetMs * 1.25 &&
        currentFps >= recoveryFpsThreshold * 0.9;

      if (stableWindow) {
        stableDurationMs += frameMs;
      } else {
        stableDurationMs = 0;
      }

      if (lowWindow) {
        lowFpsDurationMs += frameMs;
      } else {
        lowFpsDurationMs = 0;
      }

      if (
        stableDurationMs >= stableRecoveryAfterMs &&
        qualityManager.getLevel() === 'performance'
      ) {
        return recover();
      }

      if (elapsedMs < effectiveWarmupMs) {
        return null;
      }

      if (lowFpsDurationMs < downgradeAfterMs) {
        return null;
      }
      return downgrade();
    },
    getDowngradeCount() {
      return downgradeCount;
    },
    getRecoveryCount() {
      return recoveryCount;
    },
    getLastReason() {
      return lastAdaptiveReason;
    },
    getLastDowngradeReason() {
      return lastDowngradeReason;
    },
    getLastRecoveryReason() {
      return lastRecoveryReason;
    },
    getLastAction() {
      return lastAdaptiveAction;
    },
    getSnapshot() {
      const summary = summarizeFrameWindow(frameSamples);
      return {
        warmupElapsedMs: Math.min(elapsedMs, effectiveWarmupMs),
        warmupDurationMs: effectiveWarmupMs,
        isWarmingUp: elapsedMs < effectiveWarmupMs,
        lowFpsDurationMs,
        stableDurationMs,
        cooldownRemainingMs,
        downgradeCount,
        recoveryCount,
        lastAdaptiveAction,
        lastDowngradeReason,
        lastRecoveryReason,
        lastAdaptiveReason,
        isRecoveryAllowed: !isSoftwareRenderer && !hasManualQualitySelection(),
        isSoftwareRenderer,
        sampleCount: frameSamples.length,
        medianFps: summary.medianFps,
        p95FrameMs: summary.p95FrameMs,
      };
    },
    isExhausted() {
      return (
        qualityManager.getLevel() === 'performance' && pixelRatioStepApplied
      );
    },
  };

  return controller;
}
