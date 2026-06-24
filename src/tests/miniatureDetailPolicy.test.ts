import { describe, expect, it } from 'vitest';

import { GRAPHICS_QUALITY_PRESETS } from '../scene/graphics/qualityManager';
import {
  SCENE_DETAIL_LEVELS,
  SCENE_DETAIL_POLICIES,
  getMiniatureDetailLevel,
  getMiniatureSceneDetailPolicy,
  getOverworldDetailLevel,
  stepSceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';

describe('miniature detail policies', () => {
  it('keeps three public quality levels and five ordered internal levels', () => {
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
  it('maps overworld quality exactly two levels down for miniature detail', () => {
    expect(getOverworldDetailLevel('cinematic')).toBe('cinematic');
    expect(getMiniatureDetailLevel('cinematic')).toBe('performance');
    expect(getMiniatureDetailLevel('balanced')).toBe('low');
    expect(getMiniatureDetailLevel('performance')).toBe('micro');
    expect(getMiniatureSceneDetailPolicy('balanced').level).toBe('low');
    expect(stepSceneDetailLevel('micro', 2)).toBe('micro');
    expect(stepSceneDetailLevel('performance', -5)).toBe('cinematic');
  });
  it('decreases policy metadata monotonically and disables expensive low-detail effects', () => {
    let previous = Infinity;
    for (const level of SCENE_DETAIL_LEVELS) {
      const policy = SCENE_DETAIL_POLICIES[level];
      expect(policy.detailIndex).toBe(SCENE_DETAIL_LEVELS.indexOf(level));
      expect(policy.modelDetailScale).toBeLessThanOrEqual(previous);
      expect(policy.geometry.cylinderSegments).toBeGreaterThanOrEqual(3);
      expect(policy.geometry.sphereWidthSegments).toBeGreaterThanOrEqual(3);
      expect(policy.geometry.sphereHeightSegments).toBeGreaterThanOrEqual(2);
      previous = policy.modelDetailScale;
    }
    for (const level of ['performance', 'low', 'micro'] as const) {
      expect(SCENE_DETAIL_POLICIES[level].effects.dynamicPointLights).toBe(
        false
      );
      expect(SCENE_DETAIL_POLICIES[level].effects.decorativeShards).toBe(false);
      expect(SCENE_DETAIL_POLICIES[level].effects.telemetryPanels).toBe(false);
    }
  });
});
