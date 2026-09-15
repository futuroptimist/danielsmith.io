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
  const readFiniteTime = () => {
    const value = now();
    return Number.isFinite(value) ? value : 0;
  };
  const startedAt = readFiniteTime();
  const controller = new AbortController();
  const result = (
    failureStage: VisitorJourneyFailureStage | null
  ): VisitorJourneyResult => {
    const completedAt = readFiniteTime();
    const elapsed = completedAt - startedAt;
    return {
      state: failureStage === null ? 'success' : 'failure',
      freshness: Math.floor(completedAt / 1_000),
      aggregateDurationMs:
        Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0,
      failureStage,
    };
  };

  if (options.signal?.aborted) {
    return result('producer_interrupted');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let removeAbortListener: (() => void) | undefined;
  let controlStage: JourneyControlError['stage'] | null = null;

  const controlFailure = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controlStage = 'timeout';
      reject(new JourneyControlError(controlStage));
      controller.abort();
    }, options.timeoutMs);

    if (options.signal) {
      const interrupt = () => {
        controlStage = 'producer_interrupted';
        reject(new JourneyControlError(controlStage));
        controller.abort();
      };
      options.signal.addEventListener('abort', interrupt, { once: true });
      removeAbortListener = () =>
        options.signal?.removeEventListener('abort', interrupt);
    }
  });

  let failureStage: VisitorJourneyFailureStage | null = null;
  let currentStage: EssentialStage = ESSENTIAL_STAGES[0];

  try {
    for (const stage of ESSENTIAL_STAGES) {
      currentStage = stage;
      await Promise.race([probes[stage](controller.signal), controlFailure]);
    }
  } catch (error) {
    if (controlStage) {
      failureStage = controlStage;
    } else if (error instanceof JourneyControlError) {
      failureStage = error.stage;
    } else {
      failureStage = currentStage;
    }
  } finally {
    if (timer) clearTimeout(timer);
    removeAbortListener?.();
  }

  return result(failureStage);
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
