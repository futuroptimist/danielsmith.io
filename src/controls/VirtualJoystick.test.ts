import { afterEach, describe, expect, it } from 'vitest';

import { VirtualJoystick } from './VirtualJoystick';

describe('VirtualJoystick', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  type MutablePointerEvent = Event & {
    pointerId: number;
    clientX: number;
    clientY: number;
    pointerType?: string;
    button?: number;
  };

  function createPointerEvent(
    type: string,
    init: {
      pointerId: number;
      clientX: number;
      clientY: number;
      pointerType?: string;
      button?: number;
    }
  ): PointerEvent {
    const event = new Event(type, {
      bubbles: true,
      cancelable: true,
    }) as MutablePointerEvent;

    Object.assign(event, init);

    if (event.button === undefined) {
      event.button = 0;
    }

    if (!event.pointerType) {
      event.pointerType = 'touch';
    }

    return event as PointerEvent;
  }

  it('ignores mouse pointer interactions', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    new VirtualJoystick(target);

    const event = createPointerEvent('pointerdown', {
      pointerType: 'mouse',
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });

    target.dispatchEvent(event);

    expect(document.querySelectorAll('.joystick')).toHaveLength(0);
  });

  it('spawns a movement joystick on the left half and tracks pointer deltas', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const joystick = new VirtualJoystick(target);

    const downEvent = createPointerEvent('pointerdown', {
      pointerId: 1,
      clientX: 200,
      clientY: 320,
    });

    target.dispatchEvent(downEvent);

    expect(downEvent.defaultPrevented).toBe(true);
    expect(document.querySelectorAll('.joystick')).toHaveLength(1);
    expect(joystick.getMovement()).toEqual({ x: 0, y: 0 });

    const moveEvent = createPointerEvent('pointermove', {
      pointerId: 1,
      clientX: 270,
      clientY: 320,
    });

    window.dispatchEvent(moveEvent);

    expect(moveEvent.defaultPrevented).toBe(true);
    expect(joystick.getMovement().x).toBeCloseTo(1, 5);
    expect(joystick.getMovement().y).toBeCloseTo(0, 5);

    const upEvent = createPointerEvent('pointerup', {
      pointerId: 1,
      clientX: 270,
      clientY: 320,
    });

    window.dispatchEvent(upEvent);

    expect(document.querySelectorAll('.joystick')).toHaveLength(0);
    expect(joystick.getMovement()).toEqual({ x: 0, y: 0 });
  });

  it('spawns a camera joystick on the right half and scales by viewport size', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
      writable: true,
    });

    try {
      const joystick = new VirtualJoystick(target);

      const downEvent = createPointerEvent('pointerdown', {
        pointerId: 2,
        clientX: 900,
        clientY: 360,
      });

      target.dispatchEvent(downEvent);

      expect(downEvent.defaultPrevented).toBe(true);
      expect(document.querySelectorAll('.joystick')).toHaveLength(1);
      expect(joystick.getCamera()).toEqual({ x: 0, y: 0 });

      const moveEvent = createPointerEvent('pointermove', {
        pointerId: 2,
        clientX: 900,
        clientY: 0,
      });

      window.dispatchEvent(moveEvent);

      expect(moveEvent.defaultPrevented).toBe(true);
      expect(joystick.getCamera().x).toBeCloseTo(0, 5);
      expect(joystick.getCamera().y).toBeCloseTo(-0.9, 5);

      const upEvent = createPointerEvent('pointerup', {
        pointerId: 2,
        clientX: 900,
        clientY: 0,
      });

      window.dispatchEvent(upEvent);

      expect(document.querySelectorAll('.joystick')).toHaveLength(0);
      expect(joystick.getCamera()).toEqual({ x: 0, y: 0 });
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalWidth,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: originalHeight,
        writable: true,
      });
    }
  });

  it('reset removes any active joysticks and clears values', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const joystick = new VirtualJoystick(target);

    const leftDown = createPointerEvent('pointerdown', {
      pointerId: 3,
      clientX: 180,
      clientY: 250,
    });
    target.dispatchEvent(leftDown);

    const rightDown = createPointerEvent('pointerdown', {
      pointerId: 4,
      clientX: 850,
      clientY: 250,
    });
    target.dispatchEvent(rightDown);

    expect(document.querySelectorAll('.joystick')).toHaveLength(2);

    joystick.reset();

    expect(document.querySelectorAll('.joystick')).toHaveLength(0);
    expect(joystick.getMovement()).toEqual({ x: 0, y: 0 });
    expect(joystick.getCamera()).toEqual({ x: 0, y: 0 });
  });
});
