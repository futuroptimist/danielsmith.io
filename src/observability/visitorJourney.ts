/**
 * Privacy-bounded result contract for an application-owned visitor journey.
 * Detailed browser assertions stay inside the producer and are never serialized.
 */
export const VISITOR_JOURNEY_FAILURE_STAGES = [
  'homepage_delivery',
  'javascript_initialization',
  'essential_assets',
  'accessible_fallback',
  'resume_pdf',
  'timeout',
  'producer_interrupted',
] as const;

export type VisitorJourneyFailureStage =
  (typeof VISITOR_JOURNEY_FAILURE_STAGES)[number];
export type VisitorJourneyCheckStage = Exclude<
  VisitorJourneyFailureStage,
  'timeout' | 'producer_interrupted'
>;

export interface VisitorJourneyResult {
  state: 'success' | 'failure';
  freshness: 'fresh';
  durationMs: number;
  failureStage: VisitorJourneyFailureStage | null;
}

export type VisitorJourneyChecks = Record<
  VisitorJourneyCheckStage,
  (signal: AbortSignal) => Promise<void>
>;

export interface VisitorJourneyRunOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  now?: () => number;
}

const CHECK_ORDER: readonly VisitorJourneyCheckStage[] = [
  'homepage_delivery',
  'javascript_initialization',
  'essential_assets',
  'accessible_fallback',
  'resume_pdf',
];

function boundedDuration(startedAt: number, now: () => number): number {
  const elapsed = Math.round(now() - startedAt);
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

export async function runVisitorJourney(
  checks: VisitorJourneyChecks,
  options: VisitorJourneyRunOptions
): Promise<VisitorJourneyResult> {
  const now = options.now ?? performance.now.bind(performance);
  const startedAt = now();
  const timeoutController = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, options.timeoutMs);
  const interrupt = () => timeoutController.abort();
  options.signal?.addEventListener('abort', interrupt, { once: true });
  const aborted = new Promise<never>((_, reject) => {
    timeoutController.signal.addEventListener(
      'abort',
      () => reject(new Error('visitor journey aborted')),
      { once: true }
    );
  });

  let activeStage: VisitorJourneyCheckStage = 'homepage_delivery';
  try {
    for (const stage of CHECK_ORDER) {
      activeStage = stage;
      if (options.signal?.aborted) {
        return failure('producer_interrupted', startedAt, now);
      }
      await Promise.race([checks[stage](timeoutController.signal), aborted]);
      if (timedOut) {
        return failure('timeout', startedAt, now);
      }
    }

    return {
      state: 'success',
      freshness: 'fresh',
      durationMs: boundedDuration(startedAt, now),
      failureStage: null,
    };
  } catch {
    const failureStage = timedOut
      ? 'timeout'
      : options.signal?.aborted
        ? 'producer_interrupted'
        : activeStage;
    return failure(failureStage, startedAt, now);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', interrupt);
  }
}

function failure(
  failureStage: VisitorJourneyFailureStage,
  startedAt: number,
  now: () => number
): VisitorJourneyResult {
  return {
    state: 'failure',
    freshness: 'fresh',
    durationMs: boundedDuration(startedAt, now),
    failureStage,
  };
}

export function isPdfResponse(
  contentType: string | undefined,
  body: Uint8Array
): boolean {
  const normalizedContentType = contentType
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  const signature = new TextDecoder('ascii').decode(body.subarray(0, 5));
  return normalizedContentType === 'application/pdf' && signature === '%PDF-';
}
