import { describe, expect, it } from 'vitest';

import {
  createImmersiveModeUrl,
  createTextModeUrl,
  hasImmersiveOverride,
  hasPerformanceFailoverBypass,
  shouldDisablePerformanceFailover,
} from '../ui/immersiveUrl';

const baseLocation = {
  pathname: '/',
  search: '',
  hash: '',
};

describe('createImmersiveModeUrl', () => {
  it('appends immersive mode and performance failover bypass params', () => {
    const url = createImmersiveModeUrl(baseLocation);
    expect(url).toBe('/?mode=immersive&disablePerformanceFailover=1');
  });

  it('preserves existing query params and hash fragments', () => {
    const url = createImmersiveModeUrl({
      pathname: '/portfolio',
      search: '?foo=bar',
      hash: '#scene',
    });
    expect(url).toBe(
      '/portfolio?foo=bar&mode=immersive&disablePerformanceFailover=1#scene'
    );
  });

  it('overrides conflicting mode values while keeping other params intact', () => {
    const url = createImmersiveModeUrl({
      pathname: '/space',
      search: '?mode=text&feature=preview',
      hash: '',
    });
    expect(url).toBe(
      '/space?mode=immersive&feature=preview&disablePerformanceFailover=1'
    );
  });
});

describe('createTextModeUrl', () => {
  it('appends mode=text to relative paths while preserving fragments', () => {
    expect(
      createTextModeUrl({
        pathname: '/portfolio',
        search: '',
        hash: '#text',
      })
    ).toBe('/portfolio?mode=text#text');
  });

  it('replaces existing mode values and strips performance bypass flags', () => {
    const url = createTextModeUrl({
      pathname: '/portfolio',
      search: '?mode=immersive&feature=demo&disablePerformanceFailover=1',
      hash: '',
    });
    expect(url).toBe('/portfolio?mode=text&feature=demo');
  });

  it('supports absolute canonical URLs with existing query and hash', () => {
    const url = createTextModeUrl('https://example.com/app?ref=promo#hero');
    expect(url).toBe('https://example.com/app?ref=promo&mode=text#hero');
  });

  it('appends query separator when canonical URL lacks params', () => {
    const url = createTextModeUrl('https://example.com/app/');
    expect(url).toBe('https://example.com/app/?mode=text');
  });

  it('falls back to root path when pathname is empty', () => {
    const url = createTextModeUrl({ pathname: '', search: '', hash: '' });
    expect(url).toBe('/?mode=text');
  });
});

describe('immersive flag helpers', () => {
  it('detects immersive override and bypass params independently', () => {
    expect(hasImmersiveOverride('mode=immersive')).toBe(true);
    expect(hasPerformanceFailoverBypass('disablePerformanceFailover=1')).toBe(
      true
    );
  });

  it('only bypasses when value matches the expected flag', () => {
    expect(hasPerformanceFailoverBypass('disablePerformanceFailover=0')).toBe(
      false
    );
    expect(hasPerformanceFailoverBypass('mode=immersive')).toBe(false);
  });

  it('disables performance failover when either override or bypass is present', () => {
    expect(shouldDisablePerformanceFailover('mode=immersive')).toBe(true);
    expect(
      shouldDisablePerformanceFailover('disablePerformanceFailover=1')
    ).toBe(true);
    expect(shouldDisablePerformanceFailover('feature=preview')).toBe(false);
  });
});
