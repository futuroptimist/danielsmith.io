import type { GraphicsQualityLevel } from '../graphics/qualityManager';

export type AdaptiveQualitySelectionSource = 'initial' | 'adaptive' | 'user';
export type AdaptiveQualityAction = 'downgrade' | 'recover';

export interface AdaptiveQualityManagerLike {
  getLevel(): GraphicsQualityLevel;
  setLevel(
    level: GraphicsQualityLevel,
    options?: { source?: AdaptiveQualitySelectionSource }
  ): void;
  setBasePixelRatio(pixelRatio: number): void;
}

export interface AdaptiveQualityControllerOptions {
  qualityManager: AdaptiveQualityManagerLike;
  getBasePixelRatio: () => number;
  setBasePixelRatio: (value: number) => void;
  fpsThreshold?: number;
  downgradeAfterMs?: number;
  cooldownMs?: number;
  minBasePixelRatio?: number;
  isSoftwareRenderer?: boolean;
  warmupMs?: number;
  recoveryAfterMs?: number;
  recoveryFpsThreshold?: number;
  recoveryP95FrameMs?: number;
  getSelectionSource?: () => AdaptiveQualitySelectionSource;
  onAction?: (event: AdaptiveQualityEvent) => void;
  onDowngrade?: (event: AdaptiveQualityEvent) => void;
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
  stableDurationMs: number;
  lowFpsDurationMs: number;
}

