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
    expect(service.getDiagnostics()).toMatchObject({
      source: 'live',
      lastErrorStatus: null,
      requestCount: 1,
    });

    const cached = await service.requestStats({
      owner: 'futuroptimist',
      repo: 'flywheel',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cached).toBe(stats);
    expect(service.getDiagnostics().source).toBe('cached');
  });

  it('returns null without caching when fetch fails', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('network unreachable'));
    const warn = { warn: vi.fn() };
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, storage: new MemoryStorage(), warn }
    );

    const stats = await service.requestStats({ owner: 'foo', repo: 'bar' });
    expect(stats).toBeNull();
    expect(service.getCachedStats({ owner: 'foo', repo: 'bar' })).toBeNull();
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 'network',
      requestCount: 1,
    });
    expect(warn.warn).toHaveBeenCalledTimes(1);
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

  it('enters backoff and returns static fallback after a 403', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const warn = { warn: vi.fn() };
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffMs: 10_000,
        now: () => 1_000,
        storage: new MemoryStorage(),
        warn,
      }
    );

    const stats = await service.requestStats({ owner: 'foo', repo: 'bar' });

    expect(stats).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(warn.warn).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 403,
      requestCount: 1,
      backoffExpiresAt: 11_000,
    });
  });

  it('enters backoff and returns static fallback after a 429', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffMs: 20_000,
        now: () => 1_000,
        storage: new MemoryStorage(),
        warn: null,
      }
    );

    await expect(
      service.requestStats({ owner: 'foo', repo: 'ratelimited' })
    ).resolves.toBeNull();
    expect(service.getDiagnostics()).toMatchObject({
      lastErrorStatus: 429,
      backoffExpiresAt: 21_000,
    });
  });

  it('uses stale cached success when live fetches are backed off', async () => {
    const storage = new MemoryStorage();
    const fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stargazers_count: 99,
        subscribers_count: 4,
        forks_count: 5,
        open_issues_count: 6,
      }),
    });
    const firstService = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, storage }
    );
    await firstService.requestStats({ owner: 'foo', repo: 'cached' });

    const failingFetch = vi.fn().mockRejectedValue(new Error('offline'));
    const secondService = createGitHubRepoStatsService(
      failingFetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, storage }
    );

    const stats = await secondService.requestStats({
      owner: 'foo',
      repo: 'cached',
    });

    expect(stats).toEqual({
      stars: 99,
      watchers: 4,
      forks: 5,
      openIssues: 6,
      pushedAt: null,
    });
    expect(failingFetch).not.toHaveBeenCalled();
    expect(secondService.getDiagnostics().source).toBe('cached');
  });

  it('suppresses repeated repo metric attempts during backoff', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffMs: 30_000,
        now: () => 5_000,
        storage: new MemoryStorage(),
        warn: null,
      }
    );

    await service.requestStats({ owner: 'foo', repo: 'one' });
    await service.requestStats({ owner: 'foo', repo: 'two' });
    await service.requestStats({ owner: 'foo', repo: 'three' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      lastErrorStatus: 403,
      requestCount: 1,
      suppressedRequestCount: 2,
      backoffExpiresAt: 35_000,
    });
  });

  it('groups failures into one warning path', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const warn = { warn: vi.fn() };
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffMs: 30_000,
        now: () => 5_000,
        storage: new MemoryStorage(),
        warn,
      }
    );

    await service.requestStats({ owner: 'foo', repo: 'one' });
    await service.requestStats({ owner: 'foo', repo: 'two' });

    expect(warn.warn).toHaveBeenCalledTimes(1);
  });
});
