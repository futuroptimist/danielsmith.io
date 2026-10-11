import { describe, expect, it, vi } from 'vitest';

import { createGaitToggle } from './gaitToggle';

function key(
  caps: boolean,
  init: KeyboardEventInit = {},
  type = 'keydown',
  target: EventTarget = window
) {
  const event = new KeyboardEvent(type, {
    key: 'CapsLock',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'getModifierState', {
    value: (name: string) => name === 'CapsLock' && caps,
  });
  target.dispatchEvent(event);
  return event;
}

describe('authoritative gait', () => {
  it('defaults to run and maps the lock directly on down/up without repeat toggles', () => {
    const onChange = vi.fn();
    const gait = createGaitToggle(window, { onChange });
    expect(gait.isRunning()).toBe(true);
    key(true);
    key(true, { repeat: true });
    key(true);
    key(true, {}, 'keyup');
    expect(gait.isRunning()).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    key(false);
    key(false, {}, 'keyup');
    expect(gait.isRunning()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(2);
    gait.dispose();
    key(true);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
  it('resynchronizes after focus returns, including Caps Lock already on at startup', () => {
    const gait = createGaitToggle(window);
    key(true, { key: 'ArrowUp' });
    expect(gait.isRunning()).toBe(false);
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    expect(gait.isRunning()).toBe(false);
    key(false, { key: 'w' });
    expect(gait.isRunning()).toBe(true);
    gait.dispose();
    const restart = createGaitToggle(window);
    expect(restart.isRunning()).toBe(true);
    key(true, { key: 'W' });
    expect(restart.isRunning()).toBe(false);
    restart.dispose();
  });
  it.each(['w', 'W', 'z', 'Z', 'ArrowUp', 'Shift', 'AltGraph'])(
    'does not create another gait for %s or modifier combinations',
    (name) => {
      const gait = createGaitToggle(window);
      for (const caps of [true, false]) {
        for (const modifiers of [
          {},
          { shiftKey: true },
          { ctrlKey: true },
          { altKey: true },
          { metaKey: true },
        ]) {
          key(caps, { key: name, ...modifiers });
          expect(gait.isRunning()).toBe(!caps);
        }
      }
      gait.dispose();
    }
  );
  it('observes UI and remapped keys without preventing native behavior', () => {
    const gait = createGaitToggle(window, { canToggle: () => false });
    const input = document.createElement('input');
    document.body.append(input);
    expect(key(true, {}, 'keydown', input).defaultPrevented).toBe(false);
    expect(gait.isRunning()).toBe(false);
    expect(key(false).defaultPrevented).toBe(false);
    expect(gait.isRunning()).toBe(true);
    input.remove();
    gait.dispose();
  });
  it('uses one state for touch and the next physical keyboard event', () => {
    const gait = createGaitToggle(window);
    gait.toggle();
    expect(gait.isRunning()).toBe(false);
    gait.toggle();
    expect(gait.isRunning()).toBe(true);
    key(true, { key: 'ArrowLeft' });
    expect(gait.isRunning()).toBe(false);
    gait.toggle();
    key(true, { key: 'ArrowLeft', repeat: true });
    expect(gait.isRunning()).toBe(false);
    gait.dispose();
  });
  it('falls back to one toggle per press only when modifier reporting is absent', () => {
    const gait = createGaitToggle(window);
    const send = (type: string, repeat = false) => {
      const event = new KeyboardEvent(type, { key: 'CapsLock', repeat });
      Object.defineProperty(event, 'getModifierState', { value: undefined });
      window.dispatchEvent(event);
    };
    send('keydown');
    send('keydown', true);
    send('keydown');
    expect(gait.isRunning()).toBe(false);
    send('keyup');
    send('keydown');
    expect(gait.isRunning()).toBe(true);
    gait.dispose();
  });
});
