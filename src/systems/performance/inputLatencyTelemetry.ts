import {
  createInputLatencyMonitor,
  type InputLatencyMonitor,
  type InputLatencySummary,
} from './inputLatencyMonitor';

export interface InputLatencyTelemetryOptions {
  windowTarget: Window;
  documentTarget: Document;
  budgetMs?: number;
  eventTypes?: ReadonlyArray<string>;
  now?: () => number;
  logger?: Pick<Console, 'info' | 'warn'>;
  onReport?: (reason: string, summary: InputLatencySummary) => void;
}

export interface InputLatencyTelemetryHandle {
  report(reason: string): void;
  dispose(): void;
  getSummary(): InputLatencySummary | null;
}

const DEFAULT_BUDGET_MS = 200;

const formatNumber = (value: number): string => value.toFixed(1);

export function createInputLatencyTelemetry(
  options: InputLatencyTelemetryOptions
): InputLatencyTelemetryHandle {
  const {
    windowTarget,
    documentTarget,
    budgetMs = DEFAULT_BUDGET_MS,
    eventTypes,
    now,
    logger = console,
    onReport,
  } = options;

  const monitor: InputLatencyMonitor = createInputLatencyMonitor({
    target: windowTarget,
    eventTypes,
    now,
  });

  const report = (reason: string) => {
    const summary = monitor.getSummary();
    if (!summary || summary.count === 0) {
      return;
    }
    try {
      onReport?.(reason, summary);
    } catch (error) {
      logger.warn('Input latency onReport callback failed:', error);
    }
    const median = formatNumber(summary.medianLatencyMs);
    const p95 = formatNumber(summary.p95LatencyMs);
    const max = formatNumber(summary.maxLatencyMs);
    const average = formatNumber(summary.averageLatencyMs);
    const message =
      `Input latency summary (${reason}): median ${median} ms, p95 ${p95} ms ` +
      `(budget ${budgetMs} ms), max ${max} ms across ${summary.count} ` +
      `interactions (avg ${average} ms).`;
    const logMethod =
      summary.p95LatencyMs > budgetMs ? logger.warn : logger.info;
    logMethod.call(logger, message);
    monitor.reset();
  };

  const handleVisibilityChange = () => {
    if (documentTarget.visibilityState !== 'hidden') {
      return;
    }
    report('visibilitychange');
  };

  const handlePageHide = () => {
    report('pagehide');
  };

  documentTarget.addEventListener('visibilitychange', handleVisibilityChange);
  windowTarget.addEventListener('pagehide', handlePageHide);

  const dispose = () => {
    documentTarget.removeEventListener(
      'visibilitychange',
      handleVisibilityChange
    );
    windowTarget.removeEventListener('pagehide', handlePageHide);
    monitor.dispose();
  };

  return {
    report,
    dispose,
    getSummary: () => monitor.getSummary(),
  };
}
