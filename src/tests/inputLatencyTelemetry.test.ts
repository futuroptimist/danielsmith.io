import { describe, expect, it, vi } from 'vitest';

import { createInputLatencyTelemetry } from '../systems/performance/inputLatencyTelemetry';

import { FakeEventTarget } from './helpers/fakeEventTarget';

class FakeDocument extends FakeEventTarget {
  visibilityState: DocumentVisibilityState = 'visible';
}

const createInputEvent = (type: string, timeStamp: number): Event => {
  const event = new Event(type);
  Object.defineProperty(event, 'timeStamp', {
    configurable: true,
    value: timeStamp,
  });
  return event;
};

describe('createInputLatencyTelemetry', () => {
  const setup = () => {
    const windowTarget = new FakeEventTarget();
    const documentTarget = new FakeDocument();
    let now = 0;
    const logger = { info: vi.fn(), warn: vi.fn() };
    const telemetry = createInputLatencyTelemetry({
      windowTarget: windowTarget as unknown as Window,
      documentTarget: documentTarget as unknown as Document,
      budgetMs: 200,
      eventTypes: ['pointerdown'],
      now: () => now,
      logger,
    });

    const recordLatency = (latency: number) => {
      now += latency;
      windowTarget.dispatchEvent(
        createInputEvent('pointerdown', now - latency)
      );
    };

    return {
      windowTarget,
      documentTarget,
      telemetry,
      logger,
      recordLatency,
    };
  };

  it('logs summaries with severity based on the latency budget', () => {
    const { telemetry, logger, recordLatency } = setup();
    recordLatency(50);
    recordLatency(60);
    recordLatency(210);

    telemetry.report('manual');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('p95 210.0 ms');
    expect(logger.warn.mock.calls[0][0]).toContain('(budget 200 ms)');
    expect(telemetry.getSummary()).toBeNull();

    recordLatency(40);
    recordLatency(45);
    telemetry.report('follow-up');
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0][0]).toContain('p95 45.0 ms');
  });

  it('auto-reports on visibility change and pagehide, then disposes cleanly', () => {
    const { telemetry, logger, recordLatency, documentTarget, windowTarget } =
      setup();

    recordLatency(30);
    recordLatency(32);
    recordLatency(34);

    documentTarget.visibilityState = 'hidden';
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0][0]).toContain('visibilitychange');

    recordLatency(20);
    windowTarget.dispatchEvent(new Event('pagehide'));
    expect(logger.info.mock.calls[1][0]).toContain('pagehide');

    telemetry.dispose();
    expect(windowTarget.listenerCount('pagehide')).toBe(0);
    expect(documentTarget.listenerCount('visibilitychange')).toBe(0);
  });
});
