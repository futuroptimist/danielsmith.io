import {
  FORCE_CONTINUOUS_RENDERING_PARAM,
  SOFTWARE_RENDERER_CONTINUOUS_VALUE,
  SOFTWARE_RENDERER_MODE_PARAM,
} from '../../ui/immersiveUrl';
import type { GraphicsQualityLevel } from '../graphics/qualityManager';

import type { RendererInfoSnapshot } from './rendererCapabilities';

export type SoftwareRendererMode = 'safe' | 'continuous';

export interface SoftwareRendererPolicyState {
  mode: SoftwareRendererMode;
  safeMode: boolean;
  renderCadenceFps: number | null;
  reason: string;
}

const SOFTWARE_SAFE_RENDER_CADENCE_FPS = 12;

const isTruthyParam = (value: string | null): boolean => {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

export function resolveSoftwareRendererPolicy(
  rendererInfo: Pick<RendererInfoSnapshot, 'isDangerousSoftwareRenderer'>,
  search: string | URLSearchParams = typeof window !== 'undefined'
    ? window.location.search
    : ''
): SoftwareRendererPolicyState {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const requestedMode = params
    .get(SOFTWARE_RENDERER_MODE_PARAM)
    ?.trim()
    .toLowerCase();
  const forceContinuous = isTruthyParam(
    params.get(FORCE_CONTINUOUS_RENDERING_PARAM)
  );

  if (
    rendererInfo.isDangerousSoftwareRenderer &&
    (requestedMode === SOFTWARE_RENDERER_CONTINUOUS_VALUE || forceContinuous)
  ) {
    return {
      mode: 'continuous',
      safeMode: false,
      renderCadenceFps: null,
      reason:
        'dangerous software renderer continuous rendering override requested',
    };
  }

  if (rendererInfo.isDangerousSoftwareRenderer) {
    return {
      mode: 'safe',
      safeMode: true,
      renderCadenceFps: SOFTWARE_SAFE_RENDER_CADENCE_FPS,
      reason: 'dangerous software renderer uses software-safe capped rendering',
    };
  }

  return {
    mode: 'continuous',
    safeMode: false,
    renderCadenceFps: null,
    reason: 'hardware renderer uses continuous rendering',
  };
}

export interface SoftwareSafeRenderCadenceInput {
  safeMode: boolean;
  hasPresentedFirstFrame: boolean;
  renderRequested: boolean;
  lastRenderMs: number;
  nowMs: number;
  renderIntervalMs: number;
}

export interface SoftwareSafeRenderCadenceDecision {
  shouldRender: boolean;
  renderRequested: boolean;
  lastRenderMs: number;
}

export function resolveSoftwareSafeRenderCadence({
  safeMode,
  hasPresentedFirstFrame,
  renderRequested,
  lastRenderMs,
  nowMs,
  renderIntervalMs,
}: SoftwareSafeRenderCadenceInput): SoftwareSafeRenderCadenceDecision {
  if (!safeMode || !hasPresentedFirstFrame) {
    return {
      shouldRender: true,
      renderRequested: false,
      lastRenderMs: nowMs,
    };
  }

  const hasCadenceElapsed =
    renderIntervalMs > 0 && nowMs - lastRenderMs >= renderIntervalMs;
  if (!renderRequested && !hasCadenceElapsed) {
    return {
      shouldRender: false,
      renderRequested,
      lastRenderMs,
    };
  }

  return {
    shouldRender: true,
    renderRequested: false,
    lastRenderMs: nowMs,
  };
}

export interface QualityPolicyDeviceHints {
  coarsePointer?: boolean;
  mobileLike?: boolean;
  tabletLike?: boolean;
  deviceMemoryGb?: number | null;
  hardwareConcurrency?: number | null;
}

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
  rendererInfo: Pick<
    RendererInfoSnapshot,
    'isSoftwareRenderer' | 'isDangerousSoftwareRenderer'
  >,
  devicePixelRatio: number,
  softwareRendererPolicy: SoftwareRendererPolicyState = resolveSoftwareRendererPolicy(
    rendererInfo
  ),
  deviceHints: QualityPolicyDeviceHints = {}
): QualityPolicyState {
  if (
    rendererInfo.isDangerousSoftwareRenderer &&
    softwareRendererPolicy.safeMode
  ) {
    return {
      initialLevel: 'performance',
      basePixelRatioCap: clampDevicePixelRatio(devicePixelRatio, 0.45, 0.35),
      mirrorEnabled: false,
      mirrorTargetSize: 128,
      mirrorUpdateRateFps: 0,
      ambientUpdateIntervalMs: 250,
      softwareSafeMode: true,
      renderCadenceFps: softwareRendererPolicy.renderCadenceFps,
      reason:
        'dangerous software renderer starts in software-safe performance mode',
    };
  }

  if (rendererInfo.isSoftwareRenderer) {
    return {
      initialLevel: 'performance',
      basePixelRatioCap: clampDevicePixelRatio(devicePixelRatio, 0.75, 0.5),
      mirrorEnabled: false,
      mirrorTargetSize: 192,
      mirrorUpdateRateFps: 0,
      ambientUpdateIntervalMs: 100,
      softwareSafeMode: false,
      renderCadenceFps: null,
      reason: 'software renderer starts in performance mode',
    };
  }

  const isConstrainedMobileOrTablet =
    Boolean(
      deviceHints.coarsePointer ||
        deviceHints.mobileLike ||
        deviceHints.tabletLike
    ) ||
    (typeof deviceHints.deviceMemoryGb === 'number' &&
      deviceHints.deviceMemoryGb > 0 &&
      deviceHints.deviceMemoryGb <= 4) ||
    (typeof deviceHints.hardwareConcurrency === 'number' &&
      deviceHints.hardwareConcurrency > 0 &&
      deviceHints.hardwareConcurrency <= 4);

  if (isConstrainedMobileOrTablet) {
    return {
      initialLevel: 'performance',
      basePixelRatioCap: clampDevicePixelRatio(devicePixelRatio, 0.9, 0.6),
      mirrorEnabled: false,
      mirrorTargetSize: 192,
      mirrorUpdateRateFps: 0,
      ambientUpdateIntervalMs: 100,
      softwareSafeMode: false,
      renderCadenceFps: null,
      reason:
        'coarse-pointer or constrained mobile/tablet hardware starts in performance mode',
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
