import { describe, expect, it } from 'vitest';

import {
  DISABLE_LOW_FPS_FAILOVER_PARAM,
  resolvePerformanceFailoverEnabled,
} from '../failover/performanceFailoverConfig';

describe('resolvePerformanceFailoverEnabled', () => {
  it('defaults to enabled when no overrides are provided', () => {
    expect(resolvePerformanceFailoverEnabled()).toBe(true);
  });

  it('respects an explicit disable override flag', () => {
    expect(resolvePerformanceFailoverEnabled({ disableOverride: true })).toBe(false);
    expect(resolvePerformanceFailoverEnabled({ disableOverride: false })).toBe(true);
  });

  it('disables monitoring when the query parameter is present without value', () => {
    const search = `?${DISABLE_LOW_FPS_FAILOVER_PARAM}`;
    expect(resolvePerformanceFailoverEnabled({ search })).toBe(false);
  });

  it('disables monitoring for truthy parameter values', () => {
    const param = DISABLE_LOW_FPS_FAILOVER_PARAM;
    expect(resolvePerformanceFailoverEnabled({ search: `?${param}=1` })).toBe(false);
    expect(resolvePerformanceFailoverEnabled({ search: `?${param}=true` })).toBe(false);
    expect(resolvePerformanceFailoverEnabled({ search: `?foo=bar&${param}=disabled` })).toBe(
      false
    );
  });

  it('keeps monitoring enabled for explicit falsy parameter values', () => {
    const param = DISABLE_LOW_FPS_FAILOVER_PARAM;
    expect(resolvePerformanceFailoverEnabled({ search: `?${param}=0` })).toBe(true);
    expect(resolvePerformanceFailoverEnabled({ search: `?${param}=false` })).toBe(true);
    expect(resolvePerformanceFailoverEnabled({ search: `?${param}=off` })).toBe(true);
    expect(resolvePerformanceFailoverEnabled({ search: `?foo=bar&${param}=no` })).toBe(true);
  });

  it('ignores malformed search strings', () => {
    expect(resolvePerformanceFailoverEnabled({ search: '://not-a-query' })).toBe(true);
  });
});
