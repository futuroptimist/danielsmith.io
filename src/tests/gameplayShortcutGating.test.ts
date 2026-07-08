import { describe, expect, it } from 'vitest';

import { canHandleGameplayShortcut } from '../ui/hud/gameplayShortcutGating';

const createEvent = (target: EventTarget | null, defaultPrevented = false) =>
  ({ target, defaultPrevented }) as const;

describe('canHandleGameplayShortcut', () => {
  it('allows gameplay shortcuts with no active HUD panel', () => {
    expect(canHandleGameplayShortcut(createEvent(document.body), null)).toBe(
      true
    );
  });

  it('allows gameplay shortcuts while Controls is open', () => {
    expect(
      canHandleGameplayShortcut(createEvent(document.body), 'controls')
    ).toBe(true);
  });

  it('blocks gameplay shortcuts while Settings is open', () => {
    expect(
      canHandleGameplayShortcut(createEvent(document.body), 'settings')
    ).toBe(false);
  });

  it('blocks gameplay shortcuts from text entry targets', () => {
    const input = document.createElement('input');

    expect(canHandleGameplayShortcut(createEvent(input), 'controls')).toBe(
      false
    );
  });

  it('blocks already-prevented gameplay shortcuts', () => {
    expect(
      canHandleGameplayShortcut(createEvent(document.body, true), null)
    ).toBe(false);
  });
});
