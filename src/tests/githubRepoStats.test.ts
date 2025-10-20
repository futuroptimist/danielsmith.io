import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearGitHubRepoStatsCache,
  getGitHubRepoStats,
} from '../systems/github/repoStats';

describe('getGitHubRepoStats', () => {
  afterEach(() => {
    clearGitHubRepoStatsCache();
  });

  it('fetches and normalizes repository statistics from GitHub', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        stargazers_count: 1234,
        forks_count: 56,
        subscribers_count: 78,
        watchers_count: 90,
        open_issues_count: 12,
        updated_at: '2024-06-01T12:00:00Z',
      }),
    })) as unknown as typeof fetch;

    const stats = await getGitHubRepoStats({
      owner: 'Foo',
      repo: 'Bar',
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/Foo/Bar');
    expect(init.headers).toMatchObject({
      Accept: 'application/vnd.github+json',
    });
    expect(stats).toEqual({
      stars: 1234,
      forks: 56,
      watchers: 78,
      openIssues: 12,
      updatedAt: '2024-06-01T12:00:00Z',
    });
  });

  it('reuses cached promises for identical owner/repo combinations', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        stargazers_count: 42,
        forks_count: 7,
        subscribers_count: 3,
        watchers_count: 0,
        open_issues_count: 1,
        updated_at: '2024-05-01T00:00:00Z',
      }),
    })) as unknown as typeof fetch;

    const first = getGitHubRepoStats({
      owner: ' Futuroptimist ',
      repo: 'Portfolio',
      fetchImpl: fetchMock,
    });
    const second = getGitHubRepoStats({
      owner: 'futuroptimist',
      repo: 'portfolio',
      fetchImpl: fetchMock,
    });

    const [firstStats, secondStats] = await Promise.all([first, second]);
    expect(firstStats.stars).toBe(42);
    expect(secondStats.stars).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sanitizes invalid numeric values and prefers subscriber counts for watchers', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        stargazers_count: -5,
        forks_count: 'n/a',
        subscribers_count: null,
        watchers_count: 21,
        open_issues_count: undefined,
      }),
    })) as unknown as typeof fetch;

    const stats = await getGitHubRepoStats({
      owner: 'foo',
      repo: 'bar',
      fetchImpl: fetchMock,
    });

    expect(stats).toEqual({
      stars: 0,
      forks: 0,
      watchers: 21,
      openIssues: 0,
      updatedAt: null,
    });
  });

  it('throws informative errors when GitHub responds with a failure status and clears cache', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => ({
        ok: false,
        status: 403,
        json: async () => ({}),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          stargazers_count: 8,
          forks_count: 2,
          watchers_count: 5,
          open_issues_count: 1,
          updated_at: '2024-04-02T11:22:33Z',
        }),
      })) as unknown as typeof fetch;

    await expect(
      getGitHubRepoStats({ owner: 'foo', repo: 'bar', fetchImpl: fetchMock })
    ).rejects.toThrow('status 403');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const stats = await getGitHubRepoStats({
      owner: 'foo',
      repo: 'bar',
      fetchImpl: fetchMock,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(stats).toEqual({
      stars: 8,
      forks: 2,
      watchers: 5,
      openIssues: 1,
      updatedAt: '2024-04-02T11:22:33Z',
    });
  });

  it('throws when owner or repo values are missing after trimming', async () => {
    const fetchMock = vi.fn();
    await expect(
      getGitHubRepoStats({
        owner: '   ',
        repo: 'valid',
        fetchImpl: fetchMock as never,
      })
    ).rejects.toThrow('must be provided');
    await expect(
      getGitHubRepoStats({
        owner: 'valid',
        repo: '',
        fetchImpl: fetchMock as never,
      })
    ).rejects.toThrow('must be provided');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
