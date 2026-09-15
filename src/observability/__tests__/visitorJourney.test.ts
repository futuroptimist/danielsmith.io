import { describe, expect, it, vi } from 'vitest';

import {
  isPdfResponse,
  runVisitorJourney,
  type VisitorJourneyProbes,
} from '../visitorJourney';

const pass = async () => ({ ok: true });

function probes(
  overrides: Partial<VisitorJourneyProbes> = {}
): VisitorJourneyProbes {
  return {
    homepage: pass,
    javascriptInitialization: pass,
    essentialAssets: pass,
    accessibleFallback: pass,
    resumePdf: pass,
    ...overrides,
  };
}

describe('visitor journey contract', () => {
  it.each([
    ['javascript-initialization', 'javascriptInitialization'],
    ['essential-assets', 'essentialAssets'],
  ] as const)(
    'classifies a broken %s probe',
    async (failureStage, probeName) => {
      const result = await runVisitorJourney(
        probes({ [probeName]: async () => ({ ok: false }) })
      );
      expect(result).toMatchObject({ status: 'failure', failureStage });
    }
  );

  it('rejects a healthy HTML response at the resume URL', () => {
    const html = new TextEncoder().encode(
      '<!doctype html><title>healthy fallback</title>'
    );
    expect(isPdfResponse('application/pdf', html)).toBe(false);
    expect(
      isPdfResponse('text/html', new TextEncoder().encode('%PDF-1.7'))
    ).toBe(false);
  });

  it('classifies an invalid resume response despite a healthy endpoint', async () => {
    const result = await runVisitorJourney(
      probes({ resumePdf: async () => ({ ok: false }) })
    );
    expect(result).toMatchObject({
      status: 'failure',
      failureStage: 'resume-pdf',
    });
  });

  it('accepts PDF content type and magic bytes together', () => {
    expect(
      isPdfResponse(
        'application/pdf; charset=binary',
        new TextEncoder().encode('%PDF-1.7')
      )
    ).toBe(true);
  });

  it('keeps accessible fallback success when optional immersive rendering fails', async () => {
    const result = await runVisitorJourney(
      probes({ optionalImmersive: async () => ({ ok: false }) })
    );
    expect(result).toMatchObject({ status: 'success', failureStage: null });
    expect(Object.keys(result).sort()).toEqual(
      ['durationMs', 'failureStage', 'freshnessMs', 'status'].sort()
    );
  });

  it('classifies timeout without including probe details', async () => {
    vi.useFakeTimers();
    const pending = runVisitorJourney(
      probes({ homepage: () => new Promise(() => undefined) }),
      { timeoutMs: 10 }
    );
    await vi.advanceTimersByTimeAsync(10);
    expect(await pending).toMatchObject({
      status: 'failure',
      failureStage: 'timeout',
    });
    vi.useRealTimers();
  });

  it('classifies producer interruption while a probe is pending', async () => {
    const controller = new AbortController();
    const pending = runVisitorJourney(
      probes({ homepage: () => new Promise(() => undefined) }),
      { signal: controller.signal }
    );
    controller.abort();
    expect(await pending).toMatchObject({
      status: 'failure',
      failureStage: 'producer-interrupted',
    });
  });
});
