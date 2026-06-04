import { describe, expect, it } from 'vitest';

import {
  applyCameraZoomStep,
  applyPinchCameraZoom,
  applyWheelCameraZoomStep,
  clampCameraZoom,
  getKeyboardZoomDirection,
  normalizeWheelDeltaY,
} from '../systems/camera/zoomControls';

const bounds = { minZoom: 0.65, maxZoom: 12 } as const;

describe('camera zoom controls', () => {
  it('maps non-finite zoom values to safe bounds', () => {
    expect(clampCameraZoom(Infinity, bounds)).toBe(bounds.maxZoom);
    expect(clampCameraZoom(-Infinity, bounds)).toBe(bounds.minZoom);
    expect(clampCameraZoom(Number.NaN, bounds)).toBe(bounds.minZoom);
  });

  it('recognizes Shift+Equal and Shift+Minus from keyboard codes', () => {
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'Equal',
          key: '+',
          shiftKey: true,
        })
      )
    ).toBe(1);
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'Minus',
          key: '_',
          shiftKey: true,
        })
      )
    ).toBe(-1);
  });

  it('recognizes layout-character and numpad zoom shortcuts', () => {
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'BracketRight',
          key: '+',
          shiftKey: true,
        })
      )
    ).toBe(1);
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'Slash',
          key: '-',
          shiftKey: true,
        })
      )
    ).toBe(-1);
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'NumpadAdd',
          key: '+',
        })
      )
    ).toBe(1);
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'NumpadSubtract',
          key: '-',
        })
      )
    ).toBe(-1);
  });

  it('ignores keyboard zoom shortcuts with text-entry focus or system modifiers', () => {
    expect(
      getKeyboardZoomDirection(
        new KeyboardEvent('keydown', {
          code: 'Equal',
          shiftKey: true,
          metaKey: true,
        })
      )
    ).toBeNull();

    const input = document.createElement('input');
    document.body.appendChild(input);
    let direction: 1 | -1 | null = null;
    input.addEventListener('keydown', (event) => {
      direction = getKeyboardZoomDirection(event);
    });
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Equal',
        key: '+',
        shiftKey: true,
        bubbles: true,
      })
    );
    expect(direction).toBeNull();
    input.remove();
  });

  it('applies repeatable bounded keyboard zoom steps', () => {
    const zoomedIn = applyCameraZoomStep({
      currentZoomTarget: 6,
      direction: 1,
      source: 'keyboard',
      ...bounds,
    });
    expect(zoomedIn).toBeGreaterThan(6);

    const clampedIn = applyCameraZoomStep({
      currentZoomTarget: 11.9,
      direction: 1,
      source: 'keyboard',
      ...bounds,
    });
    expect(clampedIn).toBe(bounds.maxZoom);

    const clampedOut = applyCameraZoomStep({
      currentZoomTarget: 0.66,
      direction: -1,
      source: 'keyboard',
      ...bounds,
    });
    expect(clampedOut).toBe(bounds.minZoom);
  });

  it('normalizes wheel delta modes and speeds up high-resolution trackpad deltas', () => {
    expect(normalizeWheelDeltaY(3, WheelEvent.DOM_DELTA_LINE)).toBe(48);
    expect(normalizeWheelDeltaY(1, WheelEvent.DOM_DELTA_PAGE, 720)).toBe(720);

    const oldAdditiveTrackpadStep = 6 - 1 * 0.0018;
    const next = applyWheelCameraZoomStep({
      currentZoomTarget: 6,
      deltaY: 1,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      ...bounds,
    });
    expect(next).toBeLessThan(oldAdditiveTrackpadStep);
    expect(next).toBeGreaterThan(bounds.minZoom);

    const wheelNotch = applyWheelCameraZoomStep({
      currentZoomTarget: 6,
      deltaY: 120,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      ...bounds,
    });
    expect(wheelNotch).toBeLessThan(6);
    expect(wheelNotch).toBeGreaterThan(4);
  });

  it('keeps pinch zoom multiplicative and bounded', () => {
    expect(
      applyPinchCameraZoom({
        startZoomTarget: 4,
        startDistance: 100,
        currentDistance: 150,
        ...bounds,
      })
    ).toBe(6);
    expect(
      applyPinchCameraZoom({
        startZoomTarget: 10,
        startDistance: 100,
        currentDistance: 200,
        ...bounds,
      })
    ).toBe(bounds.maxZoom);
    expect(
      applyPinchCameraZoom({
        startZoomTarget: 1,
        startDistance: 100,
        currentDistance: 10,
        ...bounds,
      })
    ).toBe(bounds.minZoom);
  });
});
