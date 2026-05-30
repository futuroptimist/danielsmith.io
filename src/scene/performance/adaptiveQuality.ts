import type { GraphicsQualityLevel } from '../graphics/qualityManager';

import type { RendererRiskLevel } from './rendererCapabilities';

export interface AdaptiveQualityManagerLike {
  getLevel(): GraphicsQualityLevel;
  setLevel(level: GraphicsQualityLevel): void;
  setBasePixelRatio(pixelRatio: number): void;
}

export type AdaptiveQualityAction = 'downgrade' | 'recovery';
export type AdaptiveQualitySource = 'initial' | 'adaptive' | 'manual';

export interface AdaptiveQualityControllerOptions {
  qualityManager: AdaptiveQualityManagerLike;
  getBasePixelRatio: () => number;
  setBasePixelRatio: (value: number) => void;
  fpsThreshold?: number;
  downgradeAfterMs?: number;
  cooldownMs?: number;
  minBasePixelRatio?: number;
  rendererRiskLevel?: RendererRiskLevel;
  warmupGraceMs?: number;
  evaluationWindowMs?: number;
  recoveryAfterMs?: number;
  recoveryFpsThreshold?: number;
  recoveryP95FrameMs?: number;
  initialQualitySource?: AdaptiveQualitySource;
  onDowngrade?: (event: AdaptiveQualityDowngradeEvent) => void;
  onRecovery?: (event: AdaptiveQualityRecoveryEvent) => void;
  onAction?: (event: AdaptiveQualityEvent) => void;
}

export interface AdaptiveQualityEvent {
  action: AdaptiveQualityAction;
  step: string;
  level: GraphicsQualityLevel;
  basePixelRatio: number;
  reason: string;
  downgradeCount: number;
  recoveryCount: number;
  elapsedMs: number;
  warmupElapsedMs: number;
  warmupGraceMs: number;
  inWarmup: boolean;
  lowFpsDurationMs: number;
  stableDurationMs: number;
  medianFps: number;
  p95FrameMs: number;
  minFps: number;
  sampleCount: number;
  qualitySource: AdaptiveQualitySource;
  rendererRiskLevel: RendererRiskLevel;
}

export type AdaptiveQualityDowngradeEvent = AdaptiveQualityEvent & {
  action: 'downgrade';
};

export type AdaptiveQualityRecoveryEvent = AdaptiveQualityEvent & {
  action: 'recovery';
};

export interface AdaptiveQualityPolicySnapshot {
  rendererRiskLevel: RendererRiskLevel;
  qualitySource: AdaptiveQualitySource;
  inWarmup: boolean;
  warmupElapsedMs: number;
  warmupGraceMs: number;
  lowFpsDurationMs: number;
  stableDurationMs: number;
  cooldownRemainingMs: number;
  downgradeCount: number;
  recoveryCount: number;
  lastAction: AdaptiveQualityAction | null;
  lastDowngradeReason: string | null;
  lastRecoveryReason: string | null;
  lastAdaptiveReason: string | null;
  medianFps: number;
  p95FrameMs: number;
  minFps: number;
  sampleCount: number;
  canAutoRecover: boolean;
}

export interface AdaptiveQualityController {
  update(deltaSeconds: number): AdaptiveQualityEvent | null;
  getDowngradeCount(): number;
  getRecoveryCount(): number;
  getLastReason(): string | null;
  getLastDowngradeReason(): string | null;
  getLastRecoveryReason(): string | null;
  getSnapshot(): AdaptiveQualityPolicySnapshot;
  markUserSelectedLevel(level: GraphicsQualityLevel): void;
  isExhausted(): boolean;
}

const NORMAL_WARMUP_GRACE_MS = 5000;
const LOW_FPS_P95_MULTIPLIER = 1.5;

