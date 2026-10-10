import { describe, expect, it, vi } from 'vitest';

import { createGaitToggle } from './gaitToggle';

const press = (target: EventTarget = window, repeat = false) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'CapsLock',
      bubbles: true,
      cancelable: true,
      repeat,
    })
  );
const release = () =>
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'CapsLock' }));

describe('game-local gait toggle', () => {
  it('starts walking, toggles once per press and preserves the chosen gait across blur', () => {
    const onChange = vi.fn();
    const gait = createGaitToggle(window, { onChange });
    expect(gait.isRunning()).toBe(false);
    press();
    press(window, true);
    press();
    expect(gait.isRunning()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('blur'));
    expect(gait.isRunning()).toBe(true);
    press();
    expect(gait.isRunning()).toBe(false);
    gait.dispose();
    release();
    press();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
  it('leaves text inputs, modal dialogs, shortcuts and blocked panels alone', () => {
    let blocked = false;
    const gait = createGaitToggle(window, { canToggle: () => !blocked });
    for (const tag of ['input', 'textarea', 'select']) {
      const el = document.createElement(tag);
      document.body.append(el);
      press(el);
      release();
      el.remove();
    }
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    document.body.append(editor);
    press(editor);
    release();
    editor.remove();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'CapsLock', ctrlKey: true })
    );
    release();
    blocked = true;
    press();
    release();
    expect(gait.isRunning()).toBe(false);
    blocked = false;
    press();
    expect(gait.isRunning()).toBe(true);
    gait.dispose();
  });
});
