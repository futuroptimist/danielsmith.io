import {
  createSampleAccumulator,
  type SampleAccumulator,
  type SampleSummary,
} from './sampleAccumulator';

export interface InputLatencySummary {
  count: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  medianLatencyMs: number;
}

export interface InputLatencySample {
  eventType: string;
  latencyMs: number;
}

export interface InputLatencyMonitor {
  record(latencyMs: number, eventType?: string): void;
  getSummary(): InputLatencySummary | null;
  reset(): void;
  dispose(): void;
}

export interface InputLatencyMonitorOptions {
  target: EventTarget;
  eventTypes?: ReadonlyArray<string>;
  listenerOptions?: AddEventListenerOptions;
  now?: () => number;
  onSample?: (sample: InputLatencySample) => void;
}

const DEFAULT_EVENT_TYPES = [
  'pointerdown',
  'pointerup',
  'click',
  'keydown',
  'keyup',
] as const;

const clampLatency = (value: number): number | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (value < 0) {
    return null;
  }
  return value;
};

const mapSummary = (summary: SampleSummary): InputLatencySummary => ({
  count: summary.count,
  averageLatencyMs: summary.average,
  minLatencyMs: summary.min,
  maxLatencyMs: summary.max,
  p95LatencyMs: summary.p95,
  medianLatencyMs: summary.median,
});

const resolveTimeStamp = (event: Event): number | null => {
  const { timeStamp } = event;
  if (typeof timeStamp === 'number') {
    return timeStamp;
  }
  if (typeof timeStamp === 'bigint') {
    return Number(timeStamp);
  }
  return null;
};

export function createInputLatencyMonitor(
  options: InputLatencyMonitorOptions
): InputLatencyMonitor {
  const accumulator: SampleAccumulator = createSampleAccumulator();
  const target = options.target;
  const now = options.now ?? (() => performance.now());
  const listenerOptions = options.listenerOptions ?? { passive: true };
  const eventTypes =
    (options.eventTypes?.length ?? 0)
      ? [...options.eventTypes]
      : [...DEFAULT_EVENT_TYPES];
  const listeners = new Map<string, EventListener>();

  const recordSample = (latency: number, eventType: string) => {
    accumulator.record(latency);
    options.onSample?.({ latencyMs: latency, eventType });
  };

  const handleEvent = (event: Event) => {
    const eventStamp = resolveTimeStamp(event);
    if (eventStamp === null) {
      return;
    }
    const nowValue = now();
    if (!Number.isFinite(nowValue)) {
      return;
    }
    const latency = clampLatency(nowValue - eventStamp);
    if (latency === null) {
      return;
    }
    recordSample(latency, event.type);
  };

  eventTypes.forEach((eventType) => {
    const listener: EventListener = (event) => {
      handleEvent(event);
    };
    target.addEventListener(eventType, listener, listenerOptions);
    listeners.set(eventType, listener);
  });

  const record = (latencyMs: number, eventType = 'manual') => {
    const normalized = clampLatency(latencyMs);
    if (normalized === null) {
      return;
    }
    recordSample(normalized, eventType);
  };

  const getSummary = (): InputLatencySummary | null => {
    const summary = accumulator.getSummary();
    if (!summary) {
      return null;
    }
    return mapSummary(summary);
  };

  const reset = () => {
    accumulator.reset();
  };

  const dispose = () => {
    listeners.forEach((listener, eventType) => {
      target.removeEventListener(eventType, listener, listenerOptions);
    });
    listeners.clear();
    accumulator.reset();
  };

  return {
    record,
    getSummary,
    reset,
    dispose,
  };
}