interface FrameSample {
  frameMs: number;
  elapsedMs: number;
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

function summarizeFrameSamples(samples: readonly FrameSample[]): {
  medianFps: number;
  p95FrameMs: number;
  minFps: number;
  sampleCount: number;
} {
  if (samples.length === 0) {
    return { medianFps: 0, p95FrameMs: 0, minFps: 0, sampleCount: 0 };
  }
  const sortedFrameMs = samples
    .map((sample) => sample.frameMs)
    .sort((a, b) => a - b);
  const medianFrameMs = percentile(sortedFrameMs, 50);
  const p95FrameMs = percentile(sortedFrameMs, 95);
  const maxFrameMs = sortedFrameMs[sortedFrameMs.length - 1] ?? 0;
  return {
    medianFps: medianFrameMs > 0 ? 1000 / medianFrameMs : 0,
    p95FrameMs,
    minFps: maxFrameMs > 0 ? 1000 / maxFrameMs : 0,
    sampleCount: sortedFrameMs.length,
  };
}

export function createAdaptiveQualityController({
  qualityManager,
  getBasePixelRatio,
  setBasePixelRatio,
  fpsThreshold = 30,
  downgradeAfterMs = 1600,
  cooldownMs = 3500,
  minBasePixelRatio = 0.75,
  rendererRiskLevel = 'normal',
  warmupGraceMs,
  evaluationWindowMs = 2200,
  recoveryAfterMs = 8000,
  recoveryFpsThreshold = 55,
  recoveryP95FrameMs = 24,
  initialQualitySource = 'initial',
  onDowngrade,
  onRecovery,
  onAction,
}: AdaptiveQualityControllerOptions): AdaptiveQualityController {
  const isConservativeRenderer = rendererRiskLevel !== 'normal';
  const resolvedWarmupGraceMs =
    warmupGraceMs ?? (isConservativeRenderer ? 0 : NORMAL_WARMUP_GRACE_MS);
  let elapsedMs = 0;
  let lowFpsDurationMs = 0;
  let stableDurationMs = 0;
  let cooldownRemainingMs = 0;
  let downgradeCount = 0;
  let recoveryCount = 0;
  let lastAction: AdaptiveQualityAction | null = null;
  let lastDowngradeReason: string | null = null;
  let lastRecoveryReason: string | null = null;
  let lastAdaptiveReason: string | null = null;
  let pixelRatioStepApplied = false;
  let qualitySource = initialQualitySource;
  let manualLevel: GraphicsQualityLevel | null =
    initialQualitySource === 'manual' ? qualityManager.getLevel() : null;
  const samples: FrameSample[] = [];

  const getWarmupElapsedMs = () => Math.min(elapsedMs, resolvedWarmupGraceMs);
  const isInWarmup = () => elapsedMs < resolvedWarmupGraceMs;
  const getStats = () => summarizeFrameSamples(samples);
  const canAutoRecover = () =>
    !isConservativeRenderer && manualLevel !== 'performance';

  const pushSample = (frameMs: number) => {
    samples.push({ frameMs, elapsedMs });
    const oldestAllowedElapsedMs = elapsedMs - evaluationWindowMs;
    while (
      samples.length > 0 &&
      (samples[0]?.elapsedMs ?? 0) < oldestAllowedElapsedMs
    ) {
      samples.shift();
    }
  };

  const emit = (
    action: AdaptiveQualityAction,
    step: string,
    reason: string
  ): AdaptiveQualityEvent => {
    const stats = getStats();
    lastAction = action;
    lastAdaptiveReason = reason;
    if (action === 'downgrade') {
      downgradeCount += 1;
      lastDowngradeReason = reason;
      lowFpsDurationMs = 0;
    } else {
      recoveryCount += 1;
      lastRecoveryReason = reason;
      stableDurationMs = 0;
    }
    cooldownRemainingMs = cooldownMs;
    qualitySource = 'adaptive';
    const event = {
      action,
      step,
      level: qualityManager.getLevel(),
      basePixelRatio: getBasePixelRatio(),
      reason,
      downgradeCount,
      recoveryCount,
      elapsedMs,
      warmupElapsedMs: getWarmupElapsedMs(),
      warmupGraceMs: resolvedWarmupGraceMs,
      inWarmup: isInWarmup(),
      lowFpsDurationMs,
      stableDurationMs,
      ...stats,
      qualitySource,
      rendererRiskLevel,
    };
    if (action === 'downgrade') {
      onDowngrade?.(event as AdaptiveQualityDowngradeEvent);
    } else {
      onRecovery?.(event as AdaptiveQualityRecoveryEvent);
    }
    onAction?.(event);
    return event;
  };

  const downgrade = (): AdaptiveQualityDowngradeEvent | null => {
    const currentLevel = qualityManager.getLevel();
    if (currentLevel === 'cinematic') {
      qualityManager.setLevel('balanced');
      return emit(
        'downgrade',
        'quality-balanced',
        'sustained low FPS downgraded cinematic to balanced'
      ) as AdaptiveQualityDowngradeEvent;
    }
    if (currentLevel === 'balanced') {
      qualityManager.setLevel('performance');
      return emit(
        'downgrade',
        'quality-performance',
        'sustained low FPS downgraded balanced to performance'
      ) as AdaptiveQualityDowngradeEvent;
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
      ) as AdaptiveQualityDowngradeEvent;
    }

    return null;
  };

