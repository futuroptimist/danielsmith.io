import { describe, expect, it } from 'vitest';

import {
  describePerformanceBudgetUsage,
  type PerformanceBudgetUsage,
} from '../assets/performance';
import {
  buildPressKitSummary,
  describeHeadroomStatus,
  formatRemainingPercentLabel,
} from '../tools/pressKit';

const formatUsage = (usage: PerformanceBudgetUsage, unitLabel?: string) =>
  describePerformanceBudgetUsage(usage, {
    formatter: new Intl.NumberFormat('en-US'),
    unitLabel,
  });

describe('press kit summary', () => {
  it('annotates performance headroom with human-readable labels', () => {
    const summary = buildPressKitSummary({
      now: () => new Date('2024-06-01T12:00:00Z'),
    });

    expect(summary.performance.headroom.materials.label).toMatch(
      /Within budget/i
    );
    expect(summary.performance.headroom.drawCalls.label).toMatch(/used/i);
    expect(summary.performance.headroom.textureBytes.label).toContain('%');
    expect(summary.performance.headroom.materials.statusLabel).toBe(
      'Within budget'
    );
    expect(
      summary.performance.headroom.textureBytes.remainingPercentLabel
    ).toMatch(/% remaining$/);
  });
});

describe('formatHeadroomLabel', () => {
  const baseUsage: PerformanceBudgetUsage = {
    used: 0,
    limit: 0,
    remaining: 0,
    overBudgetBy: 0,
    percentUsed: 0,
    remainingPercent: 0,
    status: 'within-budget',
    hasInvalidMeasurements: false,
  };

  it('summarizes within-budget usage with remaining percentages', () => {
    const label = formatUsage({
      ...baseUsage,
      used: 72,
      limit: 100,
      remaining: 28,
      percentUsed: 0.72,
      remainingPercent: 0.28,
    });

    expect(label).toBe(
      'Within budget · 72% used · 28% remaining (28 headroom).'
    );
  });

  it('flags over-budget usage with formatted overage', () => {
    const label = formatUsage(
      {
        ...baseUsage,
        used: 180,
        limit: 120,
        overBudgetBy: 60,
        percentUsed: 1.5,
        remainingPercent: 0,
        status: 'over-budget',
      },
      'draw calls'
    );

    expect(label).toBe('Over budget by 60 draw calls (100% used).');
  });

  it('returns an invalid measurement warning when data is unreliable', () => {
    const label = formatUsage({
      ...baseUsage,
      used: -1,
      limit: -1,
      percentUsed: 1,
      remainingPercent: 0,
      status: 'invalid',
      hasInvalidMeasurements: true,
    });

    expect(label).toBe(
      'Invalid measurements – refresh the performance snapshot.'
    );
  });
});

describe('describeHeadroomStatus', () => {
  const usage: PerformanceBudgetUsage = {
    used: 0,
    limit: 0,
    remaining: 0,
    overBudgetBy: 0,
    percentUsed: 0,
    remainingPercent: 0,
    status: 'within-budget',
    hasInvalidMeasurements: false,
  };

  it('returns within-budget labels by default', () => {
    expect(describeHeadroomStatus(usage)).toBe('Within budget');
  });

  it('flags over-budget usage', () => {
    expect(
      describeHeadroomStatus({
        ...usage,
        status: 'over-budget',
        overBudgetBy: 1,
      })
    ).toBe('Over budget');
  });

  it('reports invalid measurements when telemetry is missing', () => {
    expect(
      describeHeadroomStatus({
        ...usage,
        status: 'invalid',
      })
    ).toBe('Invalid measurements');
  });

  it('treats invalid measurement flags as invalid regardless of status', () => {
    expect(
      describeHeadroomStatus({
        ...usage,
        hasInvalidMeasurements: true,
        status: 'within-budget',
      })
    ).toBe('Invalid measurements');
  });

  it('treats inconsistent over-budget states as within budget defensively', () => {
    expect(
      describeHeadroomStatus({
        ...usage,
        status: 'over-budget',
        overBudgetBy: 0,
      })
    ).toBe('Within budget');
  });
});

describe('formatRemainingPercentLabel', () => {
  it('clamps and rounds remaining percentages', () => {
    expect(formatRemainingPercentLabel(0.284)).toBe('28% remaining');
    expect(formatRemainingPercentLabel(1.8)).toBe('100% remaining');
    expect(formatRemainingPercentLabel(-0.5)).toBe('0% remaining');
  });
});
