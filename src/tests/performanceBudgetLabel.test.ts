import { describe, expect, it } from 'vitest';

import {
  describePerformanceBudgetUsage,
  type PerformanceBudgetUsage,
} from '../assets/performance';

const buildUsage = (
  overrides: Partial<PerformanceBudgetUsage>
): PerformanceBudgetUsage => ({
  used: 0,
  limit: 0,
  remaining: 0,
  overBudgetBy: 0,
  percentUsed: 0,
  remainingPercent: 0,
  status: 'within-budget',
  hasInvalidMeasurements: false,
  ...overrides,
});

describe('describePerformanceBudgetUsage', () => {
  it('summarizes within-budget usage with units and headroom', () => {
    const label = describePerformanceBudgetUsage(
      buildUsage({
        used: 18,
        limit: 36,
        remaining: 18,
        remainingPercent: 0.5,
        percentUsed: 0.5,
      }),
      { unitLabel: 'materials', formatter: new Intl.NumberFormat('en-US') }
    );

    expect(label).toBe(
      'Within budget · 50% used · 50% remaining (18 materials headroom).'
    );
  });

  it('highlights when usage exceeds the budget', () => {
    const label = describePerformanceBudgetUsage(
      buildUsage({
        used: 180,
        limit: 150,
        overBudgetBy: 30,
        percentUsed: 1.2,
        status: 'over-budget',
      }),
      { unitLabel: 'draw calls', formatter: new Intl.NumberFormat('en-US') }
    );

    expect(label).toBe('Over budget by 30 draw calls (100% used).');
  });

  it('guards against invalid measurements', () => {
    const label = describePerformanceBudgetUsage(
      buildUsage({
        hasInvalidMeasurements: true,
        status: 'invalid',
        overBudgetBy: 12,
      })
    );

    expect(label).toBe(
      'Invalid measurements – refresh the performance snapshot.'
    );
  });
});
