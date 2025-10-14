import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_KEY_BINDINGS,
  KeyBindings,
  createKeyBindingAwareSource,
  formatKeyLabel,
} from './keyBindings';

describe('KeyBindings', () => {
  it('normalises keys and deduplicates entries', () => {
    const bindings = new KeyBindings();
    bindings.setBindings('interact', ['F', ' f ', 'Space', 'spacebar', 'F']);

    expect(bindings.getBindings('interact')).toEqual(['f', ' ']);
  });

  it('reports action state via a key press source', () => {
    const bindings = new KeyBindings();
    const pressed = new Set(['w']);
    const source = { isPressed: (key: string) => pressed.has(key) };

    expect(bindings.isActionActive('moveForward', source)).toBe(true);
    expect(bindings.isActionActive('moveBackward', source)).toBe(false);

    bindings.setBindings('moveForward', ['i']);
    expect(bindings.isActionActive('moveForward', source)).toBe(false);

    pressed.add('i');
    expect(bindings.isActionActive('moveForward', source)).toBe(true);
  });

  it('emits changes to listeners and supports resets', () => {
    const bindings = new KeyBindings();
    const listener = vi.fn();
    const unsubscribe = bindings.subscribe(listener);

    bindings.setBindings('help', ['?']);
    expect(listener).toHaveBeenLastCalledWith('help', ['?']);

    listener.mockClear();
    bindings.reset('help');
    expect(listener).toHaveBeenLastCalledWith(
      'help',
      DEFAULT_KEY_BINDINGS.help.slice()
    );

    listener.mockClear();
    bindings.resetAll();
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
    bindings.setBindings('help', ['h']);
    expect(listener).not.toHaveBeenCalled();
  });

  it('applies partial updates via update()', () => {
    const bindings = new KeyBindings({ interact: ['e'] });
    bindings.update({ moveLeft: ['j'], moveRight: ['l'] });

    expect(bindings.getBindings('interact')).toEqual(['e']);
    expect(bindings.getBindings('moveLeft')).toEqual(['j']);
    expect(bindings.getBindings('moveRight')).toEqual(['l']);
  });

  it('ignores updates for unknown actions', () => {
    const bindings = new KeyBindings();
    const listener = vi.fn();
    bindings.subscribe(listener);

    bindings.update({ unknown: ['x'] } as unknown as Record<string, string[]>);

    expect(listener).not.toHaveBeenCalled();
    expect(bindings.getBindings('interact')).toEqual(
      DEFAULT_KEY_BINDINGS.interact.slice()
    );
  });
});

describe('formatKeyLabel', () => {
  it('formats single characters and known keys for display', () => {
    expect(formatKeyLabel('f')).toBe('F');
    expect(formatKeyLabel('ArrowUp')).toBe('Arrow Up');
    expect(formatKeyLabel(' ')).toBe('Space');
    expect(formatKeyLabel('Shift')).toBe('Shift');
    expect(formatKeyLabel(undefined)).toBe('');
  });
});

describe('createKeyBindingAwareSource', () => {
  it('delegates to the provided controls', () => {
    const isPressed = vi.fn().mockReturnValue(true);
    const controls = {
      isPressed,
    } as unknown as import('./KeyboardControls').KeyboardControls;
    const source = createKeyBindingAwareSource(controls);

    expect(source.isPressed('f')).toBe(true);
    expect(isPressed).toHaveBeenCalledWith('f');
  });
});
