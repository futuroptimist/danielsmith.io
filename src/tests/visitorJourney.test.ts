import { describe, expect, it, vi } from 'vitest';

import {
  isPdfResponse,
  runVisitorJourney,
  type VisitorJourneyChecks,
} from '../observability/visitorJourney';

function passingChecks(): VisitorJourneyChecks {
  return {
    homepage_delivery: async () => undefined,
    javascript_initialization: async () => undefined,
    essential_assets: async () => undefined,
    accessible_fallback: async () => undefined,
    resume_pdf: async () => undefined,
  };
}

function brokenAt(stage: keyof VisitorJourneyChecks): VisitorJourneyChecks {
  return {
    ...passingChecks(),
    [stage]: async () => {
      throw new Error('fixture detail must not escape the aggregate');
    },
  };
}

describe('visitor journey aggregate', () => {
  it.each([
    ['javascript_initialization', 'javascript_initialization'],
    ['essential_assets', 'essential_assets'],
  ] as const)('classifies a broken %s fixture', async (stage, expected) => {
    const result = await runVisitorJourney(brokenAt(stage), {
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({ state: 'failure', failureStage: expected });
    expect(Object.keys(result).sort()).toEqual([
      'durationMs',
      'failureStage',
      'freshness',
      'state',
    ]);
    expect(JSON.stringify(result)).not.toContain('fixture detail');
  });

  it('accepts accessible fallback when the optional immersive renderer is unavailable', async () => {
    const checks = passingChecks();
    const optionalImmersiveAvailable = false;
    checks.accessible_fallback = async () => {
      expect(optionalImmersiveAvailable).toBe(false);
    };

    await expect(
      runVisitorJourney(checks, { timeoutMs: 1_000 })
    ).resolves.toMatchObject({ state: 'success', failureStage: null });
  });

  it('rejects healthy HTML fallback responses at the resume URL', () => {
    const html = new TextEncoder().encode(
      '<!doctype html><title>healthy</title>'
    );
    expect(isPdfResponse('text/html; charset=utf-8', html)).toBe(false);
    expect(isPdfResponse('application/pdf', html)).toBe(false);
  });

  it('requires both the PDF content type and magic bytes', () => {
    const pdf = new TextEncoder().encode('%PDF-1.7 fixture');
    expect(isPdfResponse('application/pdf; charset=binary', pdf)).toBe(true);
    expect(isPdfResponse('application/octet-stream', pdf)).toBe(false);
  });

  it('classifies a bounded timeout', async () => {
    vi.useFakeTimers();
    const checks = passingChecks();
    checks.homepage_delivery = (signal) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });

    const resultPromise = runVisitorJourney(checks, { timeoutMs: 25 });
    await vi.advanceTimersByTimeAsync(25);
    await expect(resultPromise).resolves.toMatchObject({
      state: 'failure',
      failureStage: 'timeout',
    });
    vi.useRealTimers();
  });

  it('classifies producer interruption', async () => {
    const controller = new AbortController();
    const checks = passingChecks();
    checks.homepage_delivery = (signal) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
        controller.abort();
      });

    await expect(
      runVisitorJourney(checks, { timeoutMs: 1_000, signal: controller.signal })
    ).resolves.toMatchObject({
      state: 'failure',
      failureStage: 'producer_interrupted',
    });
  });
});
