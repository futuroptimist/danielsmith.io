import { describe, expect, it, vi } from 'vitest';

import { createGitHubRepoStatsService } from '../systems/github/repoStats';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const createServiceStorage = () => ({
  localStorage: new MemoryStorage(),
  sessionStorage: new MemoryStorage(),
});

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
    const storage = createServiceStorage();

    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, ...storage }
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

    const cached = await service.requestStats({
      owner: 'futuroptimist',
      repo: 'flywheel',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cached).toBe(stats);
    expect(service.getDiagnostics()).toMatchObject({
      source: 'cached',
      lastErrorStatus: null,
      requestCount: 1,
    });
  });

  it('returns null and warns once when fetch fails', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('network unreachable'));
    const warn = vi.fn();
    const storage = createServiceStorage();
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, warn, ...storage }
    );

    const stats = await service.requestStats({ owner: 'foo', repo: 'bar' });
    const suppressed = await service.requestStats({
      owner: 'foo',
      repo: 'baz',
    });

    expect(stats).toBeNull();
    expect(suppressed).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(service.getCachedStats({ owner: 'foo', repo: 'bar' })).toBeNull();
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 'network',
      requestCount: 1,
      suppressedRequestCount: 1,
      warnedThisSession: true,
    });
  });

  it('enters backoff and returns static fallback after a 403 response', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const warn = vi.fn();
    const storage = createServiceStorage();
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffTtlMs: 60_000,
        now: () => 1_000,
        warn,
        ...storage,
      }
    );

    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'gabriel' })
    ).resolves.toBeNull();
    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'flywheel' })
    ).resolves.toBeNull();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      source: 'static-fallback',
      lastErrorStatus: 403,
      requestCount: 1,
      suppressedRequestCount: 1,
      backoffExpiresAt: 61_000,
    });
  });

  it('enters backoff and returns static fallback after a 429 response', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const warn = vi.fn();
    const storage = createServiceStorage();
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      {
        allowLiveFetch: true,
        backoffTtlMs: 30_000,
        now: () => 5_000,
        warn,
        ...storage,
      }
    );

    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'token.place' })
    ).resolves.toBeNull();
    await expect(
      service.requestStats({ owner: 'futuroptimist', repo: 'wove' })
    ).resolves.toBeNull();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(service.getDiagnostics()).toMatchObject({
      lastErrorStatus: 429,
      requestCount: 1,
      suppressedRequestCount: 1,
      backoffExpiresAt: 35_000,
    });
  });

  it('uses stale cached success when live fetch fails', async () => {
    const identifier = { owner: 'foo', repo: 'baz' };
    const storage = createServiceStorage();
    const firstFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stargazers_count: 42,
        watchers_count: 7,
        forks_count: 0,
        open_issues_count: 0,
      }),
    });
    const firstService = createGitHubRepoStatsService(
      firstFetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, ...storage }
    );
    await firstService.requestStats(identifier);

    const secondFetch = vi.fn().mockRejectedValue(new Error('offline'));
    const secondService = createGitHubRepoStatsService(
      secondFetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, ...storage }
    );

    await expect(secondService.requestStats(identifier)).resolves.toEqual({
      stars: 42,
      watchers: 7,
      forks: 0,
      openIssues: 0,
      pushedAt: null,
    });
    expect(secondFetch).not.toHaveBeenCalled();
    expect(secondService.getDiagnostics().source).toBe('cached');
  });

  it('suppresses repeated repo metric fetch attempts during persisted backoff', async () => {
    const storage = createServiceStorage();
    const firstFetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const firstService = createGitHubRepoStatsService(
      firstFetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, now: () => 10_000, warn: vi.fn(), ...storage }
    );
    await firstService.requestStats({
      owner: 'futuroptimist',
      repo: 'gabriel',
    });

    const secondFetch = vi.fn();
    const secondService = createGitHubRepoStatsService(
      secondFetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true, now: () => 20_000, ...storage }
    );
    await secondService.requestStats({
      owner: 'futuroptimist',
      repo: 'flywheel',
    });

    expect(secondFetch).not.toHaveBeenCalled();
    expect(secondService.getDiagnostics()).toMatchObject({
      lastErrorStatus: 403,
      suppressedRequestCount: 1,
      warnedThisSession: true,
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
      { allowLiveFetch: true, ...createServiceStorage() }
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
