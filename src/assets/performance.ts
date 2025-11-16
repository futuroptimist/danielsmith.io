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
  /** Indicates the snapshot or budget value was invalid when recorded. */
  hasInvalidMeasurements: boolean;
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

interface NormalizedValue {
  value: number;
  isInvalid: boolean;
}

const normalizeValue = (value: number): NormalizedValue => {
  if (!Number.isFinite(value) || value < 0) {
    return { value: 0, isInvalid: true };
  }
  return { value, isInvalid: false };
};

const createUsage = (used: number, limit: number): PerformanceBudgetUsage => {
  const normalizedUsed = normalizeValue(used);
  const normalizedLimit = normalizeValue(limit);
  const remaining = Math.max(0, normalizedLimit.value - normalizedUsed.value);
  const overBudgetBy = Math.max(
    0,
    normalizedUsed.value - normalizedLimit.value
  );
  const percentUsed =
    normalizedLimit.value === 0
      ? normalizedUsed.value > 0
        ? 1
        : 0
      : normalizedUsed.value / normalizedLimit.value;
  const hasInvalidMeasurements =
    normalizedUsed.isInvalid || normalizedLimit.isInvalid;

  if (hasInvalidMeasurements) {
    const fallbackOverBudget =
      normalizedLimit.value > 0 ? normalizedLimit.value : 1;
    return {
      used: normalizedUsed.value,
      limit: normalizedLimit.value,
      remaining: 0,
      overBudgetBy: overBudgetBy > 0 ? overBudgetBy : fallbackOverBudget,
      percentUsed: 1,
      hasInvalidMeasurements,
    };
  }
  return {
    used: normalizedUsed.value,
    limit: normalizedLimit.value,
    remaining,
    overBudgetBy,
    percentUsed,
    hasInvalidMeasurements,
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
