import { BufferGeometry, InstancedMesh, Mesh, Object3D } from 'three';

function countGeometryTriangles(geometry: BufferGeometry): number {
  if (geometry.index) return geometry.index.count / 3;
  const position = geometry.getAttribute('position');
  return position ? position.count / 3 : 0;
}

export function countObjectTriangles(root: Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    // Retained authoring meshes have their geometry represented by a live batch.
    // Keep ordinary hidden models countable, including models on another floor.
    if (object instanceof Mesh && object.userData.staticBatchSource !== true) {
      const instances = object instanceof InstancedMesh ? object.count : 1;
      triangles += countGeometryTriangles(object.geometry) * instances;
    }
  });
  return Math.round(triangles);
}
