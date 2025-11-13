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

export interface PerformanceBudgetUsage {
  /** Number of resources currently used by the scene. */
  used: number;
  /** Allowed resources for this budget metric. */
  limit: number;
  /** Headroom remaining before hitting the budget. */
  remaining: number;
  /** Amount over budget; zero when still within the limit. */
  overBudgetBy: number;
  /** Ratio of used resources versus the limit (values >1 mean over budget). */
  percentUsed: number;
}

export interface PerformanceBudgetReport {
  materials: PerformanceBudgetUsage;
  drawCalls: PerformanceBudgetUsage;
  textureBytes: PerformanceBudgetUsage;
  isWithinBudget: boolean;
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

const sanitizeUsage = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
};

const sanitizeLimit = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
};

const createUsage = (used: number, limit: number): PerformanceBudgetUsage => {
  const normalizedUsed = sanitizeUsage(used);
  const normalizedLimit = sanitizeLimit(limit);
  const remaining = Math.max(0, normalizedLimit - normalizedUsed);
  const overBudgetBy = Math.max(0, normalizedUsed - normalizedLimit);
  const percentUsed =
    normalizedLimit === 0
      ? normalizedUsed > 0
        ? 1
        : 0
      : normalizedUsed / normalizedLimit;
  return {
    used: normalizedUsed,
    limit: normalizedLimit,
    remaining,
    overBudgetBy,
    percentUsed,
  };
};

export function createPerformanceBudgetReport(
  snapshot: ScenePerformanceSnapshot,
  budget: PerformanceBudget
): PerformanceBudgetReport {
  const materials = createUsage(snapshot.materialCount, budget.maxMaterials);
  const drawCalls = createUsage(snapshot.drawCallCount, budget.maxDrawCalls);
  const textureBytes = createUsage(
    snapshot.textureBytes,
    budget.maxTextureBytes
  );
  const isWithinBudget =
    materials.overBudgetBy === 0 &&
    drawCalls.overBudgetBy === 0 &&
    textureBytes.overBudgetBy === 0;
  return { materials, drawCalls, textureBytes, isWithinBudget };
}

export function isWithinBudget(
  snapshot: ScenePerformanceSnapshot,
  budget: PerformanceBudget
): boolean {
  return createPerformanceBudgetReport(snapshot, budget).isWithinBudget;
}
