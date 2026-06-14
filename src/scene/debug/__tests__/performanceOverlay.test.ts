import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDebugPerformanceOverlay } from '../performanceOverlay';

const createCanvasContext = () => ({
  fillRect: vi.fn(),
  fillText: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  font: '',
  fillStyle: '',
  globalAlpha: 1,
});

describe('debug performance overlay', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => createCanvasContext() as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('reports disabled state before the FPS panel is enabled', () => {
    const overlay = createDebugPerformanceOverlay();

    expect(overlay.getState()).toEqual({
      fpsEnabled: false,
      panelVisible: false,
    });

    overlay.dispose();
  });

  it('toggles a single non-interactive stats panel without duplicates', () => {
    const overlay = createDebugPerformanceOverlay();

    overlay.setFpsEnabled(true);
    overlay.setFpsEnabled(true);

    const panels = document.querySelectorAll(
      '[data-debug-performance-panel="fps"]'
    );
    expect(panels).toHaveLength(1);
    expect(overlay.getState()).toEqual({
      fpsEnabled: true,
      panelVisible: true,
    });
    expect((panels[0] as HTMLElement).style.pointerEvents).toBe('none');

    overlay.setFpsEnabled(false);

    expect(
      document.querySelectorAll('[data-debug-performance-panel="fps"]')
    ).toHaveLength(0);
    expect(overlay.getState()).toEqual({
      fpsEnabled: false,
      panelVisible: false,
    });
  });
});