  const recover = (): AdaptiveQualityRecoveryEvent | null => {
    if (!canAutoRecover() || qualityManager.getLevel() !== 'performance') {
      return null;
    }
    qualityManager.setLevel('balanced');
    return emit(
      'recovery',
      'quality-balanced',
      'sustained stable FPS recovered performance to balanced'
    ) as AdaptiveQualityRecoveryEvent;
  };

  return {
    update(deltaSeconds: number) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
        return null;
      }
      const frameMs = deltaSeconds * 1000;
      elapsedMs += frameMs;
      pushSample(frameMs);

      if (cooldownRemainingMs > 0) {
        cooldownRemainingMs = Math.max(0, cooldownRemainingMs - frameMs);
        return null;
      }

      const stats = getStats();
      const hasEvaluationWindow =
        samples.length > 1 &&
        elapsedMs - (samples[0]?.elapsedMs ?? elapsedMs) >=
          Math.min(evaluationWindowMs, downgradeAfterMs);
      const lowFpsThresholdFrameMs = 1000 / fpsThreshold;
      const isSustainedLow =
        hasEvaluationWindow &&
        (stats.medianFps < fpsThreshold ||
          stats.p95FrameMs > lowFpsThresholdFrameMs * LOW_FPS_P95_MULTIPLIER);
      const isStable =
        stats.medianFps >= recoveryFpsThreshold &&
        stats.p95FrameMs > 0 &&
        stats.p95FrameMs <= recoveryP95FrameMs;

      if (isInWarmup() && !isConservativeRenderer) {
        lowFpsDurationMs = isSustainedLow ? lowFpsDurationMs + frameMs : 0;
        stableDurationMs = isStable ? stableDurationMs + frameMs : 0;
        return null;
      }

      if (isSustainedLow) {
        lowFpsDurationMs += frameMs;
        stableDurationMs = 0;
      } else {
        lowFpsDurationMs = 0;
        stableDurationMs = isStable ? stableDurationMs + frameMs : 0;
      }

      if (lowFpsDurationMs >= downgradeAfterMs) {
        return downgrade();
      }

      if (stableDurationMs >= recoveryAfterMs) {
        return recover();
      }

      return null;
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
    getSnapshot() {
      return {
        rendererRiskLevel,
        qualitySource,
        inWarmup: isInWarmup(),
        warmupElapsedMs: getWarmupElapsedMs(),
        warmupGraceMs: resolvedWarmupGraceMs,
        lowFpsDurationMs,
        stableDurationMs,
        cooldownRemainingMs,
        downgradeCount,
        recoveryCount,
        lastAction,
        lastDowngradeReason,
        lastRecoveryReason,
        lastAdaptiveReason,
        ...getStats(),
        canAutoRecover: canAutoRecover(),
      };
    },
    markUserSelectedLevel(level) {
      manualLevel = level;
      qualitySource = 'manual';
      stableDurationMs = 0;
      lowFpsDurationMs = 0;
      cooldownRemainingMs = cooldownMs;
    },
    isExhausted() {
      return (
        qualityManager.getLevel() === 'performance' && pixelRatioStepApplied
      );
    },
  };
}
