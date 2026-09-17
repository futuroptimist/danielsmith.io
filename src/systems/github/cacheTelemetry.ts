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

type CacheState = (typeof GITHUB_CACHE_STATES)[number];
type DataCompleteness = (typeof GITHUB_CACHE_COMPLETENESS)[number];
type FailureCategory = (typeof GITHUB_CACHE_FAILURE_CATEGORIES)[number];

export interface GitHubCacheTelemetry {
  enabled: boolean;
  state: CacheState;
  lastSuccessfulRefreshAt: string | null;
  dataCompleteness: DataCompleteness;
  refreshDurationMs: number | null;
  failureCategories: FailureCategory[];
  configuredRepositoryCount: number;
  successfulRepositoryCount: number;
  failedRepositoryCount: number;
  retainedRepositoryCount: number;
  oldestDataFetchedAt: string | null;
  retainedDataAgeSeconds: number | null;
}

const MAX_REPOSITORIES = 50;
const MAX_DURATION_MS = 3_600_000;
const MAX_AGE_SECONDS = 31_536_000;
const MAX_SERIALIZED_BYTES = 8_192;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isEnum = <T extends string>(
  values: readonly T[],
  value: unknown
): value is T => typeof value === 'string' && values.includes(value as T);

const isBoundedInteger = (value: unknown, maximum: number): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= maximum;

const isCanonicalTimestamp = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length !== 24) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

const isTimestampOrNull = (value: unknown): value is string | null =>
  value === null || isCanonicalTimestamp(value);

/**
 * Validate the static cache document without retaining repository data or unknown fields.
 * This function is deliberately pure: callers must fetch/read the document separately.
 */
export function readGitHubCacheTelemetry(
  document: unknown
): GitHubCacheTelemetry | null {
  if (
    !isRecord(document) ||
    document.schemaVersion !== 1 ||
    !isRecord(document.cache)
  ) {
    return null;
  }

  const cache = document.cache;
  if (
    typeof cache.enabled !== 'boolean' ||
    !isEnum(GITHUB_CACHE_STATES, cache.state) ||
    !isTimestampOrNull(cache.lastSuccessfulRefreshAt) ||
    !isEnum(GITHUB_CACHE_COMPLETENESS, cache.dataCompleteness) ||
    !(
      cache.refreshDurationMs === null ||
      isBoundedInteger(cache.refreshDurationMs, MAX_DURATION_MS)
    ) ||
    !Array.isArray(cache.failureCategories) ||
    cache.failureCategories.length > GITHUB_CACHE_FAILURE_CATEGORIES.length ||
    !cache.failureCategories.every((category) =>
      isEnum(GITHUB_CACHE_FAILURE_CATEGORIES, category)
    ) ||
    new Set(cache.failureCategories).size !== cache.failureCategories.length ||
    !isBoundedInteger(cache.configuredRepositoryCount, MAX_REPOSITORIES) ||
    !isBoundedInteger(cache.successfulRepositoryCount, MAX_REPOSITORIES) ||
    !isBoundedInteger(cache.failedRepositoryCount, MAX_REPOSITORIES) ||
    !isBoundedInteger(cache.retainedRepositoryCount, MAX_REPOSITORIES) ||
    !isTimestampOrNull(cache.oldestDataFetchedAt) ||
    !(
      cache.retainedDataAgeSeconds === null ||
      isBoundedInteger(cache.retainedDataAgeSeconds, MAX_AGE_SECONDS)
    )
  ) {
    return null;
  }

  const expectedCompleteness: Record<CacheState, DataCompleteness> = {
    disabled: 'none',
    warming: 'none',
    fresh: 'complete',
    stale: 'partial',
    unavailable: 'none',
  };
  if (
    cache.enabled !== (cache.state !== 'disabled') ||
    cache.dataCompleteness !== expectedCompleteness[cache.state] ||
    cache.successfulRepositoryCount + cache.failedRepositoryCount !==
      cache.configuredRepositoryCount ||
    cache.retainedRepositoryCount > cache.failedRepositoryCount
  ) {
    return null;
  }

  return {
    enabled: cache.enabled,
    state: cache.state,
    lastSuccessfulRefreshAt: cache.lastSuccessfulRefreshAt,
    dataCompleteness: cache.dataCompleteness,
    refreshDurationMs: cache.refreshDurationMs,
    failureCategories: [...cache.failureCategories].sort(),
    configuredRepositoryCount: cache.configuredRepositoryCount,
    successfulRepositoryCount: cache.successfulRepositoryCount,
    failedRepositoryCount: cache.failedRepositoryCount,
    retainedRepositoryCount: cache.retainedRepositoryCount,
    oldestDataFetchedAt: cache.oldestDataFetchedAt,
    retainedDataAgeSeconds: cache.retainedDataAgeSeconds,
  };
}

const timestampSeconds = (value: string): number => Date.parse(value) / 1_000;

/** Serialize only fixed-name gauges and bounded enum labels from validated existing state. */
export function serializeGitHubCacheMetrics(document: unknown): string | null {
  const cache = readGitHubCacheTelemetry(document);
  if (!cache) return null;

  const lines = [
    '# HELP daniel_github_cache_enabled Whether the optional cache is enabled.',
    '# TYPE daniel_github_cache_enabled gauge',
    `daniel_github_cache_enabled ${Number(cache.enabled)}`,
  ];
  for (const state of GITHUB_CACHE_STATES) {
    lines.push(
      `daniel_github_cache_state{state="${state}"} ${Number(cache.state === state)}`
    );
  }
  for (const completeness of GITHUB_CACHE_COMPLETENESS) {
    lines.push(
      `daniel_github_cache_data_completeness{completeness="${completeness}"} ` +
        Number(cache.dataCompleteness === completeness)
    );
  }
  for (const category of GITHUB_CACHE_FAILURE_CATEGORIES) {
    lines.push(
      `daniel_github_cache_refresh_failure{category="${category}"} ` +
        Number(cache.failureCategories.includes(category))
    );
  }

  const optional = [
    [
      'daniel_github_cache_last_successful_refresh_timestamp_seconds',
      cache.lastSuccessfulRefreshAt,
    ],
    [
      'daniel_github_cache_oldest_data_timestamp_seconds',
      cache.oldestDataFetchedAt,
    ],
    [
      'daniel_github_cache_retained_data_age_seconds',
      cache.retainedDataAgeSeconds,
    ],
    [
      'daniel_github_cache_refresh_duration_milliseconds',
      cache.refreshDurationMs,
    ],
  ] as const;
  for (const [name, value] of optional) {
    if (value !== null) {
      lines.push(
        `${name} ${typeof value === 'string' ? timestampSeconds(value) : value}`
      );
    }
  }
  lines.push(
    `daniel_github_cache_repositories{result="configured"} ${cache.configuredRepositoryCount}`,
    `daniel_github_cache_repositories{result="successful"} ${cache.successfulRepositoryCount}`,
    `daniel_github_cache_repositories{result="failed"} ${cache.failedRepositoryCount}`,
    `daniel_github_cache_repositories{result="retained"} ${cache.retainedRepositoryCount}`
  );

  const serialized = `${lines.join('\n')}\n`;
  return new TextEncoder().encode(serialized).byteLength <= MAX_SERIALIZED_BYTES
    ? serialized
    : null;
}
