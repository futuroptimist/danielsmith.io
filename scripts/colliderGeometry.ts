import type { RuntimeColliderBounds } from './colliderRuntimeCollector';

export type Rectangle = RuntimeColliderBounds;

export type CoverageSample = {
  x: number;
  z: number;
  covered: boolean;
};

export type UnionCoverage = {
  coveredSamples: number;
  totalSamples: number;
  coveragePercent: number;
  uncoveredSamples: CoverageSample[];
};

const round = (value: number, digits = 6): number =>
  Number(value.toFixed(digits));

export const getRectangleArea = (rectangle: Rectangle): number =>
  Math.max(0, rectangle.maxX - rectangle.minX) *
  Math.max(0, rectangle.maxZ - rectangle.minZ);

export const getIntersection = (
  left: Rectangle,
  right: Rectangle
): Rectangle | undefined => {
  const intersection = {
    minX: Math.max(left.minX, right.minX),
    maxX: Math.min(left.maxX, right.maxX),
    minZ: Math.max(left.minZ, right.minZ),
    maxZ: Math.min(left.maxZ, right.maxZ),
  };
  return getRectangleArea(intersection) > 0 ? intersection : undefined;
};

export const rectanglesEqual = (
  left: Rectangle,
  right: Rectangle,
  tolerance = 0
): boolean =>
  Math.abs(left.minX - right.minX) <= tolerance &&
  Math.abs(left.maxX - right.maxX) <= tolerance &&
  Math.abs(left.minZ - right.minZ) <= tolerance &&
  Math.abs(left.maxZ - right.maxZ) <= tolerance;

export const containsRectangle = (
  outer: Rectangle,
  inner: Rectangle,
  tolerance = 0
): boolean =>
  outer.minX <= inner.minX + tolerance &&
  outer.maxX >= inner.maxX - tolerance &&
  outer.minZ <= inner.minZ + tolerance &&
  outer.maxZ >= inner.maxZ - tolerance;

export const getRectangleDistance = (
  left: Rectangle,
  right: Rectangle
): number => {
  const dx = Math.max(0, left.minX - right.maxX, right.minX - left.maxX);
  const dz = Math.max(0, left.minZ - right.maxZ, right.minZ - left.maxZ);
  return Math.hypot(dx, dz);
};

export const areRectanglesAdjacent = (
  left: Rectangle,
  right: Rectangle,
  tolerance: number
): boolean => getRectangleDistance(left, right) <= tolerance;

export const pointInRectangle = (
  point: { x: number; z: number },
  rectangle: Rectangle
): boolean =>
  point.x >= rectangle.minX &&
  point.x <= rectangle.maxX &&
  point.z >= rectangle.minZ &&
  point.z <= rectangle.maxZ;

export const estimateUnionCoverage = (
  target: Rectangle,
  coveringRectangles: readonly Rectangle[],
  samplesPerAxis: number
): UnionCoverage => {
  const safeSamplesPerAxis = Math.max(1, Math.floor(samplesPerAxis));
  const totalSamples = safeSamplesPerAxis * safeSamplesPerAxis;
  const width = target.maxX - target.minX;
  const depth = target.maxZ - target.minZ;
  let coveredSamples = 0;
  const uncoveredSamples: CoverageSample[] = [];

  for (let zIndex = 0; zIndex < safeSamplesPerAxis; zIndex += 1) {
    for (let xIndex = 0; xIndex < safeSamplesPerAxis; xIndex += 1) {
      const point = {
        x: round(target.minX + ((xIndex + 0.5) / safeSamplesPerAxis) * width),
        z: round(target.minZ + ((zIndex + 0.5) / safeSamplesPerAxis) * depth),
      };
      const covered = coveringRectangles.some((rectangle) =>
        pointInRectangle(point, rectangle)
      );
      if (covered) {
        coveredSamples += 1;
      } else {
        uncoveredSamples.push({ ...point, covered });
      }
    }
  }

  return {
    coveredSamples,
    totalSamples,
    coveragePercent: round((coveredSamples / totalSamples) * 100, 3),
    uncoveredSamples,
  };
};
