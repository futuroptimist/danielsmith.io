import type { RuntimeColliderBounds } from './colliderRuntimeCollector';

export type Rectangle = RuntimeColliderBounds;

export type SamplePoint = {
  x: number;
  z: number;
};

export type UnionCoverageEstimate = {
  totalSamples: number;
  coveredSamples: number;
  uncoveredSamples: SamplePoint[];
  coverageRatio: number;
};

export const roundGeometry = (value: number): number =>
  Number(value.toFixed(6));

export const rectangleArea = (rect: Rectangle): number =>
  roundGeometry(
    Math.max(0, rect.maxX - rect.minX) * Math.max(0, rect.maxZ - rect.minZ)
  );

export const rectangleIntersection = (
  left: Rectangle,
  right: Rectangle
): Rectangle | undefined => {
  const intersection = {
    minX: Math.max(left.minX, right.minX),
    maxX: Math.min(left.maxX, right.maxX),
    minZ: Math.max(left.minZ, right.minZ),
    maxZ: Math.min(left.maxZ, right.maxZ),
  };

  return rectangleArea(intersection) > 0 ? intersection : undefined;
};

export const rectangleContains = (
  outer: Rectangle,
  inner: Rectangle
): boolean =>
  outer.minX <= inner.minX &&
  outer.maxX >= inner.maxX &&
  outer.minZ <= inner.minZ &&
  outer.maxZ >= inner.maxZ;

export const rectangleDistance = (
  left: Rectangle,
  right: Rectangle
): number => {
  const xGap = Math.max(0, right.minX - left.maxX, left.minX - right.maxX);
  const zGap = Math.max(0, right.minZ - left.maxZ, left.minZ - right.maxZ);
  return roundGeometry(Math.hypot(xGap, zGap));
};

export const rectanglesAreAdjacent = (
  left: Rectangle,
  right: Rectangle,
  tolerance: number
): boolean => {
  if (rectangleIntersection(left, right)) {
    return false;
  }
  return rectangleDistance(left, right) <= tolerance;
};

export const estimateUnionCoverage = (
  candidate: Rectangle,
  others: readonly Rectangle[],
  samplesPerAxis: number
): UnionCoverageEstimate => {
  const sampleCount = Math.max(1, Math.floor(samplesPerAxis));
  const width = candidate.maxX - candidate.minX;
  const depth = candidate.maxZ - candidate.minZ;
  const uncoveredSamples: SamplePoint[] = [];
  let coveredSamples = 0;

  for (let xIndex = 0; xIndex < sampleCount; xIndex += 1) {
    const x = candidate.minX + ((xIndex + 0.5) / sampleCount) * width;
    for (let zIndex = 0; zIndex < sampleCount; zIndex += 1) {
      const z = candidate.minZ + ((zIndex + 0.5) / sampleCount) * depth;
      const covered = others.some(
        (other) =>
          x >= other.minX &&
          x <= other.maxX &&
          z >= other.minZ &&
          z <= other.maxZ
      );
      if (covered) {
        coveredSamples += 1;
      } else {
        uncoveredSamples.push({ x: roundGeometry(x), z: roundGeometry(z) });
      }
    }
  }

  const totalSamples = sampleCount * sampleCount;
  return {
    totalSamples,
    coveredSamples,
    uncoveredSamples,
    coverageRatio: roundGeometry(coveredSamples / totalSamples),
  };
};
