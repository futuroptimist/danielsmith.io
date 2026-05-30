import type { GraphicsQualityLevel } from '../graphics/qualityManager';

import type { RendererInfoSnapshot } from './rendererCapabilities';

export interface QualityPolicyState {
  initialLevel: GraphicsQualityLevel;
  basePixelRatioCap: number;
  mirrorEnabled: boolean;
  mirrorTargetSize: number;
  mirrorUpdateRateFps: number;
  ambientUpdateIntervalMs: number;
  softwareSafeMode: boolean;
  renderCadenceFps: number | null;
  reason: string;
}

export function clampDevicePixelRatio(
  devicePixelRatio: number,
  cap: number,
  floor = 0.75
): number {
  const safeRatio =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  const safeCap = Number.isFinite(cap) && cap > 0 ? cap : 1;
  return Math.max(floor, Math.min(safeRatio, safeCap));
}

export function resolveResizedBasePixelRatio(
  devicePixelRatio: number,
  maxPolicyCap: number,
  adaptivePixelRatioCap = Number.POSITIVE_INFINITY
): number {
  const resizedPixelRatio = clampDevicePixelRatio(
    devicePixelRatio,
    maxPolicyCap
  );
  const safeAdaptiveCap =
    Number.isFinite(adaptivePixelRatioCap) && adaptivePixelRatioCap > 0
      ? adaptivePixelRatioCap
      : Number.POSITIVE_INFINITY;
  return Math.min(resizedPixelRatio, safeAdaptiveCap);
}

export function resolveInitialQualityPolicy(
  rendererInfo: Pick<RendererInfoSnapshot, 'isSoftwareRenderer'> &
    Partial<Pick<RendererInfoSnapshot, 'isDangerousSoftwareRenderer'>>,
  devicePixelRatio: number
): QualityPolicyState {
  if (rendererInfo.isDangerousSoftwareRenderer === true) {
    return {
      initialLevel: 'performance',
      basePixelRatioCap: clampDevicePixelRatio(devicePixelRatio, 0.5, 0.35),
      mirrorEnabled: false,
      mirrorTargetSize: 128,
      mirrorUpdateRateFps: 0,
      ambientUpdateIntervalMs: 250,
      softwareSafeMode: true,
      renderCadenceFps: 15,
      reason:
        'dangerous software renderer starts with software-safe guardrails',
    };
  }

  if (rendererInfo.isSoftwareRenderer) {
    return {
      initialLevel: 'performance',
      basePixelRatioCap: clampDevicePixelRatio(devicePixelRatio, 1, 0.75),
      mirrorEnabled: false,
      mirrorTargetSize: 192,
      mirrorUpdateRateFps: 0,
      ambientUpdateIntervalMs: 100,
      softwareSafeMode: false,
      renderCadenceFps: null,
      reason: 'software renderer starts in performance mode',
    };
  }

  return {
    initialLevel: 'balanced',
    basePixelRatioCap: clampDevicePixelRatio(devicePixelRatio, 1.25, 0.75),
    mirrorEnabled: true,
    mirrorTargetSize: 320,
    mirrorUpdateRateFps: 8,
    ambientUpdateIntervalMs: 33,
    softwareSafeMode: false,
    renderCadenceFps: null,
    reason: 'default desktop path balances fidelity with pixel cost',
  };
}

export function getQualityFeaturePolicy(
  level: GraphicsQualityLevel,
  isSoftwareRenderer = false,
  isDangerousSoftwareRenderer = false
): Pick<
  QualityPolicyState,
  | 'mirrorEnabled'
  | 'mirrorTargetSize'
  | 'mirrorUpdateRateFps'
  | 'ambientUpdateIntervalMs'
> {
  if (isDangerousSoftwareRenderer) {
    return {
      mirrorEnabled: false,
      mirrorTargetSize: 128,
      mirrorUpdateRateFps: 0,
      ambientUpdateIntervalMs: 250,
    };
  }
  if (isSoftwareRenderer || level === 'performance') {
    return {
      mirrorEnabled: false,
      mirrorTargetSize: 192,
      mirrorUpdateRateFps: 0,
      ambientUpdateIntervalMs: 100,
    };
  }
  if (level === 'balanced') {
    return {
      mirrorEnabled: true,
      mirrorTargetSize: 320,
      mirrorUpdateRateFps: 8,
      ambientUpdateIntervalMs: 33,
    };
  }
  return {
    mirrorEnabled: true,
    mirrorTargetSize: 512,
    mirrorUpdateRateFps: 15,
    ambientUpdateIntervalMs: 16,
  };
}
