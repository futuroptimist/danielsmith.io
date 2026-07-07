import { describe, expect, it } from 'vitest';

import {
  IMMERSIVE_PERFORMANCE_BUDGET,
  IMMERSIVE_RUNTIME_PERFORMANCE_BUDGET,
  IMMERSIVE_SCENE_BASELINE,
  describeRuntimePerformanceBudgetResult,
  evaluateRuntimePerformanceBudget,
  isWithinBudget,
} from '../assets/performance';

describe('performance budgets', () => {
  it('baseline metrics stay within the immersive budget', () => {
    expect(
      isWithinBudget(IMMERSIVE_SCENE_BASELINE, IMMERSIVE_PERFORMANCE_BUDGET)
    ).toBe(true);
  });

  it('budgets leave measurable headroom for new content', () => {
    const remainingMaterials =
      IMMERSIVE_PERFORMANCE_BUDGET.maxMaterials -
      IMMERSIVE_SCENE_BASELINE.materialCount;
    const remainingDrawCalls =
      IMMERSIVE_PERFORMANCE_BUDGET.maxDrawCalls -
      IMMERSIVE_SCENE_BASELINE.drawCallCount;
    const remainingTextureBytes =
      IMMERSIVE_PERFORMANCE_BUDGET.maxTextureBytes -
      IMMERSIVE_SCENE_BASELINE.textureBytes;

    expect(remainingMaterials).toBeGreaterThanOrEqual(4);
    expect(remainingDrawCalls).toBeGreaterThanOrEqual(12);
    expect(remainingTextureBytes).toBeGreaterThanOrEqual(4 * 1024 * 1024);
  });

  it('evaluates runtime launch budgets with software frame-time allowances', () => {
    const snapshot = {
      p95FrameMs: IMMERSIVE_RUNTIME_PERFORMANCE_BUDGET.maxP95FrameMs + 1,
      rendererCounters: {
        calls: IMMERSIVE_RUNTIME_PERFORMANCE_BUDGET.maxDrawCalls,
        triangles: IMMERSIVE_RUNTIME_PERFORMANCE_BUDGET.maxTriangles + 1,
        memoryGeometries: IMMERSIVE_RUNTIME_PERFORMANCE_BUDGET.maxGeometries,
        memoryTextures: IMMERSIVE_RUNTIME_PERFORMANCE_BUDGET.maxTextures,
      },
      renderer: { isSoftwareRenderer: true, riskLevel: 'software' },
      quality: { level: 'performance' },
    };

    const report = evaluateRuntimePerformanceBudget(snapshot);

    expect(
      report.find((result) => result.metric === 'maxP95FrameMs')
    ).toMatchObject({
      applies: false,
      isWithinBudget: true,
    });
    expect(
      report.find((result) => result.metric === 'maxTriangles')
    ).toMatchObject({
      applies: true,
      isWithinBudget: false,
      actual: IMMERSIVE_RUNTIME_PERFORMANCE_BUDGET.maxTriangles + 1,
      budget: IMMERSIVE_RUNTIME_PERFORMANCE_BUDGET.maxTriangles,
    });
    expect(
      describeRuntimePerformanceBudgetResult(report[1], snapshot)
    ).toContain('renderer risk software, quality performance');
  });
});
