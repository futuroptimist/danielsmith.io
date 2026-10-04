import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from 'three';

import type { RectCollider } from '../../systems/collision';
import type { DoorController } from '../../systems/doors/controller';
import type { FloorDefinition, SceneObjectDefinition } from '../level/schema';

export interface ExteriorSolid {
  definition: SceneObjectDefinition;
  collider: RectCollider;
}
type Palette = 'paving' | 'grass' | 'slate' | 'wood' | 'foliage' | 'trim';
interface Part {
  palette: Palette;
  position: [number, number, number];
  size: [number, number, number];
  sourceId: string;
}

/** Original procedural geometry: one shared box, instanced static materials, no textures. */
export function createResidentialExterior(
  floor: FloorDefinition,
  scale: number,
  doors: DoorController[]
) {
  const group = new Group();
  group.name = 'ResidentialExterior';
  const geometry = new BoxGeometry(1, 1, 1);
  const palette: Record<Palette, MeshStandardMaterial> = {
    paving: new MeshStandardMaterial({ color: 0xa7aba4, roughness: 0.92 }),
    grass: new MeshStandardMaterial({ color: 0x344b3e, roughness: 1 }),
    slate: new MeshStandardMaterial({ color: 0x384352, roughness: 0.75 }),
    wood: new MeshStandardMaterial({ color: 0x85694f, roughness: 0.85 }),
    foliage: new MeshStandardMaterial({ color: 0x5b7753, roughness: 1 }),
    trim: new MeshStandardMaterial({
      color: 0xd1c4a4,
      emissive: 0x30291b,
      emissiveIntensity: 0.18,
      roughness: 0.55,
    }),
  };
  const parts: Part[] = [];
  const solids: ExteriorSolid[] = [];
  const add = (
    palette: Palette,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    sourceId: string
  ) => parts.push({ palette, position: [x, y, z], size: [w, h, d], sourceId });
  floor.floorSurfaces
    .filter((surface) => surface.purpose === 'exterior-surface')
    .forEach((surface) => {
      const isYard = surface.roomId === 'frontYard';
      const rectangles = [surface.bounds];
      // The source-authored paving cuts through the grass; no coplanar overlap.
      for (const b of rectangles)
        add(
          isYard ? 'grass' : 'paving',
          ((b.minX + b.maxX) * scale) / 2,
          isYard ? -0.15 : -0.06,
          ((b.minZ + b.maxZ) * scale) / 2,
          (b.maxX - b.minX) * scale,
          isYard ? 0.3 : 0.12,
          (b.maxZ - b.minZ) * scale,
          surface.sourceId
        );
    });
  floor.sceneObjects
    ?.filter((object) => object.kind === 'exterior.planter')
    .forEach((definition) => {
      const x = definition.position.x * scale;
      const z = definition.position.z * scale;
      add('wood', x, 0.4, z, 5, 0.8, 1.7, definition.sourceId);
      add('foliage', x, 1.02, z, 4.6, 0.8, 1.35, definition.sourceId);
      for (const offset of [-1.5, 0, 1.5])
        add('foliage', x + offset, 1.5, z, 1.15, 0.5, 1.1, definition.sourceId);
      solids.push({
        definition,
        collider: {
          minX: x - 2.5,
          maxX: x + 2.5,
          minZ: z - 0.85,
          maxZ: z + 0.85,
        },
      });
    });
  const panels = doors.map((door) => {
    const d = door.definition;
    // The lateral pocket sits within the existing solid wall, never in the walking lane.
    add(
      'slate',
      d.center.x,
      d.height / 2,
      d.center.z + d.width + 0.22,
      d.depth + 0.14,
      d.height,
      d.width + 0.44,
      d.sourceId
    );
    for (const sign of [-1, 1])
      add(
        'wood',
        d.center.x,
        d.height / 2,
        d.center.z + sign * (d.width / 2 + 0.12),
        0.62,
        d.height,
        0.24,
        d.sourceId
      );
    add(
      'wood',
      d.center.x,
      d.height + 0.16,
      d.center.z,
      0.62,
      0.32,
      d.width + 0.48,
      d.sourceId
    );
    const panel = new Group();
    panel.name = `DoorPanel:${d.id}`;
    panel.userData.levelSourceId = d.sourceId;
    const slab = new Mesh(geometry, palette.slate);
    slab.scale.set(d.depth, d.height, d.width);
    panel.add(slab);
    for (const side of [-1, 1]) {
      const accent = new Mesh(geometry, palette.trim);
      accent.position.set(side * (d.depth / 2 + 0.015), 0, -d.width * 0.28);
      accent.scale.set(0.035, d.height * 0.5, 0.12);
      panel.add(accent);
    }
    panel.traverse((node) => {
      node.userData.levelSourceId = d.sourceId;
      node.userData.levelSource = {
        sourceId: d.sourceId,
        sourceType: 'sceneObject',
      };
    });
    group.add(panel);
    return { door, panel };
  });
  const transform = new Object3D();
  const instanceMeshes: InstancedMesh[] = [];
  const instanceKeys = new Set(
    parts.map((part) => `${part.palette}|${part.sourceId}`)
  );
  for (const key of instanceKeys) {
    const [name, sourceId] = key.split('|');
    const instances = parts.filter(
      (part) => part.palette === name && part.sourceId === sourceId
    );
    const mesh = new InstancedMesh(
      geometry,
      palette[name as Palette],
      instances.length
    );
    mesh.name = `Exterior:${sourceId}:${name}`;
    mesh.userData.parts = instances;
    const decorative = sourceId.endsWith('.surface') || name === 'foliage';
    mesh.userData.collisionPolicy = decorative
      ? 'decorativeNoCollision'
      : 'solid';
    mesh.userData.nonPhysicalCollider = decorative;
    mesh.userData.collisionRationale = decorative
      ? 'Walking surface or decorative foliage within a source-backed solid planter.'
      : 'Visible source-backed solid; door frames and pockets are protected by the authored wall.';
    mesh.userData.levelSourceId = sourceId;
    mesh.userData.levelSource = {
      sourceId,
      sourceType: sourceId.endsWith('.surface')
        ? 'floorSurface'
        : 'sceneObject',
    };
    instances.forEach((part, index) => {
      transform.position.set(...part.position);
      transform.scale.set(...part.size);
      transform.updateMatrix();
      mesh.setMatrixAt(index, new Matrix4().copy(transform.matrix));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    instanceMeshes.push(mesh);
  }
  let disposed = false;
  const update = () =>
    panels.forEach(({ door, panel }) => {
      const d = door.definition;
      panel.position.set(
        d.center.x,
        d.height / 2,
        d.center.z + door.snapshot().progress * d.travel
      );
    });
  update();
  return {
    group,
    solids,
    update,
    getLifecycle: () => ({
      isDisposed: disposed,
      geometries: 1,
      instances: instanceMeshes.length,
      materials: Object.keys(palette).length,
      textures: 0,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      instanceMeshes.forEach((mesh) => mesh.dispose());
      geometry.dispose();
      Object.values(palette).forEach((material) => material.dispose());
      group.removeFromParent();
    },
  };
}
