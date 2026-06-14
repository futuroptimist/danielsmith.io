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
const FPS_REFRESH_INTERVAL_MS = 500;

export function createDebugPerformanceOverlay(
  parent: HTMLElement = document.body
): DebugPerformanceOverlay {
  const panel = document.createElement('div');
  panel.className = PANEL_CLASS;
  panel.dataset.debugPerformancePanel = 'fps';
  panel.setAttribute('aria-hidden', 'true');
  panel.style.position = 'fixed';
  panel.style.left = 'max(1rem, env(safe-area-inset-left))';
  panel.style.top = 'max(1rem, env(safe-area-inset-top))';
  panel.style.zIndex = '40';
  panel.style.pointerEvents = 'none';
  panel.style.minWidth = '4.25rem';
  panel.style.padding = '0.35rem 0.45rem';
  panel.style.border = '1px solid rgba(86, 184, 255, 0.5)';
  panel.style.borderRadius = '0.45rem';
  panel.style.background = 'rgba(5, 12, 21, 0.82)';
  panel.style.boxShadow = '0 10px 24px rgba(3, 9, 18, 0.36)';
  panel.style.color = '#8fffb1';
  panel.style.font = '700 0.72rem/1.15 ui-monospace, SFMono-Regular, monospace';
  panel.style.letterSpacing = '0.02em';
  panel.style.textTransform = 'uppercase';
  panel.textContent = 'FPS --';

  let fpsEnabled = false;
  let frameCount = 0;
  let sampleStartMs = 0;

  const attach = () => {
    if (panel.parentElement !== parent) {
      panel.remove();
      parent.appendChild(panel);
    }
  };

  const detach = () => {
    panel.remove();
  };

  const resetSample = (nowMs: number) => {
    frameCount = 0;
    sampleStartMs = nowMs;
    panel.textContent = 'FPS --';
  };

  return {
    begin: () => {
      if (!fpsEnabled) {
        return;
      }
      // Capture cadence with a lightweight in-house counter instead of an npm
      // dependency so locked-down registry installs can still run npm ci.
    },
    end: () => {
      if (!fpsEnabled) {
        return;
      }
      const nowMs = performance.now();
      frameCount += 1;
      const elapsedMs = nowMs - sampleStartMs;
      if (elapsedMs >= FPS_REFRESH_INTERVAL_MS) {
        const fps = Math.round((frameCount * 1000) / elapsedMs);
        panel.textContent = `FPS ${fps}`;
        frameCount = 0;
        sampleStartMs = nowMs;
      }
    },
    getState: () => ({
      fpsEnabled,
      panelVisible: panel.isConnected,
    }),
    setFpsEnabled: (enabled: boolean) => {
      fpsEnabled = enabled;
      if (enabled) {
        resetSample(performance.now());
        attach();
      } else {
        detach();
      }
    },
    dispose: () => {
      fpsEnabled = false;
      frameCount = 0;
      detach();
    },
  };
}
