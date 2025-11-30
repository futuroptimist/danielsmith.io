import { describe, expect, it, vi } from 'vitest';

import { createConsoleBudgetMonitor } from '../systems/failover/consoleBudgetMonitor';

class FakeWindowTarget {
  private readonly target = new EventTarget();

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    this.target.addEventListener(type, listener);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    this.target.removeEventListener(type, listener);
  }

  dispatch(type: string, detail?: unknown): void {
    const event = new Event(type);
    Object.assign(event, { detail });
    this.target.dispatchEvent(event);
  }
}

describe('createConsoleBudgetMonitor', () => {
  const createConsoleTarget = () => {
    const originalError = vi.fn();
    const consoleTarget = { error: originalError } as Pick<Console, 'error'>;
    return { consoleTarget, originalError };
  };

  it('invokes callback and dispatches event when console budget is exceeded', () => {
    const { consoleTarget, originalError } = createConsoleTarget();
    const eventTarget = new EventTarget();
    const onExceeded = vi.fn();
    const monitor = createConsoleBudgetMonitor({
      budget: 0,
      consoleTarget,
      eventTarget,
      eventName: 'test:console-budget',
      onBudgetExceeded: onExceeded,
    });

    const events: Array<CustomEvent> = [];
    eventTarget.addEventListener(
      'test:console-budget',
      (event) => {
        events.push(event as CustomEvent);
      },
      { once: true }
    );

    const instrumentedError = consoleTarget.error;
    expect(instrumentedError).not.toBe(originalError);

    consoleTarget.error('boom');

    expect(originalError).toHaveBeenCalledWith('boom');
    expect(monitor.getCount()).toBe(1);
    expect(monitor.getBudget()).toBe(0);
    expect(monitor.getRemainingBudget()).toBe(0);
    expect(onExceeded).toHaveBeenCalledTimes(1);
    const [detail] = onExceeded.mock.calls[0] as [
      Parameters<NonNullable<typeof onExceeded>>[0],
    ];
    expect(detail.source).toBe('console-error');
    expect(detail.count).toBe(1);
    expect(detail.sourceCounts).toEqual({
      'console-error': 1,
      'window-error': 0,
      unhandledrejection: 0,
    });
    expect(events).toHaveLength(1);
    expect(events[0].detail).toMatchObject({
      source: 'console-error',
      count: 1,
      sourceCounts: {
        'console-error': 1,
        'window-error': 0,
        unhandledrejection: 0,
      },
    });
  });

  it('captures window error and unhandled rejection events', () => {
    const { consoleTarget, originalError } = createConsoleTarget();
    const windowTarget = new FakeWindowTarget();
    const onExceeded = vi.fn();
    const monitor = createConsoleBudgetMonitor({
      budget: 1,
      consoleTarget,
      windowTarget,
      onBudgetExceeded: onExceeded,
    });

    consoleTarget.error('first');
    expect(originalError).toHaveBeenCalledWith('first');
    expect(monitor.getRemainingBudget()).toBe(0);

    windowTarget.dispatch('error', { message: 'fail' });
    expect(onExceeded).toHaveBeenCalledTimes(1);
    const detail = onExceeded.mock.calls[0][0];
    expect(detail.source).toBe('window-error');
    expect(detail.sourceCounts).toEqual({
      'console-error': 1,
      'window-error': 1,
      unhandledrejection: 0,
    });

    onExceeded.mockClear();
    windowTarget.dispatch('unhandledrejection', {
      reason: new Error('rejected'),
    });
    expect(onExceeded).not.toHaveBeenCalled();
  });

  it('restores console target and detaches listeners on dispose', () => {
    const { consoleTarget, originalError } = createConsoleTarget();
    const windowTarget = new FakeWindowTarget();
    const monitor = createConsoleBudgetMonitor({
      budget: 5,
      consoleTarget,
      windowTarget,
    });

    const instrumented = consoleTarget.error;
    expect(instrumented).not.toBe(originalError);

    monitor.dispose();

    expect(consoleTarget.error).toBe(originalError);
    consoleTarget.error('after dispose');
    expect(monitor.getCount()).toBe(0);
  });

  it('normalizes invalid budgets to zero tolerance', () => {
    const { consoleTarget } = createConsoleTarget();
    const onExceeded = vi.fn();
    const monitor = createConsoleBudgetMonitor({
      budget: -3,
      consoleTarget,
      onBudgetExceeded: onExceeded,
    });

    consoleTarget.error('budget check');

    expect(monitor.getBudget()).toBe(0);
    expect(onExceeded).toHaveBeenCalledTimes(1);
  });
});
