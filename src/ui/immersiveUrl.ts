export const IMMERSIVE_MODE_PARAM = 'mode';
export const IMMERSIVE_MODE_VALUE = 'immersive';
export const DISABLE_PERFORMANCE_FAILOVER_PARAM = 'disablePerformanceFailover';
export const DISABLE_PERFORMANCE_FAILOVER_VALUE = '1';
export const TEXT_MODE_VALUE = 'text';
export type ModeSelection =
  | typeof IMMERSIVE_MODE_VALUE
  | typeof TEXT_MODE_VALUE
  | null;

type QueryParamValue = string | number | boolean | null | undefined;

interface LocationLike {
  pathname: string;
  search?: string;
  hash?: string | null;
}

type UrlLike = string | LocationLike | URL | undefined;

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

interface UrlParts {
  base: string;
  search: string;
  hash: string;
}

const splitHash = (value: string): { withoutHash: string; hash: string } => {
  const hashIndex = value.indexOf('#');
  if (hashIndex === -1) {
    return { withoutHash: value, hash: '' };
  }
  return {
    withoutHash: value.slice(0, hashIndex),
    hash: value.slice(hashIndex),
  };
};

const splitSearch = (value: string): { base: string; search: string } => {
  const queryIndex = value.indexOf('?');
  if (queryIndex === -1) {
    return { base: value, search: '' };
  }
  return {
    base: value.slice(0, queryIndex),
    search: value.slice(queryIndex),
  };
};

const normalizeBasePath = (base: string): string =>
  base && base.length > 0 ? base : '/';

const normalizeUrlParts = (input: UrlLike): UrlParts => {
  if (input instanceof URL) {
    return {
      base: `${input.origin}${input.pathname}`,
      search: input.search,
      hash: input.hash,
    };
  }
  if (typeof input === 'string') {
    const { withoutHash, hash } = splitHash(input);
    const { base, search } = splitSearch(withoutHash);
    return { base: normalizeBasePath(base), search, hash };
  }
  const { pathname, search, hash } = normalizeLocation(input);
  const base = normalizeBasePath(pathname);
  return { base, search, hash };
};

const toParams = (search: string): URLSearchParams =>
  new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

type ExtraParams = Record<string, QueryParamValue> | undefined;

interface BuildModeUrlOptions {
  includePerformanceBypass: boolean;
  extraParams?: ExtraParams;
}

const applyExtraParams = (
  params: URLSearchParams,
  extraParams?: ExtraParams
) => {
  if (!extraParams) {
    return;
  }
  for (const [key, value] of Object.entries(extraParams)) {
    if (value === null || value === undefined) {
      params.delete(key);
      continue;
    }
    params.set(key, String(value));
  }
};

const buildModeUrl = (
  input: UrlLike,
  modeValue: string,
  options: BuildModeUrlOptions
) => {
  const { base, search, hash } = normalizeUrlParts(input);
  const params = toParams(search);
  const enforceModeParams = () => {
    params.set(IMMERSIVE_MODE_PARAM, modeValue);
    if (options.includePerformanceBypass) {
      params.set(
        DISABLE_PERFORMANCE_FAILOVER_PARAM,
        DISABLE_PERFORMANCE_FAILOVER_VALUE
      );
    } else {
      params.delete(DISABLE_PERFORMANCE_FAILOVER_PARAM);
    }
  };

  enforceModeParams();
  applyExtraParams(params, options.extraParams);
  enforceModeParams();
  const query = params.toString();
  return `${base}${query ? `?${query}` : ''}${hash ?? ''}`;
};

export const createImmersiveModeUrl = (
  input?: UrlLike,
  extraParams?: ExtraParams
) =>
  buildModeUrl(input, IMMERSIVE_MODE_VALUE, {
    includePerformanceBypass: true,
    extraParams,
  });

export const createTextModeUrl = (input?: UrlLike, extraParams?: ExtraParams) =>
  buildModeUrl(input, TEXT_MODE_VALUE, {
    includePerformanceBypass: false,
    extraParams,
  });

const toSearchParams = (value: string | URLSearchParams): URLSearchParams =>
  typeof value === 'string' ? new URLSearchParams(value) : value;

export const getModeFromSearch = (
  value: string | URLSearchParams
): ModeSelection => {
  const params = toSearchParams(value);
  const mode = params.get(IMMERSIVE_MODE_PARAM);
  if (mode === IMMERSIVE_MODE_VALUE) {
    return IMMERSIVE_MODE_VALUE;
  }
  if (mode === TEXT_MODE_VALUE) {
    return TEXT_MODE_VALUE;
  }
  return null;
};

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
