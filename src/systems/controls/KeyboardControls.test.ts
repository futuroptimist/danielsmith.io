import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { KeyboardControls } from './KeyboardControls';

describe('KeyboardControls', () => {
  let controls: KeyboardControls;

  beforeEach(() => {
    controls = new KeyboardControls(window);
  });

  afterEach(() => {
    controls.dispose(window);
  });

  it('tracks keydown and keyup events', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    expect(controls.isPressed('w')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    expect(controls.isPressed('w')).toBe(false);
  });

  it('normalizes alphabetic keys to lowercase', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
    expect(controls.isPressed('w')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'W' }));
    expect(controls.isPressed('w')).toBe(false);
  });

  it('clears held input on blur and ignores keys owned by a DOM control', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    window.dispatchEvent(new Event('blur'));
    expect(controls.isPressed('w')).toBe(false);
    const button = document.createElement('button');
    document.body.append(button);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(controls.isPressed('Enter')).toBe(false);
    button.remove();
  });

  it('allows gameplay letters from ordinary buttons but never from open dialogs', () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'w', bubbles: true })
    );
    expect(controls.isPressed('w')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);
    dialog.append(button);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'w', bubbles: true })
    );
    expect(controls.isPressed('w')).toBe(false);
    dialog.remove();
  });

  it('tracks multiple simultaneous keys for diagonal movement', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));

    expect(controls.isPressed('w')).toBe(true);
    expect(controls.isPressed('d')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    expect(controls.isPressed('w')).toBe(false);
    expect(controls.isPressed('d')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    expect(controls.isPressed('d')).toBe(false);
  });
});
