import { describe, expect, it, vi } from 'vitest';

import {
  GITHUB_CACHE_FAILURE_CATEGORIES,
  GITHUB_CACHE_STATES,
  parseGitHubCacheTelemetry,
  serializeGitHubCacheMetrics,
} from '../cacheTelemetry';

const cache = {
  enabled: true,
  state: 'fresh',
  lastSuccessfulRefreshAt: '2026-09-17T12:00:00.000Z',
  dataCompleteness: 'complete',
  refreshDurationMs: 125,
  failureCategories: [],
  configuredRepositoryCount: 2,
  successfulRepositoryCount: 2,
  failedRepositoryCount: 0,
  retainedRepositoryCount: 2,
  oldestDataFetchedAt: '2026-09-17T12:00:00.000Z',
  retainedDataAgeSeconds: 0,
} as const;

const document = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({ schemaVersion: 1, cache: { ...cache, ...overrides } });

describe('GitHub cache telemetry', () => {
  it.each([
    [
      'disabled caching',
      { enabled: false, state: 'disabled', dataCompleteness: 'none' },
    ],
    ['initial warmup', { state: 'warming', dataCompleteness: 'none' }],
    ['first refresh', {}],
    [
      'partial failure with stale fallback',
      {
        state: 'stale',
        dataCompleteness: 'partial',
        failureCategories: ['upstream'],
        successfulRepositoryCount: 1,
        failedRepositoryCount: 1,
      },
    ],
    [
      'rate limiting',
      {
        state: 'stale',
        dataCompleteness: 'partial',
        failureCategories: ['rate_limited'],
      },
    ],
    [
      'unavailable data',
      {
        state: 'unavailable',
        dataCompleteness: 'none',
        failureCategories: ['network'],
        retainedRepositoryCount: 0,
      },
    ],
    ['recovery', { state: 'fresh', dataCompleteness: 'complete' }],
  ])('accepts the bounded %s state', (_name, overrides) => {
    expect(parseGitHubCacheTelemetry(document(overrides))).toMatchObject(
      overrides
    );
  });

  it('preserves last-good time and retained age through a failed refresh', () => {
    const snapshot = parseGitHubCacheTelemetry(
      document({
        state: 'stale',
        dataCompleteness: 'partial',
        lastSuccessfulRefreshAt: '2026-09-17T11:00:00.000Z',
        oldestDataFetchedAt: '2026-09-17T10:00:00.000Z',
        retainedDataAgeSeconds: 7_200,
        refreshDurationMs: 500,
        failureCategories: ['timeout'],
      })
    );

    expect(snapshot?.lastSuccessfulRefreshAt).toBe('2026-09-17T11:00:00.000Z');
    expect(snapshot?.oldestDataFetchedAt).toBe('2026-09-17T10:00:00.000Z');
    expect(snapshot?.retainedDataAgeSeconds).toBe(7_200);
  });

  it('fails closed for unknown, duplicate, oversized, or privacy-sensitive fields', () => {
    expect(parseGitHubCacheTelemetry(document({ token: 'secret' }))).toBeNull();
    expect(
      parseGitHubCacheTelemetry(
        document({ failureCategories: ['timeout', 'timeout'] })
      )
    ).toBeNull();
    expect(
      parseGitHubCacheTelemetry(
        document({ failureCategories: ['https://github.com/error'] })
      )
    ).toBeNull();
    expect(
      parseGitHubCacheTelemetry(
        document({ retainedDataAgeSeconds: 31_536_001 })
      )
    ).toBeNull();
    expect(
      parseGitHubCacheTelemetry(`{"padding":"${'x'.repeat(262_144)}"}`)
    ).toBeNull();
  });

  it('serializes bounded label-free metrics without calling an upstream client', () => {
    const upstreamClient = vi.fn();
    const snapshot = parseGitHubCacheTelemetry(document());
    expect(snapshot).not.toBeNull();

    const metrics = serializeGitHubCacheMetrics(snapshot!);

    expect(upstreamClient).not.toHaveBeenCalled();
    expect(metrics).toContain('daniel_github_cache_enabled 1\n');
    expect(metrics).toContain('daniel_github_cache_state_fresh 1\n');
    expect(metrics).toContain('daniel_github_cache_failure_rate_limited 0\n');
    expect(metrics).not.toContain('{');
    expect(metrics.length).toBeLessThan(4_096);
    expect(GITHUB_CACHE_STATES).toHaveLength(5);
    expect(GITHUB_CACHE_FAILURE_CATEGORIES).toHaveLength(8);
  });
});
