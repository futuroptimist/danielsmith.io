export const GITHUB_CACHE_STATES = [
  'disabled',
  'warming',
  'fresh',
  'stale',
  'unavailable',
] as const;

export const GITHUB_CACHE_COMPLETENESS = [
  'complete',
  'partial',
  'none',
] as const;

export const GITHUB_CACHE_FAILURE_CATEGORIES = [
  'configuration',
  'internal',
  'invalid_response',
  'network',
  'not_found',
  'rate_limited',
  'timeout',
  'upstream',
] as const;

export type GitHubCacheState = (typeof GITHUB_CACHE_STATES)[number];
export type GitHubCacheCompleteness =
  (typeof GITHUB_CACHE_COMPLETENESS)[number];
export type GitHubCacheFailureCategory =
  (typeof GITHUB_CACHE_FAILURE_CATEGORIES)[number];

export interface GitHubCacheTelemetry {
  enabled: boolean;
  state: GitHubCacheState;
  lastSuccessfulRefreshAt: string | null;
  dataCompleteness: GitHubCacheCompleteness;
  refreshDurationMs: number | null;
  failureCategories: GitHubCacheFailureCategory[];
  configuredRepositoryCount: number;
  successfulRepositoryCount: number;
  failedRepositoryCount: number;
  retainedRepositoryCount: number;
  oldestDataFetchedAt: string | null;
  retainedDataAgeSeconds: number | null;
}

const MAX_DOCUMENT_BYTES = 262_144;
const MAX_COUNT = 50;
const MAX_DURATION_MS = 3_600_000;
const MAX_AGE_SECONDS = 31_536_000;
const CACHE_KEYS = [
  'enabled',
  'state',
  'lastSuccessfulRefreshAt',
  'dataCompleteness',
  'refreshDurationMs',
  'failureCategories',
  'configuredRepositoryCount',
  'successfulRepositoryCount',
  'failedRepositoryCount',
  'retainedRepositoryCount',
  'oldestDataFetchedAt',
  'retainedDataAgeSeconds',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isBoundedInteger = (value: unknown, maximum: number): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= maximum;

const isCanonicalTimestamp = (value: unknown): value is string | null => {
  if (value === null) return true;
  if (typeof value !== 'string' || value.length !== 24) return false;
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
};

const hasExactKeys = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value).sort();
  return (
    keys.length === CACHE_KEYS.length &&
    keys.every((key, index) => key === [...CACHE_KEYS].sort()[index])
  );
};

/** Parse the published cache health object without making any upstream request. */
export const parseGitHubCacheTelemetry = (
  document: string
): GitHubCacheTelemetry | null => {
  if (new TextEncoder().encode(document).byteLength > MAX_DOCUMENT_BYTES)
    return null;

  let payload: unknown;
  try {
    payload = JSON.parse(document);
  } catch {
    return null;
  }
  if (
    !isRecord(payload) ||
    payload.schemaVersion !== 1 ||
    !isRecord(payload.cache)
  )
    return null;

  const cache = payload.cache;
  if (
    !hasExactKeys(cache) ||
    typeof cache.enabled !== 'boolean' ||
    !GITHUB_CACHE_STATES.includes(cache.state as GitHubCacheState) ||
    !GITHUB_CACHE_COMPLETENESS.includes(
      cache.dataCompleteness as GitHubCacheCompleteness
    ) ||
    !isCanonicalTimestamp(cache.lastSuccessfulRefreshAt) ||
    !isCanonicalTimestamp(cache.oldestDataFetchedAt) ||
    !Array.isArray(cache.failureCategories) ||
    cache.failureCategories.length > GITHUB_CACHE_FAILURE_CATEGORIES.length ||
    !cache.failureCategories.every((category) =>
      GITHUB_CACHE_FAILURE_CATEGORIES.includes(
        category as GitHubCacheFailureCategory
      )
    ) ||
    new Set(cache.failureCategories).size !== cache.failureCategories.length ||
    !(
      cache.refreshDurationMs === null ||
      isBoundedInteger(cache.refreshDurationMs, MAX_DURATION_MS)
    ) ||
    !(
      cache.retainedDataAgeSeconds === null ||
      isBoundedInteger(cache.retainedDataAgeSeconds, MAX_AGE_SECONDS)
    ) ||
    !isBoundedInteger(cache.configuredRepositoryCount, MAX_COUNT) ||
    !isBoundedInteger(cache.successfulRepositoryCount, MAX_COUNT) ||
    !isBoundedInteger(cache.failedRepositoryCount, MAX_COUNT) ||
    !isBoundedInteger(cache.retainedRepositoryCount, MAX_COUNT)
  ) {
    return null;
  }

  return cache as unknown as GitHubCacheTelemetry;
};

const timestampSeconds = (value: string | null): number =>
  value === null ? 0 : Date.parse(value) / 1_000;

/** Serialize only fixed-name, label-free metrics from an already parsed snapshot. */
export const serializeGitHubCacheMetrics = (
  cache: GitHubCacheTelemetry
): string => {
  const metrics: Array<[string, number]> = [
    ['daniel_github_cache_enabled', Number(cache.enabled)],
    [
      'daniel_github_cache_last_successful_refresh_timestamp_seconds',
      timestampSeconds(cache.lastSuccessfulRefreshAt),
    ],
    [
      'daniel_github_cache_oldest_data_timestamp_seconds',
      timestampSeconds(cache.oldestDataFetchedAt),
    ],
    [
      'daniel_github_cache_retained_data_age_seconds',
      cache.retainedDataAgeSeconds ?? 0,
    ],
    [
      'daniel_github_cache_refresh_duration_milliseconds',
      cache.refreshDurationMs ?? 0,
    ],
    [
      'daniel_github_cache_configured_repositories',
      cache.configuredRepositoryCount,
    ],
    [
      'daniel_github_cache_successful_repositories',
      cache.successfulRepositoryCount,
    ],
    ['daniel_github_cache_failed_repositories', cache.failedRepositoryCount],
    [
      'daniel_github_cache_retained_repositories',
      cache.retainedRepositoryCount,
    ],
  ];
  for (const state of GITHUB_CACHE_STATES) {
    metrics.push([
      `daniel_github_cache_state_${state}`,
      Number(cache.state === state),
    ]);
  }
  for (const completeness of GITHUB_CACHE_COMPLETENESS) {
    metrics.push([
      `daniel_github_cache_completeness_${completeness}`,
      Number(cache.dataCompleteness === completeness),
    ]);
  }
  for (const category of GITHUB_CACHE_FAILURE_CATEGORIES) {
    metrics.push([
      `daniel_github_cache_failure_${category}`,
      Number(cache.failureCategories.includes(category)),
    ]);
  }
  return `${metrics.map(([name, value]) => `${name} ${value}`).join('\n')}\n`;
};
