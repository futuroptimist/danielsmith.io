import { describe, expect, it } from 'vitest';

import {
  IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE,
  IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET,
  IMMERSIVE_PERFORMANCE_BUDGET,
  IMMERSIVE_SCENE_BASELINE,
  createImmersiveLaunchBudgetReport,
  isWithinBudget,
} from '../assets/performance';

describe('performance budgets', () => {
  it('baseline metrics stay within the immersive budget', () => {
    expect(
      isWithinBudget(IMMERSIVE_SCENE_BASELINE, IMMERSIVE_PERFORMANCE_BUDGET)
    ).toBe(true);
  });

  it('static budgets leave measurable headroom for new content', () => {
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

  it('runtime launch budgets leave conservative renderer headroom', () => {
    const report = createImmersiveLaunchBudgetReport(
      IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE,
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET
    );

    expect(report.isWithinBudget).toBe(true);
    expect(report.drawCalls.remaining).toBeGreaterThanOrEqual(24);
    expect(report.triangles.remaining).toBeGreaterThanOrEqual(10_000);
    expect(report.geometries.remaining).toBeGreaterThanOrEqual(20);
    expect(report.textures.remaining).toBeGreaterThanOrEqual(8);
    expect(report.p95FrameMs.remaining).toBeGreaterThanOrEqual(20);
  });
});
