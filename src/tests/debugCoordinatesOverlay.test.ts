import { describe, expect, it, vi } from 'vitest';

import {
  createDebugCoordinatesOverlay,
  type DebugCoordinatesState,
} from '../ui/hud/debugCoordinatesOverlay';

const enabledState: DebugCoordinatesState = {
  enabled: true,
  x: 1.234,
  y: 2.345,
  z: -3.456,
  activeFloorId: 'upper',
  predictedFloorId: 'ground',
  cameraZoom: 1.5,
  insideStairWidth: true,
  insideLanding: false,
  insideStairNavArea: true,
  stairZone: 'explicitDescentCorridor',
  roomId: 'studio',
};

describe('debugCoordinatesOverlay', () => {
  it('hides while disabled and renders rounded coordinates when enabled', () => {
    const container = document.createElement('div');
    let state: DebugCoordinatesState = { ...enabledState, enabled: false };
    const timer = {
      setInterval: vi.fn(() => 42),
      clearInterval: vi.fn(),
    };
    const handle = createDebugCoordinatesOverlay({
      container,
      getState: () => state,
      timer,
    });

    expect(handle.element.hidden).toBe(true);

    state = enabledState;
    handle.refresh();

    expect(handle.element.hidden).toBe(false);
    expect(
      handle.element.querySelector('[data-debug-coordinates-value="x"]')
        ?.textContent
    ).toBe('1.23');
    expect(
      handle.element.querySelector('[data-debug-coordinates-value="z"]')
        ?.textContent
    ).toBe('-3.46');
    expect(handle.element.textContent).toContain('upper');
    expect(handle.element.textContent).toContain('explicitDescentCorridor');
    handle.dispose();
    expect(timer.clearInterval).toHaveBeenCalledWith(42);
  });
});
