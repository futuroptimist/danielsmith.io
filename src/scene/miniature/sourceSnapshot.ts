import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Matrix3,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  type Side,
} from 'three';

import {
  getSceneDetailPolicy,
  type SceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';
import type { FloorId } from '../level/floorElevations';

export interface MiniatureSource {
  floor: FloorId;
  roots: readonly Object3D[];
  visibleOnFloors?: readonly FloorId[];
}

/** One static, batched visual projection. No scene builders, lights or update loops are copied. */
export function createSourceSnapshot(
  sources: readonly MiniatureSource[],
  policy: SceneDetailPolicy = getSceneDetailPolicy('micro')
) {
  const group = new Group();
  group.name = 'MiniatureSourceSnapshot';
  const bounds = new Box3();
  const floors = new Map<Group, readonly FloorId[]>();
  const records: { name: string; floor: FloorId; triangles: number }[] = [];
  const materials: (MeshStandardMaterial | MeshBasicMaterial)[] = [];
  const geometries: BufferGeometry[] = [];
  const visited = new Set<Object3D>();
  const point = new Vector3();
  const normal = new Vector3();
  const local = new Matrix4();
  const normalMatrix = new Matrix3();
  for (const source of sources) {
    const floor = new Group();
    floor.name = `MiniatureSource:${source.floor}`;
    floors.set(floor, source.visibleOnFloors ?? [source.floor]);
    group.add(floor);
    const batches = new Map<
      string,
      {
        positions: number[];
        normals: number[];
        colors: number[];
        opacity: number;
        emissive: boolean;
        side: Side;
      }
    >();
    const visit = (object: Object3D, root = false) => {
      if (visited.has(object)) return;
      visited.add(object);
      if (
        object.name === 'MiniatureWorldRoot' ||
        object.name === 'PortfolioMiniatureTable'
      )
        return;
      // Floor visibility is camera state, not authored absence. Nested hidden effects stay hidden.
      if (!root && !object.visible) return;
      if (
        object instanceof Mesh &&
        !object.name.toLowerCase().includes('ceiling')
      ) {
        const original: BufferGeometry = object.geometry;
        let geometry = original;
        // Preserve source dimensions while avoiding overworld tessellation at miniature scale.
        if (original instanceof SphereGeometry) {
          const p = original.parameters;
          geometry = new SphereGeometry(
            p.radius,
            Math.min(8, policy.geometry.sphereWidthSegments),
            Math.min(4, policy.geometry.sphereHeightSegments),
            p.phiStart,
            p.phiLength,
            p.thetaStart,
            p.thetaLength
          );
        } else if (original instanceof CylinderGeometry) {
          const p = original.parameters;
          geometry = new CylinderGeometry(
            p.radiusTop,
            p.radiusBottom,
            p.height,
            Math.min(8, policy.geometry.cylinderSegments),
            1,
            p.openEnded,
            p.thetaStart,
            p.thetaLength
          );
        } else if (
          (original.index?.count ??
            original.getAttribute('position')?.count ??
            0) > 1536
        ) {
          // High-density effects and sculptures use their source bounds, never a second authored model.
          original.computeBoundingBox();
          const size = original.boundingBox!.getSize(new Vector3());
          const center = original.boundingBox!.getCenter(new Vector3());
          geometry = new BoxGeometry(size.x, size.y, size.z).translate(
            center.x,
            center.y,
            center.z
          );
        }
        const position = geometry.getAttribute('position');
        const normals = geometry.getAttribute('normal');
        if (position && normals) {
          const count = geometry.index?.count ?? position.count;
          const instances = object instanceof InstancedMesh ? object.count : 1;
          for (let instance = 0; instance < instances; instance++) {
            local.copy(object.matrixWorld);
            if (object instanceof InstancedMesh) {
              const instanceMatrix = new Matrix4();
              object.getMatrixAt(instance, instanceMatrix);
              local.multiply(instanceMatrix);
            }
            normalMatrix.getNormalMatrix(local);
            for (let i = 0; i < count; i += 3) {
              const materialIndex =
                geometry.groups.find(
                  (g) => i >= g.start && i < g.start + g.count
                )?.materialIndex ?? 0;
              const material = (
                Array.isArray(object.material)
                  ? object.material[materialIndex]
                  : object.material
              ) as MeshStandardMaterial;
              if (!material || !material.visible || material.opacity === 0)
                continue;
              const opacity = material.transparent ? material.opacity : 1;
              const emissive =
                material instanceof MeshBasicMaterial ||
                (!!material.emissive &&
                  material.emissive.getHex() !== 0 &&
                  material.emissiveIntensity > 0);
              const key = `${opacity}:${emissive}:${material.side}`;
              let batch = batches.get(key);
              if (!batch) {
                batch = {
                  positions: [],
                  normals: [],
                  colors: [],
                  opacity,
                  emissive,
                  side: material.side,
                };
                batches.set(key, batch);
              }
              const color = material.color?.clone() ?? new Color(0xffffff);
              if (object instanceof InstancedMesh && object.instanceColor) {
                const instanceColor = new Color();
                object.getColorAt(instance, instanceColor);
                color.multiply(instanceColor);
              }
              if (material.emissive && emissive)
                color.add(
                  material.emissive
                    .clone()
                    .multiplyScalar(Math.min(material.emissiveIntensity, 1))
                );
              for (let j = 0; j < 3; j++) {
                const index = geometry.index
                  ? geometry.index.getX(i + j)
                  : i + j;
                point.fromBufferAttribute(position, index).applyMatrix4(local);
                normal
                  .fromBufferAttribute(normals, index)
                  .applyNormalMatrix(normalMatrix);
                bounds.expandByPoint(point);
                batch.positions.push(point.x, point.y, point.z);
                batch.normals.push(normal.x, normal.y, normal.z);
                const vertexColor = geometry.getAttribute('color');
                batch.colors.push(
                  color.r * (vertexColor ? vertexColor.getX(index) : 1),
                  color.g * (vertexColor ? vertexColor.getY(index) : 1),
                  color.b * (vertexColor ? vertexColor.getZ(index) : 1)
                );
              }
            }
          }
          records.push({
            name: object.name,
            floor: source.floor,
            triangles: (count / 3) * instances,
          });
        }
        if (geometry !== original) geometry.dispose();
      }
      object.children.forEach((child) => visit(child));
    };
    for (const root of source.roots) {
      root.updateWorldMatrix(true, true);
      visit(root, true);
    }
    for (const batch of batches.values()) {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(batch.positions, 3)
      );
      geometry.setAttribute(
        'normal',
        new Float32BufferAttribute(batch.normals, 3)
      );
      geometry.setAttribute(
        'color',
        new Float32BufferAttribute(batch.colors, 3)
      );
      const materialOptions = {
        side: batch.side,
        vertexColors: true,
        transparent: batch.opacity < 1,
        opacity: batch.opacity,
        depthWrite: batch.opacity === 1,
      };
      const material = batch.emissive
        ? new MeshBasicMaterial(materialOptions)
        : new MeshStandardMaterial({ ...materialOptions, roughness: 0.72 });
      const mesh = new Mesh(geometry, material);
      mesh.name = `MiniatureBatch:${source.floor}`;
      floor.add(mesh);
      materials.push(material);
      geometries.push(geometry);
    }
  }
  return {
    group,
    bounds,
    records,
    setFloor(id: FloorId) {
      for (const [floor, visibleOnFloors] of floors)
        floor.visible = visibleOnFloors.includes(id);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      group.clear();
    },
  };
}
