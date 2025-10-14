export const IMMERSIVE_MODE_PARAM = 'mode';
export const IMMERSIVE_MODE_VALUE = 'immersive';
export const DISABLE_PERFORMANCE_FAILOVER_PARAM = 'disablePerformanceFailover';
export const DISABLE_PERFORMANCE_FAILOVER_VALUE = '1';

interface LocationLike {
  pathname: string;
  search?: string;
  hash?: string | null;
}

const normalizeLocation = (location?: LocationLike) => {
  if (location) {
    return {
      pathname: location.pathname,
      search: location.search ?? '',
      hash: location.hash ?? '',
    };
  }

  if (typeof window === 'undefined') {
    return { pathname: '/', search: '', hash: '' };
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash ?? '',
  };
};

export const createImmersiveModeUrl = (location?: LocationLike) => {
  const { pathname, search, hash } = normalizeLocation(location);
  const params = new URLSearchParams(search);
  params.set(IMMERSIVE_MODE_PARAM, IMMERSIVE_MODE_VALUE);
  params.set(
    DISABLE_PERFORMANCE_FAILOVER_PARAM,
    DISABLE_PERFORMANCE_FAILOVER_VALUE
  );
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
};

const toSearchParams = (value: string | URLSearchParams): URLSearchParams =>
  typeof value === 'string' ? new URLSearchParams(value) : value;

export const hasImmersiveOverride = (value: string | URLSearchParams) => {
  const params = toSearchParams(value);
  return params.get(IMMERSIVE_MODE_PARAM) === IMMERSIVE_MODE_VALUE;
};

export const hasPerformanceFailoverBypass = (
  value: string | URLSearchParams
) => {
  const params = toSearchParams(value);
  return (
    params.get(DISABLE_PERFORMANCE_FAILOVER_PARAM) ===
    DISABLE_PERFORMANCE_FAILOVER_VALUE
  );
};

export const shouldDisablePerformanceFailover = (
  value: string | URLSearchParams
) => {
  const params = toSearchParams(value);
  return hasImmersiveOverride(params) || hasPerformanceFailoverBypass(params);
};
