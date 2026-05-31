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

export type GitHubRepoStatsSource = 'live' | 'cached' | 'static-fallback';
export type GitHubRepoStatsErrorStatus =
  | number
  | 'network'
  | 'timeout'
  | 'storage';

export interface GitHubRepoStatsDiagnostics {
  source: GitHubRepoStatsSource;
  lastErrorStatus: GitHubRepoStatsErrorStatus | null;
  requestCount: number;
  suppressedRequestCount: number;
  backoffExpiresAt: number | null;
  warnedThisSession: boolean;
}

export type GitHubRepoStatsListener = (stats: GitHubRepoStats) => void;

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
} as const;

const SUCCESS_CACHE_KEY_PREFIX = 'danielsmith.io:github-repo-stats:';
const BACKOFF_CACHE_KEY = 'danielsmith.io:github-repo-stats:backoff';
const WARNING_SESSION_KEY = 'danielsmith.io:github-repo-stats:warned';
const DEFAULT_BACKOFF_TTL_MS = 60 * 60 * 1000;
const DEFAULT_NETWORK_BACKOFF_TTL_MS = 5 * 60 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 4500;

interface StoredStatsRecord {
  stats: GitHubRepoStats;
  fetchedAt: number;
}

interface StoredBackoffRecord {
  expiresAt: number;
  status: GitHubRepoStatsErrorStatus;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
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
  `${SUCCESS_CACHE_KEY_PREFIX}${makeCacheKey(identifier)}`;

const readStorageJson = <T>(
  storage: StorageLike | undefined,
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

const writeStorageJson = (
  storage: StorageLike | undefined,
  key: string,
  value: unknown
): void => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in private browsing or test shims.
  }
};

const removeStorageItem = (
  storage: StorageLike | undefined,
  key: string
): void => {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures; live metrics are always optional.
  }
};

const isGitHubRepoStats = (value: unknown): value is GitHubRepoStats => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as GitHubRepoStats;
  return (
    typeof candidate.stars === 'number' &&
    typeof candidate.watchers === 'number' &&
    typeof candidate.forks === 'number' &&
    typeof candidate.openIssues === 'number' &&
    (typeof candidate.pushedAt === 'string' || candidate.pushedAt === null)
  );
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

const getDefaultStorage = (
  kind: 'localStorage' | 'sessionStorage'
): StorageLike | undefined => {
  try {
    return globalThis[kind] as StorageLike | undefined;
  } catch {
    return undefined;
  }
};

const createTimeoutSignal = (
  timeoutMs: number
): { signal?: AbortSignal; dispose(): void } => {
  if (typeof AbortController === 'undefined') {
    return { dispose: () => undefined };
  }
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => globalThis.clearTimeout(timeout),
  };
};

export interface GitHubRepoStatsServiceOptions {
  allowLiveFetch?: boolean;
  backoffTtlMs?: number;
  networkBackoffTtlMs?: number;
  fetchTimeoutMs?: number;
  now?: () => number;
  localStorage?: StorageLike;
  sessionStorage?: StorageLike;
  warn?: (message: string, diagnostics: GitHubRepoStatsDiagnostics) => void;
}

