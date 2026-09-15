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

  it('classifies a bounded timeout before an abort-aware probe rejection', async () => {
    vi.useFakeTimers();
    try {
      const probes = passingProbes();
      probes.homepage_delivery = (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          });
        });
      const resultPromise = runVisitorJourney(probes, {
        timeoutMs: 25,
        now: () => 5_000,
      });

      await vi.advanceTimersByTimeAsync(25);

      await expect(resultPromise).resolves.toMatchObject({
        state: 'failure',
        failureStage: 'timeout',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('times out a noncooperative probe without starting later stages', async () => {
    vi.useFakeTimers();
    try {
      const probes = passingProbes();
      const laterProbe = vi.fn(async () => undefined);
      probes.homepage_delivery = () => new Promise(() => undefined);
      probes.javascript_initialization = laterProbe;

      const resultPromise = runVisitorJourney(probes, {
        timeoutMs: 25,
        now: () => 5_000,
      });
      await vi.advanceTimersByTimeAsync(25);

      await expect(resultPromise).resolves.toMatchObject({
        state: 'failure',
        failureStage: 'timeout',
      });
      expect(laterProbe).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'normalizes a nonfinite clock value of %s',
    async (clockValue) => {
      const result = await runVisitorJourney(passingProbes(), {
        timeoutMs: 1_000,
        now: () => clockValue,
      });

      expect(result.freshness).toBe(0);
      expect(result.aggregateDurationMs).toBe(0);
      expect(Number.isFinite(result.freshness)).toBe(true);
      expect(Number.isFinite(result.aggregateDurationMs)).toBe(true);
    }
  );

  it('classifies producer interruption', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await runVisitorJourney(passingProbes(), {
      timeoutMs: 1_000,
      signal: controller.signal,
      now: () => 6_000,
    });

    expect(result.failureStage).toBe('producer_interrupted');
    expect(Number.isFinite(result.freshness)).toBe(true);
    expect(Number.isFinite(result.aggregateDurationMs)).toBe(true);
  });

  it('normalizes invalid clock values for a pre-aborted execution', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await runVisitorJourney(passingProbes(), {
      timeoutMs: 1_000,
      signal: controller.signal,
      now: () => Number.NaN,
    });

    expect(result).toEqual({
      state: 'failure',
      freshness: 0,
      aggregateDurationMs: 0,
      failureStage: 'producer_interrupted',
    });
  });

  it('reports finite nonnegative elapsed milliseconds', async () => {
    const clock = [1_000, 3_250, 3_250];
    const result = await runVisitorJourney(passingProbes(), {
      timeoutMs: 1_000,
      now: () => clock.shift() ?? 3_250,
    });

    expect(result.freshness).toBe(3);
    expect(result.aggregateDurationMs).toBe(2_250);
  });

  it('normalizes an overflowing elapsed duration', async () => {
    const clock = [-Number.MAX_VALUE, Number.MAX_VALUE];
    const result = await runVisitorJourney(passingProbes(), {
      timeoutMs: 1_000,
      now: () => clock.shift() ?? Number.MAX_VALUE,
    });

    expect(Number.isFinite(result.freshness)).toBe(true);
    expect(result.aggregateDurationMs).toBe(0);
  });

  it('classifies interruption before an abort-aware probe rejection', async () => {
    const controller = new AbortController();
    const probes = passingProbes();
    probes.homepage_delivery = (signal) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')), {
          once: true,
        });
      });

    const resultPromise = runVisitorJourney(probes, {
      timeoutMs: 1_000,
      signal: controller.signal,
      now: () => 7_000,
    });
    controller.abort();

    await expect(resultPromise).resolves.toMatchObject({
      state: 'failure',
      failureStage: 'producer_interrupted',
    });
  });

  it('exports no probe exception details or sensitive fields', async () => {
    const result = await runVisitorJourney(
      failingProbe(passingProbes(), 'homepage_delivery'),
      { timeoutMs: 1_000, now: () => 8_000 }
    );

    expect(JSON.stringify(result)).not.toContain('fixture details');
    expect(Object.keys(result)).toEqual([
      'state',
      'freshness',
      'aggregateDurationMs',
      'failureStage',
    ]);
  });
});
