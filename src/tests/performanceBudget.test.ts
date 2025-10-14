import { describe, expect, it } from 'vitest';

import {
  IMMERSIVE_PERFORMANCE_BUDGET,
  IMMERSIVE_SCENE_BASELINE,
  isWithinBudget,
} from '../assets/performance';

describe('performance budgets', () => {
  it('baseline metrics stay within the immersive budget', () => {
    expect(isWithinBudget(IMMERSIVE_SCENE_BASELINE, IMMERSIVE_PERFORMANCE_BUDGET)).toBe(
      true
    );
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
});
