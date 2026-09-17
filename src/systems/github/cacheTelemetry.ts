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
const MAX_SERIALIZED_BYTES = 8192;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isBoundedInteger = (value: unknown, maximum: number): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= maximum;

const normalizeTimestamp = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string' || value.length > 24) {
    return undefined;
  }
  const timestamp = Date.parse(value);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== value
  ) {
    return undefined;
  }
  return value;
};

const includes = <T extends string>(
  values: readonly T[],
  value: unknown
): value is T => typeof value === 'string' && values.includes(value as T);

/**
 * Validates the fixed cache-health vocabulary without retaining unknown fields.
 * This pure function deliberately has no fetch or client dependency, so scrape
 * adapters can serialize already-published state without contacting GitHub.
 */
export const parseGitHubCacheTelemetry = (
  value: unknown
): GitHubCacheTelemetry | null => {
  if (!isRecord(value) || typeof value.enabled !== 'boolean') {
    return null;
  }
  if (
    !includes(GITHUB_CACHE_STATES, value.state) ||
    !includes(GITHUB_CACHE_COMPLETENESS, value.dataCompleteness)
  ) {
    return null;
  }

  const lastSuccessfulRefreshAt = normalizeTimestamp(
    value.lastSuccessfulRefreshAt
  );
  const oldestDataFetchedAt = normalizeTimestamp(value.oldestDataFetchedAt);
  const nullableAge = value.retainedDataAgeSeconds;
  const nullableDuration = value.refreshDurationMs;
  const counts = [
    value.configuredRepositoryCount,
    value.successfulRepositoryCount,
    value.failedRepositoryCount,
    value.retainedRepositoryCount,
  ];
  if (
    lastSuccessfulRefreshAt === undefined ||
    oldestDataFetchedAt === undefined ||
    !(nullableAge === null || isBoundedInteger(nullableAge, MAX_AGE_SECONDS)) ||
    !(
      nullableDuration === null ||
      isBoundedInteger(nullableDuration, MAX_DURATION_MS)
    ) ||
    !counts.every((count) => isBoundedInteger(count, MAX_REPOSITORIES)) ||
    !Array.isArray(value.failureCategories) ||
    value.failureCategories.length > GITHUB_CACHE_FAILURE_CATEGORIES.length ||
    !value.failureCategories.every((category) =>
      includes(GITHUB_CACHE_FAILURE_CATEGORIES, category)
    )
  ) {
    return null;
  }

  const failureCategories = [
    ...new Set(value.failureCategories),
  ].sort() as GitHubCacheFailureCategory[];
  if (failureCategories.length !== value.failureCategories.length) {
    return null;
  }

  const configuredRepositoryCount = value.configuredRepositoryCount as number;
  const successfulRepositoryCount = value.successfulRepositoryCount as number;
  const failedRepositoryCount = value.failedRepositoryCount as number;
  const retainedRepositoryCount = value.retainedRepositoryCount as number;
  const hasData = retainedRepositoryCount > 0 || successfulRepositoryCount > 0;
  if (
    (value.state !== 'warming' &&
      successfulRepositoryCount + failedRepositoryCount !==
        configuredRepositoryCount) ||
    retainedRepositoryCount > failedRepositoryCount ||
    (value.enabled === false && value.state !== 'disabled') ||
    (value.enabled === true && value.state === 'disabled') ||
    ((value.state === 'disabled' || value.state === 'warming') &&
      ((value.state === 'disabled' && configuredRepositoryCount !== 0) ||
        successfulRepositoryCount !== 0 ||
        failedRepositoryCount !== 0 ||
        retainedRepositoryCount !== 0 ||
        value.dataCompleteness !== 'none' ||
        nullableDuration !== null ||
        lastSuccessfulRefreshAt !== null ||
        oldestDataFetchedAt !== null ||
        nullableAge !== null ||
        failureCategories.length !== 0)) ||
    (value.state === 'fresh' &&
      (value.dataCompleteness !== 'complete' || failedRepositoryCount !== 0)) ||
    (value.state === 'stale' &&
      (value.dataCompleteness !== 'partial' ||
        failedRepositoryCount === 0 ||
        !hasData)) ||
    (value.state === 'unavailable' &&
      (value.dataCompleteness !== 'none' || hasData)) ||
    (hasData && (oldestDataFetchedAt === null || nullableAge === null)) ||
    (!hasData && (oldestDataFetchedAt !== null || nullableAge !== null))
  ) {
    return null;
  }

  return {
    enabled: value.enabled,
    state: value.state,
    lastSuccessfulRefreshAt,
    oldestDataFetchedAt,
    retainedDataAgeSeconds: nullableAge,
    dataCompleteness: value.dataCompleteness,
    refreshDurationMs: nullableDuration,
    failureCategories,
    configuredRepositoryCount,
    successfulRepositoryCount,
    failedRepositoryCount,
    retainedRepositoryCount,
  };
};

const metric = (name: string, value: number, label?: string): string =>
  `${name}${label ?? ''} ${value}`;

/** Returns a deterministic, bounded Prometheus exposition or null for invalid state. */
export const serializeGitHubCacheMetrics = (value: unknown): string | null => {
  const telemetry = parseGitHubCacheTelemetry(value);
  if (!telemetry) {
    return null;
  }
  const lines = [
    metric('daniel_github_cache_enabled', Number(telemetry.enabled)),
  ];
  for (const state of GITHUB_CACHE_STATES) {
    lines.push(
      metric(
        'daniel_github_cache_state',
        Number(telemetry.state === state),
        `{state="${state}"}`
      )
    );
  }
  for (const completeness of GITHUB_CACHE_COMPLETENESS) {
    lines.push(
      metric(
        'daniel_github_cache_data_completeness',
        Number(telemetry.dataCompleteness === completeness),
        `{completeness="${completeness}"}`
      )
    );
  }
  for (const category of GITHUB_CACHE_FAILURE_CATEGORIES) {
    lines.push(
      metric(
        'daniel_github_cache_refresh_failure',
        Number(telemetry.failureCategories.includes(category)),
        `{category="${category}"}`
      )
    );
  }
  lines.push(
    metric(
      'daniel_github_cache_last_success_unixtime_seconds',
      telemetry.lastSuccessfulRefreshAt
        ? Date.parse(telemetry.lastSuccessfulRefreshAt) / 1000
        : 0
    ),
    metric(
      'daniel_github_cache_oldest_data_unixtime_seconds',
      telemetry.oldestDataFetchedAt
        ? Date.parse(telemetry.oldestDataFetchedAt) / 1000
        : 0
    ),
    metric(
      'daniel_github_cache_retained_data_age_seconds',
      telemetry.retainedDataAgeSeconds ?? 0
    ),
    metric(
      'daniel_github_cache_refresh_duration_milliseconds',
      telemetry.refreshDurationMs ?? 0
    ),
    metric(
      'daniel_github_cache_configured_repositories',
      telemetry.configuredRepositoryCount
    ),
    metric(
      'daniel_github_cache_successful_repositories',
      telemetry.successfulRepositoryCount
    ),
    metric(
      'daniel_github_cache_failed_repositories',
      telemetry.failedRepositoryCount
    ),
    metric(
      'daniel_github_cache_retained_repositories',
      telemetry.retainedRepositoryCount
    )
  );
  const output = `${lines.join('\n')}\n`;
  return new TextEncoder().encode(output).byteLength <= MAX_SERIALIZED_BYTES
    ? output
    : null;
};
