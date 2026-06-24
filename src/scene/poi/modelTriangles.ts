import { BufferGeometry, InstancedMesh, Mesh, Object3D } from 'three';

const getFiniteNonnegativeInteger = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

function countGeometryTriangles(geometry: BufferGeometry): number {
  const drawRangeStart = getFiniteNonnegativeInteger(geometry.drawRange.start);
  const rawDrawRangeCount = geometry.drawRange.count;
  const hasFiniteDrawRange = Number.isFinite(rawDrawRangeCount);
  const drawRangeCount = hasFiniteDrawRange
    ? getFiniteNonnegativeInteger(rawDrawRangeCount)
    : Infinity;

  if (geometry.index) {
    const indexCount = getFiniteNonnegativeInteger(geometry.index.count);
    const effectiveCount = Math.max(
      0,
      Math.min(indexCount, drawRangeStart + drawRangeCount) - drawRangeStart
    );
    return Math.floor(effectiveCount / 3);
  }

  const positionCount = getFiniteNonnegativeInteger(
    geometry.getAttribute('position')?.count ?? 0
  );
  const effectiveCount = Math.max(
    0,
    Math.min(positionCount, drawRangeStart + drawRangeCount) - drawRangeStart
  );
  return Math.floor(effectiveCount / 3);
}

export function countRenderedPoiModelTriangles(
  roots: readonly Object3D[]
): number {
  const visited = new Set<Object3D>();
  let triangles = 0;

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

      const geometryTriangles = countGeometryTriangles(geometry);
      const instanceCount =
        object instanceof InstancedMesh
          ? getFiniteNonnegativeInteger(object.count)
          : 1;
      triangles += geometryTriangles * instanceCount;
    });
  }

  return getFiniteNonnegativeInteger(triangles);
}
