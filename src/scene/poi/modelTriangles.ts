import { InstancedMesh, Mesh, Object3D } from 'three';
import type { BufferGeometry } from 'three';

const getFiniteCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;

function countGeometryTriangles(geometry: BufferGeometry): number {
  const indexCount = getFiniteCount(geometry.index?.count);
  const positionCount = getFiniteCount(
    geometry.getAttribute('position')?.count
  );
  const sourceCount = indexCount ?? positionCount;
  if (sourceCount === null) {
    return 0;
  }

  const drawRangeStart = Math.max(
    0,
    getFiniteCount(geometry.drawRange.start) ?? 0
  );
  const drawRangeCount = getFiniteCount(geometry.drawRange.count);
  const effectiveCount =
    drawRangeCount === null
      ? sourceCount
      : Math.min(sourceCount, drawRangeStart + drawRangeCount) - drawRangeStart;

  return Math.max(0, Math.floor(effectiveCount / 3));
}

export function countPoiModelTriangles(roots: readonly Object3D[]): number {
  const visited = new Set<Object3D>();
  let total = 0;

  for (const root of roots) {
    if (visited.has(root)) {
      continue;
    }
    root.traverseVisible((object) => {
      if (visited.has(object)) {
        return;
      }
      visited.add(object);
      if (!(object instanceof Mesh)) {
        return;
      }
      const baseTriangles = countGeometryTriangles(object.geometry);
      const instanceCount =
        object instanceof InstancedMesh
          ? (getFiniteCount(object.count) ?? 0)
          : 1;
      total += baseTriangles * instanceCount;
    });
  }

  return Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
}
