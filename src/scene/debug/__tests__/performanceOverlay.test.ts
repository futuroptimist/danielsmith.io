import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDebugPerformanceOverlay } from '../performanceOverlay';

const showPanel = vi.fn();
const begin = vi.fn();
const end = vi.fn();
const statsInstances: Array<{
  dom: HTMLDivElement;
  domElement: HTMLDivElement;
}> = [];

vi.mock('stats.js', () => ({
  default: vi.fn().mockImplementation(() => {
    const dom = document.createElement('div');
    const stats = {
      dom,
      domElement: dom,
      showPanel,
      begin,
      end,
    };
    statsInstances.push(stats);
    return stats;
  }),
}));

describe('debug performance overlay', () => {
  afterEach(() => {
    vi.clearAllMocks();
    statsInstances.length = 0;
    document.body.innerHTML = '';
  });

  it('creates a stats.js FPS panel and reports disabled state before enabling', () => {
    const overlay = createDebugPerformanceOverlay();

    expect(showPanel).toHaveBeenCalledWith(0);
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

  it('delegates frame samples to stats.js only while enabled', () => {
    const overlay = createDebugPerformanceOverlay();

    overlay.begin();
    overlay.end();
    expect(begin).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();

    overlay.setFpsEnabled(true);
    overlay.begin();
    overlay.end();

    expect(begin).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
  });
});
