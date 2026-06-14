import Stats from 'stats.js';

export const DEBUG_FPS_STORAGE_KEY = 'danielsmith.io::debugFpsCounter::v1';

export interface DebugPerformanceState {
  fpsEnabled: boolean;
  panelVisible: boolean;
}

interface StatsLike {
  dom: HTMLElement;
  showPanel(id: number): void;
  begin(): void;
  end(): void;
}

export interface DebugPerformanceOverlay {
  beginFrame(): void;
  endFrame(): void;
  getState(): DebugPerformanceState;
  setFpsEnabled(enabled: boolean): void;
  dispose(): void;
}

export const createDebugPerformanceOverlay = ({
  enabled,
  parent = document.body,
  createStats = () => new Stats(),
}: {
  enabled: boolean;
  parent?: HTMLElement;
  createStats?: () => StatsLike;
}): DebugPerformanceOverlay => {
  let fpsEnabled = enabled;
  let stats: StatsLike | null = null;

  const ensureStats = () => {
    if (stats) {
      return stats;
    }
    stats = createStats();
    stats.showPanel(0);
    stats.dom.classList.add('debug-performance-overlay');
    stats.dom.dataset.debugPerformancePanel = 'fps';
    stats.dom.style.position = 'fixed';
    stats.dom.style.left = '12px';
    stats.dom.style.bottom = '12px';
    stats.dom.style.top = 'auto';
    stats.dom.style.right = 'auto';
    stats.dom.style.zIndex = '30';
    stats.dom.style.pointerEvents = 'none';
    stats.dom.setAttribute('aria-hidden', 'true');
    return stats;
  };

  const syncPanel = () => {
    if (!fpsEnabled) {
      stats?.dom.remove();
      return;
    }
    const panel = ensureStats().dom;
    if (panel.parentElement !== parent) {
      parent.appendChild(panel);
    }
  };

  syncPanel();

  return {
    beginFrame() {
      if (fpsEnabled) {
        ensureStats().begin();
      }
    },
    endFrame() {
      if (fpsEnabled) {
        ensureStats().end();
      }
    },
    getState: () => ({
      fpsEnabled,
      panelVisible: stats?.dom.parentElement === parent,
    }),
    setFpsEnabled(enabled: boolean) {
      fpsEnabled = enabled;
      syncPanel();
    },
    dispose() {
      stats?.dom.remove();
      stats = null;
    },
  };
};
