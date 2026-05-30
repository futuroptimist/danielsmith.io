import type { GraphicsQualityLevel } from '../graphics/qualityManager';

import type { RendererInfoSnapshot } from './rendererCapabilities';

export type AdaptiveQualityAction = 'downgrade' | 'recovery';
export type AdaptiveQualitySource = 'initial' | 'stored' | 'user' | 'adaptive';

export interface AdaptiveQualityManagerLike {
  getLevel(): GraphicsQualityLevel;
  setLevel(level: GraphicsQualityLevel, source?: AdaptiveQualitySource): void;
  setBasePixelRatio(pixelRatio: number): void;
  getSource?(): AdaptiveQualitySource;
}

export interface AdaptiveQualityControllerOptions {
  qualityManager: AdaptiveQualityManagerLike;
  getBasePixelRatio: () => number;
  setBasePixelRatio: (value: number) => void;
  rendererInfo?: Pick<RendererInfoSnapshot, 'isSoftwareRenderer' | 'riskLevel'>;
  fpsThreshold?: number;
  downgradeAfterMs?: number;
  cooldownMs?: number;
  minBasePixelRatio?: number;
  warmupMs?: number;
  sampleWindowMs?: number;
  recoveryFpsThreshold?: number;
  recoveryP95FrameMs?: number;
  recoveryAfterMs?: number;
  onDowngrade?: (event: AdaptiveQualityEvent) => void;
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
  warmupActive: boolean;
}

export interface AdaptiveQualityPolicySnapshot {
  elapsedMs: number;
  warmupMs: number;
  warmupActive: boolean;
  lowFpsDurationMs: number;
  stableFpsDurationMs: number;
  cooldownRemainingMs: number;
  downgradeCount: number;
  recoveryCount: number;
  lastReason: string | null;
  lastDowngradeReason: string | null;
  lastRecoveryReason: string | null;
  lastAction: AdaptiveQualityAction | null;
  qualitySource: AdaptiveQualitySource;
  canAutoRecover: boolean;
  sampleCount: number;
  medianFps: number;
  p95FrameMs: number;
  isSoftwareRenderer: boolean;
  riskLevel: RendererInfoSnapshot['riskLevel'] | 'unknown';
}

export interface AdaptiveQualityController {
  update(deltaSeconds: number): AdaptiveQualityEvent | null;
  getDowngradeCount(): number;
  getRecoveryCount(): number;
  getLastReason(): string | null;
  getLastDowngradeReason(): string | null;
  getLastRecoveryReason(): string | null;
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
    return { medianFrameMs: 0, p95FrameMs: 0, medianFps: 0 };
  }
  const sorted = samples.map((sample) => sample.frameMs).sort((a, b) => a - b);
  const medianFrameMs = percentile(sorted, 50);
  const p95FrameMs = percentile(sorted, 95);
  return {
    medianFrameMs,
    p95FrameMs,
    medianFps: medianFrameMs > 0 ? 1000 / medianFrameMs : 0,
  };
}

