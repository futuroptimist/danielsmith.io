import { describe, expect, it, vi } from 'vitest';

import {
  GITHUB_CACHE_FAILURE_CATEGORIES,
  GITHUB_CACHE_STATES,
  readGitHubCacheTelemetry,
  serializeGitHubCacheMetrics,
} from '../cacheTelemetry';

const cacheDocument = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  repos: { 'unbounded/repository-name': { token: 'must-not-leak' } },
  cache: {
    enabled: true,
    state: 'fresh',
    lastSuccessfulRefreshAt: '2026-09-17T12:00:00.000Z',
    dataCompleteness: 'complete',
    refreshDurationMs: 125,
    failureCategories: [],
    configuredRepositoryCount: 2,
    successfulRepositoryCount: 2,
    failedRepositoryCount: 0,
    retainedRepositoryCount: 0,
    oldestDataFetchedAt: '2026-09-17T12:00:00.000Z',
    retainedDataAgeSeconds: 0,
    ...overrides,
  },
});

describe('GitHub cache telemetry', () => {
  it.each([
    ['disabled', false, 'none'],
    ['warming', true, 'none'],
    ['fresh', true, 'complete'],
    ['stale', true, 'partial'],
    ['unavailable', true, 'none'],
  ])(
    'serializes the bounded %s lifecycle state',
    (state, enabled, completeness) => {
      const output = serializeGitHubCacheMetrics(
        cacheDocument({ state, enabled, dataCompleteness: completeness })
      );

      expect(output).toContain(`daniel_github_cache_state{state="${state}"} 1`);
      expect(output).toContain(
        `daniel_github_cache_enabled ${Number(enabled)}`
      );
      expect(output).toContain(
        `daniel_github_cache_data_completeness{completeness="${completeness}"} 1`
      );
    }
  );

  it('preserves last-good freshness during partial, rate-limited fallback and recovery', () => {
    const partial = readGitHubCacheTelemetry(
      cacheDocument({
        state: 'stale',
        dataCompleteness: 'partial',
        failureCategories: ['invalid_response', 'rate_limited'],
        successfulRepositoryCount: 1,
        failedRepositoryCount: 1,
        retainedRepositoryCount: 1,
        oldestDataFetchedAt: '2026-09-17T10:00:00.000Z',
        retainedDataAgeSeconds: 7_200,
      })
    );
    expect(partial).toMatchObject({
      lastSuccessfulRefreshAt: '2026-09-17T12:00:00.000Z',
      oldestDataFetchedAt: '2026-09-17T10:00:00.000Z',
      retainedDataAgeSeconds: 7_200,
    });

    const recovered = readGitHubCacheTelemetry(
      cacheDocument({ lastSuccessfulRefreshAt: '2026-09-17T13:00:00.000Z' })
    );
    expect(recovered?.state).toBe('fresh');
    expect(recovered?.lastSuccessfulRefreshAt).toBe('2026-09-17T13:00:00.000Z');
  });

  it('exports every failure category as a fixed zero-or-one series', () => {
    const output = serializeGitHubCacheMetrics(
      cacheDocument({ failureCategories: ['rate_limited', 'timeout'] })
    );

    for (const category of GITHUB_CACHE_FAILURE_CATEGORIES) {
      const expected =
        category === 'rate_limited' || category === 'timeout' ? 1 : 0;
      expect(output).toContain(
        `daniel_github_cache_refresh_failure{category="${category}"} ${expected}`
      );
    }
  });

  it('fails closed on arbitrary labels, duplicate categories, and out-of-range values', () => {
    expect(
      serializeGitHubCacheMetrics(cacheDocument({ state: 'secret-state' }))
    ).toBeNull();
    expect(
      serializeGitHubCacheMetrics(
        cacheDocument({ failureCategories: ['rate_limited', 'rate_limited'] })
      )
    ).toBeNull();
    expect(
      serializeGitHubCacheMetrics(
        cacheDocument({ configuredRepositoryCount: 51 })
      )
    ).toBeNull();
    expect(
      serializeGitHubCacheMetrics(
        cacheDocument({ refreshDurationMs: Infinity })
      )
    ).toBeNull();
    expect(
      serializeGitHubCacheMetrics({ ...cacheDocument(), schemaVersion: 2 })
    ).toBeNull();
    expect(
      serializeGitHubCacheMetrics(cacheDocument({ enabled: false }))
    ).toBeNull();
    expect(
      serializeGitHubCacheMetrics(cacheDocument({ failedRepositoryCount: 1 }))
    ).toBeNull();
  });

  it('omits repository data, errors, URLs, request identities, and tokens', () => {
    const document = cacheDocument();
    const output = serializeGitHubCacheMetrics({
      ...document,
      error: 'https://api.github.com/repos/private?token=secret',
      requestId: 'arbitrary-request',
    });

    expect(output?.length).toBeLessThan(8_192);
    expect(output).not.toMatch(
      /unbounded|repository-name|token|secret|https|request/i
    );
  });

  it('serializes existing state without calling fetch or an upstream client', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const first = serializeGitHubCacheMetrics(cacheDocument());
    const second = serializeGitHubCacheMetrics(
      cacheDocument({ state: 'stale', dataCompleteness: 'partial' })
    );

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('keeps state labels finite and deterministic', () => {
    const output = serializeGitHubCacheMetrics(cacheDocument());
    expect(GITHUB_CACHE_STATES).toHaveLength(5);
    expect(output).toBe(serializeGitHubCacheMetrics(cacheDocument()));
  });
});
