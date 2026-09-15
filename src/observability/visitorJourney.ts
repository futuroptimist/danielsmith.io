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
  freshness: 'fresh';
  durationMs: number;
  failureStage: VisitorJourneyFailureStage | null;
};

type EssentialStage = Exclude<
  VisitorJourneyFailureStage,
  'timeout' | 'producer_interrupted'
>;

export type VisitorJourneyProbes = Record<
  EssentialStage,
  () => Promise<boolean>
> & {
  /** Optional rendering is diagnostic only and cannot turn a usable fallback into an outage. */
  immersive_rendering?: () => Promise<boolean>;
};

export type VisitorJourneyOptions = {
  now?: () => number;
  signal?: AbortSignal;
  timeoutMs: number;
};

const ESSENTIAL_STAGES: readonly EssentialStage[] = [
  'homepage_delivery',
  'javascript_initialization',
  'essential_assets',
  'accessible_fallback',
  'resume_pdf',
];

export function isPdfResponse(
  contentType: string | null,
  body: Uint8Array
): boolean {
  const signature = new TextDecoder().decode(body.subarray(0, 5));
  return (
    Boolean(contentType?.toLowerCase().includes('application/pdf')) &&
    signature === '%PDF-'
  );
}

export async function runVisitorJourney(
  probes: VisitorJourneyProbes,
  options: VisitorJourneyOptions
): Promise<VisitorJourneyResult> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const execute = async (): Promise<VisitorJourneyFailureStage | null> => {
    for (const stage of ESSENTIAL_STAGES) {
      if (options.signal?.aborted) return 'producer_interrupted';
      try {
        if (!(await probes[stage]())) return stage;
      } catch {
        return stage;
      }
    }

    // Exercise the optional probe when supplied, but deliberately discard its result.
    try {
      await probes.immersive_rendering?.();
    } catch {
      // Optional renderer diagnostics cannot invalidate essential functionality.
    }
    return options.signal?.aborted ? 'producer_interrupted' : null;
  };

  const timeout = new Promise<VisitorJourneyFailureStage>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), options.timeoutMs);
  });

  const interrupted = new Promise<VisitorJourneyFailureStage>((resolve) => {
    options.signal?.addEventListener(
      'abort',
      () => resolve('producer_interrupted'),
      {
        once: true,
      }
    );
  });

  const failureStage = await Promise.race([execute(), timeout, interrupted]);
  if (timer) clearTimeout(timer);

  return {
    state: failureStage === null ? 'success' : 'failure',
    freshness: 'fresh',
    durationMs: Math.max(0, now() - startedAt),
    failureStage,
  };
}