export function createAdaptiveQualityController({
  qualityManager,
  getBasePixelRatio,
  setBasePixelRatio,
  rendererInfo,
  fpsThreshold = 30,
  downgradeAfterMs = 1600,
  cooldownMs = 2500,
  minBasePixelRatio = 0.75,
  warmupMs,
  sampleWindowMs = 2000,
  recoveryFpsThreshold = 55,
  recoveryP95FrameMs = 24,
  recoveryAfterMs = 8000,
  onDowngrade,
  onAction,
}: AdaptiveQualityControllerOptions): AdaptiveQualityController {
  const isSoftwareRenderer = rendererInfo?.isSoftwareRenderer === true;
  const riskLevel = rendererInfo?.riskLevel ?? 'unknown';
  const resolvedWarmupMs = warmupMs ?? (isSoftwareRenderer ? 0 : 5000);

  let elapsedMs = 0;
  let lowFpsDurationMs = 0;
  let stableFpsDurationMs = 0;
  let cooldownRemainingMs = 0;
  let downgradeCount = 0;
  let recoveryCount = 0;
  let lastReason: string | null = null;
  let lastDowngradeReason: string | null = null;
  let lastRecoveryReason: string | null = null;
  let lastAction: AdaptiveQualityAction | null = null;
  let pixelRatioStepApplied = false;
  const frameSamples: FrameSample[] = [];

  const getQualitySource = (): AdaptiveQualitySource =>
    qualityManager.getSource?.() ?? 'user';

  const getWindowSummary = () => summarizeFrameWindow(frameSamples);

  const canAutoRecover = () =>
    !isSoftwareRenderer &&
    riskLevel !== 'software' &&
    !(
      qualityManager.getLevel() === 'performance' &&
      getQualitySource() === 'user'
    );

  const emit = (
    action: AdaptiveQualityAction,
    step: string,
    reason: string
  ): AdaptiveQualityEvent => {
    lastReason = reason;
    lastAction = action;
    if (action === 'downgrade') {
      downgradeCount += 1;
      lastDowngradeReason = reason;
      lowFpsDurationMs = 0;
    } else {
      recoveryCount += 1;
      lastRecoveryReason = reason;
      stableFpsDurationMs = 0;
    }
    cooldownRemainingMs = cooldownMs;
    const event = {
      action,
      step,
      level: qualityManager.getLevel(),
      basePixelRatio: getBasePixelRatio(),
      reason,
      downgradeCount,
      recoveryCount,
      elapsedMs,
      warmupActive: elapsedMs < resolvedWarmupMs,
    };
    if (action === 'downgrade') {
      onDowngrade?.(event);
    }
    onAction?.(event);
    return event;
  };

  const downgrade = (): AdaptiveQualityEvent | null => {
    const currentLevel = qualityManager.getLevel();
    if (currentLevel === 'cinematic') {
      qualityManager.setLevel('balanced', 'adaptive');
      return emit(
        'downgrade',
        'quality-balanced',
        'sustained low FPS downgraded cinematic to balanced'
      );
    }
    if (currentLevel === 'balanced') {
      qualityManager.setLevel('performance', 'adaptive');
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
    if (!canAutoRecover() || qualityManager.getLevel() !== 'performance') {
      return null;
    }
    qualityManager.setLevel('balanced', 'adaptive');
    return emit(
      'recovery',
      'quality-balanced',
      'sustained stable FPS recovered performance to balanced'
    );
  };

  const recordSample = (frameMs: number) => {
    frameSamples.push({ elapsedMs, frameMs });
    const oldestAllowedMs = elapsedMs - sampleWindowMs;
    while (
      frameSamples.length > 0 &&
      (frameSamples[0]?.elapsedMs ?? 0) < oldestAllowedMs
    ) {
      frameSamples.shift();
    }
  };

  return {
    update(deltaSeconds: number) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
        return null;
      }
      const frameMs = deltaSeconds * 1000;
      elapsedMs += frameMs;
      recordSample(frameMs);

      if (cooldownRemainingMs > 0) {
        cooldownRemainingMs = Math.max(0, cooldownRemainingMs - frameMs);
        return null;
      }

      const { medianFps, p95FrameMs } = getWindowSummary();
      const warmupActive = elapsedMs < resolvedWarmupMs;
      const lowFrameBudgetMs = 1000 / fpsThreshold;
      const sustainedLowFps =
        medianFps > 0 &&
        medianFps < fpsThreshold &&
        p95FrameMs > lowFrameBudgetMs;

      if (warmupActive && !isSoftwareRenderer) {
        lowFpsDurationMs = 0;
        stableFpsDurationMs = 0;
        return null;
      }

      if (sustainedLowFps) {
        lowFpsDurationMs += frameMs;
        stableFpsDurationMs = 0;
      } else {
        lowFpsDurationMs = 0;
      }

      if (lowFpsDurationMs >= downgradeAfterMs) {
        return downgrade();
      }

      const stableForRecovery =
        medianFps >= recoveryFpsThreshold &&
        p95FrameMs > 0 &&
        p95FrameMs <= recoveryP95FrameMs;
      if (stableForRecovery && canAutoRecover()) {
        stableFpsDurationMs += frameMs;
      } else {
        stableFpsDurationMs = 0;
      }

      if (stableFpsDurationMs >= recoveryAfterMs) {
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
      return lastReason;
    },
    getLastDowngradeReason() {
      return lastDowngradeReason;
    },
    getLastRecoveryReason() {
      return lastRecoveryReason;
    },
    getSnapshot() {
      const { medianFps, p95FrameMs } = getWindowSummary();
      return {
        elapsedMs,
        warmupMs: resolvedWarmupMs,
        warmupActive: elapsedMs < resolvedWarmupMs,
        lowFpsDurationMs,
        stableFpsDurationMs,
        cooldownRemainingMs,
        downgradeCount,
        recoveryCount,
        lastReason,
        lastDowngradeReason,
        lastRecoveryReason,
        lastAction,
        qualitySource: getQualitySource(),
        canAutoRecover: canAutoRecover(),
        sampleCount: frameSamples.length,
        medianFps,
        p95FrameMs,
        isSoftwareRenderer,
        riskLevel,
      };
    },
    isExhausted() {
      return (
        qualityManager.getLevel() === 'performance' && pixelRatioStepApplied
      );
    },
  };
}
