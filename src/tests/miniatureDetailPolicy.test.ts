import { describe, expect, it } from 'vitest';

import { GRAPHICS_QUALITY_PRESETS } from '../scene/graphics/qualityManager';
import {
  SCENE_DETAIL_LEVELS,
  getMiniatureDetailLevel,
  getMiniatureSceneDetailPolicy,
  getSceneDetailPolicy,
  mapGraphicsQualityToOverworldDetailLevel,
  stepSceneDetailLevelDown,
} from '../scene/graphics/sceneDetailPolicy';

describe('miniature detail policy', () => {
  it('keeps three public graphics quality levels while defining five ordered detail levels', () => {
    expect(GRAPHICS_QUALITY_PRESETS.map((preset) => preset.id)).toEqual([
      'cinematic',
      'balanced',
      'performance',
    ]);
    expect(SCENE_DETAIL_LEVELS).toEqual([
      'cinematic',
      'balanced',
      'performance',
      'low',
      'micro',
    ]);
  });

  it('maps overworld graphics levels to miniature levels exactly two levels lower', () => {
    expect(mapGraphicsQualityToOverworldDetailLevel('cinematic')).toBe(
      'cinematic'
    );
    expect(getMiniatureDetailLevel('cinematic')).toBe('performance');
    expect(getMiniatureDetailLevel('balanced')).toBe('low');
    expect(getMiniatureDetailLevel('performance')).toBe('micro');
    expect(stepSceneDetailLevelDown('low', 99)).toBe('micro');
    expect(getMiniatureSceneDetailPolicy('balanced').level).toBe('low');
  });

  it('decreases policy scale, geometry, textures, effects, and budgets monotonically', () => {
    let previous = getSceneDetailPolicy('cinematic');
    for (const level of SCENE_DETAIL_LEVELS.slice(1)) {
      const policy = getSceneDetailPolicy(level);
      expect(policy.detailIndex).toBeGreaterThan(previous.detailIndex);
      expect(policy.modelDetailScale).toBeLessThanOrEqual(
        previous.modelDetailScale
      );
      expect(policy.geometry.cylinderSegments).toBeGreaterThanOrEqual(3);
      expect(policy.geometry.cylinderSegments).toBeLessThanOrEqual(
        previous.geometry.cylinderSegments
      );
      expect(policy.textures.maxResolution).toBeLessThanOrEqual(
        previous.textures.maxResolution
      );
      expect(policy.budgets.triangleBudgetHint).toBeLessThan(
        previous.budgets.triangleBudgetHint
      );
      expect(Number(policy.effects.dynamicPointLights)).toBeLessThanOrEqual(
        Number(previous.effects.dynamicPointLights)
      );
      previous = policy;
    }
    expect(getSceneDetailPolicy('low').effects.dynamicPointLights).toBe(false);
    expect(getSceneDetailPolicy('micro').effects.telemetryPanels).toBe(false);
  });
});
