import { AdditiveBlending, Box3, Material, Mesh, Object3D } from 'three';

import type { RectCollider } from '../collision';

const DEFAULT_PADDING = 0.03;
const NON_PHYSICAL_NAME_PATTERN =
  /(badge|beacon|billboard|debug|glow|halo|helper|hologram|label|light|marker|orb|pulse|ring|tooltip|trail)/i;

const isNonPhysicalMaterial = (material: Material): boolean =>
  material.transparent || material.blending === AdditiveBlending;

export interface TightPoiColliderOptions {
  padding?: number;
  exclude?: (object: Object3D) => boolean;
  include?: (object: Object3D) => boolean;
  includeOnly?: boolean;
  debugName?: string;
}

const isPhysicalMesh = (object: Object3D): object is Mesh => {
  if (!(object instanceof Mesh) || !object.visible) return false;
  if (NON_PHYSICAL_NAME_PATTERN.test(object.name)) return false;
  if (
    object.userData.colliderDebug ||
    object.userData.colliderDebugLabel ||
    object.userData.solidDebug ||
    object.userData.solidDebugLabel ||
    object.userData.nonPhysicalCollider
  ) {
    return false;
  }
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];
  return materials.every((material) => !isNonPhysicalMaterial(material));
};

export function createTightPoiCollider(
  root: Object3D,
  options: TightPoiColliderOptions = {}
): (RectCollider & { debugName?: string }) | null {
  root.updateWorldMatrix(true, true);
  const bounds = new Box3();
  let hasBounds = false;

  root.traverse((object) => {
    if (options.exclude?.(object)) return;
    const isIncluded = options.include?.(object) ?? false;
    if (options.includeOnly && !isIncluded) return;
    if (!isPhysicalMesh(object) && !isIncluded) return;
    if (!(object instanceof Mesh) || !object.visible) return;
    const geometry = object.geometry;
    if (!geometry) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const meshBounds = geometry.boundingBox?.clone();
    if (!meshBounds) return;
    meshBounds.applyMatrix4(object.matrixWorld);
    if (meshBounds.isEmpty()) return;
    bounds.union(meshBounds);
    hasBounds = true;
  });

  if (!hasBounds) return null;

  const padding = options.padding ?? DEFAULT_PADDING;
  return {
    minX: bounds.min.x - padding,
    maxX: bounds.max.x + padding,
    minZ: bounds.min.z - padding,
    maxZ: bounds.max.z + padding,
    ...(options.debugName ? { debugName: options.debugName } : {}),
  };
}

export function createRequiredTightPoiCollider(
  root: Object3D,
  options: TightPoiColliderOptions = {}
): RectCollider & { debugName?: string } {
  const collider = createTightPoiCollider(root, options);
  if (!collider) {
    throw new Error(
      `Unable to derive POI collider bounds for ${root.name || 'unnamed object'}.`
    );
  }
  return collider;
}
