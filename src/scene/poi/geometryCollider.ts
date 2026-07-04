import {
  Box3,
  Mesh,
  Object3D,
  Vector3,
  type BufferGeometry,
  type Material,
  type Matrix4,
} from 'three';

import type { RectCollider } from '../collision';

const DEFAULT_PADDING = 0.025;
const NON_PHYSICAL_NAME_PATTERN =
  /(?:hit|label|text|tooltip|badge|halo|ring|marker|helper|debug|selection|outline|beam|particle|spark|hologram|light|screen|callout|ticker|telemetry|orb)/i;

export interface TightColliderOptions {
  padding?: number;
  debugName?: string;
  excludeNamePattern?: RegExp;
  include?: (object: Object3D) => boolean;
}

const materialIsVisible = (material: Material | Material[]): boolean => {
  const materials = Array.isArray(material) ? material : [material];
  return materials.some(
    (entry) => entry.visible && (!entry.transparent || entry.opacity > 0.01)
  );
};

const preciseGeometryBounds = (geometry: BufferGeometry): Box3 | null => {
  if (geometry.type === 'CylinderGeometry') {
    const parameters = geometry.parameters as {
      radiusTop?: number;
      radiusBottom?: number;
      height?: number;
    };
    const radius = Math.max(
      parameters.radiusTop ?? 0,
      parameters.radiusBottom ?? 0
    );
    const height = parameters.height ?? 0;
    if (radius > 0 && height > 0) {
      return new Box3(
        new Vector3(-radius, -height / 2, -radius),
        new Vector3(radius, height / 2, radius)
      );
    }
  }
  return null;
};

const geometryHasPosition = (geometry: BufferGeometry): boolean =>
  Boolean(
    geometry.attributes.position && geometry.attributes.position.count > 0
  );

export function createTightColliderFromObject(
  object: Object3D,
  options: TightColliderOptions = {}
): (RectCollider & { debugName?: string }) | null {
  const padding = options.padding ?? DEFAULT_PADDING;
  const excludeNamePattern =
    options.excludeNamePattern ?? NON_PHYSICAL_NAME_PATTERN;
  const bounds = new Box3();
  const meshBounds = new Box3();
  let hasBounds = false;

  object.updateWorldMatrix(true, true);
  object.traverse((candidate) => {
    if (!candidate.visible || candidate.userData.physicalCollider === false)
      return;
    if (excludeNamePattern.test(candidate.name)) return;
    if (options.include && !options.include(candidate)) return;
    if (!(candidate instanceof Mesh)) return;
    if (!materialIsVisible(candidate.material)) return;
    if (!geometryHasPosition(candidate.geometry)) return;

    const preciseBounds = preciseGeometryBounds(candidate.geometry);
    if (!candidate.geometry.boundingBox && !preciseBounds)
      candidate.geometry.computeBoundingBox();
    const geometryBounds = preciseBounds ?? candidate.geometry.boundingBox;
    if (!geometryBounds) return;

    meshBounds
      .copy(geometryBounds)
      .applyMatrix4(candidate.matrixWorld as Matrix4);
    if (meshBounds.isEmpty()) return;
    if (hasBounds) bounds.union(meshBounds);
    else bounds.copy(meshBounds);
    hasBounds = true;
  });

  if (!hasBounds) return null;

  return {
    minX: bounds.min.x - padding,
    maxX: bounds.max.x + padding,
    minZ: bounds.min.z - padding,
    maxZ: bounds.max.z + padding,
    ...(options.debugName ? { debugName: options.debugName } : {}),
  };
}

export function requireTightColliderFromObject(
  object: Object3D,
  options: TightColliderOptions = {}
): RectCollider & { debugName?: string } {
  const collider = createTightColliderFromObject(object, options);
  if (!collider) {
    throw new Error(
      `Unable to derive physical collider bounds for ${object.name || 'object'}.`
    );
  }
  return collider;
}
