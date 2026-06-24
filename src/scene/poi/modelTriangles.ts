import {
  BufferGeometry,
  InstancedMesh,
  Mesh,
  Object3D,
  type BufferAttribute,
  type InterleavedBufferAttribute,
} from 'three';

const isFiniteNonnegative = (value: number): boolean =>
  Number.isFinite(value) && value >= 0;

const getAttributeCount = (
  attribute: BufferAttribute | InterleavedBufferAttribute | undefined
): number => {
  const count = attribute?.count ?? 0;
  return isFiniteNonnegative(count) ? Math.floor(count) : 0;
};

export function countPoiModelTriangles(roots: readonly Object3D[]): number {
  const visitedObjects = new Set<Object3D>();
  let triangles = 0;

  for (const root of roots) {
    root.traverseVisible((object) => {
      if (visitedObjects.has(object)) {
        return;
      }
      visitedObjects.add(object);

      if (!(object instanceof Mesh)) {
        return;
      }

      const geometry = object.geometry;
      if (!(geometry instanceof BufferGeometry)) {
        return;
      }

      const geometryTriangles = countGeometryTriangles(geometry);
      const instanceMultiplier =
        object instanceof InstancedMesh && isFiniteNonnegative(object.count)
          ? Math.floor(object.count)
          : 1;
      triangles += geometryTriangles * instanceMultiplier;
    });
  }

  return Math.max(0, Math.floor(Number.isFinite(triangles) ? triangles : 0));
}

function countGeometryTriangles(geometry: BufferGeometry): number {
  const indexCount = getAttributeCount(geometry.index ?? undefined);
  const positionCount = getAttributeCount(geometry.getAttribute('position'));
  const sourceCount = indexCount > 0 ? indexCount : positionCount;
  if (sourceCount <= 0) {
    return 0;
  }

  const drawRangeStart = isFiniteNonnegative(geometry.drawRange.start)
    ? Math.floor(geometry.drawRange.start)
    : 0;
  const drawRangeCount = isFiniteNonnegative(geometry.drawRange.count)
    ? Math.floor(geometry.drawRange.count)
    : Number.POSITIVE_INFINITY;
  const effectiveStart = Math.min(drawRangeStart, sourceCount);
  const effectiveCount = Math.min(drawRangeCount, sourceCount - effectiveStart);

  return Math.floor(Math.max(0, effectiveCount) / 3);
}
