import { Box3, Mesh, Object3D } from 'three';

import type { RectCollider } from '../../systems/collision';

export interface GeometryColliderOptions {
  padding?: number;
  include?: (object: Object3D) => boolean;
}

const DEFAULT_PADDING = 0.03;

const isFiniteBox = (box: Box3): boolean =>
  Number.isFinite(box.min.x) &&
  Number.isFinite(box.max.x) &&
  Number.isFinite(box.min.z) &&
  Number.isFinite(box.max.z);

const defaultIncludePhysicalMesh = (object: Object3D): boolean => {
  if (!(object instanceof Mesh)) return false;
  if (!object.visible) return false;
  if (object.userData.physicalCollider === false) return false;
  if (object.userData.colliderDebug || object.userData.colliderDebugLabel) {
    return false;
  }

  const normalizedName = object.name.toLowerCase();
  return !(
    normalizedName.includes('hit') ||
    normalizedName.includes('label') ||
    normalizedName.includes('cable') ||
    normalizedName.includes('wallplate') ||
    normalizedName.includes('badge') ||
    normalizedName.includes('halo') ||
    normalizedName.includes('ring') ||
    normalizedName.includes('marker') ||
    normalizedName.includes('orb') ||
    normalizedName.includes('helper') ||
    normalizedName.includes('debug')
  );
};

export function createTightColliderFromObject(
  root: Object3D,
  options: GeometryColliderOptions = {}
): RectCollider | null {
  root.updateWorldMatrix(true, true);
  const bounds = new Box3();
  const meshBounds = new Box3();
  let hasBounds = false;
  const include = options.include ?? defaultIncludePhysicalMesh;

  root.traverse((object) => {
    if (!include(object) || !(object instanceof Mesh)) return;
    const geometry = object.geometry;
    if (!geometry) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;

    meshBounds.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld);
    if (!isFiniteBox(meshBounds)) return;
    if (hasBounds) {
      bounds.union(meshBounds);
    } else {
      bounds.copy(meshBounds);
      hasBounds = true;
    }
  });

  if (!hasBounds || !isFiniteBox(bounds)) return null;

  const padding = options.padding ?? DEFAULT_PADDING;
  return {
    minX: bounds.min.x - padding,
    maxX: bounds.max.x + padding,
    minZ: bounds.min.z - padding,
    maxZ: bounds.max.z + padding,
  };
}
