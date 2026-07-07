import { describe, expect, it } from 'vitest';

import {
  IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE,
  IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET,
  IMMERSIVE_PERFORMANCE_BUDGET,
  IMMERSIVE_SCENE_BASELINE,
  isWithinBudget,
} from '../assets/performance';

describe('performance budgets', () => {
  it('baseline metrics stay within the immersive budget', () => {
    expect(
      isWithinBudget(IMMERSIVE_SCENE_BASELINE, IMMERSIVE_PERFORMANCE_BUDGET)
    ).toBe(true);
  });

  it('static press-kit budgets leave measurable headroom for new content', () => {
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

  it('runtime launch budgets leave conservative headroom around measured diagnostics', () => {
    expect(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxDrawCalls -
        IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE.drawCalls
    ).toBeGreaterThanOrEqual(60);
    expect(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxTriangles -
        IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE.triangles
    ).toBeGreaterThanOrEqual(80_000);
    expect(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxGeometries -
        IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE.geometries
    ).toBeGreaterThanOrEqual(80);
    expect(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxTextures -
        IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE.textures
    ).toBeGreaterThanOrEqual(24);
    expect(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxP95FrameMs -
        IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE.p95FrameMs
    ).toBeGreaterThanOrEqual(15);
  });
});
