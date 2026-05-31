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

export type GitHubRepoMetricsSource = 'live' | 'cached' | 'static-fallback';

export interface GitHubRepoStatsDiagnostics {
  source: GitHubRepoMetricsSource;
  lastErrorStatus: number | 'network' | 'timeout' | 'backoff' | null;
  requestCount: number;
  backoffExpiresAt: number | null;
  suppressedRequestCount: number;
}

export type GitHubRepoStatsListener = (stats: GitHubRepoStats) => void;

export interface GitHubRepoStatsService {
  getCachedStats(identifier: GitHubRepoIdentifier): GitHubRepoStats | null;
  getDiagnostics(): GitHubRepoStatsDiagnostics;
  requestStats(
    identifier: GitHubRepoIdentifier
  ): Promise<GitHubRepoStats | null>;
  subscribe(
    identifier: GitHubRepoIdentifier,
    listener: GitHubRepoStatsListener
  ): () => void;
}

const DEFAULT_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'danielsmith.io-github-metrics',
} as const;

const CACHE_STORAGE_PREFIX = 'danielsmith.io:github-repo-stats:';
const BACKOFF_STORAGE_KEY = 'danielsmith.io:github-repo-stats:backoff';
const DEFAULT_BACKOFF_MS = 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 3500;
const DEFAULT_MAX_LIVE_REQUESTS = 16;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface CacheRecord {
  stats: GitHubRepoStats;
  cachedAt: number;
}

interface BackoffRecord {
  expiresAt: number;
  status: number | 'network' | 'timeout' | 'backoff';
}

export interface GitHubRepoStatsServiceOptions {
  allowLiveFetch?: boolean;
  backoffMs?: number;
  maxLiveRequests?: number;
  now?: () => number;
  storage?: StorageLike | null;
  timeoutMs?: number;
  warn?: Pick<Console, 'warn'> | null;
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

const isStorageLike = (value: unknown): value is StorageLike => {
  const candidate = value as Partial<StorageLike> | null | undefined;
  return (
    !!candidate &&
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  );
};

const getDefaultStorage = (): StorageLike | null => {
  try {
    if (isStorageLike(globalThis.localStorage)) {
      return globalThis.localStorage;
    }
  } catch {
    // Browser storage can be disabled; metrics remain best-effort.
  }
  return null;
};

const readJson = <T>(storage: StorageLike | null, key: string): T | null => {
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

const writeJson = (
  storage: StorageLike | null,
  key: string,
  value: unknown
) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache writes are optional and must never affect the immersive scene.
  }
};

const removeStorageItem = (storage: StorageLike | null, key: string) => {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch {
    // Cache cleanup is optional.
  }
};

const parseCachedStats = (
  record: CacheRecord | null
): GitHubRepoStats | null => {
  const stats = record?.stats;
  if (!stats) {
    return null;
  }
  return {
    stars: sanitizeNumber(stats.stars),
    watchers: sanitizeNumber(stats.watchers),
    forks: sanitizeNumber(stats.forks),
    openIssues: sanitizeNumber(stats.openIssues),
    pushedAt: typeof stats.pushedAt === 'string' ? stats.pushedAt : null,
  };
};

const readBackoff = (
  storage: StorageLike | null,
  now: number
): BackoffRecord | null => {
  const record = readJson<BackoffRecord>(storage, BACKOFF_STORAGE_KEY);
  if (!record || !Number.isFinite(record.expiresAt)) {
    return null;
  }
  if (record.expiresAt <= now) {
    removeStorageItem(storage, BACKOFF_STORAGE_KEY);
    return null;
  }
  return record;
};

const shouldAttemptLiveFetch = (() => {
  const globalScope = globalThis as Partial<
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
  if (params.get('enableLiveGitHubMetrics') === '1') {
    return true;
  }
  const hostname = location.hostname.toLowerCase();
  if (hostname === 'danielsmith.io' || hostname.endsWith('.danielsmith.io')) {
    return true;
  }
  return false;
})();

const createTimeoutSignal = (
  timeoutMs: number
): { signal?: AbortSignal; dispose(): void; timedOut(): boolean } => {
  if (typeof AbortController !== 'function' || timeoutMs <= 0) {
    return { dispose() {}, timedOut: () => false };
  }
  const controller = new AbortController();
  let didTimeOut = false;
  const timeout = globalThis.setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    dispose() {
      globalThis.clearTimeout(timeout);
    },
    timedOut: () => didTimeOut,
  };
};

const statusEntersBackoff = (status: number | 'network' | 'timeout'): boolean =>
  status === 403 ||
  status === 429 ||
  status === 'network' ||
  status === 'timeout';

