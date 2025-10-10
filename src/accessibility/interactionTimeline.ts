export interface InteractionTimelineEvent {
  id?: string;
  run(): void;
}

export interface InteractionTimelineOptions {
  /**
   * Minimum time between dispatched events in milliseconds. Defaults to 1800 ms
   * to keep announcements comfortably spaced for cognitive processing.
   */
  minIntervalMs?: number;
  /**
   * Maximum number of queued events. Defaults to 3 so newer messages can
   * replace older ones without overwhelming players.
   */
  maxQueueLength?: number;
  /**
   * Override for retrieving the current timestamp. Primarily used in tests.
   */
  now?: () => number;
  /**
   * Custom scheduler for delayed callbacks. Defaults to `setTimeout` and is
   * exposed for deterministic testing.
   */
  schedule?: (
    callback: () => void,
    delay: number
  ) => ReturnType<typeof setTimeout>;
  /**
   * Matching cancellation function for {@link InteractionTimelineOptions.schedule}.
   */
  cancel?: (handle: ReturnType<typeof setTimeout>) => void;
}

interface QueuedEvent {
  id: string | null;
  run: () => void;
}

/**
 * Serialises high-signal interactions (screen reader announcements, HUD prompts)
 * so players never receive rapid-fire messaging. Events are deduplicated by id
 * and spaced using an exponential decay-inspired interval.
 */
export class InteractionTimeline {
  private readonly minIntervalMs: number;

  private readonly maxQueueLength: number;

  private readonly now: () => number;

  private readonly schedule: (
    callback: () => void,
    delay: number
  ) => ReturnType<typeof setTimeout>;

  private readonly cancel: (handle: ReturnType<typeof setTimeout>) => void;

  private readonly queue: QueuedEvent[] = [];

  private timerHandle: ReturnType<typeof setTimeout> | null = null;

  private lastDispatchTimestamp = Number.NEGATIVE_INFINITY;

  private disposed = false;

  constructor(options: InteractionTimelineOptions = {}) {
    this.minIntervalMs = Math.max(0, options.minIntervalMs ?? 1800);
    this.maxQueueLength = Math.max(1, options.maxQueueLength ?? 3);
    this.now = options.now ?? (() => Date.now());
    this.schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay));
    this.cancel = options.cancel ?? ((handle) => clearTimeout(handle));
  }

  enqueue(event: InteractionTimelineEvent): void {
    if (this.disposed) {
      return;
    }
    const entry: QueuedEvent = {
      id: event.id ?? null,
      run: event.run,
    };

    if (entry.id) {
      const existingIndex = this.queue.findIndex((queued) => queued.id === entry.id);
      if (existingIndex >= 0) {
        this.queue.splice(existingIndex, 1, entry);
      } else {
        this.queue.push(entry);
      }
    } else {
      this.queue.push(entry);
    }

    if (this.queue.length > this.maxQueueLength) {
      const excess = this.queue.length - this.maxQueueLength;
      this.queue.splice(0, excess);
    }

    this.scheduleNext();
  }

  cancelById(id: string): void {
    if (!id || this.disposed) {
      return;
    }
    const originalLength = this.queue.length;
    for (let i = this.queue.length - 1; i >= 0; i -= 1) {
      if (this.queue[i]?.id === id) {
        this.queue.splice(i, 1);
      }
    }
    if (originalLength !== this.queue.length && this.queue.length === 0) {
      this.clearTimer();
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearTimer();
    this.queue.splice(0, this.queue.length);
  }

  private scheduleNext(): void {
    if (this.disposed || this.queue.length === 0 || this.timerHandle !== null) {
      return;
    }
    const now = this.now();
    const elapsed = now - this.lastDispatchTimestamp;
    const delay = Math.max(this.minIntervalMs - elapsed, 0);
    if (delay <= 0) {
      this.dispatchNext();
      return;
    }
    this.timerHandle = this.schedule(() => {
      this.timerHandle = null;
      this.dispatchNext();
    }, delay);
  }

  private dispatchNext(): void {
    if (this.disposed) {
      this.queue.splice(0, this.queue.length);
      this.clearTimer();
      return;
    }
    const next = this.queue.shift();
    if (!next) {
      this.clearTimer();
      return;
    }

    let thrown: unknown = null;
    this.lastDispatchTimestamp = this.now();
    try {
      next.run();
    } catch (error) {
      thrown = error;
    }

    if (this.queue.length === 0) {
      this.clearTimer();
    } else {
      this.scheduleNext();
    }

    if (thrown) {
      throw thrown;
    }
  }

  private clearTimer(): void {
    if (this.timerHandle !== null) {
      this.cancel(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
