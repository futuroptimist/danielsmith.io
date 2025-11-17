import { describe, expect, it } from 'vitest';

import {
  createImmersiveModeUrl,
  createTextModeUrl,
  getModeFromSearch,
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

  it('merges extra params without letting them clobber immersive overrides', () => {
    const url = createImmersiveModeUrl(
      {
        pathname: '/demo',
        search: '?foo=bar',
        hash: '',
      },
      {
        utm_campaign: 'launch',
        mode: 'text',
        disablePerformanceFailover: 0,
        feature: null,
      }
    );

    expect(url).toBe(
      '/demo?foo=bar&mode=immersive&disablePerformanceFailover=1&utm_campaign=launch'
    );
  });

  it('normalizes canonical URLs passed as strings while enforcing overrides', () => {
    const url = createImmersiveModeUrl(
      'https://example.com/app?foo=bar#scene',
      {
        feature: 'preview',
        disablePerformanceFailover: 0,
      }
    );

    expect(url).toBe(
      'https://example.com/app?foo=bar&mode=immersive&disablePerformanceFailover=1&feature=preview#scene'
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

  it('respects extra params while stripping conflicting or null entries', () => {
    const url = createTextModeUrl(
      { pathname: '/portfolio', search: '?mode=immersive&foo=keep', hash: '' },
      { disablePerformanceFailover: true, foo: null, bar: 'baz' }
    );

    expect(url).toBe('/portfolio?mode=text&bar=baz');
  });
});

describe('immersive flag helpers', () => {
  it('reads mode selections from search strings and param instances', () => {
    expect(getModeFromSearch('?mode=immersive&feature=preview')).toBe(
      'immersive'
    );
    expect(getModeFromSearch(new URLSearchParams('mode=text'))).toBe('text');
    expect(getModeFromSearch('mode=unknown')).toBeNull();
  });

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
