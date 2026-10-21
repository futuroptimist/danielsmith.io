import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GamepadControls, gamepadStick } from './GamepadControls';
import { KeyBindings, createKeyBindingAwareSource } from './keyBindings';
import { KeyboardControls } from './KeyboardControls';

function fixture(id = 'Generic controller', mapping = 'standard'): Gamepad {
  return {
    id,
    index: 0,
    mapping,
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    })),
  } as Gamepad;
}

describe('standard gamepad controls (synthetic devices)', () => {
  let controls: GamepadControls;
  let pad: Gamepad;
  let pads: (Gamepad | null)[];
  const press = (index: number, value = 1) => {
    Object.assign(pad.buttons[index], { pressed: value > 0.5, value });
  };
  const axes = (values: number[]) => Object.assign(pad, { axes: values });

  beforeEach(() => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    pad = fixture();
    pads = [null, pad];
    vi.stubGlobal(
      'navigator',
      Object.assign(Object.create(navigator), { getGamepads: () => pads })
    );
    controls = new GamepadControls();
    controls.update();
  });

  afterEach(() => {
    controls.dispose();
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    'Generic controller',
    'Xbox Wireless Controller',
    'DualSense Wireless Controller',
  ])('maps standard positions independently of ID: %s', (id) => {
    pad = fixture(id);
    pads = [pad];
    controls.update();
    axes([0.6, -1, 0.5, -0.5]);
    press(7);
    controls.update();
    expect(controls.getActionValue('moveForward')).toBeGreaterThan(0.5);
    expect(controls.getActionValue('moveRight')).toBeGreaterThan(0);
    expect(controls.camera.x).toBeGreaterThan(0);
    expect(controls.camera.y).toBeLessThan(0);
    expect(controls.zoom).toBeCloseTo(0.9);
  });

  it('preserves analog travel, dead zones and finite bounded vectors', () => {
    expect(gamepadStick(0.1, -0.1)).toEqual({ x: 0, y: 0 });
    expect(gamepadStick(0.6, 0).x).toBeCloseTo(0.5);
    expect(Math.hypot(...Object.values(gamepadStick(1, 1)))).toBeCloseTo(1);
    expect(gamepadStick(NaN, Infinity)).toEqual({ x: 0, y: 0 });
    press(12);
    press(14);
    controls.update();
    expect(controls.movement).toEqual({ x: -1, y: -1 });
  });

  it('emits one interaction per press and ignores a held activation button', () => {
    controls.reset();
    press(0);
    controls.update();
    expect(controls.interact).toBe(false);
    press(0, 0);
    controls.update();
    press(0);
    controls.update();
    expect(controls.interact).toBe(true);
    controls.update();
    expect(controls.interact).toBe(false);
    press(0, 0);
    controls.update();
    press(0);
    controls.update();
    expect(controls.interact).toBe(true);
  });

  it.each(['blur', 'gamepaddisconnected', 'visibilitychange'])(
    'neutralizes on %s and requires release',
    (event) => {
      axes([1, 0, 1, 0]);
      press(7);
      controls.update();
      (event === 'visibilitychange' ? document : window).dispatchEvent(
        Object.assign(new Event(event), { gamepad: pad })
      );
      expect(controls.movement.x).toBe(0);
      expect(controls.camera.x).toBe(0);
      expect(controls.zoom).toBe(0);
      controls.update();
      expect(controls.movement.x).toBe(0);
      axes([0, 0, 0, 0]);
      press(7, 0);
      controls.update();
      axes([1, 0, 0, 0]);
      controls.update();
      expect(controls.movement.x).toBe(1);
    }
  );

  it.each(['blur', 'visibilitychange', 'focusin', 'blocked'])(
    'retains the selected controller after %s until it disconnects',
    (event) => {
      Object.assign(pad, { index: 1 });
      controls.update();
      const other = fixture('Second controller');
      pads = [other, pad];
      if (event === 'blocked') controls.update(true);
      else
        (event === 'blur' ? window : document).dispatchEvent(new Event(event));
      axes([1, 0, 0, 0]);
      controls.update();
      expect(controls.movement.x).toBe(0);
      axes([0, 0, 0, 0]);
      controls.update();
      axes([1, 0, 0, 0]);
      controls.update();
      expect(controls.movement.x).toBe(1);
      pads = [other];
      Object.assign(other, { axes: [-1, 0, 0, 0] });
      controls.update();
      expect(controls.movement.x).toBe(0);
      Object.assign(other, { axes: [0, 0, 0, 0] });
      controls.update();
      Object.assign(other, { axes: [-1, 0, 0, 0] });
      controls.update();
      expect(controls.movement.x).toBe(-1);
    }
  );

  it('ignores secondary disconnects while the selected controller is held', () => {
    const secondary = fixture('Secondary');
    Object.assign(secondary, { index: 1 });
    pads = [pad, secondary];
    axes([1, 0, 1, 0]);
    press(0);
    controls.update();
    window.dispatchEvent(
      Object.assign(new Event('gamepaddisconnected'), { gamepad: secondary })
    );
    controls.update();
    expect(controls.movement.x).toBe(1);
    expect(controls.camera.x).toBe(1);
    expect(controls.interact).toBe(false);
    window.dispatchEvent(
      Object.assign(new Event('gamepaddisconnected'), { gamepad: pad })
    );
    expect(controls.movement.x).toBe(0);
    controls.update();
    expect(controls.movement.x).toBe(0);
  });

  it('clears disconnected, unknown and missing devices and catches denied API access', () => {
    axes([1, 0, 0, 0]);
    controls.update();
    pads = [];
    controls.update();
    expect(controls.movement.x).toBe(0);
    pad = fixture('Unknown', '');
    pads = [pad];
    controls.update();
    axes([1, 0, 0, 0]);
    press(0);
    controls.update();
    expect(controls.movement.x).toBe(0);
    expect(controls.interact).toBe(false);
    vi.spyOn(navigator, 'getGamepads').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    expect(() => controls.update()).not.toThrow();
    controls.update();
    controls.reset();
    controls.update();
    expect(navigator.getGamepads).toHaveBeenCalledTimes(1);
  });

  it.each(['input', 'textarea', 'select', 'button', 'a', 'div'])(
    'leaves %s focus to the UI',
    (tag) => {
      const element = document.createElement(tag);
      element.tabIndex = 0;
      if (tag === 'div') element.setAttribute('contenteditable', 'true');
      document.body.append(element);
      element.focus();
      axes([1, 0, 0, 0]);
      press(0);
      controls.update();
      expect(controls.movement.x).toBe(0);
      expect(controls.interact).toBe(false);
    }
  );

  it('blocks menus, hidden documents and unfocused windows', () => {
    axes([1, 0, 0, 0]);
    controls.update(true);
    expect(controls.movement.x).toBe(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    controls.update();
    expect(controls.movement.x).toBe(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.mocked(document.hasFocus).mockReturnValue(false);
    controls.update();
    expect(controls.movement.x).toBe(0);
  });

  it('composes analog gamepad actions with remapped keyboard bindings', () => {
    const keyboard = new KeyboardControls();
    const bindings = new KeyBindings({ moveForward: ['i'] });
    const source = createKeyBindingAwareSource(keyboard, controls);
    axes([0, -0.6, 0, 0]);
    controls.update();
    expect(bindings.getActionValue('moveForward', source)).toBeCloseTo(0.5);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    expect(bindings.getActionValue('moveForward', source)).toBe(1);
    controls.dispose();
    expect(bindings.getActionValue('moveForward', source)).toBe(1);
    keyboard.dispose();
  });
});
