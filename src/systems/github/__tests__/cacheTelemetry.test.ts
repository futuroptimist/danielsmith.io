import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  parseGitHubCacheTelemetry,
  serializeGitHubCacheMetrics,
} from '../cacheTelemetry';

afterEach(() => {
  vi.restoreAllMocks();
});

const snapshot = (overrides: Record<string, unknown> = {}) => ({
  enabled: true,
  state: 'fresh',
  lastSuccessfulRefreshAt: '2026-09-17T12:00:00.000Z',
  oldestDataFetchedAt: '2026-09-17T12:00:00.000Z',
  retainedDataAgeSeconds: 0,
  dataCompleteness: 'complete',
  refreshDurationMs: 125,
  failureCategories: [],
  configuredRepositoryCount: 2,
  successfulRepositoryCount: 2,
  failedRepositoryCount: 0,
  retainedRepositoryCount: 0,
  ...overrides,
});

describe('GitHub cache telemetry contract', () => {
  it.each([
    [
      'disabled',
      snapshot({
        enabled: false,
        state: 'disabled',
        lastSuccessfulRefreshAt: null,
        oldestDataFetchedAt: null,
        retainedDataAgeSeconds: null,
        dataCompleteness: 'none',
        refreshDurationMs: null,
        configuredRepositoryCount: 0,
        successfulRepositoryCount: 0,
      }),
    ],
    [
      'warming',
      snapshot({
        state: 'warming',
        lastSuccessfulRefreshAt: null,
        oldestDataFetchedAt: null,
        retainedDataAgeSeconds: null,
        dataCompleteness: 'none',
        refreshDurationMs: null,
        successfulRepositoryCount: 0,
        failedRepositoryCount: 0,
        configuredRepositoryCount: 2,
      }),
    ],
    ['fresh', snapshot()],
    [
      'partial stale fallback',
      snapshot({
        state: 'stale',
        oldestDataFetchedAt: '2026-09-17T10:00:00.000Z',
        retainedDataAgeSeconds: 7200,
        dataCompleteness: 'partial',
        failureCategories: ['network'],
        successfulRepositoryCount: 1,
        failedRepositoryCount: 1,
        retainedRepositoryCount: 1,
      }),
    ],
    [
      'rate limiting',
      snapshot({
        state: 'stale',
        dataCompleteness: 'partial',
        failureCategories: ['rate_limited'],
        successfulRepositoryCount: 0,
        failedRepositoryCount: 2,
        retainedRepositoryCount: 2,
      }),
    ],
    [
      'unavailable',
      snapshot({
        state: 'unavailable',
        lastSuccessfulRefreshAt: null,
        oldestDataFetchedAt: null,
        retainedDataAgeSeconds: null,
        dataCompleteness: 'none',
        failureCategories: ['timeout'],
        successfulRepositoryCount: 0,
        failedRepositoryCount: 2,
      }),
    ],
  ])('accepts the bounded %s state', (_name, value) => {
    expect(parseGitHubCacheTelemetry(value)).toEqual(value);
  });

  it('preserves last-good timestamps through failure and recovery snapshots', () => {
    const lastSuccess = '2026-09-17T12:00:00.000Z';
    const stale = parseGitHubCacheTelemetry(
      snapshot({
        state: 'stale',
        lastSuccessfulRefreshAt: lastSuccess,
        oldestDataFetchedAt: '2026-09-17T10:00:00.000Z',
        retainedDataAgeSeconds: 10800,
        dataCompleteness: 'partial',
        failureCategories: ['upstream'],
        successfulRepositoryCount: 0,
        failedRepositoryCount: 2,
        retainedRepositoryCount: 2,
      })
    );
    const recovered = parseGitHubCacheTelemetry(
      snapshot({
        lastSuccessfulRefreshAt: '2026-09-17T15:00:00.000Z',
        oldestDataFetchedAt: '2026-09-17T15:00:00.000Z',
      })
    );

    expect(stale?.lastSuccessfulRefreshAt).toBe(lastSuccess);
    expect(stale?.oldestDataFetchedAt).toBe('2026-09-17T10:00:00.000Z');
    expect(recovered?.state).toBe('fresh');
    expect(recovered?.lastSuccessfulRefreshAt).toBe('2026-09-17T15:00:00.000Z');
  });

  it.each([
    ['unknown state', { state: 'broken' }],
    ['unknown error', { failureCategories: ['token=secret'] }],
    ['duplicate error', { failureCategories: ['network', 'network'] }],
    ['unbounded count', { configuredRepositoryCount: 51 }],
    ['unbounded duration', { refreshDurationMs: 3_600_001 }],
    [
      'noncanonical timestamp',
      { lastSuccessfulRefreshAt: '2026-09-17T12:00:00Z' },
    ],
    ['inconsistent counts', { successfulRepositoryCount: 1 }],
    ['enabled without repositories', { configuredRepositoryCount: 0 }],
    ['completed attempt without duration', { refreshDurationMs: null }],
    [
      'failed attempt without a category',
      {
        state: 'unavailable',
        lastSuccessfulRefreshAt: null,
        oldestDataFetchedAt: null,
        retainedDataAgeSeconds: null,
        dataCompleteness: 'none',
        failureCategories: [],
        successfulRepositoryCount: 0,
        failedRepositoryCount: 2,
      },
    ],
    ['successful attempt with a category', { failureCategories: ['network'] }],
    ['fresh state without a last success', { lastSuccessfulRefreshAt: null }],
    ['failure category on fresh state', { failureCategories: ['network'] }],
    ['arbitrary repository label', { repository: 'private/repo' }],
  ])('fails closed for %s', (_name, override) => {
    const value = snapshot(override);
    const parsed = parseGitHubCacheTelemetry(value);
    if ('repository' in override) {
      expect(parsed).not.toHaveProperty('repository');
    } else {
      expect(parsed).toBeNull();
    }
  });

  it('serializes fixed metric series from a published snapshot', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const output = serializeGitHubCacheMetrics(
      snapshot({
        state: 'stale',
        dataCompleteness: 'partial',
        failureCategories: ['rate_limited'],
        successfulRepositoryCount: 1,
        failedRepositoryCount: 1,
        retainedRepositoryCount: 1,
      })
    );

    expect(output).toContain('daniel_github_cache_state{state="stale"} 1');
    expect(output).toContain(
      'daniel_github_cache_refresh_failure{category="rate_limited"} 1'
    );
    expect(output).not.toContain('private/repo');
    expect(
      new TextEncoder().encode(output ?? '').byteLength
    ).toBeLessThanOrEqual(8192);
    expect(fetch).not.toHaveBeenCalled();
  });
});
