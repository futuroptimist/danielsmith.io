import type { RendererInfoSnapshot } from './rendererCapabilities';

export const SOFTWARE_RENDERER_MODE_PARAM = 'softwareRendererMode';
export const SOFTWARE_RENDERER_SAFE_MODE = 'safe';
export const SOFTWARE_RENDERER_CONTINUOUS_MODE = 'continuous';
export const FORCE_CONTINUOUS_RENDERING_PARAM = 'forceContinuousRendering';
export const FORCE_CONTINUOUS_RENDERING_VALUE = '1';
export const SOFTWARE_SAFE_RENDER_FPS = 12;

export type SoftwareRendererMode =
  | typeof SOFTWARE_RENDERER_SAFE_MODE
  | typeof SOFTWARE_RENDERER_CONTINUOUS_MODE;

export interface SoftwareRendererPolicyState {
  dangerousRenderer: boolean;
  softwareSafeMode: boolean;
  continuousRendering: boolean;
  renderCadenceFps: number | null;
  pixelRatioCap: number | null;
  reason: string;
}

const normalizeParam = (value: string | null | undefined): string | null => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
};

export function resolveSoftwareRendererMode(
  search: string | URLSearchParams = typeof window === 'undefined'
    ? ''
    : window.location.search
): SoftwareRendererMode | null {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const explicitMode = normalizeParam(params.get(SOFTWARE_RENDERER_MODE_PARAM));
  if (explicitMode === SOFTWARE_RENDERER_CONTINUOUS_MODE) {
    return SOFTWARE_RENDERER_CONTINUOUS_MODE;
  }
  if (explicitMode === SOFTWARE_RENDERER_SAFE_MODE) {
    return SOFTWARE_RENDERER_SAFE_MODE;
  }
  if (
    normalizeParam(params.get(FORCE_CONTINUOUS_RENDERING_PARAM)) ===
    FORCE_CONTINUOUS_RENDERING_VALUE
  ) {
    return SOFTWARE_RENDERER_CONTINUOUS_MODE;
  }
  return null;
}

export function resolveSoftwareRendererPolicy(
  rendererInfo: Pick<
    RendererInfoSnapshot,
    'isSoftwareRenderer' | 'isDangerousSoftwareRenderer' | 'reason'
  >,
  search?: string | URLSearchParams
): SoftwareRendererPolicyState {
  const requestedMode = resolveSoftwareRendererMode(search);
  const dangerousRenderer = rendererInfo.isDangerousSoftwareRenderer === true;
  if (!dangerousRenderer) {
    return {
      dangerousRenderer: false,
      softwareSafeMode: false,
      continuousRendering: true,
      renderCadenceFps: null,
      pixelRatioCap: null,
      reason: rendererInfo.isSoftwareRenderer
        ? 'software renderer is not on the dangerous renderer list'
        : 'hardware renderer path',
    };
  }

  const continuousRendering =
    requestedMode === SOFTWARE_RENDERER_CONTINUOUS_MODE;
  return {
    dangerousRenderer,
    softwareSafeMode: !continuousRendering,
    continuousRendering,
    renderCadenceFps: continuousRendering ? null : SOFTWARE_SAFE_RENDER_FPS,
    pixelRatioCap: continuousRendering ? null : 0.4,
    reason: continuousRendering
      ? 'explicit software renderer continuous rendering override'
      : `dangerous software renderer guardrails active: ${rendererInfo.reason}`,
  };
}

export function shouldRenderSoftwareSafeFrame(input: {
  nowMs: number;
  lastRenderMs: number | null;
  cadenceFps: number | null;
  dirty: boolean;
}): boolean {
  if (!input.cadenceFps || input.cadenceFps <= 0) {
    return true;
  }
  if (input.lastRenderMs === null || input.dirty) {
    return true;
  }
  return input.nowMs - input.lastRenderMs >= 1000 / input.cadenceFps;
}
