import { afterEach, describe, expect, it } from 'vitest';

import { VirtualJoystick } from './VirtualJoystick';

describe('VirtualJoystick', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ignores mouse pointer interactions', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    new VirtualJoystick(target);

    const event = new Event('pointerdown') as PointerEvent & {
      [key: string]: unknown;
    };

    Object.assign(event, {
      pointerType: 'mouse',
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });

    target.dispatchEvent(event);

    expect(document.querySelectorAll('.joystick')).toHaveLength(0);
  });
});
