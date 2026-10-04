import { afterEach, describe, expect, it, vi } from 'vitest';

import { getExteriorStrings } from '../../../assets/i18n/exterior';
import { KeyboardControls } from '../../../systems/controls/KeyboardControls';
import { createDoorControl } from '../doorControl';

const state = {
  id: 'front-door',
  sourceId: 'ground.frontEntry.door',
  progress: 0,
  state: 'closed' as const,
  target: 0 as const,
  blocked: true,
  occupied: false,
};

afterEach(() => vi.unstubAllGlobals());

describe('accessible door control', () => {
  it('distinguishes the Japanese closing and closed announcements', () => {
    const parent = document.createElement('div');
    const control = createDoorControl({
      parent,
      onActivate: vi.fn(),
      restoreFocus: vi.fn(),
    });
    const strings = getExteriorStrings('ja');
    control.update({ ...state, state: 'closing', progress: 0.5 }, strings);
    const live = parent.querySelector('[aria-live]')!;
    const closing = live.textContent;
    control.update(state, strings);
    expect(live.textContent).not.toBe(closing);
    expect(live.textContent).toBe('玄関ドア：閉まっています');
    control.dispose();
  });

  it('avoids unchanged DOM writes and layout reads, then remeasures size, locale and viewport changes', async () => {
    let resize: () => void = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe = observe;
        disconnect = disconnect;
      }
    );
    const parent = document.createElement('div');
    document.body.append(parent);
    const hud = document.createElement('div');
    hud.id = 'control-overlay';
    parent.append(hud);
    const hudBounds = vi
      .spyOn(hud, 'getBoundingClientRect')
      .mockReturnValue({ bottom: 120 } as DOMRect);
    const control = createDoorControl({
      parent,
      onActivate: vi.fn(),
      restoreFocus: vi.fn(),
    });
    const bounds = vi
      .spyOn(control.button, 'getBoundingClientRect')
      .mockReturnValue({ width: 200, height: 50 } as DOMRect);
    control.update(state, getExteriorStrings('en'), { x: 0, y: 0 });
    const mutations = new MutationObserver(() => {});
    mutations.observe(parent, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });
    for (let frame = 0; frame < 60; frame++) {
      control.update(state, getExteriorStrings('en'), { x: 0, y: 0 });
    }
    expect(bounds).toHaveBeenCalledTimes(1);
    expect(hudBounds).toHaveBeenCalledTimes(1);
    expect(mutations.takeRecords()).toEqual([]);
    expect(observe).toHaveBeenCalledWith(control.button);
    expect(observe).toHaveBeenCalledWith(hud);
    hudBounds.mockReturnValue({ bottom: 180 } as DOMRect);
    resize();
    control.update(state, getExteriorStrings('en'), { x: 0, y: 0 });
    expect(control.button.style.top).toBe('242px');
    expect(bounds).toHaveBeenCalledTimes(2);
    bounds.mockReturnValue({ width: 240, height: 70 } as DOMRect);
    control.update(state, getExteriorStrings('hu'), { x: 0, y: 0 });
    expect(control.button.style.left).toBe('136px');
    expect(control.button.style.top).toBe('262px');
    expect(bounds).toHaveBeenCalledTimes(3);
    window.dispatchEvent(new Event('resize'));
    control.update(state, getExteriorStrings('hu'), { x: 0, y: 0 });
    expect(bounds).toHaveBeenCalledTimes(4);
    control.update(state, getExteriorStrings('hu'), { x: 400, y: 300 });
    expect(control.button.style.left).toBe('400px');
    expect(control.button.style.top).toBe('300px');
    expect(bounds).toHaveBeenCalledTimes(4);
    document.documentElement.dataset.hudLayout = 'mobile';
    await Promise.resolve();
    control.update(state, getExteriorStrings('hu'), { x: 0, y: 0 });
    expect(bounds).toHaveBeenCalledTimes(5);
    delete document.documentElement.dataset.hudLayout;
    control.update(null, getExteriorStrings('hu'));
    control.update(state, getExteriorStrings('hu'), { x: 0, y: 0 });
    expect(bounds).toHaveBeenCalledTimes(6);
    mutations.disconnect();
    control.dispose();
    expect(disconnect).toHaveBeenCalledOnce();
    parent.remove();
  });

  it('renders localized state and announces only changes, without synthetic double activation', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const onActivate = vi.fn();
    const control = createDoorControl({
      parent,
      onActivate,
      restoreFocus: vi.fn(),
    });
    control.update(state, getExteriorStrings('en'));
    expect(control.button.textContent).toBe('Open Front door');
    expect(control.button.getAttribute('aria-pressed')).toBe('false');
    const live = parent.querySelector('[aria-live]')!;
    expect(live.classList.contains('visually-hidden')).toBe(true);
    const announce = new MutationObserver(() => {});
    announce.observe(live, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    control.update(state, getExteriorStrings('en'));
    expect(announce.takeRecords()).toEqual([]);
    announce.disconnect();
    control.button.click();
    expect(onActivate).toHaveBeenCalledTimes(1);
    control.update({ ...state, occupied: true }, getExteriorStrings('en'));
    expect(live.textContent).toContain('Doorway occupied');
    control.update(state, getExteriorStrings('ja'));
    expect(control.button.textContent).toBe('玄関ドアを開く');
    control.dispose();
    expect(parent.childElementCount).toBe(0);
    parent.remove();
  });
  it('allows a previously held movement key to release after button focus', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const keys = new KeyboardControls();
    const control = createDoorControl({
      parent,
      onActivate: vi.fn(),
      restoreFocus: vi.fn(),
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    expect(keys.isPressed('w')).toBe(true);
    control.update(state, getExteriorStrings('en'));
    control.button.focus();
    control.button.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'w', bubbles: true })
    );
    expect(keys.isPressed('w')).toBe(false);
    control.dispose();
    keys.dispose();
    parent.remove();
  });
  it('retains native activation but releases HUD shortcuts and Escape', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const restoreFocus = vi.fn();
    const control = createDoorControl({
      parent,
      onActivate: vi.fn(),
      restoreFocus,
    });
    control.update(state, getExteriorStrings('en'));
    const globalKey = vi.fn();
    window.addEventListener('keydown', globalKey);
    const repeated = new KeyboardEvent('keydown', {
      key: 'Enter',
      repeat: true,
      cancelable: true,
      bubbles: true,
    });
    control.button.dispatchEvent(repeated);
    expect(repeated.defaultPrevented).toBe(true);
    expect(globalKey).not.toHaveBeenCalled();
    control.button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'h', bubbles: true })
    );
    expect(globalKey).toHaveBeenCalledTimes(1);
    control.button.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        cancelable: true,
        bubbles: true,
      })
    );
    expect(restoreFocus).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', globalKey);
    control.dispose();
    parent.remove();
  });

  it('returns focus when the current door leaves range', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const restoreFocus = vi.fn();
    const control = createDoorControl({
      parent,
      onActivate: vi.fn(),
      restoreFocus,
    });
    control.update(state, getExteriorStrings('en'));
    control.button.focus();
    control.update(null, getExteriorStrings('en'));
    expect(restoreFocus).toHaveBeenCalledTimes(1);
    expect(control.button.hidden).toBe(true);
    control.dispose();
    parent.remove();
  });
});

it('keeps a long door control below the HUD and within horizontal viewport margins', () => {
  const parent = document.createElement('div');
  document.body.append(parent);
  const hud = document.createElement('div');
  hud.id = 'control-overlay';
  parent.append(hud);
  vi.spyOn(hud, 'getBoundingClientRect').mockReturnValue({
    bottom: 120,
  } as DOMRect);
  const control = createDoorControl({
    parent,
    onActivate: vi.fn(),
    restoreFocus: vi.fn(),
  });
  vi.spyOn(control.button, 'getBoundingClientRect').mockReturnValue({
    width: 240,
    height: 70,
  } as DOMRect);
  control.update(state, getExteriorStrings('hu'), { x: 0, y: 0 });
  expect(Number.parseFloat(control.button.style.left)).toBeGreaterThanOrEqual(
    136
  );
  expect(Number.parseFloat(control.button.style.top)).toBeGreaterThanOrEqual(
    202
  );
  control.dispose();
  parent.remove();
});
