export interface GitHubRepoIdentifier {
  owner: string;
  repo: string;
}

export interface GitHubRepoStats {
  stars: number;
  watchers: number;
  forks: number;
  openIssues: number;
  pushedAt: string | null;
}

export type GitHubRepoStatsListener = (stats: GitHubRepoStats) => void;

export type GitHubRepoMetricsSource =
  | 'runtime-cache'
  | 'runtime-cache-stale'
  | 'browser-live'
  | 'cached'
  | 'static-neutral';

export interface GitHubRepoStatsDiagnostics {
  source: GitHubRepoMetricsSource;
  requestCount: number;
  suppressedRequestCount: number;
  lastErrorStatus: number | 'network' | null;
  lastErrorAt: string | null;
  backoffExpiresAt: string | null;
  cachedRepoCount: number;
  warningCount: number;
}

export interface GitHubRepoStatsService {
  getCachedStats(identifier: GitHubRepoIdentifier): GitHubRepoStats | null;
  requestStats(
    identifier: GitHubRepoIdentifier
  ): Promise<GitHubRepoStats | null>;
  loadRuntimeCache(): Promise<void>;
  subscribe(
    identifier: GitHubRepoIdentifier,
    listener: GitHubRepoStatsListener
  ): () => void;
  getDiagnostics(): GitHubRepoStatsDiagnostics;
}

const DEFAULT_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'danielsmith.io-github-metrics',
} as const;

const CACHE_STORAGE_PREFIX = 'danielsmith.io:github-repo-stats:';
const BACKOFF_STORAGE_KEY = 'danielsmith.io:github-repo-stats:backoff';
const DEFAULT_SUCCESS_CACHE_TTL_MS = 60 * 60 * 1000;
const DEFAULT_RUNTIME_CACHE_URL = '/runtime/github-metrics.json';
const DEFAULT_RUNTIME_CACHE_GRACE_MS = 30 * 60 * 1000;
const DEFAULT_FAILURE_BACKOFF_MS = 15 * 60 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 3500;
const WARNING_SESSION_KEY = 'danielsmith.io:github-repo-stats:warning-shown';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type ErrorStatus = number | 'network';

interface CachedStatsRecord {
  stats: GitHubRepoStats;
  cachedAt: number;
}

interface BackoffRecord {
  expiresAt: number;
  status: ErrorStatus;
  lastErrorAt: number;
}

interface MemoryCacheEntry extends CachedStatsRecord {
  freshUntil: number;
  source: 'runtime-cache' | 'runtime-cache-stale' | 'browser-live' | 'cached';
}

interface RuntimeRepoMetricRecord {
  owner: string;
  repo: string;
  stars: number;
  watchers: number;
  forks: number;
  openIssues: number;
  pushedAt: string | null;
}

interface RuntimeMetricsCachePayload {
  schemaVersion: 1;
  generatedAt: string;
  expiresAt: string;
  source: string;
  repos: Record<string, RuntimeRepoMetricRecord>;
}

export interface GitHubRepoStatsServiceOptions {
  allowLiveFetch?: boolean;
  localStorage?: StorageLike | null;
  sessionStorage?: StorageLike | null;
  logger?: Pick<Console, 'warn'> | null;
  now?: () => number;
  successCacheTtlMs?: number;
  failureBackoffMs?: number;
  fetchTimeoutMs?: number;
  runtimeCacheUrl?: string;
  runtimeCacheGraceMs?: number;
  AbortControllerImpl?: typeof AbortController;
}

const sanitizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const makeCacheKey = ({ owner, repo }: GitHubRepoIdentifier): string =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}`;

const makeStorageKey = (identifier: GitHubRepoIdentifier): string =>
  `${CACHE_STORAGE_PREFIX}${makeCacheKey(identifier)}`;

const shouldAttemptLiveFetch = (() => {
  const globalScope = globalThis as unknown as Partial<
    Window & { __ENABLE_LIVE_GITHUB_METRICS__?: boolean }
  >;
  if (globalScope.__ENABLE_LIVE_GITHUB_METRICS__) {
    return true;
  }
  const { location } = globalScope;
  if (!location) {
    return false;
  }
  const params = new URLSearchParams(location.search);
  return params.get('enableLiveGitHubMetrics') === '1';
})();

const getBrowserStorage = (key: 'localStorage' | 'sessionStorage') => {
  try {
    return globalThis[key] ?? null;
  } catch {
    return null;
  }
};

const safeReadJson = <T>(
  storage: StorageLike | null,
  key: string
): T | null => {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const safeWriteJson = (
  storage: StorageLike | null,
  key: string,
  value: unknown
): void => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage is best effort only.
  }
};

const safeRemove = (storage: StorageLike | null, key: string): void => {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch {
    // Browser storage is best effort only.
  }
};

const normalizeCachedRecord = (
  record: CachedStatsRecord | null,
  now: number,
  ttlMs: number
): MemoryCacheEntry | null => {
  if (!record || typeof record !== 'object') {
    return null;
  }
  const { stats, cachedAt } = record;
  if (
    !stats ||
    typeof cachedAt !== 'number' ||
    !Number.isFinite(cachedAt) ||
    cachedAt > now
  ) {
    return null;
  }
  return {
    stats: {
      stars: sanitizeNumber(stats.stars),
      watchers: sanitizeNumber(stats.watchers),
      forks: sanitizeNumber(stats.forks),
      openIssues: sanitizeNumber(stats.openIssues),
      pushedAt: typeof stats.pushedAt === 'string' ? stats.pushedAt : null,
    },
    cachedAt,
    freshUntil: cachedAt + ttlMs,
    source: 'cached',
  };
};

const isBackoffActive = (
  backoff: BackoffRecord | null,
  now: number
): backoff is BackoffRecord =>
  !!backoff &&
  typeof backoff.expiresAt === 'number' &&
  Number.isFinite(backoff.expiresAt) &&
  backoff.expiresAt > now;

const shouldBackoffForStatus = (status: ErrorStatus): boolean =>
  status === 'network' || status === 403 || status === 429;

const toIso = (timestamp: number | null): string | null => {
  if (timestamp === null || !Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
};

const parseIsoTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const parseRuntimeRepoRecord = (
  key: string,
  value: unknown
): RuntimeRepoMetricRecord | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const [fallbackOwner, fallbackRepo] = key.split('/');
  const owner =
    typeof record.owner === 'string' && record.owner
      ? record.owner
      : fallbackOwner;
  const repo =
    typeof record.repo === 'string' && record.repo ? record.repo : fallbackRepo;
  if (!owner || !repo || typeof record.stars !== 'number') {
    return null;
  }
  return {
    owner,
    repo,
    stars: sanitizeNumber(record.stars),
    watchers: sanitizeNumber(record.watchers),
    forks: sanitizeNumber(record.forks),
    openIssues: sanitizeNumber(record.openIssues),
    pushedAt: typeof record.pushedAt === 'string' ? record.pushedAt : null,
  };
};

const parseRuntimeCachePayload = (
  payload: unknown,
  now: number,
  graceMs: number
): { payload: RuntimeMetricsCachePayload; stale: boolean } | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const expiresAt = parseIsoTimestamp(record.expiresAt);
  const generatedAt = parseIsoTimestamp(record.generatedAt);
  if (
    record.schemaVersion !== 1 ||
    expiresAt === null ||
    generatedAt === null
  ) {
    return null;
  }
  if (generatedAt > now || expiresAt + graceMs < now) {
    return null;
  }
  if (!record.repos || typeof record.repos !== 'object') {
    return null;
  }
  const repos: Record<string, RuntimeRepoMetricRecord> = {};
  for (const [key, value] of Object.entries(record.repos)) {
    const parsed = parseRuntimeRepoRecord(key, value);
    if (parsed) {
      repos[makeCacheKey(parsed)] = parsed;
    }
  }
  return {
    payload: {
      schemaVersion: 1,
      generatedAt: new Date(generatedAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      source: typeof record.source === 'string' ? record.source : 'unknown',
      repos,
    },
    stale: expiresAt < now,
  };
};

export function createGitHubRepoStatsService(
  fetchImpl: typeof fetch | undefined = globalThis.fetch,
  options: GitHubRepoStatsServiceOptions = {}
): GitHubRepoStatsService {
  const allowLiveFetch = options.allowLiveFetch ?? shouldAttemptLiveFetch;
  const localStorage =
    options.localStorage === undefined
      ? getBrowserStorage('localStorage')
      : options.localStorage;
  const sessionStorage =
    options.sessionStorage === undefined
      ? getBrowserStorage('sessionStorage')
      : options.sessionStorage;
  const logger = options.logger === undefined ? console : options.logger;
  const now = options.now ?? (() => Date.now());
  const successCacheTtlMs =
    options.successCacheTtlMs ?? DEFAULT_SUCCESS_CACHE_TTL_MS;
  const failureBackoffMs =
    options.failureBackoffMs ?? DEFAULT_FAILURE_BACKOFF_MS;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const runtimeCacheUrl = options.runtimeCacheUrl ?? DEFAULT_RUNTIME_CACHE_URL;
  const runtimeCacheGraceMs =
    options.runtimeCacheGraceMs ?? DEFAULT_RUNTIME_CACHE_GRACE_MS;
  const AbortControllerTarget =
    options.AbortControllerImpl ?? globalThis.AbortController;
  const cache = new Map<string, MemoryCacheEntry>();
  const listeners = new Map<string, Set<GitHubRepoStatsListener>>();
  const inFlight = new Map<string, Promise<GitHubRepoStats | null>>();
  const diagnostics = {
    source: 'static-neutral' as GitHubRepoMetricsSource,
    requestCount: 0,
    suppressedRequestCount: 0,
    lastErrorStatus: null as ErrorStatus | null,
    lastErrorAt: null as number | null,
    warningCount: 0,
  };

  let backoff = safeReadJson<BackoffRecord>(localStorage, BACKOFF_STORAGE_KEY);
  if (!isBackoffActive(backoff, now())) {
    backoff = null;
  } else {
    diagnostics.lastErrorStatus = backoff.status;
    diagnostics.lastErrorAt = backoff.lastErrorAt;
  }
  let warnedThisService = false;

  const notify = (key: string, stats: GitHubRepoStats) => {
    const repoListeners = listeners.get(key);
    if (!repoListeners || repoListeners.size === 0) {
      return;
    }
    for (const listener of repoListeners) {
      try {
        listener(stats);
      } catch {
        // Suppress listener failures so one consumer cannot block updates.
      }
    }
  };

  const warnOnce = (status: ErrorStatus) => {
    if (!logger || warnedThisService) {
      return;
    }
    const alreadyWarned = safeReadJson<boolean>(
      sessionStorage,
      WARNING_SESSION_KEY
    );
    if (alreadyWarned) {
      warnedThisService = true;
      return;
    }
    warnedThisService = true;
    diagnostics.warningCount += 1;
    safeWriteJson(sessionStorage, WARNING_SESSION_KEY, true);
    logger.warn(
      '[github-metrics] GitHub repo metrics are temporarily unavailable; using cached or neutral project metrics.',
      {
        status,
        backoffExpiresAt: backoff ? toIso(backoff.expiresAt) : null,
      }
    );
  };

  const readCachedEntry = (
    identifier: GitHubRepoIdentifier
  ): MemoryCacheEntry | null => {
    const key = makeCacheKey(identifier);
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    if (!allowLiveFetch) {
      return null;
    }
    const stored = normalizeCachedRecord(
      safeReadJson<CachedStatsRecord>(localStorage, makeStorageKey(identifier)),
      now(),
      successCacheTtlMs
    );
    if (stored) {
      cache.set(key, stored);
      return stored;
    }
    return null;
  };

  const writeCachedEntry = (
    identifier: GitHubRepoIdentifier,
    stats: GitHubRepoStats
  ) => {
    const key = makeCacheKey(identifier);
    const cachedAt = now();
    const record: CachedStatsRecord = { stats, cachedAt };
    cache.set(key, {
      ...record,
      freshUntil: cachedAt + successCacheTtlMs,
      source: 'browser-live',
    });
    safeWriteJson(localStorage, makeStorageKey(identifier), record);
  };

  const setBackoff = (status: ErrorStatus) => {
    if (!shouldBackoffForStatus(status)) {
      return;
    }
    const lastErrorAt = now();
    backoff = {
      status,
      lastErrorAt,
      expiresAt: lastErrorAt + failureBackoffMs,
    };
    safeWriteJson(localStorage, BACKOFF_STORAGE_KEY, backoff);
  };

  const recordFailure = (status: ErrorStatus) => {
    diagnostics.lastErrorStatus = status;
    diagnostics.lastErrorAt = now();
    setBackoff(status);
    warnOnce(status);
  };

  const getCachedStats = (
    identifier: GitHubRepoIdentifier
  ): GitHubRepoStats | null => {
    const entry = readCachedEntry(identifier);
    if (entry) {
      diagnostics.source = entry.source;
    }
    return entry?.stats ?? null;
  };

  const subscribe = (
    identifier: GitHubRepoIdentifier,
    listener: GitHubRepoStatsListener
  ): (() => void) => {
    const key = makeCacheKey(identifier);
    let repoListeners = listeners.get(key);
    if (!repoListeners) {
      repoListeners = new Set();
      listeners.set(key, repoListeners);
    }
    repoListeners.add(listener);

    const cached = readCachedEntry(identifier)?.stats;
    if (cached) {
      queueMicrotask(() => {
        if (listeners.get(key)?.has(listener)) {
          listener(cached);
        }
      });
    }

    return () => {
      const current = listeners.get(key);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        listeners.delete(key);
      }
    };
  };

  const requestStats = async (
    identifier: GitHubRepoIdentifier
  ): Promise<GitHubRepoStats | null> => {
    const key = makeCacheKey(identifier);
    const cached = readCachedEntry(identifier);
    if (cached && cached.freshUntil > now()) {
      diagnostics.source =
        cached.source === 'browser-live' ? 'cached' : cached.source;
      return cached.stats;
    }
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }
    if (!fetchImpl || !allowLiveFetch) {
      diagnostics.source = cached ? cached.source : 'static-neutral';
      return cached?.stats ?? null;
    }
    if (isBackoffActive(backoff, now())) {
      diagnostics.suppressedRequestCount += 1;
      diagnostics.source = cached ? cached.source : 'static-neutral';
      return cached?.stats ?? null;
    }
    if (backoff) {
      backoff = null;
      safeRemove(localStorage, BACKOFF_STORAGE_KEY);
    }

    const promise = (async () => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let controller: AbortController | undefined;
      try {
        if (AbortControllerTarget && fetchTimeoutMs > 0) {
          controller = new AbortControllerTarget();
          timeoutId = setTimeout(() => controller?.abort(), fetchTimeoutMs);
        }
        diagnostics.requestCount += 1;
        const response = await fetchImpl(
          `https://api.github.com/repos/${identifier.owner}/${identifier.repo}`,
          { headers: DEFAULT_HEADERS, signal: controller?.signal }
        );
        if (!response.ok) {
          recordFailure(response.status);
          diagnostics.source = cached ? cached.source : 'static-neutral';
          return cached?.stats ?? null;
        }
        const data = (await response.json()) as Record<string, unknown>;
        const stats: GitHubRepoStats = {
          stars: sanitizeNumber(data.stargazers_count),
          watchers: sanitizeNumber(
            data.subscribers_count ?? data.watchers_count ?? 0
          ),
          forks: sanitizeNumber(data.forks_count),
          openIssues: sanitizeNumber(data.open_issues_count),
          pushedAt: typeof data.pushed_at === 'string' ? data.pushed_at : null,
        };
        writeCachedEntry(identifier, stats);
        diagnostics.source = 'browser-live';
        diagnostics.lastErrorStatus = null;
        diagnostics.lastErrorAt = null;
        notify(key, stats);
        return stats;
      } catch {
        recordFailure('network');
        diagnostics.source = cached ? cached.source : 'static-neutral';
        return cached?.stats ?? null;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  };

  const loadRuntimeCache = async (): Promise<void> => {
    if (!fetchImpl) {
      diagnostics.source = 'static-neutral';
      return;
    }
    try {
      const response = await fetchImpl(runtimeCacheUrl, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        diagnostics.source = 'static-neutral';
        return;
      }
      const parsed = parseRuntimeCachePayload(
        await response.json(),
        now(),
        runtimeCacheGraceMs
      );
      if (!parsed) {
        diagnostics.source = 'static-neutral';
        return;
      }
      const source = parsed.stale ? 'runtime-cache-stale' : 'runtime-cache';
      const expiresAt = Date.parse(parsed.payload.expiresAt);
      for (const record of Object.values(parsed.payload.repos)) {
        const identifier = { owner: record.owner, repo: record.repo };
        const key = makeCacheKey(identifier);
        const stats: GitHubRepoStats = {
          stars: record.stars,
          watchers: record.watchers,
          forks: record.forks,
          openIssues: record.openIssues,
          pushedAt: record.pushedAt,
        };
        cache.set(key, {
          stats,
          cachedAt: Date.parse(parsed.payload.generatedAt),
          freshUntil: expiresAt,
          source,
        });
        notify(key, stats);
      }
      diagnostics.source = source;
      diagnostics.lastErrorStatus = null;
      diagnostics.lastErrorAt = null;
    } catch {
      diagnostics.source = 'static-neutral';
    }
  };

  const getDiagnostics = (): GitHubRepoStatsDiagnostics => ({
    source: diagnostics.source,
    requestCount: diagnostics.requestCount,
    suppressedRequestCount: diagnostics.suppressedRequestCount,
    lastErrorStatus: diagnostics.lastErrorStatus,
    lastErrorAt: toIso(diagnostics.lastErrorAt),
    backoffExpiresAt: isBackoffActive(backoff, now())
      ? toIso(backoff.expiresAt)
      : null,
    cachedRepoCount: cache.size,
    warningCount: diagnostics.warningCount,
  });

  return {
    getCachedStats,
    requestStats,
    loadRuntimeCache,
    subscribe,
    getDiagnostics,
  };
}
