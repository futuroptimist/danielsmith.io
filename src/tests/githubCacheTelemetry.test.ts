import { describe, expect, it, vi } from 'vitest';

import { serializeGitHubCacheMetrics } from '../systems/github/cacheTelemetry';

const snapshot = (cache: Record<string, unknown>) => ({
  schemaVersion: 1,
  cache: {
    enabled: true,
    state: 'fresh',
    lastSuccessfulRefreshAt: '2026-01-01T00:00:00.000Z',
    oldestDataFetchedAt: '2026-01-01T00:00:00.000Z',
    retainedDataAgeSeconds: 0,
    dataCompleteness: 'complete',
    refreshDurationMs: 250,
    failureCategories: [],
    configuredRepositoryCount: 2,
    successfulRepositoryCount: 2,
    failedRepositoryCount: 0,
    retainedRepositoryCount: 0,
    ...cache,
  },
});

describe('GitHub cache telemetry serialization', () => {
  it.each([
    ['disabled', false, 'none'],
    ['warming', true, 'none'],
    ['fresh', true, 'complete'],
    ['stale', true, 'partial'],
    ['unavailable', true, 'none'],
  ])(
    'exports the bounded %s lifecycle state',
    (state, enabled, completeness) => {
      const metrics = serializeGitHubCacheMetrics(
        snapshot({
          state,
          enabled,
          dataCompleteness: completeness,
          configuredRepositoryCount: enabled ? 2 : 0,
          successfulRepositoryCount: state === 'fresh' ? 2 : 0,
          failedRepositoryCount:
            state === 'fresh' || state === 'disabled' ? 0 : 2,
          retainedRepositoryCount: state === 'stale' ? 2 : 0,
        })
      );
      expect(metrics).toContain(`state="${state}"`);
    }
  );

  it('preserves successful and oldest-data timestamps across failure and recovery', () => {
    const partial = serializeGitHubCacheMetrics(
      snapshot({
        state: 'stale',
        dataCompleteness: 'partial',
        successfulRepositoryCount: 1,
        failedRepositoryCount: 1,
        retainedRepositoryCount: 1,
        retainedDataAgeSeconds: 3600,
        failureCategories: ['rate_limited'],
      })
    );
    expect(partial).toContain('last_success_timestamp_seconds 1767225600');
    expect(partial).toContain('oldest_data_timestamp_seconds 1767225600');
    expect(partial).toContain('retained_data_age_seconds 3600');
    expect(partial).toContain('category="rate_limited"');

    const recovered = serializeGitHubCacheMetrics(
      snapshot({
        lastSuccessfulRefreshAt: '2026-01-01T01:00:00.000Z',
        oldestDataFetchedAt: '2026-01-01T01:00:00.000Z',
      })
    );
    expect(recovered).toContain('last_success_timestamp_seconds 1767229200');
  });

  it('fails closed for unbounded or privacy-sensitive values', () => {
    expect(
      serializeGitHubCacheMetrics(
        snapshot({ failureCategories: ['token=secret'] })
      )
    ).toBeNull();
    expect(
      serializeGitHubCacheMetrics(snapshot({ configuredRepositoryCount: 51 }))
    ).toBeNull();
    expect(
      serializeGitHubCacheMetrics(snapshot({ state: 'owner/repository' }))
    ).toBeNull();
  });

  it('serializes supplied state without calling an upstream client', () => {
    const upstreamClient = vi.fn();
    const metrics = serializeGitHubCacheMetrics(snapshot({}));

    expect(metrics).toContain('daniel_github_cache_enabled 1');
    expect(upstreamClient).not.toHaveBeenCalled();
  });
});
