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
  /** Percentage of budget remaining, clamped between 0 and 1. */
  remainingPercent: number;
  /** Indicates whether usage is within budget, over budget, or invalid. */
  status: PerformanceBudgetStatus;
  /** Indicates the snapshot or budget value was invalid when recorded. */
  hasInvalidMeasurements: boolean;
}

export type PerformanceBudgetStatus =
  | 'within-budget'
  | 'over-budget'
  | 'invalid';

export interface PerformanceBudgetReport {
  materials: PerformanceBudgetUsage;
  drawCalls: PerformanceBudgetUsage;
  textureBytes: PerformanceBudgetUsage;
  isWithinBudget: boolean;
}

export interface ImmersiveLaunchPerformanceBudget {
  /** Maximum draw calls reported by renderer.info.render.calls after warmup. */
  maxDrawCalls: number;
  /** Maximum triangles reported by renderer.info.render.triangles after warmup. */
  maxTriangles: number;
  /** Maximum geometries reported by renderer.info.memory.geometries after warmup. */
  maxGeometries: number;
  /** Maximum textures reported by renderer.info.memory.textures after warmup. */
  maxTextures: number;
  /** Maximum p95 frame time for non-software renderers after warmup. */
  maxP95FrameMs: number;
}

export interface ImmersiveLaunchPerformanceSnapshot {
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  p95FrameMs: number;
}

export interface ImmersiveLaunchBudgetUsage {
  metric: keyof ImmersiveLaunchPerformanceSnapshot;
  used: number;
  limit: number;
  remaining: number;
  overBudgetBy: number;
  status: PerformanceBudgetStatus;
  hasInvalidMeasurements: boolean;
}

export interface ImmersiveLaunchBudgetReport {
  drawCalls: ImmersiveLaunchBudgetUsage;
  triangles: ImmersiveLaunchBudgetUsage;
  geometries: ImmersiveLaunchBudgetUsage;
  textures: ImmersiveLaunchBudgetUsage;
  p95FrameMs: ImmersiveLaunchBudgetUsage;
  isWithinBudget: boolean;
}

export interface PerformanceBudgetLabelOptions {
  /**
   * Formatter for numeric values in the label. Defaults to `Intl.NumberFormat('en-US')`.
   */
  formatter?: Intl.NumberFormat;
  /** Optional unit label appended to formatted values (e.g., `MB`, `draw calls`). */
  unitLabel?: string;
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
    'Static press-kit budget baseline captured with Chrome 124 WebGL inspector ' +
    'at launch pose after camera settle. Runtime launch budgets are enforced ' +
    'separately by IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.',
};

export const IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE: ImmersiveLaunchPerformanceSnapshot =
  {
    drawCalls: 114,
    triangles: 32_000,
    geometries: 86,
    textures: 19,
    p95FrameMs: 40,
  };

export const IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET: ImmersiveLaunchPerformanceBudget =
  {
    maxDrawCalls: 150,
    maxTriangles: 50_000,
    maxGeometries: 125,
    maxTextures: 32,
    maxP95FrameMs: 80,
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

  const cappedPercentUsed = Math.min(1, Math.max(0, percentUsed));
  const status: PerformanceBudgetStatus = hasInvalidMeasurements
    ? 'invalid'
    : overBudgetBy > 0
      ? 'over-budget'
      : 'within-budget';

  if (hasInvalidMeasurements) {
    const fallbackOverBudget =
      normalizedLimit.value > 0 ? normalizedLimit.value : 1;
    return {
      used: normalizedUsed.value,
      limit: normalizedLimit.value,
      remaining: 0,
      overBudgetBy: overBudgetBy > 0 ? overBudgetBy : fallbackOverBudget,
      percentUsed: 1,
      remainingPercent: 0,
      status,
      hasInvalidMeasurements,
    };
  }
  return {
    used: normalizedUsed.value,
    limit: normalizedLimit.value,
    remaining,
    overBudgetBy,
    percentUsed,
    remainingPercent: Math.max(0, 1 - cappedPercentUsed),
    status,
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

export function describePerformanceBudgetUsage(
  usage: PerformanceBudgetUsage,
  options: PerformanceBudgetLabelOptions = {}
): string {
  const formatter =
    options.formatter ??
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const formatValue = (value: number) => formatter.format(Math.max(0, value));
  const suffix = options.unitLabel ? ` ${options.unitLabel}` : '';
  const usedPercent = Math.round(
    Math.min(1, Math.max(0, usage.percentUsed)) * 100
  );

  if (usage.hasInvalidMeasurements || usage.status === 'invalid') {
    return 'Invalid measurements – refresh the performance snapshot.';
  }

  if (usage.overBudgetBy > 0 || usage.status === 'over-budget') {
    const overBudget = formatValue(usage.overBudgetBy);
    return `Over budget by ${overBudget}${suffix} (${usedPercent}% used).`;
  }

  const remainingPercent = Math.round(
    Math.min(1, Math.max(0, usage.remainingPercent)) * 100
  );
  const remainingValue = formatValue(usage.remaining);

  return `Within budget · ${usedPercent}% used · ${remainingPercent}% remaining (${remainingValue}${suffix} headroom).`;
}

export function isWithinBudget(
  snapshot: ScenePerformanceSnapshot,
  budget: PerformanceBudget
): boolean {
  return createPerformanceBudgetReport(snapshot, budget).isWithinBudget;
}

const createLaunchUsage = (
  metric: keyof ImmersiveLaunchPerformanceSnapshot,
  used: number,
  limit: number
): ImmersiveLaunchBudgetUsage => {
  const usage = createUsage(used, limit);
  return {
    metric,
    used: usage.used,
    limit: usage.limit,
    remaining: usage.remaining,
    overBudgetBy: usage.overBudgetBy,
    status: usage.status,
    hasInvalidMeasurements: usage.hasInvalidMeasurements,
  };
};

export function createImmersiveLaunchBudgetReport(
  snapshot: ImmersiveLaunchPerformanceSnapshot,
  budget: ImmersiveLaunchPerformanceBudget = IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET
): ImmersiveLaunchBudgetReport {
  const drawCalls = createLaunchUsage(
    'drawCalls',
    snapshot.drawCalls,
    budget.maxDrawCalls
  );
  const triangles = createLaunchUsage(
    'triangles',
    snapshot.triangles,
    budget.maxTriangles
  );
  const geometries = createLaunchUsage(
    'geometries',
    snapshot.geometries,
    budget.maxGeometries
  );
  const textures = createLaunchUsage(
    'textures',
    snapshot.textures,
    budget.maxTextures
  );
  const p95FrameMs = createLaunchUsage(
    'p95FrameMs',
    snapshot.p95FrameMs,
    budget.maxP95FrameMs
  );
  const entries = [drawCalls, triangles, geometries, textures, p95FrameMs];
  return {
    drawCalls,
    triangles,
    geometries,
    textures,
    p95FrameMs,
    isWithinBudget: entries.every((entry) => entry.overBudgetBy === 0),
  };
}
