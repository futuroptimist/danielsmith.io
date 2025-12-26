import {
  createInputLatencyMonitor,
  type EventCategory,
  type InputLatencyMonitor,
  type InputLatencySummary,
} from './inputLatencyMonitor';

export { categorizeEventType } from './inputLatencyMonitor';
export type { EventCategory } from './inputLatencyMonitor';

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

const formatEventTypeCounts = (
  counts: Record<string, number>,
  categoryCounts: Record<EventCategory, number>
): string => {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return 'no events recorded';
  }
  const sorted = [...entries].sort((left, right) => {
    if (left[1] === right[1]) {
      return left[0].localeCompare(right[0]);
    }
    return right[1] - left[1];
  });

  const categoryBreakdown = Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${category}: ${count}`)
    .join(', ');

  const eventBreakdown = sorted
    .map(([type, count]) => `${type}×${count}`)
    .join(', ');

  return categoryBreakdown
    ? `${eventBreakdown} (${categoryBreakdown})`
    : eventBreakdown;
};

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
    const eventBreakdown = formatEventTypeCounts(
      summary.eventTypeCounts,
      summary.eventCategoryCounts
    );
    const message =
      `Input latency summary (${reason}): median ${median} ms, p95 ${p95} ms ` +
      `(budget ${budgetMs} ms), max ${max} ms across ${summary.count} ` +
      `interactions (avg ${average} ms). Event types: ${eventBreakdown}.`;
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
