import { describe, expect, it } from 'vitest';

import { createDebugPerformanceOverlay } from '../debugPerformanceOverlay';

const createStatsStub = () => {
  const calls = { begin: 0, end: 0, showPanel: [] as number[] };
  const stats = {
    calls,
    dom: document.createElement('div'),
    showPanel(id: number) {
      calls.showPanel.push(id);
    },
    begin() {
      calls.begin += 1;
    },
    end() {
      calls.end += 1;
    },
  };
  return stats;
};

describe('debug performance overlay', () => {
  it('reports initial disabled state without creating a panel', () => {
    const parent = document.createElement('div');
    const overlay = createDebugPerformanceOverlay({
      enabled: false,
      parent,
      createStats: createStatsStub,
    });

    expect(overlay.getState()).toEqual({
      fpsEnabled: false,
      panelVisible: false,
    });
    expect(
      parent.querySelectorAll('[data-debug-performance-panel="fps"]')
    ).toHaveLength(0);
  });

  it('toggles the FPS panel without duplicating DOM nodes', () => {
    const parent = document.createElement('div');
    const overlay = createDebugPerformanceOverlay({
      enabled: false,
      parent,
      createStats: createStatsStub,
    });

    overlay.setFpsEnabled(true);
    overlay.setFpsEnabled(true);
    expect(
      parent.querySelectorAll('[data-debug-performance-panel="fps"]')
    ).toHaveLength(1);
    expect(overlay.getState()).toEqual({
      fpsEnabled: true,
      panelVisible: true,
    });

    overlay.setFpsEnabled(false);
    expect(
      parent.querySelectorAll('[data-debug-performance-panel="fps"]')
    ).toHaveLength(0);
    expect(overlay.getState()).toEqual({
      fpsEnabled: false,
      panelVisible: false,
    });
  });

  it('uses the default FPS panel and does not capture pointer events', () => {
    const parent = document.createElement('div');
    const stats = createStatsStub();
    const overlay = createDebugPerformanceOverlay({
      enabled: true,
      parent,
      createStats: () => stats,
    });

    overlay.beginFrame();
    overlay.endFrame();

    expect(stats.calls.showPanel).toEqual([0]);
    expect(stats.calls.begin).toBe(1);
    expect(stats.calls.end).toBe(1);
    expect(stats.dom.style.pointerEvents).toBe('none');
    expect(stats.dom.style.position).toBe('fixed');
  });
});
