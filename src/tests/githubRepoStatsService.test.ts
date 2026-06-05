import { describe, expect, it, vi } from 'vitest';

import { createGitHubRepoStatsService } from '../systems/github/repoStats';

class MemoryStorage
  implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
{
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const createOptions = (overrides: Record<string, unknown> = {}) => ({
  allowLiveFetch: true,
  localStorage: new MemoryStorage(),
  sessionStorage: new MemoryStorage(),
  logger: { warn: vi.fn() },
  now: () => 1_000,
  fetchTimeoutMs: 0,
  runtimeCacheUrl: null,
  ...overrides,
});

describe('GitHub repo stats service', () => {
  it('does not call browser GitHub API when live fallback is disabled', async () => {
    const fetch = vi.fn();
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ allowLiveFetch: false, runtimeCacheUrl: null })
    );

    await expect(
      service.requestStats({ owner: 'foo', repo: 'bar' })
    ).resolves.toBeNull();

    expect(fetch).not.toHaveBeenCalled();
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-neutral',
      requestCount: 0,
    });
  });

  it('loads valid runtime cache stats before browser live fetches', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        generatedAt: '1970-01-01T00:00:01.000Z',
        expiresAt: '1970-01-01T01:00:01.000Z',
        source: 'github-api',
        repos: {
          'futuroptimist/token.place': {
            owner: 'futuroptimist',
            repo: 'token.place',
            stars: 6,
            watchers: 1,
            forks: 0,
            openIssues: 0,
            pushedAt: '1970-01-01T00:00:00Z',
            fetchedAt: '1970-01-01T00:00:01.000Z',
            htmlUrl: 'https://github.com/futuroptimist/token.place',
          },
        },
        errors: {},
      }),
    });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({
        allowLiveFetch: false,
        runtimeCacheUrl: '/runtime/github-metrics.json',
      })
    );

    const stats = await service.requestStats({
      owner: 'futuroptimist',
      repo: 'token.place',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/runtime/github-metrics.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    expect(stats?.stars).toBe(6);
    expect(stats?.watchers).toBe(1);
    expect(service.getDiagnostics()).toMatchObject({
      source: 'runtime-cache',
      requestCount: 0,
      runtimeCacheRequestCount: 1,
      runtimeCacheGeneratedAt: '1970-01-01T00:00:01.000Z',
      runtimeCacheExpiresAt: '1970-01-01T01:00:01.000Z',
    });
  });

  it('treats stale runtime cache as unavailable without live fallback by default', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        generatedAt: '1970-01-01T00:00:01.000Z',
        expiresAt: '1970-01-01T00:01:00.000Z',
        repos: {
          'futuroptimist/flywheel': {
            owner: 'futuroptimist',
            repo: 'flywheel',
            stars: 999,
            watchers: 0,
            forks: 0,
            openIssues: 0,
          },
        },
      }),
    });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({
        allowLiveFetch: false,
        runtimeCacheUrl: '/runtime/github-metrics.json',
        now: () => 7_200_000,
      })
    );

    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'flywheel' })
    ).resolves.toBeNull();
    expect(service.getDiagnostics()).toMatchObject({
      source: 'runtime-cache-stale',
      requestCount: 0,
      runtimeCacheRequestCount: 1,
    });
  });

  it('treats invalid runtime cache as unavailable', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({
        allowLiveFetch: false,
        runtimeCacheUrl: '/runtime/github-metrics.json',
      })
    );

    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'flywheel' })
    ).resolves.toBeNull();
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-neutral',
      lastErrorStatus: 'invalid-runtime-cache',
    });
  });

  it('uses stargazers_count rather than watchers_count for debug live stars', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stargazers_count: 5,
        watchers_count: 999,
        forks_count: 1,
        open_issues_count: 0,
      }),
    });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ allowLiveFetch: true, runtimeCacheUrl: null })
    );

    const stats = await service.requestStats({ owner: 'foo', repo: 'bar' });

    expect(stats?.stars).toBe(5);
    expect(stats?.watchers).toBe(999);
    expect(service.getDiagnostics().source).toBe('browser-live');
  });

  it('uses neutral fallback for network failure when live debug is enabled', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline'));
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ allowLiveFetch: true, runtimeCacheUrl: null })
    );

    await expect(
      service.requestStats({ owner: 'foo', repo: 'bar' })
    ).resolves.toBeNull();
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-neutral',
      lastErrorStatus: 'network',
    });
  });

  it('fetches stats, caches results, and notifies subscribers', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stargazers_count: 1280,
        subscribers_count: 12,
        forks_count: 34,
        open_issues_count: 2,
        pushed_at: '2024-06-01T00:00:00Z',
      }),
    });

    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions()
    );

    const listener = vi.fn();
    service.subscribe({ owner: 'Futuroptimist', repo: 'Flywheel' }, listener);

    const stats = await service.requestStats({
      owner: 'Futuroptimist',
      repo: 'Flywheel',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(stats).toEqual({
      stars: 1280,
      watchers: 12,
      forks: 34,
      openIssues: 2,
      pushedAt: '2024-06-01T00:00:00Z',
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toEqual(stats);
    expect(service.getDiagnostics()).toMatchObject({
      source: 'browser-live',
      requestCount: 1,
      lastErrorStatus: null,
    });

    const cached = await service.requestStats({
      owner: 'futuroptimist',
      repo: 'flywheel',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cached).toBe(stats);
    expect(service.getDiagnostics().source).toBe('cached');
  });

  it('returns static fallback and enters backoff for a 403 response', async () => {
    const logger = { warn: vi.fn() };
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ logger })
    );

    const stats = await service.requestStats({ owner: 'foo', repo: 'bar' });

    expect(stats).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-neutral',
      requestCount: 1,
      lastErrorStatus: 403,
      warningCount: 1,
    });
    expect(service.getDiagnostics().backoffExpiresAt).toBe(
      '1970-01-01T00:15:01.000Z'
    );
  });

  it('enters backoff for a 429 response and suppresses repeated live requests', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions()
    );

    expect(
      await service.requestStats({ owner: 'futuroptimist', repo: 'flywheel' })
    ).toBeNull();
    expect(
      await service.requestStats({ owner: 'futuroptimist', repo: 'gabriel' })
    ).toBeNull();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      requestCount: 1,
      suppressedRequestCount: 1,
      lastErrorStatus: 429,
      source: 'static-neutral',
    });
  });

  it('uses stale cached stats when live fetch fails', async () => {
    const localStorage = new MemoryStorage();
    localStorage.setItem(
      'danielsmith.io:github-repo-stats:futuroptimist/flywheel',
      JSON.stringify({
        stats: {
          stars: 77,
          watchers: 3,
          forks: 4,
          openIssues: 5,
          pushedAt: '2024-01-01T00:00:00Z',
        },
        cachedAt: 1,
      })
    );
    const fetch = vi.fn().mockRejectedValue(new Error('network unreachable'));
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ localStorage, now: () => 3_700_000 })
    );

    const stats = await service.requestStats({
      owner: 'futuroptimist',
      repo: 'flywheel',
    });

    expect(stats).toEqual({
      stars: 77,
      watchers: 3,
      forks: 4,
      openIssues: 5,
      pushedAt: '2024-01-01T00:00:00Z',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      source: 'cached',
      lastErrorStatus: 'network',
    });
  });

  it('suppresses repeated repo metric attempts during persisted backoff', async () => {
    const localStorage = new MemoryStorage();
    localStorage.setItem(
      'danielsmith.io:github-repo-stats:backoff',
      JSON.stringify({
        status: 403,
        lastErrorAt: 1_000,
        expiresAt: 60_000,
      })
    );
    const fetch = vi.fn();
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ localStorage, now: () => 2_000 })
    );

    expect(service.getDiagnostics()).toMatchObject({
      suppressedRequestCount: 0,
      requestCount: 0,
      lastErrorStatus: 403,
      lastErrorAt: '1970-01-01T00:00:01.000Z',
      backoffExpiresAt: '1970-01-01T00:01:00.000Z',
    });

    await service.requestStats({ owner: 'foo', repo: 'one' });
    await service.requestStats({ owner: 'foo', repo: 'two' });

    expect(fetch).not.toHaveBeenCalled();
    expect(service.getDiagnostics()).toMatchObject({
      suppressedRequestCount: 2,
      requestCount: 0,
      lastErrorStatus: 403,
      lastErrorAt: '1970-01-01T00:00:01.000Z',
      backoffExpiresAt: '1970-01-01T00:01:00.000Z',
    });
  });

  it('rejects future-dated cache records before using live stats', async () => {
    const localStorage = new MemoryStorage();
    localStorage.setItem(
      'danielsmith.io:github-repo-stats:futuroptimist/flywheel',
      JSON.stringify({
        stats: {
          stars: 999,
          watchers: 1,
          forks: 1,
          openIssues: 1,
          pushedAt: null,
        },
        cachedAt: 60_000,
      })
    );
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stargazers_count: 42,
        watchers_count: 7,
        forks_count: 0,
        open_issues_count: 0,
      }),
    });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ localStorage, now: () => 1_000 })
    );

    const stats = await service.requestStats({
      owner: 'futuroptimist',
      repo: 'flywheel',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(stats?.stars).toBe(42);
    expect(service.getDiagnostics().source).toBe('browser-live');
  });

  it('honors explicit null storage and logger options', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ localStorage: null, sessionStorage: null, logger: null })
    );

    await service.requestStats({ owner: 'foo', repo: 'bar' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      lastErrorStatus: 403,
      warningCount: 0,
    });
  });

  it('groups failures into one warning path per session', async () => {
    const logger = { warn: vi.fn() };
    const sessionStorage = new MemoryStorage();
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ logger, sessionStorage })
    );

    await service.requestStats({ owner: 'foo', repo: 'one' });
    await service.requestStats({ owner: 'foo', repo: 'two' });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      requestCount: 2,
      warningCount: 1,
      lastErrorStatus: 404,
    });

    const nextService = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions({ logger, sessionStorage })
    );
    await nextService.requestStats({ owner: 'foo', repo: 'three' });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('skips cached subscriber callbacks after unsubscribe', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stargazers_count: 42,
        watchers_count: 7,
        forks_count: 0,
        open_issues_count: 0,
      }),
    });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions()
    );

    await service.requestStats({ owner: 'foo', repo: 'baz' });

    const listener = vi.fn();
    const unsubscribe = service.subscribe(
      { owner: 'Foo', repo: 'Baz' },
      listener
    );
    unsubscribe();

    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers cached stats to new subscribers immediately', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stargazers_count: 42,
        watchers_count: 7,
        forks_count: 0,
        open_issues_count: 0,
      }),
    });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      createOptions()
    );

    await service.requestStats({ owner: 'foo', repo: 'baz' });

    const listener = vi.fn();
    service.subscribe({ owner: 'Foo', repo: 'Baz' }, listener);

    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toEqual({
      stars: 42,
      watchers: 7,
      forks: 0,
      openIssues: 0,
      pushedAt: null,
    });
  });
});
