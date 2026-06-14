import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDebugPerformanceOverlay } from '../performanceOverlay';

describe('debug performance overlay', () => {
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

  it('toggles a single non-interactive FPS panel without duplicates', () => {
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
    expect((panels[0] as HTMLElement).style.top).toBe(
      'max(1rem, env(safe-area-inset-top))'
    );

    overlay.setFpsEnabled(false);

    expect(
      document.querySelectorAll('[data-debug-performance-panel="fps"]')
    ).toHaveLength(0);
    expect(overlay.getState()).toEqual({
      fpsEnabled: false,
      panelVisible: false,
    });
  });

  it('updates the in-house FPS label without a runtime dependency', () => {
    const now = vi.spyOn(performance, 'now');
    now
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(250)
      .mockReturnValueOnce(500);
    const overlay = createDebugPerformanceOverlay();

    overlay.setFpsEnabled(true);
    overlay.end();
    overlay.end();

    expect(
      document.querySelector<HTMLElement>(
        '[data-debug-performance-panel="fps"]'
      )?.textContent
    ).toBe('FPS 4');
  });
});
