import {
  Matrix4,
  Mesh,
  SkinnedMesh,
  InstancedMesh,
  type Group,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Batch only static opaque pieces with unchanged local transforms, retaining authoring nodes
 * for debug inspection. No collision or source position changes. */
export function batchStaticMeshes(
  root: Group,
  include: (mesh: Mesh) => boolean = () => true
): void {
  root.updateWorldMatrix(true, true);
  const furnishing = root;
  const inverse = new Matrix4().copy(furnishing.matrixWorld).invert();
  const batches = new Map<string, Mesh[]>();
  furnishing.traverseVisible((object) => {
    if (
      !(object instanceof Mesh) ||
      !object.visible ||
      Array.isArray(object.material) ||
      !include(object)
    )
      return;
    const material = object.material as Material;
    if (
      material.transparent ||
      object instanceof SkinnedMesh ||
      object instanceof InstancedMesh
    )
      return;
    const key = `${material.uuid}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}:${object.userData.levelSourceId ?? ''}`;
    const batch = batches.get(key) ?? [];
    batch.push(object);
    batches.set(key, batch);
  });
  let index = 0;
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) =>
      mesh.geometry
        .clone()
        .applyMatrix4(new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))
    );
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!geometry) continue;
    const first = meshes[0];
    const merged = new Mesh(geometry, first.material);
    merged.name = `${furnishing.name}:static-batch-${index++}`;
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    merged.renderOrder = first.renderOrder;
    merged.userData = { ...first.userData };
    furnishing.add(merged);
    // Preserve authored names/transforms for debug inspection.
    // Hidden originals are not uploaded to the renderer or copied into miniatures.
    meshes.forEach((mesh) => {
      mesh.visible = false;
    });
  }
}
