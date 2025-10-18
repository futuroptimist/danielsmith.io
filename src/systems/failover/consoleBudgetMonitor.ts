export type ConsoleBudgetSource =
  | 'console-error'
  | 'window-error'
  | 'unhandledrejection';

export interface ConsoleBudgetExceededDetail {
  count: number;
  budget: number;
  remaining: number;
  source: ConsoleBudgetSource;
  detail?: unknown;
}

export interface ConsoleBudgetMonitorOptions {
  budget?: number;
  consoleTarget?: Pick<Console, 'error'>;
  windowTarget?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  eventTarget?: EventTarget;
  eventName?: string;
  onBudgetExceeded?: (detail: ConsoleBudgetExceededDetail) => void;
}

export interface ConsoleBudgetMonitorHandle {
  getCount(): number;
  getBudget(): number;
  getRemainingBudget(): number;
  dispose(): void;
}

const DEFAULT_EVENT_NAME = 'portfolio:console-budget-exceeded';

function sanitizeBudget(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function createBudgetExceededEvent(
  name: string,
  detail: ConsoleBudgetExceededDetail
): Event {
  if (typeof CustomEvent === 'function') {
    return new CustomEvent(name, { detail });
  }
  const event = new Event(name);
  Object.assign(event, { detail });
  return event;
}

export function createConsoleBudgetMonitor(
  options: ConsoleBudgetMonitorOptions = {}
): ConsoleBudgetMonitorHandle {
  const {
    budget: rawBudget,
    consoleTarget = console,
    windowTarget = typeof window !== 'undefined' ? window : undefined,
    eventTarget = typeof window !== 'undefined' ? window : undefined,
    eventName = DEFAULT_EVENT_NAME,
    onBudgetExceeded,
  } = options;

  const budget = sanitizeBudget(rawBudget);
  let count = 0;
  let triggered = false;

  const originalConsoleError = consoleTarget.error;

  const record = (
    source: ConsoleBudgetSource,
    detail?: unknown
  ): ConsoleBudgetExceededDetail | null => {
    if (triggered) {
      return null;
    }
    count += 1;
    if (count <= budget) {
      return null;
    }
    triggered = true;
    const payload: ConsoleBudgetExceededDetail = {
      count,
      budget,
      remaining: 0,
      source,
      detail,
    };
    if (eventTarget && typeof eventTarget.dispatchEvent === 'function') {
      try {
        eventTarget.dispatchEvent(
          createBudgetExceededEvent(eventName, payload)
        );
      } catch (error) {
        console.warn('Failed to dispatch console budget event:', error);
      }
    }
    try {
      onBudgetExceeded?.(payload);
    } catch (error) {
      console.warn('Console budget exceeded handler failed:', error);
    }
    return payload;
  };

  const instrumentedConsoleError: typeof consoleTarget.error = (
    ...args: unknown[]
  ) => {
    try {
      return originalConsoleError.apply(consoleTarget, args as []);
    } finally {
      record('console-error', args);
    }
  };

  consoleTarget.error = instrumentedConsoleError;

  const windowListeners: Array<{
    type: 'error' | 'unhandledrejection';
    listener: EventListener;
  }> = [];

  if (windowTarget && typeof windowTarget.addEventListener === 'function') {
    const handleWindowError: EventListener = (event) => {
      record('window-error', event);
    };
    const handleUnhandledRejection: EventListener = (event) => {
      const reason = (event as PromiseRejectionEvent)?.reason ?? event;
      record('unhandledrejection', reason);
    };
    try {
      windowTarget.addEventListener('error', handleWindowError);
      windowTarget.addEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      windowListeners.push(
        { type: 'error', listener: handleWindowError },
        { type: 'unhandledrejection', listener: handleUnhandledRejection }
      );
    } catch (error) {
      console.warn('Failed to attach console budget listeners:', error);
    }
  }

  return {
    getCount() {
      return count;
    },
    getBudget() {
      return budget;
    },
    getRemainingBudget() {
      return Math.max(0, budget - count);
    },
    dispose() {
      if (consoleTarget.error === instrumentedConsoleError) {
        consoleTarget.error = originalConsoleError;
      }
      if (
        windowTarget &&
        typeof windowTarget.removeEventListener === 'function'
      ) {
        for (const { type, listener } of windowListeners) {
          windowTarget.removeEventListener(type, listener);
        }
      }
      windowListeners.length = 0;
    },
  };
}
