import Stats from 'stats.js';

export interface DebugPerformanceState {
  fpsEnabled: boolean;
  panelVisible: boolean;
}

export interface DebugPerformanceOverlay {
  begin(): void;
  end(): void;
  getState(): DebugPerformanceState;
  setFpsEnabled(enabled: boolean): void;
  dispose(): void;
}

const PANEL_CLASS = 'debug-performance-overlay';

export function createDebugPerformanceOverlay(
  parent: HTMLElement = document.body
): DebugPerformanceOverlay {
  const stats = new Stats();
  stats.showPanel(0);

  const panel = stats.dom;
  panel.classList.add(PANEL_CLASS);
  panel.dataset.debugPerformancePanel = 'fps';
  panel.setAttribute('aria-hidden', 'true');
  panel.style.position = 'fixed';
  panel.style.left = '12px';
  panel.style.bottom = '12px';
  panel.style.top = 'auto';
  panel.style.zIndex = '40';
  panel.style.pointerEvents = 'none';

  let fpsEnabled = false;

  const attach = () => {
    if (panel.parentElement !== parent) {
      panel.remove();
      parent.appendChild(panel);
    }
  };

  const detach = () => {
    panel.remove();
  };

  return {
    begin: () => {
      if (fpsEnabled) {
        stats.begin();
      }
    },
    end: () => {
      if (fpsEnabled) {
        stats.end();
      }
    },
    getState: () => ({
      fpsEnabled,
      panelVisible: panel.isConnected,
    }),
    setFpsEnabled: (enabled: boolean) => {
      fpsEnabled = enabled;
      if (enabled) {
        attach();
      } else {
        detach();
      }
    },
    dispose: () => {
      fpsEnabled = false;
      detach();
    },
  };
}
