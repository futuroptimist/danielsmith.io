import { describe, expect, it } from 'vitest';

import {
  IMMERSIVE_PERFORMANCE_BUDGET,
  IMMERSIVE_SCENE_BASELINE,
  createPerformanceBudgetReport,
  type PerformanceBudget,
  type ScenePerformanceSnapshot,
} from '../assets/performance';

describe('createPerformanceBudgetReport', () => {
  it('calculates headroom for the immersive baseline snapshot', () => {
    const report = createPerformanceBudgetReport(
      IMMERSIVE_SCENE_BASELINE,
      IMMERSIVE_PERFORMANCE_BUDGET
    );

    expect(report.isWithinBudget).toBe(true);
    expect(report.materials).toMatchObject({
      used: IMMERSIVE_SCENE_BASELINE.materialCount,
      limit: IMMERSIVE_PERFORMANCE_BUDGET.maxMaterials,
      remaining:
        IMMERSIVE_PERFORMANCE_BUDGET.maxMaterials -
        IMMERSIVE_SCENE_BASELINE.materialCount,
      overBudgetBy: 0,
      hasInvalidMeasurements: false,
    });
    expect(report.materials.percentUsed).toBeCloseTo(
      IMMERSIVE_SCENE_BASELINE.materialCount /
        IMMERSIVE_PERFORMANCE_BUDGET.maxMaterials
    );

    expect(report.drawCalls).toMatchObject({
      used: IMMERSIVE_SCENE_BASELINE.drawCallCount,
      limit: IMMERSIVE_PERFORMANCE_BUDGET.maxDrawCalls,
      remaining:
        IMMERSIVE_PERFORMANCE_BUDGET.maxDrawCalls -
        IMMERSIVE_SCENE_BASELINE.drawCallCount,
      overBudgetBy: 0,
      hasInvalidMeasurements: false,
    });
    expect(report.drawCalls.percentUsed).toBeCloseTo(
      IMMERSIVE_SCENE_BASELINE.drawCallCount /
        IMMERSIVE_PERFORMANCE_BUDGET.maxDrawCalls
    );

    expect(report.textureBytes).toMatchObject({
      used: IMMERSIVE_SCENE_BASELINE.textureBytes,
      limit: IMMERSIVE_PERFORMANCE_BUDGET.maxTextureBytes,
      remaining:
        IMMERSIVE_PERFORMANCE_BUDGET.maxTextureBytes -
        IMMERSIVE_SCENE_BASELINE.textureBytes,
      overBudgetBy: 0,
      hasInvalidMeasurements: false,
    });
    expect(report.textureBytes.percentUsed).toBeCloseTo(
      IMMERSIVE_SCENE_BASELINE.textureBytes /
        IMMERSIVE_PERFORMANCE_BUDGET.maxTextureBytes
    );
  });

  it('reports when snapshot metrics exceed the budget', () => {
    const snapshot: ScenePerformanceSnapshot = {
      materialCount: 40,
      drawCallCount: 210,
      textureBytes: 30 * 1024 * 1024,
    };
    const budget: PerformanceBudget = {
      maxMaterials: 36,
      maxDrawCalls: 150,
      maxTextureBytes: 24 * 1024 * 1024,
    };

    const report = createPerformanceBudgetReport(snapshot, budget);

    expect(report.isWithinBudget).toBe(false);
    expect(report.materials).toMatchObject({
      used: 40,
      limit: 36,
      remaining: 0,
      overBudgetBy: 4,
      hasInvalidMeasurements: false,
    });
    expect(report.materials.percentUsed).toBeCloseTo(40 / 36);
    expect(report.drawCalls).toMatchObject({
      used: 210,
      limit: 150,
      remaining: 0,
      overBudgetBy: 60,
      hasInvalidMeasurements: false,
    });
    expect(report.drawCalls.percentUsed).toBeCloseTo(210 / 150);
    expect(report.textureBytes).toMatchObject({
      used: 30 * 1024 * 1024,
      limit: 24 * 1024 * 1024,
      remaining: 0,
      overBudgetBy: 6 * 1024 * 1024,
      hasInvalidMeasurements: false,
    });
    expect(report.textureBytes.percentUsed).toBeCloseTo(30 / 24);
  });

  it('sanitizes invalid values and handles zero budgets gracefully', () => {
    const snapshot: ScenePerformanceSnapshot = {
      materialCount: -4,
      drawCallCount: 5,
      textureBytes: Number.POSITIVE_INFINITY,
    };
    const budget: PerformanceBudget = {
      maxMaterials: -10,
      maxDrawCalls: 0,
      maxTextureBytes: Number.NaN,
    };

    const report = createPerformanceBudgetReport(snapshot, budget);

    expect(report.materials).toEqual({
      used: 0,
      limit: 0,
      remaining: 0,
      overBudgetBy: 1,
      percentUsed: 1,
      hasInvalidMeasurements: true,
    });
    expect(report.drawCalls).toEqual({
      used: 5,
      limit: 0,
      remaining: 0,
      overBudgetBy: 5,
      percentUsed: 1,
      hasInvalidMeasurements: false,
    });
    expect(report.textureBytes).toEqual({
      used: 0,
      limit: 0,
      remaining: 0,
      overBudgetBy: 1,
      percentUsed: 1,
      hasInvalidMeasurements: true,
    });
    expect(report.isWithinBudget).toBe(false);
  });
});
