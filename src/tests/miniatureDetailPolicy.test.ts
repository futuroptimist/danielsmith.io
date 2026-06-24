import { describe, expect, it } from 'vitest';
import { GRAPHICS_QUALITY_PRESETS } from '../scene/graphics/qualityManager';
import {
  SCENE_DETAIL_LEVELS,
  getMiniatureDetailLevel,
  getMiniatureSceneDetailPolicy,
  getSceneDetailPolicy,
  mapGraphicsQualityToOverworldDetailLevel,
  stepSceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';

describe('miniature detail policy', () => {
  it('keeps five internal levels and three public qualities', () => {
    expect(SCENE_DETAIL_LEVELS).toEqual([
      'cinematic',
      'balanced',
      'performance',
      'low',
      'micro',
    ]);
    expect(GRAPHICS_QUALITY_PRESETS.map((p) => p.id)).toEqual([
      'cinematic',
      'balanced',
      'performance',
    ]);
  });
  it('maps public overworld levels two steps down for miniatures', () => {
    expect(mapGraphicsQualityToOverworldDetailLevel('cinematic')).toBe(
      'cinematic'
    );
    expect(getMiniatureDetailLevel('cinematic')).toBe('performance');
    expect(getMiniatureDetailLevel('balanced')).toBe('low');
    expect(getMiniatureDetailLevel('performance')).toBe('micro');
    expect(stepSceneDetailLevel('performance', 99)).toBe('micro');
    expect(getMiniatureSceneDetailPolicy('balanced').level).toBe('low');
  });
  it('decreases policy budgets monotonically and keeps primitives constructible', () => {
    const policies = SCENE_DETAIL_LEVELS.map(getSceneDetailPolicy);
    for (let index = 1; index < policies.length; index += 1) {
      expect(policies[index].detailIndex).toBe(index);
      expect(policies[index].modelDetailScale).toBeLessThan(
        policies[index - 1].modelDetailScale
      );
      expect(policies[index].textures.maxTextureSize).toBeLessThanOrEqual(
        policies[index - 1].textures.maxTextureSize
      );
      expect(policies[index].budgets.triangleHint).toBeLessThan(
        policies[index - 1].budgets.triangleHint
      );
    }
    for (const policy of policies) {
      expect(policy.geometry.cylinderSegments).toBeGreaterThanOrEqual(3);
      expect(policy.geometry.sphereWidthSegments).toBeGreaterThanOrEqual(4);
      expect(policy.geometry.sphereHeightSegments).toBeGreaterThanOrEqual(3);
      if (policy.level === 'low' || policy.level === 'micro') {
        expect(policy.effects.dynamicPointLights).toBe(false);
        expect(policy.effects.decorativeShards).toBe(false);
        expect(policy.effects.telemetryPanels).toBe(false);
      }
    }
  });
});
