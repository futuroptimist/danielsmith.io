import type { RendererInfoSnapshot } from './rendererCapabilities';

export const SOFTWARE_RENDERER_MODE_PARAM = 'softwareRendererMode';
export const SOFTWARE_RENDERER_MODE_SAFE = 'safe';
export const SOFTWARE_RENDERER_MODE_CONTINUOUS = 'continuous';

export type SoftwareRendererMode =
  | typeof SOFTWARE_RENDERER_MODE_SAFE
  | typeof SOFTWARE_RENDERER_MODE_CONTINUOUS;

export interface SoftwareRendererModeState {
  dangerousRenderer: boolean;
  softwareSafeMode: SoftwareRendererMode | 'off';
  continuousRendering: boolean;
  maxRenderFps: number | null;
  reason: string;
}

const normalizeMode = (value: string | null): SoftwareRendererMode | null => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === SOFTWARE_RENDERER_MODE_CONTINUOUS) {
    return SOFTWARE_RENDERER_MODE_CONTINUOUS;
  }
  if (normalized === SOFTWARE_RENDERER_MODE_SAFE) {
    return SOFTWARE_RENDERER_MODE_SAFE;
  }
  return null;
};

export function getSoftwareRendererModeFromSearch(
  value: string | URLSearchParams
): SoftwareRendererMode | null {
  const params = typeof value === 'string' ? new URLSearchParams(value) : value;
  return normalizeMode(params.get(SOFTWARE_RENDERER_MODE_PARAM));
}

export function resolveSoftwareRendererModeState(
  rendererInfo: Pick<RendererInfoSnapshot, 'isDangerousSoftwareRenderer'>,
  requestedMode: SoftwareRendererMode | null
): SoftwareRendererModeState {
  if (!rendererInfo.isDangerousSoftwareRenderer) {
    return {
      dangerousRenderer: false,
      softwareSafeMode: 'off',
      continuousRendering: true,
      maxRenderFps: null,
      reason: 'hardware renderer or non-dangerous renderer uses normal cadence',
    };
  }

  if (requestedMode === SOFTWARE_RENDERER_MODE_CONTINUOUS) {
    return {
      dangerousRenderer: true,
      softwareSafeMode: SOFTWARE_RENDERER_MODE_CONTINUOUS,
      continuousRendering: true,
      maxRenderFps: null,
      reason: 'explicit software renderer continuous rendering override',
    };
  }

  return {
    dangerousRenderer: true,
    softwareSafeMode: SOFTWARE_RENDERER_MODE_SAFE,
    continuousRendering: false,
    maxRenderFps: 15,
    reason: 'dangerous software renderer capped to safe immersive cadence',
  };
}
