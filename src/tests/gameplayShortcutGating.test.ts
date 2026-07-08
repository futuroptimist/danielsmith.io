import { describe, expect, it } from 'vitest';

import { canHandleGameplayShortcut } from '../ui/hud/gameplayShortcutGating';

describe('canHandleGameplayShortcut', () => {
  it('allows gameplay shortcuts with no panel or the Controls panel open', () => {
    expect(canHandleGameplayShortcut(new KeyboardEvent('keydown'), null)).toBe(
      true
    );
    expect(
      canHandleGameplayShortcut(new KeyboardEvent('keydown'), 'controls')
    ).toBe(true);
  });

  it('blocks gameplay shortcuts while Settings is open', () => {
    expect(
      canHandleGameplayShortcut(new KeyboardEvent('keydown'), 'settings')
    ).toBe(false);
  });

  it('blocks gameplay shortcuts from text-entry targets', () => {
    const input = document.createElement('input');
    document.body.append(input);
    let allowed = true;
    input.addEventListener('keydown', (event) => {
      allowed = canHandleGameplayShortcut(event, 'controls');
    });

    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));

    expect(allowed).toBe(false);
    input.remove();
  });
});
