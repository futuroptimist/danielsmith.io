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
  oldestDataFetchedAt: string | null;
  retainedDataAgeSeconds: number | null;
  dataCompleteness: GitHubCacheCompleteness;
  refreshDurationMs: number | null;
  failureCategories: GitHubCacheFailureCategory[];
  configuredRepositoryCount: number;
  successfulRepositoryCount: number;
  failedRepositoryCount: number;
  retainedRepositoryCount: number;
}

const MAX_REPOSITORIES = 50;
const MAX_DURATION_MS = 3_600_000;
const MAX_AGE_SECONDS = 31_536_000;
const MAX_METRICS_BYTES = 8_192;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isEnumValue = <T extends string>(
  values: readonly T[],
  value: unknown
): value is T => typeof value === 'string' && values.includes(value as T);

const boundedInteger = (value: unknown, maximum: number): number | null =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= maximum
    ? value
    : null;

const canonicalTimestamp = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 40) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  const canonical = new Date(timestamp).toISOString();
  return canonical === value ? canonical : undefined;
};

/** Parse only the fixed, privacy-safe cache health fields from a published payload. */
export const parseGitHubCacheTelemetry = (
  payload: unknown
): GitHubCacheTelemetry | null => {
  if (
    !isRecord(payload) ||
    payload.schemaVersion !== 1 ||
    !isRecord(payload.cache)
  ) {
    return null;
  }
  const cache = payload.cache;
  const state = cache.state;
  const dataCompleteness = cache.dataCompleteness;
  const lastSuccessfulRefreshAt = canonicalTimestamp(
    cache.lastSuccessfulRefreshAt
  );
  const oldestDataFetchedAt = canonicalTimestamp(cache.oldestDataFetchedAt);
  const retainedDataAgeSeconds =
    cache.retainedDataAgeSeconds === null
      ? null
      : boundedInteger(cache.retainedDataAgeSeconds, MAX_AGE_SECONDS);
  const refreshDurationMs =
    cache.refreshDurationMs === null
      ? null
      : boundedInteger(cache.refreshDurationMs, MAX_DURATION_MS);
  const counts = [
    cache.configuredRepositoryCount,
    cache.successfulRepositoryCount,
    cache.failedRepositoryCount,
    cache.retainedRepositoryCount,
  ].map((value) => boundedInteger(value, MAX_REPOSITORIES));
  if (
    typeof cache.enabled !== 'boolean' ||
    !isEnumValue(GITHUB_CACHE_STATES, state) ||
    !isEnumValue(GITHUB_CACHE_COMPLETENESS, dataCompleteness) ||
    lastSuccessfulRefreshAt === undefined ||
    oldestDataFetchedAt === undefined ||
    (retainedDataAgeSeconds === null) !==
      (cache.retainedDataAgeSeconds === null) ||
    (refreshDurationMs === null) !== (cache.refreshDurationMs === null) ||
    counts.some((value) => value === null) ||
    !Array.isArray(cache.failureCategories) ||
    cache.failureCategories.length > GITHUB_CACHE_FAILURE_CATEGORIES.length ||
    !cache.failureCategories.every((category) =>
      isEnumValue(GITHUB_CACHE_FAILURE_CATEGORIES, category)
    )
  ) {
    return null;
  }
  const categories = [...new Set(cache.failureCategories)].sort();
  if (categories.length !== cache.failureCategories.length) return null;
  const [configured, successful, failed, retained] = counts as number[];
  if (successful + failed !== configured || retained > failed) return null;
  if (cache.enabled !== (state !== 'disabled')) return null;

  return {
    enabled: cache.enabled,
    state,
    lastSuccessfulRefreshAt,
    oldestDataFetchedAt,
    retainedDataAgeSeconds,
    dataCompleteness,
    refreshDurationMs,
    failureCategories: categories,
    configuredRepositoryCount: configured,
    successfulRepositoryCount: successful,
    failedRepositoryCount: failed,
    retainedRepositoryCount: retained,
  };
};

const timestampSeconds = (value: string | null): number =>
  value === null ? 0 : Date.parse(value) / 1000;

/** Serialize a supplied snapshot only. This function has no fetch or client dependency. */
export const serializeGitHubCacheMetrics = (
  payload: unknown
): string | null => {
  const cache = parseGitHubCacheTelemetry(payload);
  if (!cache) return null;
  const lines = [
    `daniel_github_cache_enabled ${Number(cache.enabled)}`,
    `daniel_github_cache_state_info{state="${cache.state}"} 1`,
    `daniel_github_cache_data_completeness_info{completeness="${cache.dataCompleteness}"} 1`,
    `daniel_github_cache_last_success_timestamp_seconds ${timestampSeconds(cache.lastSuccessfulRefreshAt)}`,
    `daniel_github_cache_oldest_data_timestamp_seconds ${timestampSeconds(cache.oldestDataFetchedAt)}`,
    `daniel_github_cache_retained_data_age_seconds ${cache.retainedDataAgeSeconds ?? 0}`,
    `daniel_github_cache_refresh_duration_seconds ${(cache.refreshDurationMs ?? 0) / 1000}`,
    `daniel_github_cache_repositories{result="configured"} ${cache.configuredRepositoryCount}`,
    `daniel_github_cache_repositories{result="successful"} ${cache.successfulRepositoryCount}`,
    `daniel_github_cache_repositories{result="failed"} ${cache.failedRepositoryCount}`,
    `daniel_github_cache_repositories{result="retained"} ${cache.retainedRepositoryCount}`,
    ...cache.failureCategories.map(
      (category) =>
        `daniel_github_cache_refresh_failure_info{category="${category}"} 1`
    ),
  ];
  const serialized = `${lines.join('\n')}\n`;
  return new TextEncoder().encode(serialized).byteLength <= MAX_METRICS_BYTES
    ? serialized
    : null;
};
