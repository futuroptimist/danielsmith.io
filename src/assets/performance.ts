export interface PerformanceBudget {
  /** Maximum unique materials used in a single render frame. */
  maxMaterials: number;
  /** Maximum draw calls during the launch camera sweep. */
  maxDrawCalls: number;
  /** Maximum GPU texture memory in bytes. */
  maxTextureBytes: number;
}

export interface ScenePerformanceSnapshot {
  /** Counted unique materials from the renderer info inspector. */
  materialCount: number;
  /** Draw calls sampled from renderer.info.render.calls during the launch loop. */
  drawCallCount: number;
  /** Approximate GPU texture memory derived from renderer.info.memory.textures. */
  textureBytes: number;
  /** Optional note capturing how the snapshot was recorded. */
  notes?: string;
  /** ISO timestamp when the snapshot was gathered. */
  capturedAtIso?: string;
}

export const IMMERSIVE_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxMaterials: 36,
  maxDrawCalls: 150,
  maxTextureBytes: 24 * 1024 * 1024,
};

export const IMMERSIVE_SCENE_BASELINE: ScenePerformanceSnapshot = {
  materialCount: 28,
  drawCallCount: 132,
  textureBytes: 18_874_368,
  capturedAtIso: '2024-05-17T00:00:00.000Z',
  notes:
    'Captured with Chrome 124 WebGL inspector at launch pose after camera settle.',
};

export const VISUAL_SMOKE_DIFF_BUDGET = {
  /** Acceptable ratio of changed pixels when comparing launch screenshots. */
  maxDiffPixelRatio: 0.015,
  /** Hard cap on the number of differing pixels in screenshot assertions. */
  maxDiffPixels: 1_200,
};

export function isWithinBudget(
  snapshot: ScenePerformanceSnapshot,
  budget: PerformanceBudget
): boolean {
  return (
    snapshot.materialCount <= budget.maxMaterials &&
    snapshot.drawCallCount <= budget.maxDrawCalls &&
    snapshot.textureBytes <= budget.maxTextureBytes
  );
}