export interface AdaptiveQualityPolicySnapshot {
  warmupElapsedMs: number;
  warmupRemainingMs: number;
  isWarmingUp: boolean;
  lowFpsDurationMs: number;
  stableDurationMs: number;
  cooldownRemainingMs: number;
  downgradeCount: number;
  recoveryCount: number;
  lastAction: AdaptiveQualityAction | null;
  lastDowngradeReason: string | null;
  lastRecoveryReason: string | null;
  lastAdaptiveReason: string | null;
  selectionSource: AdaptiveQualitySelectionSource;
  autoRecoveryEnabled: boolean;
  softwareRenderer: boolean;
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

const DEFAULT_NORMAL_WARMUP_MS = 5000;
const FRAME_SAMPLE_WINDOW = 60;
const RECOVERY_COOLDOWN_MULTIPLIER = 2;

function percentile(sorted: readonly number[], percentileValue: number) {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

function summarizeFrameWindow(frameMsSamples: readonly number[]) {
  if (frameMsSamples.length === 0) {
    return { medianFrameMs: 0, p95FrameMs: 0 };
  }
  const sorted = [...frameMsSamples].sort((a, b) => a - b);
  return {
    medianFrameMs: percentile(sorted, 50),
    p95FrameMs: percentile(sorted, 95),
  };
}

export function createAdaptiveQualityController({
  qualityManager,
  getBasePixelRatio,
  setBasePixelRatio,
  fpsThreshold = 30,
  downgradeAfterMs = 1600,
  cooldownMs = 2500,
  minBasePixelRatio = 0.75,
  isSoftwareRenderer = false,
  warmupMs = isSoftwareRenderer ? 0 : DEFAULT_NORMAL_WARMUP_MS,
  recoveryAfterMs = 8000,
  recoveryFpsThreshold = 55,
  recoveryP95FrameMs = 22,
  getSelectionSource = () => 'adaptive',
  onAction,
  onDowngrade,
}: AdaptiveQualityControllerOptions): AdaptiveQualityController {
  let elapsedMs = 0;
  let lowFpsDurationMs = 0;
  let stableDurationMs = 0;
  let cooldownRemainingMs = 0;
  let recoveryCooldownRemainingMs = 0;
  let downgradeCount = 0;
  let recoveryCount = 0;
  let lastAction: AdaptiveQualityAction | null = null;
  let lastDowngradeReason: string | null = null;
  let lastRecoveryReason: string | null = null;
  let lastAdaptiveReason: string | null = null;
  let pixelRatioStepApplied = false;
  const frameMsSamples: number[] = [];

  const getWarmupRemainingMs = () => Math.max(0, warmupMs - elapsedMs);
  const isWarmingUp = () => getWarmupRemainingMs() > 0;
  const autoRecoveryEnabled = () =>
    !isSoftwareRenderer && getSelectionSource() !== 'user';

  const emit = (
    action: AdaptiveQualityAction,
    step: string,
    reason: string
  ): AdaptiveQualityEvent => {
    if (action === 'downgrade') {
      downgradeCount += 1;
      lastDowngradeReason = reason;
      lowFpsDurationMs = 0;
      stableDurationMs = 0;
      cooldownRemainingMs = cooldownMs;
      recoveryCooldownRemainingMs = cooldownMs * RECOVERY_COOLDOWN_MULTIPLIER;
    } else {
      recoveryCount += 1;
      lastRecoveryReason = reason;
      stableDurationMs = 0;
      lowFpsDurationMs = 0;
      cooldownRemainingMs = cooldownMs;
      recoveryCooldownRemainingMs = cooldownMs;
    }
    lastAction = action;
    lastAdaptiveReason = reason;
    const event = {
      action,
      step,
      level: qualityManager.getLevel(),
      basePixelRatio: getBasePixelRatio(),
      reason,
      downgradeCount,
      recoveryCount,
      warmupElapsedMs: Math.min(elapsedMs, warmupMs),
      stableDurationMs,
      lowFpsDurationMs,
    } satisfies AdaptiveQualityEvent;
    onAction?.(event);
    if (action === 'downgrade') {
      onDowngrade?.(event);
    }
    return event;
  };

  const downgrade = (): AdaptiveQualityEvent | null => {
    const currentLevel = qualityManager.getLevel();
    if (currentLevel === 'cinematic') {
      qualityManager.setLevel('balanced', { source: 'adaptive' });
      return emit(
        'downgrade',
        'quality-balanced',
        'sustained low FPS downgraded cinematic to balanced'
      );
    }
    if (currentLevel === 'balanced') {
      qualityManager.setLevel('performance', { source: 'adaptive' });
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
    if (!autoRecoveryEnabled() || qualityManager.getLevel() !== 'performance') {
      return null;
    }
    qualityManager.setLevel('balanced', { source: 'adaptive' });
    return emit(
      'recover',
      'quality-balanced',
      'sustained stable FPS recovered performance to balanced'
    );
  };

  const shouldDowngrade = (frameMs: number) => {
    if (isWarmingUp()) {
      lowFpsDurationMs = 0;
      return false;
    }
    const fps = frameMs > 0 ? 1000 / frameMs : Number.POSITIVE_INFINITY;
    const { medianFrameMs, p95FrameMs } = summarizeFrameWindow(frameMsSamples);
    const thresholdFrameMs = 1000 / fpsThreshold;
    const sustainedWindowIsLow =
      medianFrameMs > thresholdFrameMs || p95FrameMs > thresholdFrameMs * 1.5;

    if (fps >= fpsThreshold || !sustainedWindowIsLow) {
      lowFpsDurationMs = 0;
      return false;
    }

    lowFpsDurationMs += frameMs;
    return lowFpsDurationMs >= downgradeAfterMs;
  };

  const shouldRecover = (frameMs: number) => {
    const fps = frameMs > 0 ? 1000 / frameMs : Number.POSITIVE_INFINITY;
    const { p95FrameMs } = summarizeFrameWindow(frameMsSamples);
    const isStable =
      fps >= recoveryFpsThreshold && p95FrameMs <= recoveryP95FrameMs;
    if (!isStable || !autoRecoveryEnabled()) {
      stableDurationMs = 0;
      return false;
    }
    stableDurationMs += frameMs;
    return stableDurationMs >= recoveryAfterMs;
  };

  return {
    update(deltaSeconds: number) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
        return null;
      }
      const frameMs = deltaSeconds * 1000;
      elapsedMs += frameMs;
      frameMsSamples.push(frameMs);
      if (frameMsSamples.length > FRAME_SAMPLE_WINDOW) {
        frameMsSamples.shift();
      }

      if (cooldownRemainingMs > 0) {
        cooldownRemainingMs = Math.max(0, cooldownRemainingMs - frameMs);
      }
      if (recoveryCooldownRemainingMs > 0) {
        recoveryCooldownRemainingMs = Math.max(
          0,
          recoveryCooldownRemainingMs - frameMs
        );
      }

      if (cooldownRemainingMs <= 0 && shouldDowngrade(frameMs)) {
        return downgrade();
      }
      if (recoveryCooldownRemainingMs <= 0 && shouldRecover(frameMs)) {
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
        warmupElapsedMs: Math.min(elapsedMs, warmupMs),
        warmupRemainingMs: getWarmupRemainingMs(),
        isWarmingUp: isWarmingUp(),
        lowFpsDurationMs,
        stableDurationMs,
        cooldownRemainingMs,
        downgradeCount,
        recoveryCount,
        lastAction,
        lastDowngradeReason,
        lastRecoveryReason,
        lastAdaptiveReason,
        selectionSource: getSelectionSource(),
        autoRecoveryEnabled: autoRecoveryEnabled(),
        softwareRenderer: isSoftwareRenderer,
      };
    },
    isExhausted() {
      return (
        qualityManager.getLevel() === 'performance' && pixelRatioStepApplied
      );
    },
  };
}
