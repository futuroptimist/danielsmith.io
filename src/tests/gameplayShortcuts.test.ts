import { beforeEach, describe, expect, it } from 'vitest';

import { canHandleGameplayShortcut } from '../systems/controls/gameplayShortcuts';
import type { HudPanel } from '../ui/hud/hudPanelCoordinator';

const createKeyboardEvent = (
  target: EventTarget | null,
  defaultPrevented = false
) => ({ defaultPrevented, target }) as KeyboardEvent;

describe('canHandleGameplayShortcut', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('allows keyboard zoom and POI cycling while Controls is open', () => {
    const event = createKeyboardEvent(document.body);

    expect(canHandleGameplayShortcut(event, 'controls')).toBe(true);
  });

  it('blocks keyboard zoom and POI cycling while Settings is open', () => {
    const event = createKeyboardEvent(document.body);

    expect(canHandleGameplayShortcut(event, 'settings')).toBe(false);
  });

  it('allows gameplay shortcuts when no HUD panel is active', () => {
    const event = createKeyboardEvent(document.body);

    expect(canHandleGameplayShortcut(event, null)).toBe(true);
  });

  it('blocks gameplay shortcuts from text-entry targets', () => {
    const input = document.createElement('input');
    document.body.append(input);

    expect(canHandleGameplayShortcut(createKeyboardEvent(input), null)).toBe(
      false
    );
    expect(
      canHandleGameplayShortcut(createKeyboardEvent(input), 'controls')
    ).toBe(false);
  });

  it('blocks already-handled events regardless of active panel', () => {
    const panels: ReadonlyArray<HudPanel | null> = [
      null,
      'controls',
      'settings',
    ];

    for (const panel of panels) {
      expect(
        canHandleGameplayShortcut(
          createKeyboardEvent(document.body, true),
          panel
        )
      ).toBe(false);
    }
  });
});
