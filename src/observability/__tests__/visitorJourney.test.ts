import { describe, expect, it, vi } from 'vitest';

import {
  isPdfResponse,
  runVisitorJourney,
  type VisitorJourneyProbes,
} from '../visitorJourney';

const passingProbes = (): VisitorJourneyProbes => ({
  homepage_delivery: vi.fn().mockResolvedValue(true),
  javascript_initialization: vi.fn().mockResolvedValue(true),
  essential_assets: vi.fn().mockResolvedValue(true),
  accessible_fallback: vi.fn().mockResolvedValue(true),
  resume_pdf: vi.fn().mockResolvedValue(true),
});

describe('visitor journey contract', () => {
  it.each([
    ['javascript_initialization', 'broken JavaScript initialization'],
    ['essential_assets', 'a missing essential asset'],
  ] as const)('classifies %s without exposing probe details', async (stage) => {
    const probes = passingProbes();
    probes[stage] = vi.fn().mockResolvedValue(false);

    await expect(
      runVisitorJourney(probes, { timeoutMs: 100 })
    ).resolves.toMatchObject({
      state: 'failure',
      freshness: 'fresh',
      failureStage: stage,
    });
  });

  it('rejects an HTML fallback returned from a healthy resume endpoint', () => {
    const html = new TextEncoder().encode('<!doctype html>');
    expect(isPdfResponse('text/html', html)).toBe(false);
    expect(isPdfResponse('application/pdf', html)).toBe(false);
    expect(
      isPdfResponse('application/pdf', new TextEncoder().encode('%PDF-1.7'))
    ).toBe(true);
  });

  it('keeps accessible fallback success separate from unavailable immersive rendering', async () => {
    const probes = {
      ...passingProbes(),
      immersive_rendering: vi.fn().mockResolvedValue(false),
    };
    await expect(
      runVisitorJourney(probes, { timeoutMs: 100 })
    ).resolves.toMatchObject({
      state: 'success',
      failureStage: null,
    });
  });

  it('returns only the sanitized aggregate shape and duration', async () => {
    const clock = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(137);
    const result = await runVisitorJourney(passingProbes(), {
      timeoutMs: 100,
      now: clock,
    });
    expect(result).toEqual({
      state: 'success',
      freshness: 'fresh',
      durationMs: 37,
      failureStage: null,
    });
  });

  it('classifies timeout and producer interruption', async () => {
    vi.useFakeTimers();
    const timedOut = runVisitorJourney(
      {
        ...passingProbes(),
        homepage_delivery: () => new Promise(() => undefined),
      },
      { timeoutMs: 10 }
    );
    await vi.advanceTimersByTimeAsync(10);
    await expect(timedOut).resolves.toMatchObject({ failureStage: 'timeout' });

    const controller = new AbortController();
    const interrupted = runVisitorJourney(
      {
        ...passingProbes(),
        homepage_delivery: () => new Promise(() => undefined),
      },
      { timeoutMs: 100, signal: controller.signal }
    );
    controller.abort();
    await expect(interrupted).resolves.toMatchObject({
      failureStage: 'producer_interrupted',
    });
    vi.useRealTimers();
  });
});
