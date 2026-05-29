import type { GraphicsQualityLevel } from '../graphics/qualityManager';

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
  downgradeAfterMs?: number;
  cooldownMs?: number;
  minBasePixelRatio?: number;
  onDowngrade?: (event: AdaptiveQualityDowngradeEvent) => void;
}

export interface AdaptiveQualityDowngradeEvent {
  step: string;
  level: GraphicsQualityLevel;
  basePixelRatio: number;
  reason: string;
  downgradeCount: number;
}

export interface AdaptiveQualityController {
  update(deltaSeconds: number): AdaptiveQualityDowngradeEvent | null;
  getDowngradeCount(): number;
  getLastReason(): string | null;
  isExhausted(): boolean;
}

export function createAdaptiveQualityController({
  qualityManager,
  getBasePixelRatio,
  setBasePixelRatio,
  fpsThreshold = 30,
  downgradeAfterMs = 1200,
  cooldownMs = 2500,
  minBasePixelRatio = 0.75,
  onDowngrade,
}: AdaptiveQualityControllerOptions): AdaptiveQualityController {
  let lowFpsDurationMs = 0;
  let cooldownRemainingMs = 0;
  let downgradeCount = 0;
  let lastReason: string | null = null;
  let pixelRatioStepApplied = false;

  const emit = (
    step: string,
    reason: string
  ): AdaptiveQualityDowngradeEvent => {
    downgradeCount += 1;
    lastReason = reason;
    lowFpsDurationMs = 0;
    cooldownRemainingMs = cooldownMs;
    const event = {
      step,
      level: qualityManager.getLevel(),
      basePixelRatio: getBasePixelRatio(),
      reason,
      downgradeCount,
    };
    onDowngrade?.(event);
    return event;
  };

  const downgrade = (): AdaptiveQualityDowngradeEvent | null => {
    const currentLevel = qualityManager.getLevel();
    if (currentLevel === 'cinematic') {
      qualityManager.setLevel('balanced');
      return emit(
        'quality-balanced',
        'low FPS downgraded cinematic to balanced'
      );
    }
    if (currentLevel === 'balanced') {
      qualityManager.setLevel('performance');
      return emit(
        'quality-performance',
        'low FPS downgraded balanced to performance'
      );
    }

    const currentRatio = getBasePixelRatio();
    if (!pixelRatioStepApplied && currentRatio > minBasePixelRatio + 0.01) {
      pixelRatioStepApplied = true;
      setBasePixelRatio(Math.max(minBasePixelRatio, currentRatio * 0.8));
      qualityManager.setBasePixelRatio(getBasePixelRatio());
      return emit(
        'pixel-ratio',
        'low FPS reduced base DPR after performance preset'
      );
    }

    return null;
  };

  return {
    update(deltaSeconds: number) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
        return null;
      }
      const frameMs = deltaSeconds * 1000;
      if (cooldownRemainingMs > 0) {
        cooldownRemainingMs = Math.max(0, cooldownRemainingMs - frameMs);
        return null;
      }
      const fps = frameMs > 0 ? 1000 / frameMs : Number.POSITIVE_INFINITY;
      if (fps >= fpsThreshold) {
        lowFpsDurationMs = 0;
        return null;
      }
      lowFpsDurationMs += frameMs;
      if (lowFpsDurationMs < downgradeAfterMs) {
        return null;
      }
      return downgrade();
    },
    getDowngradeCount() {
      return downgradeCount;
    },
    getLastReason() {
      return lastReason;
    },
    isExhausted() {
      return (
        qualityManager.getLevel() === 'performance' && pixelRatioStepApplied
      );
    },
  };
}
