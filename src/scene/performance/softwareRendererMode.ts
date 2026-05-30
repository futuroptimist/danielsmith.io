export type SoftwareRendererMode = 'safe' | 'continuous';

export const SOFTWARE_RENDERER_MODE_PARAM = 'softwareRendererMode';
export const FORCE_CONTINUOUS_RENDERING_PARAM = 'forceContinuousRendering';

export interface SoftwareRendererModePolicy {
  mode: SoftwareRendererMode;
  safeMode: boolean;
  renderCadenceFps: number | null;
  reason: string;
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const normalize = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? null;

export function resolveSoftwareRendererMode(
  search: string | URLSearchParams,
  isDangerousSoftwareRenderer: boolean,
  defaultSafeCadenceFps = 15
): SoftwareRendererModePolicy {
  if (!isDangerousSoftwareRenderer) {
    return {
      mode: 'continuous',
      safeMode: false,
      renderCadenceFps: null,
      reason: 'hardware or non-dangerous renderer uses normal cadence',
    };
  }

  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  const explicitMode = normalize(params.get(SOFTWARE_RENDERER_MODE_PARAM));
  const forceContinuous = TRUE_VALUES.has(
    normalize(params.get(FORCE_CONTINUOUS_RENDERING_PARAM)) ?? ''
  );

  if (explicitMode === 'continuous' || forceContinuous) {
    return {
      mode: 'continuous',
      safeMode: false,
      renderCadenceFps: null,
      reason: 'explicit software renderer continuous override requested',
    };
  }

  return {
    mode: 'safe',
    safeMode: true,
    renderCadenceFps: defaultSafeCadenceFps,
    reason: 'dangerous software renderer defaults to capped safe cadence',
  };
}
