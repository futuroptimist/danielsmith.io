import { describe, expect, it } from 'vitest';

import { canHandleGameplayShortcut } from '../ui/hud/gameplayShortcutGating';

const keyboardEvent = (options: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...options });

describe('canHandleGameplayShortcut', () => {
  it('allows gameplay shortcuts when Controls is open', () => {
    expect(canHandleGameplayShortcut(keyboardEvent(), 'controls')).toBe(true);
  });

  it('allows gameplay shortcuts when Tutorial is open', () => {
    expect(canHandleGameplayShortcut(keyboardEvent(), 'tutorial')).toBe(true);
  });

  it('blocks gameplay shortcuts when Settings is open', () => {
    expect(
      canHandleGameplayShortcut(keyboardEvent({ key: 'q' }), 'settings')
    ).toBe(false);
    expect(
      canHandleGameplayShortcut(
        keyboardEvent({ code: 'Equal', key: '+', shiftKey: true }),
        'settings'
      )
    ).toBe(false);
  });

  it('keeps text-entry targets protected', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    let result = true;
    input.addEventListener('keydown', (event) => {
      result = canHandleGameplayShortcut(event, 'controls');
    });

    input.dispatchEvent(keyboardEvent({ key: 'q' }));

    expect(result).toBe(false);
    input.remove();
  });

  it('respects previously prevented keyboard events', () => {
    const event = keyboardEvent();
    event.preventDefault();

    expect(canHandleGameplayShortcut(event, null)).toBe(false);
  });
});
