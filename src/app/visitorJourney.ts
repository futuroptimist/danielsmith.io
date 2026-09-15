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

export type VisitorJourneyResult = {
  state: 'success' | 'failure';
  freshness: number;
  aggregateDurationMs: number;
  failureStage: VisitorJourneyFailureStage | null;
};

type EssentialStage = Exclude<
  VisitorJourneyFailureStage,
  'timeout' | 'producer_interrupted'
>;

type VisitorJourneyProbes = Record<
  EssentialStage,
  (signal: AbortSignal) => Promise<void>
>;

type VisitorJourneyOptions = {
  timeoutMs: number;
  signal?: AbortSignal;
  now?: () => number;
};

class JourneyControlError extends Error {
  constructor(readonly stage: 'timeout' | 'producer_interrupted') {
    super(stage);
  }
}

const ESSENTIAL_STAGES: readonly EssentialStage[] = [
  'homepage_delivery',
  'javascript_initialization',
  'essential_assets',
  'accessible_fallback',
  'resume_pdf',
];

/**
 * Runs application-owned checks and returns only the bounded telemetry contract.
 * Probe errors are deliberately collapsed to a finite failure stage.
 */
export async function runVisitorJourney(
  probes: VisitorJourneyProbes,
  options: VisitorJourneyOptions
): Promise<VisitorJourneyResult> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const controller = new AbortController();

  if (options.signal?.aborted) {
    return {
      state: 'failure',
      freshness: Math.floor(now() / 1_000),
      aggregateDurationMs: Math.max(0, now() - startedAt),
      failureStage: 'producer_interrupted',
    };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let removeAbortListener: (() => void) | undefined;

  const controlFailure = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new JourneyControlError('timeout'));
    }, options.timeoutMs);

    if (options.signal) {
      const interrupt = () => {
        controller.abort();
        reject(new JourneyControlError('producer_interrupted'));
      };
      options.signal.addEventListener('abort', interrupt, { once: true });
      removeAbortListener = () =>
        options.signal?.removeEventListener('abort', interrupt);
    }
  });

  let failureStage: VisitorJourneyFailureStage | null = null;

  for (const stage of ESSENTIAL_STAGES) {
    try {
      await Promise.race([probes[stage](controller.signal), controlFailure]);
    } catch (error) {
      failureStage = error instanceof JourneyControlError ? error.stage : stage;
      break;
    }
  }

  if (timer) clearTimeout(timer);
  removeAbortListener?.();

  return {
    state: failureStage === null ? 'success' : 'failure',
    freshness: Math.floor(now() / 1_000),
    aggregateDurationMs: Math.max(0, now() - startedAt),
    failureStage,
  };
}

export function isPdfResponse(
  contentType: string | undefined,
  body: Uint8Array
): boolean {
  const hasPdfContentType =
    contentType?.split(';', 1)[0].trim().toLowerCase() === 'application/pdf';
  const signature = String.fromCharCode(...body.subarray(0, 5));
  return hasPdfContentType && signature === '%PDF-';
}
