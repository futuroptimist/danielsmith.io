import type { GraphicsQualityLevel } from '../graphics/qualityManager';

import type { RendererInfoSnapshot } from './rendererCapabilities';
import type { SoftwareRendererModeState } from './softwareRendererMode';

export interface QualityPolicyState {
  initialLevel: GraphicsQualityLevel;
  basePixelRatioCap: number;
  mirrorEnabled: boolean;
  mirrorTargetSize: number;
  mirrorUpdateRateFps: number;
  ambientUpdateIntervalMs: number;
  pixelRatioFloor: number;
  maxRenderFps: number | null;
  softwareSafeMode: SoftwareRendererModeState['softwareSafeMode'];
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
  adaptivePixelRatioCap = Number.POSITIVE_INFINITY,
  floor = 0.75
): number {
  const resizedPixelRatio = clampDevicePixelRatio(
    devicePixelRatio,
    maxPolicyCap,
    floor
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
  devicePixelRatio: number,
  softwareRendererMode?: SoftwareRendererModeState
): QualityPolicyState {
  if (softwareRendererMode?.dangerousRenderer) {
    const continuous = softwareRendererMode.continuousRendering;
    return {
      initialLevel: 'performance',
      basePixelRatioCap: clampDevicePixelRatio(
        devicePixelRatio,
        continuous ? 0.5 : 0.35,
        0.35
      ),
      mirrorEnabled: false,
      mirrorTargetSize: 128,
      mirrorUpdateRateFps: 0,
      ambientUpdateIntervalMs: 150,
      pixelRatioFloor: 0.35,
      maxRenderFps: softwareRendererMode.maxRenderFps,
      softwareSafeMode: softwareRendererMode.softwareSafeMode,
      reason: softwareRendererMode.reason,
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
      pixelRatioFloor: 0.75,
      maxRenderFps: null,
      softwareSafeMode: 'off',
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
    pixelRatioFloor: 0.75,
    maxRenderFps: null,
    softwareSafeMode: 'off',
    reason: 'default desktop path balances fidelity with pixel cost',
  };
}

export function getQualityFeaturePolicy(
  level: GraphicsQualityLevel,
  isSoftwareRenderer = false
): Pick<
  QualityPolicyState,
  | 'mirrorEnabled'
  | 'mirrorTargetSize'
  | 'mirrorUpdateRateFps'
  | 'ambientUpdateIntervalMs'
> {
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
