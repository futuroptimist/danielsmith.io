import { describe, expect, it } from 'vitest';

import {
  applyCameraZoomStep,
  computeWheelZoomTarget,
  isKeyboardZoomShortcut,
  normalizeWheelDeltaY,
} from './zoomControls';

describe('zoomControls', () => {
  it('matches keyboard zoom shortcuts by physical key code and Shift state', () => {
    expect(
      isKeyboardZoomShortcut(
        new KeyboardEvent('keydown', {
          code: 'Equal',
          key: '+',
          shiftKey: true,
        })
      )
    ).toBe('in');
    expect(
      isKeyboardZoomShortcut(
        new KeyboardEvent('keydown', {
          code: 'Minus',
          key: '_',
          shiftKey: true,
        })
      )
    ).toBe('out');
    expect(
      isKeyboardZoomShortcut(
        new KeyboardEvent('keydown', {
          code: 'Equal',
          key: '=',
          shiftKey: false,
        })
      )
    ).toBeNull();
    expect(
      isKeyboardZoomShortcut(
        new KeyboardEvent('keydown', {
          altKey: true,
          code: 'Equal',
          key: '+',
          shiftKey: true,
        })
      )
    ).toBeNull();
  });

  it('applies repeatable multiplicative keyboard steps within bounds', () => {
    expect(applyCameraZoomStep(4, 'in', 0.65, 12)).toBeCloseTo(4.48);
    expect(applyCameraZoomStep(4, 'out', 0.65, 12)).toBeCloseTo(3.5714, 4);
    expect(applyCameraZoomStep(11.8, 'in', 0.65, 12)).toBe(12);
    expect(applyCameraZoomStep(0.7, 'out', 0.65, 12)).toBe(0.65);
  });

  it('normalizes wheel delta modes before exponential zoom scaling', () => {
    const lineEvent = new WheelEvent('wheel', {
      deltaMode: WheelEvent.DOM_DELTA_LINE,
      deltaY: 3,
    });
    const pageEvent = new WheelEvent('wheel', {
      deltaMode: WheelEvent.DOM_DELTA_PAGE,
      deltaY: 1,
    });

    expect(normalizeWheelDeltaY(lineEvent)).toBe(48);
    expect(normalizeWheelDeltaY(pageEvent)).toBe(800);

    const lineTarget = computeWheelZoomTarget(4, lineEvent, 0.65, 12);
    expect(lineTarget).toBeLessThan(4);
    expect(lineTarget).toBeGreaterThan(0.65);
  });

  it('makes high-resolution trackpad deltas materially responsive without exceeding bounds', () => {
    const trackpadZoomIn = computeWheelZoomTarget(
      4,
      new WheelEvent('wheel', {
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
        deltaY: -5,
      }),
      0.65,
      12
    );
    const oldAdditiveZoomIn = 4 - -5 * 0.0018;

    expect(trackpadZoomIn - 4).toBeGreaterThan(oldAdditiveZoomIn - 4);
    expect(
      computeWheelZoomTarget(
        11.8,
        new WheelEvent('wheel', { deltaY: -10_000 }),
        0.65,
        12
      )
    ).toBe(12);
    expect(
      computeWheelZoomTarget(
        0.7,
        new WheelEvent('wheel', { deltaY: 10_000 }),
        0.65,
        12
      )
    ).toBe(0.65);
  });
});
