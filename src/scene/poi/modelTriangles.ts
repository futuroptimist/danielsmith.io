import { BufferGeometry, InstancedMesh, Mesh, Object3D } from 'three';

const isFiniteNonnegative = (value: number): boolean =>
  Number.isFinite(value) && value >= 0;

function getGeometryTriangleCount(geometry: BufferGeometry): number {
  const drawRangeStart = isFiniteNonnegative(geometry.drawRange.start)
    ? Math.floor(geometry.drawRange.start)
    : 0;
  const drawRangeCount = isFiniteNonnegative(geometry.drawRange.count)
    ? Math.floor(geometry.drawRange.count)
    : Infinity;
  if (drawRangeCount <= 0) {
    return 0;
  }

  const indexCount = geometry.index?.count;
  const positionCount = geometry.getAttribute('position')?.count;
  const sourceCount = Number.isFinite(indexCount)
    ? indexCount
    : Number.isFinite(positionCount)
      ? positionCount
      : 0;
  if (!sourceCount || sourceCount < 3) {
    return 0;
  }

  const effectiveCount = Math.max(
    0,
    Math.min(sourceCount - drawRangeStart, drawRangeCount)
  );
  return Math.floor(effectiveCount / 3);
}

export function countPoiModelTriangles(roots: readonly Object3D[]): number {
  const visited = new Set<Object3D>();
  let total = 0;

  for (const root of roots) {
    root.traverseVisible((object) => {
      if (visited.has(object)) {
        return;
      }
      visited.add(object);
      if (!(object instanceof Mesh)) {
        return;
      }
      const geometry = object.geometry;
      if (!(geometry instanceof BufferGeometry)) {
        return;
      }
      const geometryTriangles = getGeometryTriangleCount(geometry);
      const instanceCount =
        object instanceof InstancedMesh
          ? Math.max(0, Math.floor(object.count))
          : 1;
      total += geometryTriangles * instanceCount;
    });
  }

  return Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
}
