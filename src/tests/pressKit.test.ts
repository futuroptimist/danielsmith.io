import { describe, expect, it } from 'vitest';

import type { PerformanceBudgetUsage } from '../assets/performance';
import { buildPressKitSummary, formatHeadroomLabel } from '../tools/pressKit';

const formatUsage = (usage: PerformanceBudgetUsage) =>
  formatHeadroomLabel(usage, new Intl.NumberFormat('en-US'));

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
      percentUsed: 0.72,
      remainingPercent: 0.28,
    });

    expect(label).toBe('Within budget · 72% used · 28% remaining.');
  });

  it('flags over-budget usage with formatted overage', () => {
    const label = formatUsage({
      ...baseUsage,
      used: 180,
      limit: 120,
      overBudgetBy: 60,
      percentUsed: 1.5,
      remainingPercent: 0,
      status: 'over-budget',
    });

    expect(label).toBe('Over budget by 60 (150% used).');
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
