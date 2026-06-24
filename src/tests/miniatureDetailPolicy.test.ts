import { describe, expect, it } from 'vitest';

import { GRAPHICS_QUALITY_PRESETS } from '../scene/graphics/qualityManager';
import {
  ORDERED_SCENE_DETAIL_LEVELS,
  SCENE_DETAIL_POLICIES,
  getMiniatureDetailLevel,
  getMiniatureSceneDetailPolicy,
  getOverworldDetailLevel,
  stepSceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';

describe('miniature detail policy', () => {
  it('keeps three public graphics quality options while exposing five internal levels', () => {
    expect(GRAPHICS_QUALITY_PRESETS.map((option) => option.id)).toEqual([
      'cinematic',
      'balanced',
      'performance',
    ]);
    expect(ORDERED_SCENE_DETAIL_LEVELS).toEqual([
      'cinematic',
      'balanced',
      'performance',
      'low',
      'micro',
    ]);
  });

  it('maps public quality to overworld and two-level-lower miniature detail', () => {
    expect(getOverworldDetailLevel('cinematic')).toBe('cinematic');
    expect(getMiniatureDetailLevel('cinematic')).toBe('performance');
    expect(getMiniatureDetailLevel('balanced')).toBe('low');
    expect(getMiniatureDetailLevel('performance')).toBe('micro');
    expect(getMiniatureSceneDetailPolicy('balanced').level).toBe('low');
  });

  it('steps detail levels down only with floored clamping', () => {
    expect(stepSceneDetailLevel('cinematic', 2)).toBe('performance');
    expect(stepSceneDetailLevel('cinematic', 2.9)).toBe('performance');
    expect(stepSceneDetailLevel('performance', 99)).toBe('micro');
    expect(stepSceneDetailLevel('low', -99)).toBe('low');
    expect(stepSceneDetailLevel('balanced', -0.5)).toBe('balanced');
    expect(stepSceneDetailLevel('balanced', 0)).toBe('balanced');
    expect(stepSceneDetailLevel('balanced', 1.5)).toBe('performance');
  });

  it('decreases policy metadata monotonically and keeps constructible primitive segments', () => {
    let previousScale = Number.POSITIVE_INFINITY;
    let previousTexture = Number.POSITIVE_INFINITY;
    let previousTriangles = Number.POSITIVE_INFINITY;
    ORDERED_SCENE_DETAIL_LEVELS.forEach((level, index) => {
      const policy = SCENE_DETAIL_POLICIES[level];
      expect(policy.detailIndex).toBe(index);
      expect(policy.modelDetailScale).toBeLessThanOrEqual(previousScale);
      expect(policy.textures.maxResolution).toBeLessThanOrEqual(
        previousTexture
      );
      expect(policy.budgets.triangleHint).toBeLessThanOrEqual(
        previousTriangles
      );
      expect(policy.geometry.cylinderSegments).toBeGreaterThanOrEqual(3);
      expect(policy.geometry.sphereWidthSegments).toBeGreaterThanOrEqual(3);
      expect(policy.geometry.sphereHeightSegments).toBeGreaterThanOrEqual(2);
      expect(policy.geometry.ringSegments).toBeGreaterThanOrEqual(3);
      previousScale = policy.modelDetailScale;
      previousTexture = policy.textures.maxResolution;
      previousTriangles = policy.budgets.triangleHint;
    });
    expect(SCENE_DETAIL_POLICIES.low.effects.dynamicPointLights).toBe(false);
    expect(SCENE_DETAIL_POLICIES.micro.effects.telemetryPanels).toBe(false);
  });
});
