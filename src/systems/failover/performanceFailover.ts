import type { FallbackReason, RenderTextFallbackOptions } from '../failover';
import { renderTextFallback } from '../failover';
import { createFpsAccumulator } from '../performance/fpsAccumulator';

import {
  createConsoleBudgetMonitor,
  type ConsoleBudgetMonitorHandle,
  type ConsoleBudgetExceededDetail,
  type ConsoleBudgetMonitorOptions,
} from './consoleBudgetMonitor';

type AnimationLoop = (() => void) | null;

export interface ImmersiveRendererHandle {
  setAnimationLoop(loop: AnimationLoop): void;
  dispose(): void;
  domElement: HTMLElement;
}

export interface PerformanceFailoverTriggerContext {
  averageFps: number;
  durationMs: number;
  sampleCount: number;
  minFps: number;
  maxFps: number;
  p95Fps: number;
  medianFps: number;
}

export interface PerformanceFailoverHandlerOptions {
  renderer: ImmersiveRendererHandle;
  container: HTMLElement;
  immersiveUrl: string;
  markAppReady: (mode: 'immersive' | 'fallback') => void;
  fpsThreshold?: number;
  minimumDurationMs?: number;
  maxFrameDeltaMs?: number;
  onTrigger?: (context: PerformanceFailoverTriggerContext) => void;
  renderFallback?: (
    container: HTMLElement,
    options: RenderTextFallbackOptions
  ) => void;
  fallbackLinks?: Pick<RenderTextFallbackOptions, 'resumeUrl' | 'githubUrl'>;
  onBeforeFallback?: (reason: FallbackReason) => void;
  disabled?: boolean;
  consoleFailover?: ConsoleFailoverOptions;
}

export interface ConsoleFailoverOptions
  extends Omit<ConsoleBudgetMonitorOptions, 'budget' | 'onBudgetExceeded'> {
  budget?: number;
  disabled?: boolean;
  onExceeded?: (detail: ConsoleBudgetExceededDetail) => void;
}

interface PerformanceFailoverMonitorOptions {
  fpsThreshold: number;
  minimumDurationMs: number;
  maxFrameDeltaMs: number;
  onTrigger: (context: PerformanceFailoverTriggerContext) => void;
}

class PerformanceFailoverMonitor {
  private readonly fpsThreshold: number;

  private readonly minimumDurationMs: number;

  private readonly maxFrameDeltaMs: number;

  private readonly onTrigger: (
    context: PerformanceFailoverTriggerContext
  ) => void;

  private lowFpsDurationMs = 0;

  private readonly fpsAccumulator = createFpsAccumulator();

  private triggered = false;

  constructor(options: PerformanceFailoverMonitorOptions) {
    this.fpsThreshold = options.fpsThreshold;
    this.minimumDurationMs = options.minimumDurationMs;
    this.maxFrameDeltaMs = options.maxFrameDeltaMs;
    this.onTrigger = options.onTrigger;
  }

  update(deltaSeconds: number): void {
    if (this.triggered) {
      return;
    }
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }
    const frameMs = deltaSeconds * 1000;
    if (frameMs > this.maxFrameDeltaMs) {
      this.resetLowFpsSamples();
      return;
    }
    const fps = frameMs > 0 ? 1000 / frameMs : Number.POSITIVE_INFINITY;
    if (fps < this.fpsThreshold) {
      this.lowFpsDurationMs += frameMs;
      this.fpsAccumulator.record(fps);
      if (this.lowFpsDurationMs >= this.minimumDurationMs) {
        this.triggered = true;
        const summary = this.fpsAccumulator.getSummary();
        const averageFps = summary?.averageFps ?? fps;
        this.onTrigger({
          averageFps,
          durationMs: this.lowFpsDurationMs,
          sampleCount: summary?.count ?? 1,
          minFps: summary?.minFps ?? fps,
          maxFps: summary?.maxFps ?? fps,
          p95Fps: summary?.p95Fps ?? fps,
          medianFps: summary?.medianFps ?? fps,
        });
      }
      return;
    }
    this.resetLowFpsSamples();
  }

  hasTriggered(): boolean {
    return this.triggered;
  }

  private resetLowFpsSamples(): void {
    this.lowFpsDurationMs = 0;
    this.fpsAccumulator.reset();
  }
}

export interface PerformanceFailoverHandler {
  update(deltaSeconds: number): void;
  hasTriggered(): boolean;
  triggerFallback(reason: FallbackReason): void;
}

export function createPerformanceFailoverHandler(
  options: PerformanceFailoverHandlerOptions
): PerformanceFailoverHandler {
  const {
    renderer,
    container,
    immersiveUrl,
    markAppReady,
    fpsThreshold = 30,
    minimumDurationMs = 5000,
    maxFrameDeltaMs = 1000,
    onTrigger,
    renderFallback: render = renderTextFallback,
    fallbackLinks,
    onBeforeFallback,
    disabled = false,
    consoleFailover,
  } = options;

  let transitioned = false;
  let consoleMonitor: ConsoleBudgetMonitorHandle | null = null;

  const transitionToFallback = (
    reason: FallbackReason,
    context?: PerformanceFailoverTriggerContext
  ) => {
    if (transitioned) {
      return;
    }
    transitioned = true;
    if (consoleMonitor) {
      consoleMonitor.dispose();
      consoleMonitor = null;
    }
    if (context && onTrigger) {
      onTrigger(context);
    }
    try {
      onBeforeFallback?.(reason);
    } catch (error) {
      console.error('Failed preparing fallback transition:', error);
    }
    try {
      renderer.setAnimationLoop(null);
    } catch (error) {
      console.error('Failed to stop renderer loop during failover:', error);
    }
    try {
      renderer.dispose();
    } catch (error) {
      console.error('Failed to dispose renderer during failover:', error);
    }
    try {
      renderer.domElement.remove();
    } catch (error) {
      console.error('Failed to remove renderer canvas during failover:', error);
    }
    try {
      render(container, {
        reason,
        immersiveUrl,
        resumeUrl: fallbackLinks?.resumeUrl,
        githubUrl: fallbackLinks?.githubUrl,
      });
    } catch (error) {
      console.error(
        'Failed to render text fallback after performance trigger:',
        error
      );
    }
    markAppReady('fallback');
  };

  const monitor = disabled
    ? null
    : new PerformanceFailoverMonitor({
        fpsThreshold,
        minimumDurationMs,
        maxFrameDeltaMs,
        onTrigger: (context) => {
          transitionToFallback('low-performance', context);
        },
      });

  const consoleFailoverOptions = consoleFailover;

  if (!disabled && consoleFailoverOptions?.disabled !== true) {
    const {
      onExceeded,
      budget: consoleBudget,
      disabled: inheritedDisabled,
      ...rest
    } = consoleFailoverOptions ?? {};
    if (inheritedDisabled !== true) {
      consoleMonitor = createConsoleBudgetMonitor({
        ...rest,
        budget: consoleBudget ?? 0,
        onBudgetExceeded: (detail) => {
          try {
            onExceeded?.(detail);
          } catch (error) {
            console.warn('Console failover callback failed:', error);
          }
          transitionToFallback('console-error');
        },
      });
    }
  }

  return {
    update(deltaSeconds: number) {
      if (transitioned || !monitor) {
        return;
      }
      monitor.update(deltaSeconds);
    },
    hasTriggered() {
      return transitioned || monitor?.hasTriggered() === true;
    },
    triggerFallback(reason: FallbackReason) {
      transitionToFallback(reason);
    },
  };
}
