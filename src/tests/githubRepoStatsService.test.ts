import { describe, expect, it, vi } from 'vitest';

import { createGitHubRepoStatsService } from '../systems/github/repoStats';

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
      { allowLiveFetch: true }
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
  });

  it('returns null without caching when fetch fails', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('network unreachable'));
    const service = createGitHubRepoStatsService(
      fetch as unknown as typeof globalThis.fetch,
      { allowLiveFetch: true }
    );

    const stats = await service.requestStats({ owner: 'foo', repo: 'bar' });
    expect(stats).toBeNull();
    expect(service.getCachedStats({ owner: 'foo', repo: 'bar' })).toBeNull();
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
      { allowLiveFetch: true }
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
