import { describe, expect, it, vi } from 'vitest';

import { createGitHubRepoStatsService } from '../systems/github/repoStats';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  length = 0;

  clear(): void {
    this.values.clear();
    this.length = 0;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
    this.length = this.values.size;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
    this.length = this.values.size;
  }
}

describe('GitHub repo stats service', () => {
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
      { allowLiveFetch: true, storage: new MemoryStorage() }
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
    expect(service.getDiagnostics().source).toBe('live');

    const cached = await service.requestStats({
      owner: 'futuroptimist',
      repo: 'flywheel',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cached).toBe(stats);
  });

  it('returns null without caching when fetch fails', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('network unreachable'));
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, storage: new MemoryStorage() }
    );

    const stats = await service.requestStats({ owner: 'foo', repo: 'bar' });
    expect(stats).toBeNull();
    expect(service.getCachedStats({ owner: 'foo', repo: 'bar' })).toBeNull();
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-fallback',
      lastErrorMessage: 'GitHub API request failed',
    });
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
      { allowLiveFetch: true, storage: new MemoryStorage() }
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

  it('enters backoff and returns static fallback after a 403 response', async () => {
    let now = 1_000;
    const storage = new MemoryStorage();
    const logger = { warn: vi.fn() };
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffTtlMs: 60_000,
        logger,
        now: () => now,
        storage,
      }
    );

    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'gabriel' })
    ).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 403,
      requestCount: 1,
      warningCount: 1,
      backoffUntil: 61_000,
    });

    now += 1_000;
    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'flywheel' })
    ).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics().suppressedRequestCount).toBe(1);
  });

  it('enters backoff and returns static fallback after a 429 response', async () => {
    const logger = { warn: vi.fn() };
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffTtlMs: 10_000,
        logger,
        now: () => 5_000,
        storage: new MemoryStorage(),
      }
    );

    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'token.place' })
    ).resolves.toBeNull();
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 429,
      backoffUntil: 15_000,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('uses stale cached success when live fetch fails', async () => {
    let now = 1_000;
    const storage = new MemoryStorage();
    const successFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stargazers_count: 86,
        subscribers_count: 5,
        forks_count: 2,
        open_issues_count: 1,
      }),
    });
    const warmService = createGitHubRepoStatsService(
      successFetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, now: () => now, storage, successCacheTtlMs: 1 }
    );
    await warmService.requestStats({ owner: 'futuroptimist', repo: 'axel' });

    now = 2_000;
    const failingFetch = vi.fn().mockRejectedValue(new Error('offline'));
    const service = createGitHubRepoStatsService(
      failingFetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, now: () => now, storage, successCacheTtlMs: 1 }
    );

    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'axel' })
    ).resolves.toEqual({
      stars: 86,
      watchers: 5,
      forks: 2,
      openIssues: 1,
      pushedAt: null,
    });
    expect(failingFetch).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({ source: 'cached' });
  });

  it('suppresses repeated repo metric fetches during persisted backoff', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'danielsmith.io:github-repo-stats-backoff:v1',
      JSON.stringify({
        until: 30_000,
        reason: 'GitHub API returned 403',
        status: 403,
      })
    );
    const fetch = vi.fn();
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, now: () => 20_000, storage }
    );

    await service.requestStats({ owner: 'futuroptimist', repo: 'gabriel' });
    await service.requestStats({ owner: 'futuroptimist', repo: 'flywheel' });

    expect(fetch).not.toHaveBeenCalled();
    expect(service.getDiagnostics()).toMatchObject({
      lastErrorStatus: 403,
      suppressedRequestCount: 2,
      backoffUntil: 30_000,
    });
  });

  it('groups unavailable warnings into one diagnostic path', async () => {
    const logger = { warn: vi.fn() };
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffTtlMs: 60_000,
        logger,
        now: () => 1_000,
        storage: new MemoryStorage(),
      }
    );

    await service.requestStats({ owner: 'futuroptimist', repo: 'gabriel' });
    await service.requestStats({ owner: 'futuroptimist', repo: 'flywheel' });
    await service.requestStats({ owner: 'futuroptimist', repo: 'wove' });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics().warningCount).toBe(1);
  });
});
