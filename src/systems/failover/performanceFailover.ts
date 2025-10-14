import type { FallbackReason, RenderTextFallbackOptions } from '../failover';
import { renderTextFallback } from '../failover';

type AnimationLoop = (() => void) | null;

export interface ImmersiveRendererHandle {
  setAnimationLoop(loop: AnimationLoop): void;
  dispose(): void;
  domElement: HTMLElement;
}

export interface PerformanceFailoverTriggerContext {
  averageFps: number;
  durationMs: number;
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

  private lowFpsFpsSum = 0;

  private lowFpsSampleCount = 0;

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
      this.lowFpsFpsSum += fps;
      this.lowFpsSampleCount += 1;
      if (this.lowFpsDurationMs >= this.minimumDurationMs) {
        this.triggered = true;
        const averageFps =
          this.lowFpsSampleCount > 0
            ? this.lowFpsFpsSum / this.lowFpsSampleCount
            : fps;
        this.onTrigger({
          averageFps,
          durationMs: this.lowFpsDurationMs,
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
    this.lowFpsFpsSum = 0;
    this.lowFpsSampleCount = 0;
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
  } = options;

  let transitioned = false;

  const transitionToFallback = (
    reason: FallbackReason,
    context?: PerformanceFailoverTriggerContext
  ) => {
    if (transitioned) {
      return;
    }
    transitioned = true;
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
