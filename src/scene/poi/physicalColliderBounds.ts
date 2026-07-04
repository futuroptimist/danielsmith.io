import { Box3, Mesh, Object3D } from 'three';

import type { RectCollider } from '../../systems/collision';

const DEFAULT_PADDING = 0.025;

export interface PhysicalColliderBoundsOptions {
  padding?: number;
  exclude?: (object: Object3D) => boolean;
}

const isPhysicalMesh = (object: Object3D): object is Mesh =>
  object instanceof Mesh &&
  object.visible &&
  object.geometry !== undefined &&
  object.userData.physicalCollider !== false &&
  !object.userData.poiLabel &&
  !object.userData.colliderDebug &&
  !object.name.startsWith('POI_HIT:') &&
  !object.name.includes('Label') &&
  !object.name.includes('Halo') &&
  !object.name.includes('Badge');

export function createPhysicalRectColliderFromObject(
  object: Object3D,
  options: PhysicalColliderBoundsOptions = {}
): RectCollider | undefined {
  object.updateWorldMatrix(true, true);
  const bounds = new Box3();
  const meshBounds = new Box3();
  let hasBounds = false;

  object.traverse((node) => {
    if (options.exclude?.(node) || !isPhysicalMesh(node)) {
      return;
    }
    node.updateWorldMatrix(true, false);
    const mesh = node as Mesh;
    mesh.geometry.computeBoundingBox();
    const localBounds = mesh.geometry.boundingBox;
    if (!localBounds) {
      return;
    }
    meshBounds.copy(localBounds).applyMatrix4(mesh.matrixWorld);
    bounds.union(meshBounds);
    hasBounds = true;
  });

  if (!hasBounds) {
    return undefined;
  }

  const padding = options.padding ?? DEFAULT_PADDING;
  return {
    minX: bounds.min.x - padding,
    maxX: bounds.max.x + padding,
    minZ: bounds.min.z - padding,
    maxZ: bounds.max.z + padding,
  };
}
