import { describe, expect, it } from 'vitest';

import {
  applyCameraZoomStep,
  applyWheelCameraZoom,
  isKeyboardZoomShortcut,
  normalizeWheelDeltaY,
} from './zoomControls';

const bounds = { minZoom: 0.65, maxZoom: 12 };

function keyboardEvent(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
}

describe('zoomControls', () => {
  it('detects Shift+Equal and Shift+Minus by physical key code', () => {
    expect(
      isKeyboardZoomShortcut(
        keyboardEvent({ code: 'Equal', key: '+', shiftKey: true })
      )
    ).toBe(1);
    expect(
      isKeyboardZoomShortcut(
        keyboardEvent({ code: 'Minus', key: '_', shiftKey: true })
      )
    ).toBe(-1);
  });

  it('ignores keyboard zoom shortcuts for text entry and modified events', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();

    expect(
      isKeyboardZoomShortcut(
        keyboardEvent({
          code: 'Equal',
          key: '+',
          shiftKey: true,
          ctrlKey: true,
        })
      )
    ).toBeNull();

    const textEntryEvent = keyboardEvent({
      code: 'Equal',
      key: '+',
      shiftKey: true,
    });
    input.dispatchEvent(textEntryEvent);
    expect(isKeyboardZoomShortcut(textEntryEvent)).toBeNull();

    const prevented = keyboardEvent({
      code: 'Equal',
      key: '+',
      shiftKey: true,
    });
    prevented.preventDefault();
    expect(isKeyboardZoomShortcut(prevented)).toBeNull();
  });

  it('applies predictable keyboard zoom steps and clamps at bounds', () => {
    const zoomedIn = applyCameraZoomStep({
      currentTarget: 4,
      direction: 1,
      source: 'keyboard',
      minZoom: bounds.minZoom,
      maxZoom: bounds.maxZoom,
    });
    expect(zoomedIn).toBeGreaterThan(4);

    const zoomedOut = applyCameraZoomStep({
      currentTarget: zoomedIn,
      direction: -1,
      source: 'keyboard',
      minZoom: bounds.minZoom,
      maxZoom: bounds.maxZoom,
    });
    expect(zoomedOut).toBeCloseTo(4, 6);

    expect(
      applyCameraZoomStep({
        currentTarget: 100,
        direction: 1,
        source: 'keyboard',
        minZoom: bounds.minZoom,
        maxZoom: bounds.maxZoom,
      })
    ).toBe(bounds.maxZoom);
    expect(
      applyCameraZoomStep({
        currentTarget: 0.1,
        direction: -1,
        source: 'keyboard',
        minZoom: bounds.minZoom,
        maxZoom: bounds.maxZoom,
      })
    ).toBe(bounds.minZoom);
  });

  it('normalizes wheel delta modes and speeds high-resolution trackpad deltas', () => {
    expect(normalizeWheelDeltaY(3, 1)).toBe(48);
    expect(normalizeWheelDeltaY(1, 2)).toBe(800);

    const previousAdditiveTarget = 4 - 40 * 0.0018;
    const nextTarget = applyWheelCameraZoom({
      currentTarget: 4,
      deltaY: 40,
      deltaMode: 0,
      minZoom: bounds.minZoom,
      maxZoom: bounds.maxZoom,
    });

    expect(nextTarget).toBeLessThan(previousAdditiveTarget);
    expect(nextTarget).toBeGreaterThan(bounds.minZoom);
  });

  it('keeps wheel zoom bounded for large mouse-wheel deltas', () => {
    expect(
      applyWheelCameraZoom({
        currentTarget: 4,
        deltaY: 10_000,
        deltaMode: 0,
        minZoom: bounds.minZoom,
        maxZoom: bounds.maxZoom,
      })
    ).toBe(bounds.minZoom);
    expect(
      applyWheelCameraZoom({
        currentTarget: 4,
        deltaY: -10_000,
        deltaMode: 0,
        minZoom: bounds.minZoom,
        maxZoom: bounds.maxZoom,
      })
    ).toBe(bounds.maxZoom);
  });

  it('preserves multiplicative pinch-style scaling through clamped targets', () => {
    expect(
      applyCameraZoomStep({
        currentTarget: 4,
        direction: 1,
        source: 'pinch',
        magnitude: Math.log(1.5),
        minZoom: bounds.minZoom,
        maxZoom: bounds.maxZoom,
      })
    ).toBeCloseTo(6, 6);
    expect(
      applyCameraZoomStep({
        currentTarget: 10,
        direction: 1,
        source: 'pinch',
        magnitude: Math.log(2),
        minZoom: bounds.minZoom,
        maxZoom: bounds.maxZoom,
      })
    ).toBe(bounds.maxZoom);
  });
});
