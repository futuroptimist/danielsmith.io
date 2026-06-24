import { BufferGeometry, InstancedMesh, Mesh, Object3D } from 'three';

function countGeometryTriangles(geometry: BufferGeometry): number {
  if (geometry.index) return geometry.index.count / 3;
  const position = geometry.getAttribute('position');
  return position ? position.count / 3 : 0;
}

export function countObjectTriangles(root: Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    if (object instanceof Mesh) {
      const instances = object instanceof InstancedMesh ? object.count : 1;
      triangles += countGeometryTriangles(object.geometry) * instances;
    }
  });
  return Math.round(triangles);
}
