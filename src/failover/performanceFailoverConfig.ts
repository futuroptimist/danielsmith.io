export const DISABLE_LOW_FPS_FAILOVER_PARAM = 'disableLowFpsFailover';

const FALSEY_DISABLE_VALUES = new Set(['0', 'false', 'no', 'off']);

export interface ResolvePerformanceFailoverEnabledOptions {
  search?: string;
  disableOverride?: boolean;
}

function shouldDisableFromSearch(search: string | undefined): boolean {
  if (!search) {
    return false;
  }
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return false;
  }
  const value = params.get(DISABLE_LOW_FPS_FAILOVER_PARAM);
  if (value === null) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  if (FALSEY_DISABLE_VALUES.has(normalized)) {
    return false;
  }
  return true;
}

export function resolvePerformanceFailoverEnabled(
  options: ResolvePerformanceFailoverEnabledOptions = {}
): boolean {
  const { disableOverride, search } = options;
  if (typeof disableOverride === 'boolean') {
    return !disableOverride;
  }
  return !shouldDisableFromSearch(search);
}
