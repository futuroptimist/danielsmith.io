import type { BufferGeometry, Object3D } from 'three';
import { InstancedMesh, Mesh } from 'three';

function countGeometryTriangles(geometry: BufferGeometry): number {
  if (geometry.index) return geometry.index.count / 3;
  const position = geometry.getAttribute('position');
  return position ? position.count / 3 : 0;
}

export function countObjectTriangles(root: Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    if (object instanceof Mesh && object.visible) {
      const instanceCount = object instanceof InstancedMesh ? object.count : 1;
      triangles += countGeometryTriangles(object.geometry) * instanceCount;
    }
  });
  return Math.round(triangles);
}
