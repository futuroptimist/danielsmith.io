import type { AdaptiveQualityFeatureState } from '../../systems/performance/adaptiveQuality';
import type { GraphicsQualityLevel } from '../graphics/qualityManager';

export interface SelfieMirrorPolicyInput {
  qualityLevel: GraphicsQualityLevel;
  adaptiveState?: Pick<
    AdaptiveQualityFeatureState,
    'throttleMirror' | 'disableMirror'
  >;
  distanceToPlayer: number;
  elapsedMs: number;
  lastRenderMs: number | null;
  maxVisibleDistance?: number;
}

export interface SelfieMirrorPolicyDecision {
  shouldRender: boolean;
  updateRate: number;
  renderTargetSize: number;
  reason: 'disabled' | 'too-far' | 'throttled' | 'ready';
}

export function getSelfieMirrorPolicy({
  qualityLevel,
  adaptiveState,
  distanceToPlayer,
  elapsedMs,
  lastRenderMs,
  maxVisibleDistance = 28,
}: SelfieMirrorPolicyInput): SelfieMirrorPolicyDecision {
  if (adaptiveState?.disableMirror || qualityLevel === 'performance') {
    return {
      shouldRender: false,
      updateRate: 0,
      renderTargetSize: 0,
      reason: 'disabled',
    };
  }

  if (distanceToPlayer > maxVisibleDistance) {
    return {
      shouldRender: false,
      updateRate: qualityLevel === 'cinematic' ? 12 : 6,
      renderTargetSize: qualityLevel === 'cinematic' ? 512 : 256,
      reason: 'too-far',
    };
  }

  const updateRate =
    qualityLevel === 'cinematic' && !adaptiveState?.throttleMirror ? 15 : 6;
  const renderTargetSize = qualityLevel === 'cinematic' ? 512 : 256;
  const intervalMs = 1000 / updateRate;
  if (lastRenderMs !== null && elapsedMs - lastRenderMs < intervalMs) {
    return {
      shouldRender: false,
      updateRate,
      renderTargetSize,
      reason: 'throttled',
    };
  }

  return {
    shouldRender: true,
    updateRate,
    renderTargetSize,
    reason: 'ready',
  };
}