export function createGitHubRepoStatsService(
  fetchImpl: typeof fetch | undefined = globalThis.fetch,
  options: GitHubRepoStatsServiceOptions = {}
): GitHubRepoStatsService {
  const allowLiveFetch = options.allowLiveFetch ?? shouldAttemptLiveFetch;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  const maxLiveRequests = options.maxLiveRequests ?? DEFAULT_MAX_LIVE_REQUESTS;
  const now = options.now ?? Date.now;
  const storage =
    options.storage === undefined ? getDefaultStorage() : options.storage;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const warnTarget = options.warn === undefined ? console : options.warn;
  const cache = new Map<string, GitHubRepoStats>();
  const listeners = new Map<string, Set<GitHubRepoStatsListener>>();
  const inFlight = new Map<string, Promise<GitHubRepoStats | null>>();
  let requestCount = 0;
  let suppressedRequestCount = 0;
  let warned = false;
  let diagnostics: GitHubRepoStatsDiagnostics = {
    source: 'static-fallback',
    lastErrorStatus: null,
    requestCount,
    backoffExpiresAt: readBackoff(storage, now())?.expiresAt ?? null,
    suppressedRequestCount,
  };

  const updateDiagnostics = (
    patch: Partial<GitHubRepoStatsDiagnostics>
  ): GitHubRepoStatsDiagnostics => {
    diagnostics = {
      ...diagnostics,
      requestCount,
      suppressedRequestCount,
      ...patch,
    };
    return diagnostics;
  };

  const warnOnce = (status: GitHubRepoStatsDiagnostics['lastErrorStatus']) => {
    if (warned || !warnTarget) {
      return;
    }
    warned = true;
    warnTarget.warn(
      '[github-metrics] Live GitHub repo metrics are unavailable; using cached/static fallback values.',
      { status, diagnostics: getDiagnostics() }
    );
  };

  const enterBackoff = (
    status: Exclude<BackoffRecord['status'], 'backoff'>
  ) => {
    const expiresAt = now() + backoffMs;
    writeJson(storage, BACKOFF_STORAGE_KEY, { expiresAt, status });
    updateDiagnostics({
      source: diagnostics.source === 'cached' ? 'cached' : 'static-fallback',
      lastErrorStatus: status,
      backoffExpiresAt: expiresAt,
    });
    warnOnce(status);
  };

  const getStoredStats = (
    identifier: GitHubRepoIdentifier
  ): GitHubRepoStats | null =>
    parseCachedStats(
      readJson<CacheRecord>(storage, makeStorageKey(identifier))
    );

  const cacheStats = (
    identifier: GitHubRepoIdentifier,
    stats: GitHubRepoStats
  ) => {
    const key = makeCacheKey(identifier);
    cache.set(key, stats);
    writeJson(storage, makeStorageKey(identifier), { stats, cachedAt: now() });
  };

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

  const getCachedStats = (
    identifier: GitHubRepoIdentifier
  ): GitHubRepoStats | null => {
    const key = makeCacheKey(identifier);
    const cached = cache.get(key) ?? getStoredStats(identifier);
    if (cached) {
      cache.set(key, cached);
      updateDiagnostics({ source: 'cached' });
    }
    return cached ?? null;
  };

  const getDiagnostics = (): GitHubRepoStatsDiagnostics => {
    const backoff = readBackoff(storage, now());
    return updateDiagnostics({
      backoffExpiresAt: backoff?.expiresAt ?? null,
    });
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

    const cached = getCachedStats(identifier);
    if (cached) {
      queueMicrotask(() => listener(cached));
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
    const cached = getCachedStats(identifier);
    if (cached) {
      return cached;
    }
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }
    if (!fetchImpl || !allowLiveFetch) {
      updateDiagnostics({ source: 'static-fallback' });
      return null;
    }
    const backoff = readBackoff(storage, now());
    if (backoff) {
      suppressedRequestCount += 1;
      updateDiagnostics({
        source: 'static-fallback',
        lastErrorStatus: backoff.status,
        backoffExpiresAt: backoff.expiresAt,
      });
      return null;
    }
    if (requestCount >= maxLiveRequests) {
      suppressedRequestCount += 1;
      updateDiagnostics({ source: 'static-fallback' });
      return null;
    }

    const promise = (async () => {
      const timeout = createTimeoutSignal(timeoutMs);
      requestCount += 1;
      updateDiagnostics({});
      try {
        const response = await fetchImpl(
          `https://api.github.com/repos/${identifier.owner}/${identifier.repo}`,
          { headers: DEFAULT_HEADERS, signal: timeout.signal }
        );
        if (!response.ok) {
          const status = response.status;
          if (statusEntersBackoff(status)) {
            enterBackoff(status);
          } else {
            updateDiagnostics({
              source: 'static-fallback',
              lastErrorStatus: status,
            });
            if (status === 404) {
              warnOnce(status);
            }
          }
          return getCachedStats(identifier);
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
        cacheStats(identifier, stats);
        removeStorageItem(storage, BACKOFF_STORAGE_KEY);
        updateDiagnostics({
          source: 'live',
          lastErrorStatus: null,
          backoffExpiresAt: null,
        });
        notify(key, stats);
        return stats;
      } catch {
        const status = timeout.timedOut() ? 'timeout' : 'network';
        enterBackoff(status);
        return getCachedStats(identifier);
      } finally {
        timeout.dispose();
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  };

  return {
    getCachedStats,
    getDiagnostics,
    requestStats,
    subscribe,
  };
}
