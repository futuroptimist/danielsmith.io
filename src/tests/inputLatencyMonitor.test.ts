import { describe, expect, it, vi } from 'vitest';

import {
  createInputLatencyMonitor,
  type InputLatencySample,
} from '../systems/performance/inputLatencyMonitor';

import { FakeEventTarget } from './helpers/fakeEventTarget';

const createEvent = (type: string, timeStamp: number): Event => {
  const event = new Event(type);
  Object.defineProperty(event, 'timeStamp', {
    configurable: true,
    value: timeStamp,
  });
  return event;
};

describe('createInputLatencyMonitor', () => {
  it('records latencies from DOM events and computes summary metrics', () => {
    const target = new FakeEventTarget();
    let currentNow = 100;
    const monitor = createInputLatencyMonitor({
      target,
      eventTypes: ['keydown'],
      now: () => currentNow,
    });

    currentNow = 130;
    target.dispatchEvent(createEvent('keydown', 100));
    currentNow = 190;
    target.dispatchEvent(createEvent('keydown', 150));
    currentNow = 260;
    target.dispatchEvent(createEvent('keydown', 210));

    const summary = monitor.getSummary();
    expect(summary).not.toBeNull();
    expect(summary?.count).toBe(3);
    expect(summary?.averageLatencyMs).toBeCloseTo(40, 6);
    expect(summary?.minLatencyMs).toBeCloseTo(30, 6);
    expect(summary?.maxLatencyMs).toBeCloseTo(50, 6);
    expect(summary?.medianLatencyMs).toBeCloseTo(40, 6);
    expect(summary?.p95LatencyMs).toBeCloseTo(50, 6);
    expect(summary?.eventTypeCounts).toEqual({ keydown: 3 });

    monitor.dispose();
    expect(target.listenerCount('keydown')).toBe(0);
  });

  it('ignores invalid timestamps and exposes manual record hook', () => {
    const target = new FakeEventTarget();
    let currentNow = 0;
    const onSample = vi.fn<(sample: InputLatencySample) => void>();
    const monitor = createInputLatencyMonitor({
      target,
      eventTypes: ['pointerdown'],
      now: () => currentNow,
      onSample,
    });

    target.dispatchEvent(createEvent('pointerdown', Number.NaN));
    target.dispatchEvent(createEvent('pointerdown', Number.POSITIVE_INFINITY));
    currentNow = 10;
    target.dispatchEvent(createEvent('pointerdown', 20));

    monitor.record(45.2, 'custom');
    const summary = monitor.getSummary();
    expect(summary?.count).toBe(1);
    expect(summary?.maxLatencyMs).toBeCloseTo(45.2, 6);
    expect(summary?.eventTypeCounts).toEqual({ custom: 1 });
    expect(onSample).toHaveBeenCalledTimes(1);
    expect(onSample.mock.calls[0][0]).toEqual({
      eventType: 'custom',
      latencyMs: 45.2,
    });

    monitor.reset();
    expect(monitor.getSummary()).toBeNull();
    monitor.dispose();
  });
});
