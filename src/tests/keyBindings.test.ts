import { describe, expect, it } from 'vitest';

import { isKeyboardZoomShortcut } from '../systems/controls/zoomControls';

describe('immersive keyboard zoom shortcuts', () => {
  it('uses dedicated Shift+Equal and Shift+Minus shortcuts for zooming', () => {
    expect(
      isKeyboardZoomShortcut(
        new KeyboardEvent('keydown', {
          code: 'Equal',
          key: '+',
          shiftKey: true,
        })
      )
    ).toBe(1);
    expect(
      isKeyboardZoomShortcut(
        new KeyboardEvent('keydown', {
          code: 'Minus',
          key: '_',
          shiftKey: true,
        })
      )
    ).toBe(-1);
  });
});
