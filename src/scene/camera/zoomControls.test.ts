import { describe, expect, it } from 'vitest';

import {
  applyCameraPinchZoom,
  applyCameraWheelZoom,
  applyCameraZoomStep,
  WHEEL_DELTA_LINE,
  WHEEL_DELTA_PAGE,
  WHEEL_DELTA_PIXEL,
  normalizeWheelDeltaY,
} from './zoomControls';

const bounds = { minZoom: 0.65, maxZoom: 12 };

describe('camera zoom controls', () => {
  it('steps keyboard zoom multiplicatively and clamps to camera bounds', () => {
    expect(applyCameraZoomStep(4, 1, bounds)).toBeCloseTo(4.48, 6);
    expect(applyCameraZoomStep(4, -1, bounds)).toBeCloseTo(4 / 1.12, 6);
    expect(applyCameraZoomStep(11.9, 1, bounds)).toBe(12);
    expect(applyCameraZoomStep(0.66, -1, bounds)).toBe(0.65);
  });

  it('normalizes wheel delta modes before applying exponential zoom', () => {
    expect(
      normalizeWheelDeltaY({ deltaY: 3, deltaMode: WHEEL_DELTA_LINE })
    ).toBe(48);
    expect(
      normalizeWheelDeltaY({ deltaY: 1, deltaMode: WHEEL_DELTA_PAGE })
    ).toBe(800);
    expect(
      normalizeWheelDeltaY({
        deltaY: 24,
        deltaMode: WHEEL_DELTA_PIXEL,
      })
    ).toBe(24);

    const lineModeTarget = applyCameraWheelZoom(
      4,
      { deltaY: -3, deltaMode: WHEEL_DELTA_LINE },
      bounds
    );
    expect(lineModeTarget).toBeGreaterThan(4);
  });

  it('makes high-resolution trackpad deltas materially more responsive than old additive zoom', () => {
    const previousAdditiveTarget = 4 - -10 * 0.0018;
    const nextTarget = applyCameraWheelZoom(
      4,
      { deltaY: -10, deltaMode: WHEEL_DELTA_PIXEL },
      bounds
    );

    expect(nextTarget - 4).toBeGreaterThan((previousAdditiveTarget - 4) * 3);
    expect(nextTarget).toBeLessThan(4.25);
  });

  it('keeps large mouse-wheel deltas controlled and bounded', () => {
    const nextTarget = applyCameraWheelZoom(
      4,
      { deltaY: -120, deltaMode: WHEEL_DELTA_PIXEL },
      bounds
    );

    expect(nextTarget).toBeGreaterThan(4);
    expect(nextTarget).toBeLessThan(5);
    expect(applyCameraWheelZoom(11, { deltaY: -10_000 }, bounds)).toBe(12);
    expect(applyCameraWheelZoom(1, { deltaY: 10_000 }, bounds)).toBe(0.65);
  });

  it('keeps touch pinch multiplicative and bounded by min/max zoom', () => {
    expect(applyCameraPinchZoom(3, 100, 150, bounds)).toBeCloseTo(4.5, 6);
    expect(applyCameraPinchZoom(3, 100, 50, bounds)).toBeCloseTo(1.5, 6);
    expect(applyCameraPinchZoom(10, 100, 300, bounds)).toBe(12);
    expect(applyCameraPinchZoom(1, 100, 10, bounds)).toBe(0.65);
  });
});
