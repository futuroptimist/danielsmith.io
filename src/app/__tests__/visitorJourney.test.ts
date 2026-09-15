import { describe, expect, it, vi } from 'vitest';

import { isPdfResponse, runVisitorJourney } from '../visitorJourney';

type Probes = Parameters<typeof runVisitorJourney>[0];

function passingProbes(): Probes {
  const pass = async () => undefined;
  return {
    homepage_delivery: pass,
    javascript_initialization: pass,
    essential_assets: pass,
    accessible_fallback: pass,
    resume_pdf: pass,
  };
}

function failingProbe(probes: Probes, stage: keyof Probes): Probes {
  return {
    ...probes,
    [stage]: async () => {
      throw new Error('fixture details must not escape');
    },
  };
}

describe('visitor journey contract', () => {
  it.each(['javascript_initialization', 'essential_assets'] as const)(
    'classifies a broken %s probe without exposing details',
    async (stage) => {
      const result = await runVisitorJourney(
        failingProbe(passingProbes(), stage),
        {
          timeoutMs: 1_000,
          now: () => 2_000,
        }
      );

      expect(result).toEqual({
        state: 'failure',
        freshness: 2,
        aggregateDurationMs: 0,
        failureStage: stage,
      });
      expect(Object.keys(result)).toEqual([
        'state',
        'freshness',
        'aggregateDurationMs',
        'failureStage',
      ]);
    }
  );

  it('rejects an HTML fallback returned from a healthy resume endpoint', () => {
    const html = new TextEncoder().encode(
      '<!doctype html><title>healthy</title>'
    );

    expect(isPdfResponse('application/pdf', html)).toBe(false);
    expect(isPdfResponse('text/html; charset=utf-8', html)).toBe(false);
    expect(
      isPdfResponse('application/pdf', new TextEncoder().encode('%PDF-1.7'))
    ).toBe(true);
  });

  it('classifies an invalid résumé response even when its endpoint is healthy', async () => {
    const html = new TextEncoder().encode('<!doctype html>');
    const probes = passingProbes();
    probes.resume_pdf = async () => {
      if (!isPdfResponse('text/html', html)) throw new Error('not a PDF');
    };

    const result = await runVisitorJourney(probes, {
      timeoutMs: 1_000,
      now: () => 3_000,
    });

    expect(result.failureStage).toBe('resume_pdf');
  });

  it('treats accessible fallback as success without an immersive-renderer probe', async () => {
    const result = await runVisitorJourney(passingProbes(), {
      timeoutMs: 1_000,
      now: () => 4_000,
    });

    expect(result).toEqual({
      state: 'success',
      freshness: 4,
      aggregateDurationMs: 0,
      failureStage: null,
    });
  });

  it('classifies a bounded timeout', async () => {
    vi.useFakeTimers();
    const probes = passingProbes();
    probes.homepage_delivery = () => new Promise(() => undefined);
    const resultPromise = runVisitorJourney(probes, {
      timeoutMs: 25,
      now: () => 5_000,
    });

    await vi.advanceTimersByTimeAsync(25);

    await expect(resultPromise).resolves.toMatchObject({
      state: 'failure',
      failureStage: 'timeout',
    });
    vi.useRealTimers();
  });

  it('classifies producer interruption', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await runVisitorJourney(passingProbes(), {
      timeoutMs: 1_000,
      signal: controller.signal,
      now: () => 6_000,
    });

    expect(result.failureStage).toBe('producer_interrupted');
  });
});
