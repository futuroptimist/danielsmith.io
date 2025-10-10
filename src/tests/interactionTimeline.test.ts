import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionTimeline } from '../accessibility/interactionTimeline';

describe('InteractionTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches immediately when the interval has elapsed', () => {
    const timeline = new InteractionTimeline({ minIntervalMs: 500 });
    const run = vi.fn();

    timeline.enqueue({ id: 'first', run });

    expect(run).toHaveBeenCalledTimes(1);
    timeline.dispose();
  });

  it('waits the configured interval before dispatching subsequent events', () => {
    const timeline = new InteractionTimeline({ minIntervalMs: 500 });
    const first = vi.fn();
    const second = vi.fn();

    timeline.enqueue({ id: 'a', run: first });
    expect(first).toHaveBeenCalledTimes(1);

    vi.setSystemTime(200);
    timeline.enqueue({ id: 'b', run: second });
    expect(second).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(second).toHaveBeenCalledTimes(1);

    timeline.dispose();
  });

  it('deduplicates queued events sharing the same id', () => {
    const timeline = new InteractionTimeline({ minIntervalMs: 400 });
    const initial = vi.fn();
    const replacement = vi.fn();

    timeline.enqueue({ id: 'shared', run: initial });
    expect(initial).toHaveBeenCalledTimes(1);

    vi.setSystemTime(100);
    timeline.enqueue({ id: 'shared', run: replacement });
    timeline.enqueue({ id: 'other', run: vi.fn() });

    vi.advanceTimersByTime(400);
    expect(replacement).toHaveBeenCalledTimes(1);
    expect(initial).toHaveBeenCalledTimes(1);

    timeline.dispose();
  });

  it('drops the oldest events when exceeding the queue length', () => {
    const timeline = new InteractionTimeline({
      minIntervalMs: 300,
      maxQueueLength: 2,
    });
    const events = [vi.fn(), vi.fn(), vi.fn()];

    timeline.enqueue({ id: 'one', run: events[0] });
    expect(events[0]).toHaveBeenCalledTimes(1);

    vi.setSystemTime(100);
    timeline.enqueue({ id: 'two', run: events[1] });
    vi.setSystemTime(150);
    timeline.enqueue({ id: 'three', run: events[2] });

    vi.advanceTimersByTime(300);
    expect(events[1]).toHaveBeenCalledTimes(1);
    expect(events[2]).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(events[2]).toHaveBeenCalledTimes(1);

    timeline.dispose();
  });

  it('cancels queued events by id', () => {
    const timeline = new InteractionTimeline({ minIntervalMs: 600 });
    const cancelled = vi.fn();
    const remaining = vi.fn();

    timeline.enqueue({ id: 'first', run: vi.fn() });
    expect(cancelled).toHaveBeenCalledTimes(0);

    vi.setSystemTime(100);
    timeline.enqueue({ id: 'cancelled', run: cancelled });
    timeline.enqueue({ id: 'remaining', run: remaining });

    timeline.cancelById('cancelled');

    vi.advanceTimersByTime(600);
    expect(cancelled).not.toHaveBeenCalled();
    expect(remaining).toHaveBeenCalledTimes(1);

    timeline.dispose();
  });

  it('clears timers when cancelling the last queued event', () => {
    const timeline = new InteractionTimeline({ minIntervalMs: 400 });
    const pending = vi.fn();

    timeline.enqueue({ id: 'immediate', run: vi.fn() });
    vi.setSystemTime(100);
    timeline.enqueue({ id: 'pending', run: pending });

    timeline.cancelById('pending');
    vi.advanceTimersByTime(400);
    expect(pending).not.toHaveBeenCalled();

    timeline.dispose();
  });

  it('rethrows callback errors while keeping the timeline usable', () => {
    const timeline = new InteractionTimeline({ minIntervalMs: 300 });
    const error = new Error('boom');

    expect(() =>
      timeline.enqueue({
        id: 'faulty',
        run: () => {
          throw error;
        },
      })
    ).toThrow(error);

    const next = vi.fn();
    vi.setSystemTime(400);
    timeline.enqueue({ id: 'next', run: next });
    vi.advanceTimersByTime(300);
    expect(next).toHaveBeenCalledTimes(1);

    timeline.dispose();
  });

  it('stops scheduling once disposed', () => {
    const timeline = new InteractionTimeline({ minIntervalMs: 500 });
    const callback = vi.fn();

    timeline.enqueue({ id: 'a', run: vi.fn() });
    vi.setSystemTime(100);
    timeline.enqueue({ id: 'b', run: callback });

    timeline.dispose();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });
});
