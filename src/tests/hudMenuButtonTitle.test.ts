import { describe, expect, it } from 'vitest';

import { formatMenuButtonTitle } from '../ui/hud/menuButtonTitle';

describe('formatMenuButtonTitle', () => {
  it('updates the parenthesized default shortcut in regular locale titles', () => {
    expect(
      formatMenuButtonTitle(
        { keyHint: 'H', title: 'Open settings and help (H)' },
        'K'
      )
    ).toBe('Open settings and help (K)');
  });

  it('updates raw parenthesized shortcuts in pseudo-locale titles', () => {
    expect(
      formatMenuButtonTitle(
        { keyHint: '⟦C⟧', title: '⟦Open controls (C)⟧' },
        'K'
      )
    ).toBe('⟦Open controls (K)⟧');
  });

  it('updates pseudo-locale settings titles after help remaps', () => {
    expect(
      formatMenuButtonTitle(
        { keyHint: '⟦H⟧', title: '⟦Open settings and help (H)⟧' },
        'F1'
      )
    ).toBe('⟦Open settings and help (F1)⟧');
  });
});
