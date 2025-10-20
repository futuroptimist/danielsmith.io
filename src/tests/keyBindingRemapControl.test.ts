import { describe, expect, it, vi } from 'vitest';

import {
  createKeyBindingRemapControl,
  type KeyBindingRemapControlHandle,
} from '../systems/controls/keyBindingRemapControl';
import { KeyBindings } from '../systems/controls/keyBindings';
import type { KeyBindingAction } from '../systems/controls/keyBindings';

const TEST_STRINGS = {
  heading: 'Keyboard shortcuts',
  description: 'Remap controls and persist them locally.',
  capturePrompt: 'Press a key…',
  captureInstruction: 'Listening for a key press. Press Escape to cancel.',
  unboundLabel: 'Unbound',
  resetLabel: 'Reset',
  resetAllLabel: 'Reset all',
  slotLabels: {
    primary: 'Primary',
    secondary: 'Alternate',
    fallbackTemplate: 'Binding {index}',
  },
  actions: {
    moveForward: {
      label: 'Move north',
      description: 'Move away from the camera.',
    },
    moveBackward: {
      label: 'Move south',
      description: 'Move toward the camera.',
    },
    moveLeft: {
      label: 'Move west',
      description: 'Strafe left relative to the camera.',
    },
    moveRight: {
      label: 'Move east',
      description: 'Strafe right relative to the camera.',
    },
    interact: {
      label: 'Interact',
      description: 'Activate exhibits and confirm HUD controls.',
    },
    help: {
      label: 'Open help',
      description: 'Toggle the Settings & Help panel.',
    },
  },
} as const;

const ACTION_ORDER: KeyBindingAction[] = [
  'moveForward',
  'moveBackward',
  'moveLeft',
  'moveRight',
  'interact',
  'help',
];

const ACTION_DEFINITIONS = ACTION_ORDER.map((action) => ({
  action,
  label: TEST_STRINGS.actions[action].label,
  description: TEST_STRINGS.actions[action].description,
}));

describe('createKeyBindingRemapControl', () => {
  const setup = (
    keyBindings: KeyBindings,
    options: { onCommit?: () => void } = {}
  ): { handle: KeyBindingRemapControlHandle; container: HTMLElement } => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = createKeyBindingRemapControl({
      container,
      keyBindings,
      strings: TEST_STRINGS,
      actions: ACTION_DEFINITIONS,
      onCommit: options.onCommit,
    });
    return { handle, container };
  };

  it('renders actions and captures remapped keys', () => {
    const keyBindings = new KeyBindings();
    const onCommit = vi.fn();
    const { handle, container } = setup(keyBindings, { onCommit });

    const forwardPrimary = container.querySelector<HTMLButtonElement>(
      '.key-remap__binding[data-action="moveForward"][data-slot-index="0"]'
    );
    const interactPrimary = container.querySelector<HTMLButtonElement>(
      '.key-remap__binding[data-action="interact"][data-slot-index="0"]'
    );

    expect(forwardPrimary).toBeTruthy();
    expect(interactPrimary).toBeTruthy();

    forwardPrimary!.click();
    expect(forwardPrimary!.dataset.state).toBe('listening');

    // Starting a second capture should cancel the first without committing.
    interactPrimary!.click();
    expect(forwardPrimary!.dataset.state).toBe('idle');
    expect(interactPrimary!.dataset.state).toBe('listening');
    expect(onCommit).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));

    expect(keyBindings.getBindings('interact')[0]).toBe('q');
    expect(interactPrimary!.dataset.state).toBe('idle');
    expect(interactPrimary!.textContent).toContain('Q');
    expect(onCommit).toHaveBeenCalledTimes(1);

    handle.dispose();
    container.remove();
  });

  it('ignores modifier keys and cancels with Escape', () => {
    const keyBindings = new KeyBindings();
    const { handle, container } = setup(keyBindings);

    const helpPrimary = container.querySelector<HTMLButtonElement>(
      '.key-remap__binding[data-action="help"][data-slot-index="0"]'
    );
    expect(helpPrimary).toBeTruthy();

    helpPrimary!.click();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true })
    );
    expect(helpPrimary!.dataset.state).toBe('listening');
    expect(keyBindings.getBindings('help')[0]).toBe('h');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(helpPrimary!.dataset.state).toBe('idle');
    expect(keyBindings.getBindings('help')[0]).toBe('h');

    handle.dispose();
    container.remove();
  });

  it('resets bindings and responds to external updates', () => {
    const keyBindings = new KeyBindings({
      interact: ['g'],
      help: ['?'],
    });
    const onCommit = vi.fn();
    const { handle, container } = setup(keyBindings, { onCommit });

    const interactAction = Array.from(
      container.querySelectorAll<HTMLDivElement>('.key-remap__action')
    ).find((element) =>
      element
        .querySelector('.key-remap__label')
        ?.textContent?.includes('Interact')
    );
    expect(interactAction).toBeTruthy();
    const resetButton =
      interactAction!.querySelector<HTMLButtonElement>('.key-remap__reset');
    expect(resetButton).toBeTruthy();

    resetButton!.click();
    expect(keyBindings.getBindings('interact')[0]).toBe('f');
    expect(onCommit).toHaveBeenCalledTimes(1);

    const resetAll = container.querySelector<HTMLButtonElement>(
      '.key-remap__reset-all'
    );
    expect(resetAll).toBeTruthy();
    keyBindings.setBindings('moveForward', ['y']);
    resetAll!.click();
    expect(keyBindings.getBindings('moveForward')[0]).toBe('w');
    expect(onCommit).toHaveBeenCalledTimes(2);

    keyBindings.setBindings('help', ['h']);
    const helpPrimary = container.querySelector<HTMLButtonElement>(
      '.key-remap__binding[data-action="help"][data-slot-index="0"]'
    );
    expect(helpPrimary?.textContent).toContain('H');

    handle.dispose();
    container.remove();
  });

  it('stops capturing when disposed', () => {
    const keyBindings = new KeyBindings();
    const { handle, container } = setup(keyBindings);
    const forwardPrimary = container.querySelector<HTMLButtonElement>(
      '.key-remap__binding[data-action="moveForward"][data-slot-index="0"]'
    );
    expect(forwardPrimary).toBeTruthy();

    forwardPrimary!.click();
    handle.dispose();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    expect(keyBindings.getBindings('moveForward')[0]).toBe('w');
    expect(container.querySelector('.key-remap')).toBeNull();
    container.remove();
  });
});
