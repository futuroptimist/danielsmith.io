import { describe, expect, it } from 'vitest';

import { getKeyboardZoomDirection } from '../systems/camera/zoomControls';
import {
  DEFAULT_KEY_BINDINGS,
  KeyBindings,
  formatKeyLabel,
} from '../systems/controls/keyBindings';

describe('KeyBindings', () => {
  it('keeps movement and HUD defaults while keyboard zoom uses code-based shortcuts', () => {
    const keyBindings = new KeyBindings();

    expect(keyBindings.getBindings('moveForward')).toEqual(
      DEFAULT_KEY_BINDINGS.moveForward
    );
    expect(keyBindings.getBindings('toggleControls')).toEqual(['c']);
    expect(keyBindings.getBindings('toggleTutorial')).toEqual(['r']);
    expect(formatKeyLabel(keyBindings.getPrimaryBinding('help'))).toBe('H');
    expect(
      formatKeyLabel(keyBindings.getPrimaryBinding('toggleTutorial'))
    ).toBe('R');

    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'Equal',
          key: '+',
          shiftKey: true,
        })
      )
    ).toBe(1);
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'Minus',
          key: '_',
          shiftKey: true,
        })
      )
    ).toBe(-1);
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'NumpadAdd',
          key: '+',
        })
      )
    ).toBe(1);
  });
});
