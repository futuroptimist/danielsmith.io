const API_BASE_URL = 'https://api.github.com/repos';

export interface GitHubRepoStats {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  updatedAt: string | null;
}

export interface GetGitHubRepoStatsOptions {
  owner: string;
  repo: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  requestInit?: RequestInit;
}

const repoStatsCache = new Map<string, Promise<GitHubRepoStats>>();

const normalizeSegment = (segment: string): string => segment.trim();

const createCacheKey = (owner: string, repo: string): string =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}`;

const readCount = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
};

const readCountOrZero = (value: unknown): number => readCount(value) ?? 0;

const sanitizeDate = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const mergeHeaders = (
  base: Record<string, string>,
  override?: HeadersInit
): Record<string, string> => {
  if (!override) {
    return base;
  }
  const result: Record<string, string> = { ...base };
  if (Array.isArray(override)) {
    override.forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  }
  if (typeof Headers !== 'undefined' && override instanceof Headers) {
    override.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  Object.assign(result, override);
  return result;
};

const toRequestInit = (
  options: GetGitHubRepoStatsOptions,
  owner: string,
  repo: string
): { url: string; init: RequestInit } => {
  const headers = mergeHeaders(
    {
      Accept: 'application/vnd.github+json',
    },
    options.requestInit?.headers
  );
  const init: RequestInit = {
    method: 'GET',
    ...options.requestInit,
    headers,
  };
  if (options.signal) {
    init.signal = options.signal;
  }
  const url = `${API_BASE_URL}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  return { url, init };
};

const parseRepoStats = (raw: unknown): GitHubRepoStats => {
  const candidate = (raw ?? {}) as Record<string, unknown>;
  const subscribers = readCount(candidate.subscribers_count);
  const watchersFallback = readCount(candidate.watchers_count);
  return {
    stars: readCountOrZero(candidate.stargazers_count),
    forks: readCountOrZero(candidate.forks_count),
    watchers: subscribers ?? watchersFallback ?? 0,
    openIssues: readCountOrZero(candidate.open_issues_count),
    updatedAt: sanitizeDate(candidate.updated_at),
  };
};

export function clearGitHubRepoStatsCache(): void {
  repoStatsCache.clear();
}

export async function getGitHubRepoStats(
  options: GetGitHubRepoStatsOptions
): Promise<GitHubRepoStats> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error('Global fetch implementation is required.');
  }
  const owner = normalizeSegment(options.owner);
  const repo = normalizeSegment(options.repo);
  if (!owner || !repo) {
    throw new Error('GitHub owner and repo must be provided.');
  }
  const cacheKey = createCacheKey(owner, repo);
  const cached = repoStatsCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const { url, init } = toRequestInit(options, owner, repo);
  const pending = (async () => {
    const response = await fetchImpl(url, init);
    if (!response.ok) {
      throw new Error(`GitHub responded with status ${response.status}`);
    }
    const data = await response.json();
    return parseRepoStats(data);
  })();
  repoStatsCache.set(cacheKey, pending);
  pending.catch(() => {
    repoStatsCache.delete(cacheKey);
  });
  return pending;
}
