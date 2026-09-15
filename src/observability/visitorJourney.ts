export const VISITOR_JOURNEY_FAILURE_STAGES = [
  'homepage',
  'javascript-initialization',
  'essential-assets',
  'accessible-fallback',
  'resume-pdf',
  'timeout',
  'producer-interrupted',
] as const;

export type VisitorJourneyFailureStage =
  (typeof VISITOR_JOURNEY_FAILURE_STAGES)[number];

export interface VisitorJourneyResult {
  status: 'success' | 'failure';
  freshnessMs: number;
  durationMs: number;
  failureStage: VisitorJourneyFailureStage | null;
}

export interface VisitorJourneyProbeResult {
  ok: boolean;
}

export interface VisitorJourneyProbes {
  homepage: () => Promise<VisitorJourneyProbeResult>;
  javascriptInitialization: () => Promise<VisitorJourneyProbeResult>;
  essentialAssets: () => Promise<VisitorJourneyProbeResult>;
  accessibleFallback: () => Promise<VisitorJourneyProbeResult>;
  resumePdf: () => Promise<VisitorJourneyProbeResult>;
  optionalImmersive?: () => Promise<VisitorJourneyProbeResult>;
}

export interface VisitorJourneyRunOptions {
  now?: () => number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

type EssentialProbe = readonly [
  VisitorJourneyFailureStage,
  () => Promise<VisitorJourneyProbeResult>,
];

export function isPdfResponse(
  contentType: string | undefined,
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
  options: VisitorJourneyRunOptions = {}
): Promise<VisitorJourneyResult> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const checks: EssentialProbe[] = [
    ['homepage', probes.homepage],
    ['javascript-initialization', probes.javascriptInitialization],
    ['essential-assets', probes.essentialAssets],
    ['accessible-fallback', probes.accessibleFallback],
    ['resume-pdf', probes.resumePdf],
  ];

  const finish = (
    failureStage: VisitorJourneyFailureStage | null
  ): VisitorJourneyResult => {
    const finishedAt = now();
    return {
      status: failureStage === null ? 'success' : 'failure',
      freshnessMs: 0,
      durationMs: Math.max(0, finishedAt - startedAt),
      failureStage,
    };
  };

  for (const [stage, probe] of checks) {
    if (options.signal?.aborted) return finish('producer-interrupted');

    const elapsed = now() - startedAt;
    const remaining = timeoutMs - elapsed;
    if (remaining <= 0) return finish('timeout');

    let timer: ReturnType<typeof setTimeout> | undefined;
    let interrupted = false;
    let resolveInterrupt:
      | ((result: VisitorJourneyProbeResult) => void)
      | undefined;
    const interrupt = new Promise<VisitorJourneyProbeResult>((resolve) => {
      resolveInterrupt = resolve;
    });
    const handleInterrupt = () => {
      interrupted = true;
      resolveInterrupt?.({ ok: false });
    };
    options.signal?.addEventListener('abort', handleInterrupt, { once: true });
    try {
      const outcome = await Promise.race([
        probe(),
        new Promise<VisitorJourneyProbeResult>((resolve) => {
          timer = setTimeout(() => resolve({ ok: false }), remaining);
        }),
        interrupt,
      ]);
      if (!outcome.ok) {
        if (interrupted) return finish('producer-interrupted');
        return finish(now() - startedAt >= timeoutMs ? 'timeout' : stage);
      }
    } catch {
      return finish(options.signal?.aborted ? 'producer-interrupted' : stage);
    } finally {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener('abort', handleInterrupt);
    }
  }

  // Immersive rendering is diagnostic only. Its failure cannot override a usable fallback.
  // The optional probe is intentionally outside this essential aggregate.
  return finish(null);
}