export function createGitHubRepoStatsService(
  fetchImpl: typeof fetch | undefined = globalThis.fetch,
  options: GitHubRepoStatsServiceOptions = {}
): GitHubRepoStatsService {
  const allowLiveFetch = options.allowLiveFetch ?? shouldAttemptLiveFetch;
  const backoffTtlMs = options.backoffTtlMs ?? DEFAULT_BACKOFF_TTL_MS;
  const networkBackoffTtlMs =
    options.networkBackoffTtlMs ?? DEFAULT_NETWORK_BACKOFF_TTL_MS;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const now = options.now ?? (() => Date.now());
  const localStorage =
    options.localStorage ?? getDefaultStorage('localStorage');
  const sessionStorage =
    options.sessionStorage ?? getDefaultStorage('sessionStorage');
  const warn =
    options.warn ??
    ((message: string, diagnostics: GitHubRepoStatsDiagnostics) => {
      console.warn(message, diagnostics);
    });
  const cache = new Map<string, GitHubRepoStats>();
  const listeners = new Map<string, Set<GitHubRepoStatsListener>>();
  const inFlight = new Map<string, Promise<GitHubRepoStats | null>>();
  const diagnostics: GitHubRepoStatsDiagnostics = {
    source: 'static-fallback',
    lastErrorStatus: null,
    requestCount: 0,
    suppressedRequestCount: 0,
    backoffExpiresAt: null,
    warnedThisSession: sessionStorage?.getItem(WARNING_SESSION_KEY) === '1',
  };

  const readBackoff = (): StoredBackoffRecord | null => {
    const record = readStorageJson<StoredBackoffRecord>(
      localStorage,
      BACKOFF_CACHE_KEY
    );
    if (!record || typeof record.expiresAt !== 'number') {
      return null;
    }
    if (record.expiresAt <= now()) {
      removeStorageItem(localStorage, BACKOFF_CACHE_KEY);
      diagnostics.backoffExpiresAt = null;
      return null;
    }
    diagnostics.backoffExpiresAt = record.expiresAt;
    diagnostics.lastErrorStatus = record.status;
    return record;
  };

  readBackoff();

  const warnOnce = () => {
    if (diagnostics.warnedThisSession) {
      return;
    }
    diagnostics.warnedThisSession = true;
    try {
      sessionStorage?.setItem(WARNING_SESSION_KEY, '1');
    } catch {
      // Optional session marker only.
    }
    warn(
      'GitHub repository metrics are unavailable; using cached or static values.',
      {
        ...diagnostics,
      }
    );
  };

  const enterBackoff = (status: GitHubRepoStatsErrorStatus, ttlMs: number) => {
    const expiresAt = now() + ttlMs;
    diagnostics.lastErrorStatus = status;
    diagnostics.backoffExpiresAt = expiresAt;
    writeStorageJson(localStorage, BACKOFF_CACHE_KEY, { expiresAt, status });
    warnOnce();
  };

  const loadStoredStats = (
    identifier: GitHubRepoIdentifier
  ): GitHubRepoStats | null => {
    const record = readStorageJson<StoredStatsRecord>(
      localStorage,
      makeStorageKey(identifier)
    );
    if (!record || !isGitHubRepoStats(record.stats)) {
      return null;
    }
    const key = makeCacheKey(identifier);
    cache.set(key, record.stats);
    diagnostics.source = 'cached';
    return record.stats;
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
    const memoryCached = cache.get(key);
    if (memoryCached) {
      diagnostics.source = 'cached';
      return memoryCached;
    }
    return loadStoredStats(identifier);
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
    if (!fetchImpl || !allowLiveFetch || readBackoff()) {
      diagnostics.suppressedRequestCount += 1;
      diagnostics.source = 'static-fallback';
      return null;
    }

    const promise = (async () => {
      const timeout = createTimeoutSignal(fetchTimeoutMs);
      diagnostics.requestCount += 1;
      try {
        const response = await fetchImpl(
          `https://api.github.com/repos/${identifier.owner}/${identifier.repo}`,
          { headers: DEFAULT_HEADERS, signal: timeout.signal }
        );
        if (!response.ok) {
          const status = response.status || 'network';
          if (status === 403 || status === 404 || status === 429) {
            enterBackoff(status, backoffTtlMs);
          } else {
            diagnostics.lastErrorStatus = status;
            warnOnce();
          }
          diagnostics.source = 'static-fallback';
          return null;
        }
        removeStorageItem(localStorage, BACKOFF_CACHE_KEY);
        diagnostics.backoffExpiresAt = null;
        diagnostics.lastErrorStatus = null;
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
        cache.set(key, stats);
        writeStorageJson(localStorage, makeStorageKey(identifier), {
          stats,
          fetchedAt: now(),
        });
        diagnostics.source = 'live';
        notify(key, stats);
        return stats;
      } catch (error) {
        const status =
          error instanceof DOMException && error.name === 'AbortError'
            ? 'timeout'
            : 'network';
        enterBackoff(status, networkBackoffTtlMs);
        diagnostics.source = 'static-fallback';
        return null;
      } finally {
        timeout.dispose();
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  };

  const getDiagnostics = (): GitHubRepoStatsDiagnostics => ({
    ...diagnostics,
    backoffExpiresAt: readBackoff()?.expiresAt ?? diagnostics.backoffExpiresAt,
  });

  return {
    getCachedStats,
    requestStats,
    subscribe,
    getDiagnostics,
  };
}
