import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IdleMonitor } from '../systems/idle/idleMonitor';

describe('IdleMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('transitions to idle after the configured timeout and resets on activity', () => {
    const monitor = new IdleMonitor({
      windowTarget: window,
      timeoutMs: 1000,
    });

    const states: boolean[] = [];
    const unsubscribe = monitor.subscribe((idle) => {
      states.push(idle);
    });

    expect(states).toEqual([false]);

    vi.advanceTimersByTime(999);
    expect(states).toEqual([false]);

    vi.advanceTimersByTime(1);
    expect(states).toEqual([false, true]);

    monitor.reportActivity();
    expect(states).toEqual([false, true, false]);

    unsubscribe();
    monitor.dispose();
  });

  it('stops responding to activity once disposed', () => {
    const monitor = new IdleMonitor({
      windowTarget: window,
      timeoutMs: 500,
    });

    const states: boolean[] = [];
    monitor.subscribe((idle) => {
      states.push(idle);
    });

    monitor.dispose();
    monitor.reportActivity();

    expect(states).toEqual([false]);
  });
});
