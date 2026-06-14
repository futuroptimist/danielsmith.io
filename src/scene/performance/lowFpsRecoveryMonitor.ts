export interface LowFpsRecoveryContext {
  averageFps: number;
  elapsedSeconds: number;
  frameCount: number;
}

export interface LowFpsRecoveryMonitorOptions {
  fpsThreshold?: number;
  windowMs?: number;
  cooldownMs?: number;
  sampleCapacity?: number;
  now?: () => number;
  onTrigger: (context: LowFpsRecoveryContext) => void;
}

export interface LowFpsRecoveryMonitorState {
  averageFps: number;
  elapsedMs: number;
  frameCount: number;
  visible: boolean;
  cooldownRemainingMs: number;
}

const DEFAULT_FPS_THRESHOLD = 5;
const DEFAULT_WINDOW_MS = 10_000;
const DEFAULT_COOLDOWN_MS = 30_000;
const DEFAULT_SAMPLE_CAPACITY = 900;

export class LowFpsRecoveryMonitor {
  private readonly fpsThreshold: number;
  private readonly windowMs: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private readonly onTrigger: (context: LowFpsRecoveryContext) => void;
  private readonly samples: number[];

  private startIndex = 0;
  private count = 0;
  private visible = false;
  private cooldownUntilMs = 0;
  private lastTriggeredAtMs = -Infinity;

  constructor(options: LowFpsRecoveryMonitorOptions) {
    this.fpsThreshold = options.fpsThreshold ?? DEFAULT_FPS_THRESHOLD;
    this.windowMs = Math.max(
      options.windowMs ?? DEFAULT_WINDOW_MS,
      DEFAULT_WINDOW_MS
    );
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.now = options.now ?? (() => performance.now());
    this.onTrigger = options.onTrigger;
    this.samples = new Array(options.sampleCapacity ?? DEFAULT_SAMPLE_CAPACITY);
  }

  recordFrame(deltaSeconds: number, nowMs = this.now()): void {
    if (this.visible || nowMs < this.cooldownUntilMs) {
      return;
    }
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }
    this.push(nowMs);
    this.trim(nowMs);
    const elapsedMs = this.getElapsedMs();
    if (elapsedMs < this.windowMs || this.count < 2) {
      return;
    }
    const averageFps = this.count / (elapsedMs / 1000);
    if (averageFps < this.fpsThreshold) {
      this.visible = true;
      this.lastTriggeredAtMs = nowMs;
      this.onTrigger({
        averageFps,
        elapsedSeconds: elapsedMs / 1000,
        frameCount: this.count,
      });
    }
  }

  dismiss(nowMs = this.now()): void {
    this.visible = false;
    this.cooldownUntilMs = nowMs + this.cooldownMs;
    this.resetSamples();
  }

  reset(): void {
    this.visible = false;
    this.cooldownUntilMs = 0;
    this.lastTriggeredAtMs = -Infinity;
    this.resetSamples();
  }

  getState(nowMs = this.now()): LowFpsRecoveryMonitorState {
    const elapsedMs = this.getElapsedMs();
    return {
      averageFps: elapsedMs > 0 ? this.count / (elapsedMs / 1000) : 0,
      elapsedMs,
      frameCount: this.count,
      visible: this.visible,
      cooldownRemainingMs: Math.max(0, this.cooldownUntilMs - nowMs),
    };
  }

  forceTrigger(nowMs = this.now()): void {
    if (this.visible || nowMs < this.cooldownUntilMs) {
      return;
    }
    this.visible = true;
    this.lastTriggeredAtMs = nowMs;
    this.onTrigger({
      averageFps: 0,
      elapsedSeconds: this.windowMs / 1000,
      frameCount: 0,
    });
  }

  private push(value: number): void {
    if (this.count < this.samples.length) {
      this.samples[(this.startIndex + this.count) % this.samples.length] =
        value;
      this.count += 1;
      return;
    }
    this.samples[this.startIndex] = value;
    this.startIndex = (this.startIndex + 1) % this.samples.length;
  }

  private trim(nowMs: number): void {
    while (
      this.count > 0 &&
      nowMs - this.samples[this.startIndex] > this.windowMs
    ) {
      this.startIndex = (this.startIndex + 1) % this.samples.length;
      this.count -= 1;
    }
  }

  private getElapsedMs(): number {
    if (this.count < 2) {
      return 0;
    }
    const first = this.samples[this.startIndex];
    const last =
      this.samples[(this.startIndex + this.count - 1) % this.samples.length];
    return Math.max(0, last - first);
  }

  private resetSamples(): void {
    this.startIndex = 0;
    this.count = 0;
  }
}
