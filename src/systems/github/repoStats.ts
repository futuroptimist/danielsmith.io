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

export type GitHubRepoMetricsSource = 'live' | 'cached' | 'static-fallback';

export interface GitHubRepoStatsDiagnostics {
  source: GitHubRepoMetricsSource;
  lastErrorStatus: number | null;
  lastErrorMessage: string | null;
  requestCount: number;
  suppressedRequestCount: number;
  backoffUntil: number | null;
  backoffReason: string | null;
  warningCount: number;
}

export interface GitHubRepoStatsService {
  getCachedStats(identifier: GitHubRepoIdentifier): GitHubRepoStats | null;
  requestStats(
    identifier: GitHubRepoIdentifier
  ): Promise<GitHubRepoStats | null>;
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

const CACHE_STORAGE_KEY = 'danielsmith.io:github-repo-stats-cache:v1';
const BACKOFF_STORAGE_KEY = 'danielsmith.io:github-repo-stats-backoff:v1';
const DEFAULT_SUCCESS_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const DEFAULT_BACKOFF_TTL_MS = 1000 * 60 * 60;
const DEFAULT_FETCH_TIMEOUT_MS = 3500;
const DEFAULT_MAX_LIVE_REQUESTS_PER_SESSION = 24;
const BACKOFF_STATUSES = new Set([403, 429]);

interface StoredStatsEntry {
  stats: GitHubRepoStats;
  storedAt: number;
}

interface StoredBackoffEntry {
  until: number;
  reason: string;
  status: number | null;
}

interface CacheEntry extends StoredStatsEntry {
  source: 'live' | 'cached';
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type GitHubMetricsLogger = Pick<Console, 'warn'>;

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

const getDefaultStorage = (): StorageLike | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const parseStoredStats = (
  value: string | null
): Map<string, StoredStatsEntry> => {
  if (!value) {
    return new Map();
  }
  try {
    const parsed = JSON.parse(value) as Record<string, StoredStatsEntry>;
    return new Map(
      Object.entries(parsed).filter(([, entry]) => isStoredStatsEntry(entry))
    );
  } catch {
    return new Map();
  }
};

const isStoredStatsEntry = (value: unknown): value is StoredStatsEntry => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<StoredStatsEntry>;
  return (
    typeof entry.storedAt === 'number' &&
    Number.isFinite(entry.storedAt) &&
    !!entry.stats &&
    typeof entry.stats === 'object'
  );
};

const readBackoff = (
  storage: StorageLike | undefined,
  now: number
): StoredBackoffEntry | null => {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(BACKOFF_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredBackoffEntry>;
    if (
      typeof parsed.until !== 'number' ||
      !Number.isFinite(parsed.until) ||
      parsed.until <= now
    ) {
      storage.removeItem(BACKOFF_STORAGE_KEY);
      return null;
    }
    return {
      until: parsed.until,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'unavailable',
      status: typeof parsed.status === 'number' ? parsed.status : null,
    };
  } catch {
    return null;
  }
};

const readStoredStats = (
  storage: StorageLike | undefined
): Map<string, StoredStatsEntry> => {
  if (!storage) {
    return new Map();
  }
  try {
    return parseStoredStats(storage.getItem(CACHE_STORAGE_KEY));
  } catch {
    return new Map();
  }
};

const serializeCache = (cache: Map<string, CacheEntry>): string =>
  JSON.stringify(
    Object.fromEntries(
      Array.from(cache.entries()).map(([key, entry]) => [
        key,
        { stats: entry.stats, storedAt: entry.storedAt },
      ])
    )
  );

export interface GitHubRepoStatsServiceOptions {
  allowLiveFetch?: boolean;
  storage?: StorageLike;
  now?: () => number;
  logger?: GitHubMetricsLogger;
  successCacheTtlMs?: number;
  backoffTtlMs?: number;
  fetchTimeoutMs?: number;
  maxLiveRequestsPerSession?: number;
}

export function createGitHubRepoStatsService(
  fetchImpl: typeof fetch | undefined = globalThis.fetch,
  options: GitHubRepoStatsServiceOptions = {}
): GitHubRepoStatsService {
  const allowLiveFetch = options.allowLiveFetch ?? shouldAttemptLiveFetch;
  const storage = options.storage ?? getDefaultStorage();
  const now = options.now ?? (() => Date.now());
  const logger = options.logger ?? console;
  const successCacheTtlMs =
    options.successCacheTtlMs ?? DEFAULT_SUCCESS_CACHE_TTL_MS;
  const backoffTtlMs = options.backoffTtlMs ?? DEFAULT_BACKOFF_TTL_MS;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxLiveRequestsPerSession =
    options.maxLiveRequestsPerSession ?? DEFAULT_MAX_LIVE_REQUESTS_PER_SESSION;
  const cache = new Map<string, CacheEntry>();
  const listeners = new Map<string, Set<GitHubRepoStatsListener>>();
  const inFlight = new Map<string, Promise<GitHubRepoStats | null>>();
  let requestCount = 0;
  let suppressedRequestCount = 0;
  let warningCount = 0;
  let hasWarnedUnavailable = false;
  let lastErrorStatus: number | null = null;
  let lastErrorMessage: string | null = null;
  let currentSource: GitHubRepoMetricsSource = 'static-fallback';
  let backoff = readBackoff(storage, now());

  readStoredStats(storage).forEach((entry, key) => {
    cache.set(key, { ...entry, source: 'cached' });
    currentSource = 'cached';
  });

  if (backoff) {
    lastErrorStatus = backoff.status;
    lastErrorMessage = backoff.reason;
  }

  const persistCache = () => {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(CACHE_STORAGE_KEY, serializeCache(cache));
    } catch {
      // Cache persistence is best effort and must not affect rendering.
    }
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

  const warnUnavailableOnce = () => {
    if (hasWarnedUnavailable) {
      return;
    }
    hasWarnedUnavailable = true;
    warningCount += 1;
    logger.warn(
      'GitHub repo metrics are temporarily unavailable; using cached or static project metrics.',
      {
        status: lastErrorStatus,
        reason: lastErrorMessage,
        backoffUntil: backoff?.until ?? null,
      }
    );
  };

  const enterBackoff = (status: number | null, reason: string) => {
    lastErrorStatus = status;
    lastErrorMessage = reason;
    backoff = {
      until: now() + backoffTtlMs,
      reason,
      status,
    };
    if (storage) {
      try {
        storage.setItem(BACKOFF_STORAGE_KEY, JSON.stringify(backoff));
      } catch {
        // Failure metadata is best effort.
      }
    }
    warnUnavailableOnce();
  };

  const getFreshCachedEntry = (key: string): CacheEntry | null => {
    const cached = cache.get(key);
    if (!cached) {
      return null;
    }
    if (now() - cached.storedAt <= successCacheTtlMs) {
      return cached;
    }
    return null;
  };

  const getCachedStats = (
    identifier: GitHubRepoIdentifier
  ): GitHubRepoStats | null => {
    const key = makeCacheKey(identifier);
    const cached = cache.get(key);
    return cached?.stats ?? null;
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

    const cached = cache.get(key);
    if (cached) {
      queueMicrotask(() => listener(cached.stats));
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

  const shouldSuppressLiveRequest = () => {
    if (!fetchImpl || !allowLiveFetch) {
      return true;
    }
    if (backoff && backoff.until > now()) {
      return true;
    }
    if (requestCount >= maxLiveRequestsPerSession) {
      return true;
    }
    return false;
  };

  const requestStats = async (
    identifier: GitHubRepoIdentifier
  ): Promise<GitHubRepoStats | null> => {
    const key = makeCacheKey(identifier);
    const freshCached = getFreshCachedEntry(key);
    if (freshCached) {
      currentSource = freshCached.source === 'live' ? 'live' : 'cached';
      return freshCached.stats;
    }
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }
    if (shouldSuppressLiveRequest()) {
      suppressedRequestCount += 1;
      const stale = cache.get(key);
      if (stale) {
        currentSource = 'cached';
        return stale.stats;
      }
      currentSource = 'static-fallback';
      return null;
    }

    const promise = (async () => {
      const controller =
        typeof AbortController === 'function' ? new AbortController() : null;
      const timeout = controller
        ? setTimeout(() => controller.abort(), fetchTimeoutMs)
        : null;
      try {
        requestCount += 1;
        const response = await fetchImpl(
          `https://api.github.com/repos/${identifier.owner}/${identifier.repo}`,
          { headers: DEFAULT_HEADERS, signal: controller?.signal }
        );
        if (!response.ok) {
          const reason = `GitHub API returned ${response.status}`;
          lastErrorStatus = response.status;
          lastErrorMessage = reason;
          if (BACKOFF_STATUSES.has(response.status)) {
            enterBackoff(response.status, reason);
          }
          const stale = cache.get(key);
          if (stale) {
            currentSource = 'cached';
            return stale.stats;
          }
          currentSource = 'static-fallback';
          return null;
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
        cache.set(key, { stats, storedAt: now(), source: 'live' });
        currentSource = 'live';
        persistCache();
        notify(key, stats);
        return stats;
      } catch (error) {
        const isAbort =
          typeof DOMException === 'function' &&
          error instanceof DOMException &&
          error.name === 'AbortError';
        lastErrorStatus = null;
        lastErrorMessage = isAbort
          ? 'GitHub API request timed out'
          : 'GitHub API request failed';
        const stale = cache.get(key);
        if (stale) {
          currentSource = 'cached';
          return stale.stats;
        }
        currentSource = 'static-fallback';
        return null;
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  };

  const getDiagnostics = (): GitHubRepoStatsDiagnostics => {
    const activeBackoff = backoff && backoff.until > now() ? backoff : null;
    return {
      source: currentSource,
      lastErrorStatus,
      lastErrorMessage,
      requestCount,
      suppressedRequestCount,
      backoffUntil: activeBackoff?.until ?? null,
      backoffReason: activeBackoff?.reason ?? null,
      warningCount,
    };
  };

  return {
    getCachedStats,
    requestStats,
    subscribe,
    getDiagnostics,
  };
}
