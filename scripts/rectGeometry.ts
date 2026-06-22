export type RectBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type SampleGridCoverage = {
  totalSamples: number;
  coveredSamples: number;
  uncoveredSamples: { x: number; z: number }[];
  coverageRatio: number;
};

export const roundMetric = (value: number): number => Number(value.toFixed(3));

export const normalizeRect = (bounds: RectBounds): RectBounds => ({
  minX: Math.min(bounds.minX, bounds.maxX),
  maxX: Math.max(bounds.minX, bounds.maxX),
  minZ: Math.min(bounds.minZ, bounds.maxZ),
  maxZ: Math.max(bounds.minZ, bounds.maxZ),
});

export const rectArea = (bounds: RectBounds): number => {
  const rect = normalizeRect(bounds);
  return (
    Math.max(0, rect.maxX - rect.minX) * Math.max(0, rect.maxZ - rect.minZ)
  );
};

export const rectIntersection = (
  left: RectBounds,
  right: RectBounds
): RectBounds | undefined => {
  const a = normalizeRect(left);
  const b = normalizeRect(right);
  const intersection = {
    minX: Math.max(a.minX, b.minX),
    maxX: Math.min(a.maxX, b.maxX),
    minZ: Math.max(a.minZ, b.minZ),
    maxZ: Math.min(a.maxZ, b.maxZ),
  };

  return intersection.maxX > intersection.minX &&
    intersection.maxZ > intersection.minZ
    ? intersection
    : undefined;
};

export const rectContains = (
  outer: RectBounds,
  inner: RectBounds,
  tolerance = 0
): boolean => {
  const a = normalizeRect(outer);
  const b = normalizeRect(inner);
  return (
    a.minX - tolerance <= b.minX &&
    a.maxX + tolerance >= b.maxX &&
    a.minZ - tolerance <= b.minZ &&
    a.maxZ + tolerance >= b.maxZ
  );
};

export const rectsEqual = (
  left: RectBounds,
  right: RectBounds,
  tolerance = 0
): boolean =>
  rectContains(left, right, tolerance) && rectContains(right, left, tolerance);

export const rectDistance = (left: RectBounds, right: RectBounds): number => {
  const a = normalizeRect(left);
  const b = normalizeRect(right);
  const gapX = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
  const gapZ = Math.max(0, Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ));
  return Math.hypot(gapX, gapZ);
};

export const rectsAdjacentWithin = (
  left: RectBounds,
  right: RectBounds,
  tolerance: number
): boolean => rectDistance(left, right) <= tolerance;

export const sampleGridUnionCoverage = (
  target: RectBounds,
  coveringRects: readonly RectBounds[],
  samplesPerAxis: number
): SampleGridCoverage => {
  const targetRect = normalizeRect(target);
  const sampleCount = Math.max(1, Math.floor(samplesPerAxis));
  const totalSamples = sampleCount * sampleCount;
  const uncoveredSamples: { x: number; z: number }[] = [];
  let coveredSamples = 0;

  for (let zIndex = 0; zIndex < sampleCount; zIndex += 1) {
    for (let xIndex = 0; xIndex < sampleCount; xIndex += 1) {
      const x =
        targetRect.minX +
        ((xIndex + 0.5) / sampleCount) * (targetRect.maxX - targetRect.minX);
      const z =
        targetRect.minZ +
        ((zIndex + 0.5) / sampleCount) * (targetRect.maxZ - targetRect.minZ);
      const covered = coveringRects.some((rect) => {
        const cover = normalizeRect(rect);
        return (
          x >= cover.minX &&
          x <= cover.maxX &&
          z >= cover.minZ &&
          z <= cover.maxZ
        );
      });
      if (covered) {
        coveredSamples += 1;
      } else {
        uncoveredSamples.push({ x: roundMetric(x), z: roundMetric(z) });
      }
    }
  }

  return {
    totalSamples,
    coveredSamples,
    uncoveredSamples,
    coverageRatio: totalSamples === 0 ? 0 : coveredSamples / totalSamples,
  };
};
