export type IdleMonitorListener = (idle: boolean) => void;

export interface IdleMonitorOptions {
  windowTarget?: Window;
  elementTargets?: EventTarget[];
  timeoutMs?: number;
  events?: readonly string[];
}

const DEFAULT_TIMEOUT_MS = 4000;
const DEFAULT_EVENTS: readonly string[] = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'keydown',
  'keyup',
  'wheel',
  'touchstart',
  'touchmove',
];

/**
 * Tracks recent interaction signals to determine whether the player is idle.
 * Consumers can subscribe to idle state changes and manually report activity
 * when custom input sources (e.g., locomotion controllers) are engaged.
 */
export class IdleMonitor {
  private readonly windowTarget: Window;

  private readonly elementTargets: EventTarget[];

  private readonly events: readonly string[];

  private readonly listeners = new Set<IdleMonitorListener>();

  private timer: number | null = null;

  private idle = false;

  private disposed = false;

  constructor({
    windowTarget = window,
    elementTargets = [],
    timeoutMs = DEFAULT_TIMEOUT_MS,
    events = DEFAULT_EVENTS,
  }: IdleMonitorOptions = {}) {
    this.windowTarget = windowTarget;
    const documentTarget = windowTarget.document;
    this.elementTargets = [windowTarget, documentTarget, ...elementTargets];
    this.events = events;
    this.timeoutMs = Math.max(0, timeoutMs);
    this.attachListeners();
    this.resetTimer();
  }

  private timeoutMs: number;

  getIdle(): boolean {
    return this.idle;
  }

  subscribe(listener: IdleMonitorListener): () => void {
    this.listeners.add(listener);
    listener(this.idle);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reportActivity(): void {
    if (this.disposed) {
      return;
    }
    this.resetTimer();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.detachListeners();
    if (this.timer !== null) {
      this.windowTarget.clearTimeout(this.timer);
      this.timer = null;
    }
    this.listeners.clear();
  }

  private readonly handleEvent = () => {
    this.reportActivity();
  };

  private attachListeners() {
    for (const target of this.elementTargets) {
      if (!target) {
        continue;
      }
      for (const event of this.events) {
        target.addEventListener(event, this.handleEvent, {
          passive: true,
        });
      }
    }
    this.windowTarget.addEventListener(
      'visibilitychange',
      this.handleVisibility
    );
  }

  private detachListeners() {
    for (const target of this.elementTargets) {
      if (!target) {
        continue;
      }
      for (const event of this.events) {
        target.removeEventListener(event, this.handleEvent);
      }
    }
    this.windowTarget.removeEventListener(
      'visibilitychange',
      this.handleVisibility
    );
  }

  private readonly handleVisibility = () => {
    if (this.windowTarget.document.visibilityState === 'visible') {
      this.reportActivity();
    }
  };

  private resetTimer() {
    if (this.timer !== null) {
      this.windowTarget.clearTimeout(this.timer);
    }
    const wasIdle = this.idle;
    this.idle = false;
    if (wasIdle) {
      this.emit();
    }
    if (this.timeoutMs === 0) {
      return;
    }
    this.timer = this.windowTarget.setTimeout(() => {
      this.timer = null;
      this.setIdle(true);
    }, this.timeoutMs);
  }

  private setIdle(next: boolean) {
    if (this.idle === next) {
      return;
    }
    this.idle = next;
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.idle);
    }
  }
}
