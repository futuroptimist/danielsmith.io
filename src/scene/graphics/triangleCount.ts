import { BufferGeometry, InstancedMesh, Mesh, Object3D } from 'three';

function countGeometryTriangles(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) {
    return index.count / 3;
  }
  const position = geometry.getAttribute('position');
  return position ? position.count / 3 : 0;
}

export function countRenderableTriangles(root: Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    if (!object.visible || !(object instanceof Mesh)) {
      return;
    }
    const multiplier = object instanceof InstancedMesh ? object.count : 1;
    triangles += countGeometryTriangles(object.geometry) * multiplier;
  });
  return triangles;
}
