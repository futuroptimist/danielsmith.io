import type { GraphicsQualityLevel } from './qualityManager';
import type { RendererInfoSnapshot } from './rendererCapabilities';

export interface DprPolicyInput {
  devicePixelRatio: number;
  rendererTier: RendererInfoSnapshot['tier'];
  quality: GraphicsQualityLevel;
  adaptiveStep?: number;
}

export interface MirrorPolicy {
  enabled: boolean;
  targetSize: number;
  updateRateFps: number;
  reason: string;
}

export function selectInitialGraphicsQuality(
  rendererInfo: Pick<RendererInfoSnapshot, 'tier'>,
  storedLevel?: GraphicsQualityLevel | null
): GraphicsQualityLevel {
  if (rendererInfo.tier === 'software') {
    return 'performance';
  }
  return storedLevel ?? 'balanced';
}

export function clampDpr({
  devicePixelRatio,
  rendererTier,
  quality,
  adaptiveStep = 0,
}: DprPolicyInput): number {
  const safeDeviceDpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  const qualityCap: Record<GraphicsQualityLevel, number> = {
    cinematic: 1.5,
    balanced: 1.25,
    performance: 1,
  };
  const tierCap = rendererTier === 'software' ? 0.75 : qualityCap[quality];
  const adaptiveReduction = Math.max(0, adaptiveStep) * 0.15;
  const cap = Math.max(0.5, tierCap - adaptiveReduction);
  return Math.max(0.5, Math.min(safeDeviceDpr, cap));
}

export function shouldUseComposer(input: {
  bloomEnabled: boolean;
  motionBlurEnabled: boolean;
}): boolean {
  return input.bloomEnabled || input.motionBlurEnabled;
}

export function getActivePostprocessingPassCount(input: {
  bloomEnabled: boolean;
  motionBlurEnabled: boolean;
}): number {
  return Number(input.bloomEnabled) + Number(input.motionBlurEnabled);
}

export function selectMirrorPolicy(input: {
  quality: GraphicsQualityLevel;
  rendererTier: RendererInfoSnapshot['tier'];
  playerDistance?: number;
}): MirrorPolicy {
  if (input.rendererTier === 'software') {
    return {
      enabled: false,
      targetSize: 128,
      updateRateFps: 0,
      reason: 'disabled for software renderer',
    };
  }
  if (input.quality === 'performance') {
    return {
      enabled: false,
      targetSize: 128,
      updateRateFps: 0,
      reason: 'disabled in performance quality',
    };
  }
  const distance = input.playerDistance ?? 0;
  if (distance > 18) {
    return {
      enabled: false,
      targetSize: input.quality === 'cinematic' ? 512 : 256,
      updateRateFps: 0,
      reason: 'player outside mirror update radius',
    };
  }
  if (input.quality === 'balanced') {
    return {
      enabled: true,
      targetSize: 256,
      updateRateFps: 8,
      reason: 'balanced throttle',
    };
  }
  return {
    enabled: true,
    targetSize: 512,
    updateRateFps: 15,
    reason: 'cinematic throttle',
  };
}
