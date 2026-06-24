import { InstancedMesh, Mesh, Object3D } from 'three';

import type { PoiId } from './types';

const poiModelRoots = new Map<PoiId, Object3D>();

export function countObjectTriangles(root: Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof InstancedMesh)) return;
    const position = object.geometry.getAttribute('position');
    const meshTriangles = object.geometry.index
      ? object.geometry.index.count / 3
      : (position?.count ?? 0) / 3;
    triangles +=
      meshTriangles * (object instanceof InstancedMesh ? object.count : 1);
  });
  return Math.round(triangles);
}

export function registerPoiModelRoot(poiId: PoiId, root: Object3D): void {
  poiModelRoots.set(poiId, root);
  root.userData.poiModelRootId = poiId;
}

export function getPoiModelRoot(poiId: PoiId): Object3D | undefined {
  return poiModelRoots.get(poiId);
}

export function getPoiModelTriangleCount(poiId: PoiId): number | undefined {
  const root = getPoiModelRoot(poiId);
  return root ? countObjectTriangles(root) : undefined;
}

export function clearPoiModelTriangleRegistry(): void {
  poiModelRoots.clear();
}
