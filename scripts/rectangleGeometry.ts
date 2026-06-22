export type RectangleBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type RectangleIntersection = RectangleBounds & { area: number };

export type UnionCoverageSample = {
  x: number;
  z: number;
  covered: boolean;
};

export type UnionCoverageEstimate = {
  totalSamples: number;
  coveredSamples: number;
  uncoveredSamples: UnionCoverageSample[];
  coverageRatio: number;
};

export const rectangleArea = (bounds: RectangleBounds): number =>
  Math.max(0, bounds.maxX - bounds.minX) *
  Math.max(0, bounds.maxZ - bounds.minZ);

export const rectanglesEqual = (
  left: RectangleBounds,
  right: RectangleBounds,
  tolerance = 0
): boolean =>
  Math.abs(left.minX - right.minX) <= tolerance &&
  Math.abs(left.maxX - right.maxX) <= tolerance &&
  Math.abs(left.minZ - right.minZ) <= tolerance &&
  Math.abs(left.maxZ - right.maxZ) <= tolerance;

export const rectangleIntersection = (
  left: RectangleBounds,
  right: RectangleBounds
): RectangleIntersection | undefined => {
  const intersection = {
    minX: Math.max(left.minX, right.minX),
    maxX: Math.min(left.maxX, right.maxX),
    minZ: Math.max(left.minZ, right.minZ),
    maxZ: Math.min(left.maxZ, right.maxZ),
  };
  const area = rectangleArea(intersection);
  return area > 0 ? { ...intersection, area } : undefined;
};

export const containsRectangle = (
  outer: RectangleBounds,
  inner: RectangleBounds,
  tolerance = 0
): boolean =>
  outer.minX <= inner.minX + tolerance &&
  outer.maxX >= inner.maxX - tolerance &&
  outer.minZ <= inner.minZ + tolerance &&
  outer.maxZ >= inner.maxZ - tolerance;

export const rectangleSeparationDistance = (
  left: RectangleBounds,
  right: RectangleBounds
): number => {
  const gapX = Math.max(0, left.minX - right.maxX, right.minX - left.maxX);
  const gapZ = Math.max(0, left.minZ - right.maxZ, right.minZ - left.maxZ);
  return Math.hypot(gapX, gapZ);
};

export const areRectanglesAdjacent = (
  left: RectangleBounds,
  right: RectangleBounds,
  tolerance: number
): boolean =>
  !rectangleIntersection(left, right) &&
  rectangleSeparationDistance(left, right) <= tolerance;

const pointInRectangle = (
  point: { x: number; z: number },
  bounds: RectangleBounds
): boolean =>
  point.x >= bounds.minX &&
  point.x <= bounds.maxX &&
  point.z >= bounds.minZ &&
  point.z <= bounds.maxZ;

export const estimateUnionCoverage = (
  candidate: RectangleBounds,
  others: readonly RectangleBounds[],
  samplesPerAxis: number
): UnionCoverageEstimate => {
  const safeSamples = Math.max(1, Math.floor(samplesPerAxis));
  const width = candidate.maxX - candidate.minX;
  const depth = candidate.maxZ - candidate.minZ;
  const uncoveredSamples: UnionCoverageSample[] = [];
  let coveredSamples = 0;

  for (let zIndex = 0; zIndex < safeSamples; zIndex += 1) {
    for (let xIndex = 0; xIndex < safeSamples; xIndex += 1) {
      const x = candidate.minX + ((xIndex + 0.5) / safeSamples) * width;
      const z = candidate.minZ + ((zIndex + 0.5) / safeSamples) * depth;
      const covered = others.some((other) => pointInRectangle({ x, z }, other));
      if (covered) {
        coveredSamples += 1;
      } else {
        uncoveredSamples.push({ x, z, covered });
      }
    }
  }

  const totalSamples = safeSamples * safeSamples;
  return {
    totalSamples,
    coveredSamples,
    uncoveredSamples,
    coverageRatio: totalSamples === 0 ? 0 : coveredSamples / totalSamples,
  };
};
