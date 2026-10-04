import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from 'three';

import type { RectCollider } from '../../systems/collision';
import { CAREER_EXHIBIT_FOOTPRINT } from '../level/careerMuseumLayout';
import {
  createPoiLabelTexture,
  type PoiInstanceOverrides,
} from '../poi/markers';
import type { CareerPoiDefinition, CareerPoiId } from '../poi/types';

export type MuseumCollisionPolicy = 'solid' | 'decorativeNoCollision';
type Primitive = 'box' | 'sphere' | 'cylinder';
type Palette =
  | 'slate'
  | 'wood'
  | 'black'
  | 'gold'
  | 'screen'
  | 'cyan'
  | 'red'
  | 'silver'
  | 'water'
  | 'green';

interface Part {
  name: string;
  primitive: Primitive;
  palette: Palette;
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  collision: MuseumCollisionPolicy;
}

export interface CareerMuseumExhibit {
  id: CareerPoiId;
  group: Group;
  collider: RectCollider;
  /** Interaction anchors come from the level and remain independent of model height. */
  interactionAnchor: { x: number; y: number; z: number };
  plaque: Mesh<PlaneGeometry, MeshBasicMaterial>;
  parts: readonly Part[];
}

export interface MuseumFurnishingPlacement {
  id: string;
  kind: 'bench' | 'table' | 'planter' | 'wall-art';
  position: { x: number; y: number; z: number };
  headingRadians?: number;
}

export interface MuseumFurnishingBuild {
  id: string;
  group: Group;
  collider: RectCollider | null;
  collision: MuseumCollisionPolicy;
}

export interface CareerMuseumResourceLifecycle {
  created: {
    geometries: number;
    materials: number;
    textures: number;
    instances: number;
  };
  disposed: {
    geometries: number;
    materials: number;
    textures: number;
    instances: number;
  };
  isDisposed: boolean;
}

export interface CareerMuseumBuild {
  group: Group;
  exhibits: readonly CareerMuseumExhibit[];
  furnishings: readonly MuseumFurnishingBuild[];
  /** Four static title textures; no lights, timers, or animation callbacks. */
  poiOverrides: PoiInstanceOverrides;
  updateDefinitions(definitions: readonly CareerPoiDefinition[]): void;
  resourceCounts: Readonly<{
    geometries: number;
    materials: number;
    textures: number;
  }>;
  getResourceLifecycle(): CareerMuseumResourceLifecycle;
  dispose(): void;
}

const TABLE = { ...CAREER_EXHIBIT_FOOTPRINT, height: 1.45 } as const;
export const CAREER_MUSEUM_FOOTPRINT = {
  width: TABLE.width,
  depth: TABLE.depth,
};

const box = (
  name: string,
  palette: Palette,
  position: Part['position'],
  scale: Part['scale'],
  collision: MuseumCollisionPolicy = 'decorativeNoCollision',
  rotation?: Part['rotation']
): Part => ({
  name,
  primitive: 'box',
  palette,
  position,
  scale,
  collision,
  rotation,
});

const sphere = (
  name: string,
  palette: Palette,
  position: Part['position'],
  scale: Part['scale']
): Part => ({
  name,
  primitive: 'sphere',
  palette,
  position,
  scale,
  collision: 'decorativeNoCollision',
});

function table(accent: Palette): Part[] {
  return [
    box(
      'solid-table-top',
      'wood',
      [0, TABLE.height, 0],
      [TABLE.width, 0.22, TABLE.depth],
      'solid'
    ),
    box(
      'solid-table-base',
      'slate',
      [0, TABLE.height / 2, 0],
      [3.8, TABLE.height, 2.25],
      'solid'
    ),
    box(
      'table-accent',
      accent,
      [0, TABLE.height + 0.13, 1.36],
      [4.6, 0.06, 0.12]
    ),
  ];
}

function mobileDevelopment(): Part[] {
  const parts = table('gold');
  parts.push(
    box('laptop-base', 'black', [-0.35, 1.63, -0.35], [1.65, 0.1, 1.05]),
    box(
      'laptop-display-frame',
      'black',
      [-0.35, 2.2, -0.78],
      [1.65, 1.15, 0.12],
      undefined,
      [-0.12, 0, 0]
    ),
    box('laptop-display', 'screen', [-0.35, 2.21, -0.7], [1.48, 0.97, 0.02]),
    box(
      'phone-simulator-frame',
      'gold',
      [-0.35, 2.21, -0.675],
      [0.45, 0.84, 0.015]
    ),
    box(
      'phone-simulator-screen',
      'black',
      [-0.35, 2.22, -0.66],
      [0.35, 0.66, 0.015]
    ),
    box(
      'phone-simulator-content',
      'cyan',
      [-0.35, 2.32, -0.645],
      [0.25, 0.25, 0.01]
    ),
    box('laptop-keyboard', 'gold', [-0.35, 1.695, -0.25], [1.2, 0.012, 0.46])
  );
  const devices: Array<{
    name: string;
    x: number;
    z: number;
    w: number;
    d: number;
    yaw: number;
  }> = [
    { name: 'phone-one', x: -1.65, z: 0.25, w: 0.43, d: 0.8, yaw: 0.35 },
    { name: 'phone-two', x: 0.4, z: 0.74, w: 0.43, d: 0.8, yaw: -0.4 },
    { name: 'tablet-one', x: 1.45, z: -0.25, w: 0.8, d: 1.08, yaw: 0.22 },
    { name: 'tablet-two', x: -0.75, z: 0.7, w: 0.68, d: 0.92, yaw: -0.12 },
  ];
  devices.forEach(({ name, x, z, w, d, yaw }) =>
    parts.push(
      box(`${name}-case`, 'black', [x, 1.65, z], [w, 0.12, d], undefined, [
        0,
        yaw,
        0,
      ]),
      box(
        `${name}-screen`,
        'gold',
        [x, 1.715, z],
        [w * 0.8, 0.012, d * 0.78],
        undefined,
        [0, yaw, 0]
      )
    )
  );
  return parts;
}

function aquarium(): Part[] {
  const parts = table('cyan');
  parts.push(
    box(
      'solid-aquarium-base',
      'slate',
      [-0.55, 1.69, 0],
      [3.2, 0.26, 2.55],
      'solid'
    ),
    box(
      'solid-aquarium-back',
      'screen',
      [-0.55, 2.45, -1.19],
      [3.2, 1.45, 0.09],
      'solid'
    ),
    box(
      'solid-aquarium-left',
      'slate',
      [-2.1, 2.43, 0],
      [0.08, 1.45, 2.45],
      'solid'
    ),
    box(
      'solid-aquarium-right',
      'slate',
      [1, 2.43, 0],
      [0.08, 1.45, 2.45],
      'solid'
    ),
    box('water-surface', 'water', [-0.55, 3.08, 0], [3.05, 0.025, 2.36]),
    box(
      'aquarium-front-glass',
      'water',
      [-0.55, 2.4, 1.2],
      [3.05, 1.28, 0.025]
    ),
    sphere(
      'inert-mine-shaped-prop',
      'black',
      [-0.65, 2.08, 0.08],
      [0.48, 0.48, 0.48]
    ),
    box(
      'inert-prop-short-stud-horizontal',
      'silver',
      [-0.65, 2.08, 0.08],
      [1.13, 0.13, 0.13]
    ),
    box(
      'inert-prop-short-stud-vertical',
      'silver',
      [-0.65, 2.08, 0.08],
      [0.13, 1.13, 0.13]
    ),
    box(
      'data-processing-display',
      'black',
      [1.65, 2.15, -0.5],
      [1.07, 1, 0.18]
    ),
    box(
      'data-processing-screen',
      'screen',
      [1.65, 2.15, -0.395],
      [0.92, 0.83, 0.025]
    )
  );
  for (let index = 0; index < 3; index += 1) {
    parts.push(
      box(
        `processing-row-${index}`,
        'cyan',
        [1.6, 2.38 - index * 0.22, -0.374],
        [0.65 - index * 0.14, 0.055, 0.01]
      ),
      sphere(
        `illustrative-fish-${index}`,
        index === 1 ? 'gold' : 'cyan',
        [-1.55 + index * 0.75, 2.65 + index * 0.11, 0.5],
        [0.23, 0.1, 0.07]
      ),
      sphere(
        `static-bubble-${index}`,
        'water',
        [0.6, 2.1 + index * 0.28, 0.7],
        [0.07, 0.07, 0.07]
      )
    );
  }
  return parts;
}

function reliability(): Part[] {
  const parts = table('red');
  parts.push(
    box(
      'sculptural-display-support',
      'silver',
      [0, 2.08, -0.35],
      [0.38, 1.3, 0.38]
    ),
    box('video-display-frame', 'black', [0, 2.6, -0.45], [3.85, 1.85, 0.19]),
    box('video-display', 'screen', [0, 2.6, -0.34], [3.61, 1.61, 0.025]),
    box('video-red-accent', 'red', [0, 1.88, -0.315], [3.4, 0.07, 0.02])
  );
  for (let index = 0; index < 5; index += 1) {
    const height = [0.32, 0.64, 0.5, 0.83, 0.72][index];
    parts.push(
      box(
        `illustrative-status-bar-${index}`,
        index === 2 ? 'gold' : 'cyan',
        [-1.2 + index * 0.6, 2.06 + height / 2, -0.31],
        [0.28, height, 0.02]
      )
    );
  }
  return parts;
}

function cubeSat(): Part[] {
  const parts = table('cyan');
  parts.push(
    box('cubesat-support', 'slate', [0, 1.86, 0], [0.38, 0.65, 0.38]),
    box('generic-cubesat-body', 'silver', [0, 2.62, 0], [0.97, 1.28, 0.97]),
    box('generic-cubesat-face', 'gold', [0, 2.62, 0.5], [0.73, 1.04, 0.02]),
    box(
      'generic-solar-panel-left',
      'screen',
      [-1.35, 2.65, 0],
      [1.35, 0.075, 1.5]
    ),
    box(
      'generic-solar-panel-right',
      'screen',
      [1.35, 2.65, 0],
      [1.35, 0.075, 1.5]
    )
  );
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index += 1) {
      parts.push(
        box(
          `generic-solar-cell-${side}-${index}`,
          'cyan',
          [side * (0.87 + index * 0.48), 2.695, 0],
          [0.025, 0.015, 1.35]
        )
      );
    }
  }
  // A static low-poly orbit motif, with no operational data or proprietary geometry.
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2;
    parts.push(
      box(
        `illustrative-orbit-${index}`,
        'cyan',
        [Math.cos(angle) * 1.55, 1.59, Math.sin(angle) * 1.12],
        [0.36, 0.02, 0.04],
        undefined,
        [0, -angle - Math.PI / 2, 0]
      )
    );
  }
  return parts;
}

function exhibitParts(id: CareerPoiId): Part[] {
  switch (id) {
    case 'career-southern-mississippi':
      return mobileDevelopment();
    case 'career-naval-research':
      return aquarium();
    case 'career-youtube':
      return reliability();
    case 'career-muon-space':
      return cubeSat();
  }
}

/** Original procedural geometry; each primitive and palette is shared across all four exhibits. */
export function createCareerMuseum(
  definitions: readonly CareerPoiDefinition[],
  furnishingPlacements: readonly MuseumFurnishingPlacement[] = []
): CareerMuseumBuild {
  const group = new Group();
  group.name = 'CareerMuseum';
  const geometries: Record<Primitive, BufferGeometry> = {
    box: new BoxGeometry(1, 1, 1),
    sphere: new SphereGeometry(1, 10, 6),
    cylinder: new CylinderGeometry(1, 1, 1, 8),
  };
  const colors: Record<Palette, number> = {
    slate: 0x283445,
    wood: 0x967352,
    black: 0x151a23,
    gold: 0xe6b94b,
    screen: 0x1a354a,
    cyan: 0x7bc7cb,
    red: 0xbd4851,
    silver: 0xa8b5bc,
    water: 0x68afbd,
    green: 0x69856a,
  };
  const materials = Object.fromEntries(
    Object.entries(colors).map(([name, color]) => [
      name,
      new MeshStandardMaterial({
        color,
        roughness: 0.78,
        metalness: name === 'silver' ? 0.28 : 0.04,
        ...(name === 'water'
          ? { transparent: true, opacity: 0.2, depthWrite: false }
          : {}),
      }),
    ])
  ) as Record<Palette, MeshStandardMaterial>;
  const meshes: InstancedMesh[] = [];
  const plaqueGeometry = new PlaneGeometry(1, 1);
  const plaqueMaterials: MeshBasicMaterial[] = [];
  const hitMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const poiOverrides: PoiInstanceOverrides = {};
  const transform = new Object3D();
  const matrix = new Matrix4();
  const exhibits = definitions.map((definition): CareerMuseumExhibit => {
    const root = new Group();
    root.name = `CareerExhibit:${definition.id}`;
    root.position.set(
      definition.position.x,
      definition.position.y,
      definition.position.z
    );
    root.rotation.y = definition.headingRadians ?? 0;
    const parts = exhibitParts(definition.id);
    const batches = new Map<string, Part[]>();
    parts.forEach((part) => {
      const key = `${part.primitive}:${part.palette}:${part.collision}`;
      const batch = batches.get(key) ?? [];
      batch.push(part);
      batches.set(key, batch);
    });
    batches.forEach((batch, key) => {
      const first = batch[0];
      const mesh = new InstancedMesh(
        geometries[first.primitive],
        materials[first.palette],
        batch.length
      );
      mesh.name = `${definition.id}:${key}`;
      mesh.userData.collisionPolicy = first.collision;
      mesh.userData.nonPhysicalCollider =
        first.collision === 'decorativeNoCollision';
      mesh.userData.collisionRationale =
        first.collision === 'solid'
          ? 'Museum stands and aquarium walls block walking.'
          : 'Small exhibit details stay inside the solid display footprint.';
      mesh.userData.partNames = batch.map((part) => part.name);
      batch.forEach((part, index) => {
        transform.position.set(...part.position);
        transform.scale.set(...part.scale);
        transform.rotation.set(...(part.rotation ?? [0, 0, 0]));
        transform.updateMatrix();
        matrix.copy(transform.matrix);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      root.add(mesh);
      meshes.push(mesh);
    });
    const plaqueMaterial = new MeshBasicMaterial({
      map: createPoiLabelTexture(definition),
      transparent: true,
      depthWrite: false,
    });
    const plaque = new Mesh(plaqueGeometry, plaqueMaterial);
    plaque.name = `CareerPlaque:${definition.id}`;
    plaque.position.set(0, 1.96, 1.5);
    plaque.scale.set(2.25, 0.675, 1);
    plaque.userData.nonPhysicalCollider = true;
    plaque.userData.collisionPolicy = 'decorativeNoCollision';
    plaque.userData.collisionRationale =
      'Readable plaque mounted above the solid table edge.';
    root.add(plaque);
    plaqueMaterials.push(plaqueMaterial);
    const highlightMaterial = new MeshBasicMaterial({
      color: 0x9ee8e7,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const highlight = new Mesh(geometries.box, highlightMaterial);
    highlight.name = `CareerPlaqueFocus:${definition.id}`;
    highlight.position.set(0, 1.96, 1.45);
    highlight.scale.set(2.45, 0.85, 0.06);
    highlight.userData.nonPhysicalCollider = true;
    highlight.userData.collisionPolicy = 'decorativeNoCollision';
    highlight.userData.collisionRationale =
      'Nonblocking focus and visited feedback around the plaque.';
    root.add(highlight);
    plaqueMaterials.push(highlightMaterial);
    const hitArea = new Mesh(geometries.box, hitMaterial);
    hitArea.position.set(0, 1.96, 1.56);
    hitArea.scale.set(2.45, 0.85, 0.16);
    hitArea.userData.nonPhysicalCollider = true;
    hitArea.userData.collisionPolicy = 'decorativeNoCollision';
    hitArea.userData.collisionRationale =
      'Pointer and touch interaction target; not a walking blocker.';
    root.add(hitArea);
    poiOverrides[definition.id] = {
      mode: 'display',
      hitArea,
      highlight: {
        mesh: highlight,
        material: highlightMaterial,
        baseOpacity: 0.12,
        focusOpacity: 0.8,
      },
    };
    group.add(root);
    const angle = definition.headingRadians ?? 0;
    const halfX =
      (Math.abs(Math.cos(angle)) * TABLE.width +
        Math.abs(Math.sin(angle)) * TABLE.depth) /
      2;
    const halfZ =
      (Math.abs(Math.sin(angle)) * TABLE.width +
        Math.abs(Math.cos(angle)) * TABLE.depth) /
      2;
    return {
      id: definition.id,
      group: root,
      collider: {
        minX: definition.position.x - halfX,
        maxX: definition.position.x + halfX,
        minZ: definition.position.z - halfZ,
        maxZ: definition.position.z + halfZ,
      },
      interactionAnchor: { ...definition.interactionAnchorPosition! },
      plaque,
      parts,
    };
  });
  const furnishings = furnishingPlacements.map(
    (placement): MuseumFurnishingBuild => {
      const root = new Group();
      root.name = `MuseumFurnishing:${placement.id}`;
      root.position.set(
        placement.position.x,
        placement.position.y,
        placement.position.z
      );
      root.rotation.y = placement.headingRadians ?? 0;
      let width = 4.4;
      let depth = 1.25;
      let parts: Part[];
      if (placement.kind === 'bench') {
        parts = [
          box('bench-seat', 'wood', [0, 0.8, 0], [width, 0.22, depth], 'solid'),
          box('bench-base', 'slate', [0, 0.38, 0], [3.8, 0.76, 0.95], 'solid'),
        ];
      } else if (placement.kind === 'table') {
        width = 3.6;
        depth = 2.4;
        parts = [
          box(
            'central-table-top',
            'wood',
            [0, 1.15, 0],
            [width, 0.22, depth],
            'solid'
          ),
          box(
            'central-table-base',
            'slate',
            [0, 0.55, 0],
            [2.7, 1.1, 1.8],
            'solid'
          ),
          box(
            'central-table-gallery-book',
            'gold',
            [0.45, 1.31, 0],
            [0.75, 0.08, 0.6]
          ),
        ];
      } else if (placement.kind === 'planter') {
        width = 1.5;
        depth = 1.5;
        parts = [
          {
            name: 'solid-planter-pot',
            primitive: 'cylinder',
            palette: 'wood',
            position: [0, 0.5, 0],
            scale: [0.75, 1, 0.75],
            collision: 'solid',
          },
          box('plant-stem', 'slate', [0, 1.5, 0], [0.08, 1.4, 0.08]),
          sphere(
            'plant-leaves-left',
            'green',
            [-0.25, 1.9, 0],
            [0.42, 0.8, 0.25]
          ),
          sphere(
            'plant-leaves-right',
            'green',
            [0.25, 2.1, 0],
            [0.42, 0.8, 0.25]
          ),
        ];
      } else {
        width = 3;
        depth = 0.08;
        parts = [
          box(
            'original-wall-art-frame',
            'wood',
            [0, 2.8, 0],
            [width, 1.8, depth]
          ),
          box(
            'original-wall-art-panel',
            'screen',
            [0, 2.8, 0.055],
            [2.76, 1.56, 0.02]
          ),
          box(
            'original-wall-art-gold',
            'gold',
            [-0.6, 2.8, 0.075],
            [0.48, 1.15, 0.02]
          ),
          box(
            'original-wall-art-cyan',
            'cyan',
            [0.3, 2.45, 0.075],
            [1.0, 0.25, 0.02]
          ),
        ];
      }
      const batches = new Map<string, Part[]>();
      parts.forEach((part) => {
        const key = `${part.primitive}:${part.palette}:${part.collision}`;
        const batch = batches.get(key) ?? [];
        batch.push(part);
        batches.set(key, batch);
      });
      batches.forEach((batch, key) => {
        const first = batch[0];
        const mesh = new InstancedMesh(
          geometries[first.primitive],
          materials[first.palette],
          batch.length
        );
        mesh.name = `${placement.id}:${key}`;
        mesh.userData.collisionPolicy = first.collision;
        mesh.userData.nonPhysicalCollider = first.collision !== 'solid';
        mesh.userData.collisionRationale =
          first.collision === 'solid'
            ? 'Museum furniture blocks walking at its visible footprint.'
            : 'Original wall art, leaves, and small tabletop details do not block walking.';
        mesh.userData.partNames = batch.map((part) => part.name);
        batch.forEach((part, index) => {
          transform.position.set(...part.position);
          transform.scale.set(...part.scale);
          transform.rotation.set(...(part.rotation ?? [0, 0, 0]));
          transform.updateMatrix();
          mesh.setMatrixAt(index, transform.matrix);
        });
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
        root.add(mesh);
        meshes.push(mesh);
      });
      group.add(root);
      const angle = placement.headingRadians ?? 0;
      const halfX =
        (Math.abs(Math.cos(angle)) * width +
          Math.abs(Math.sin(angle)) * depth) /
        2;
      const halfZ =
        (Math.abs(Math.sin(angle)) * width +
          Math.abs(Math.cos(angle)) * depth) /
        2;
      return {
        id: placement.id,
        group: root,
        collision:
          placement.kind === 'wall-art' ? 'decorativeNoCollision' : 'solid',
        collider:
          placement.kind === 'wall-art'
            ? null
            : {
                minX: placement.position.x - halfX,
                maxX: placement.position.x + halfX,
                minZ: placement.position.z - halfZ,
                maxZ: placement.position.z + halfZ,
              },
      };
    }
  );
  const created = { geometries: 0, materials: 0, textures: 0, instances: 0 };
  const released = { ...created };
  const track = (
    resource: { addEventListener(type: 'dispose', listener: () => void): void },
    kind: keyof typeof created
  ) => {
    created[kind] += 1;
    resource.addEventListener('dispose', () => {
      released[kind] += 1;
    });
  };
  Object.values(geometries).forEach((resource) =>
    track(resource, 'geometries')
  );
  track(plaqueGeometry, 'geometries');
  Object.values(materials).forEach((resource) => track(resource, 'materials'));
  plaqueMaterials.forEach((resource) => {
    track(resource, 'materials');
    if (resource.map) track(resource.map, 'textures');
  });
  track(hitMaterial, 'materials');
  meshes.forEach((resource) => track(resource, 'instances'));
  let disposed = false;
  return {
    group,
    exhibits,
    furnishings,
    poiOverrides,
    updateDefinitions(nextDefinitions) {
      if (disposed) return;
      for (const definition of nextDefinitions) {
        const exhibit = exhibits.find((entry) => entry.id === definition.id);
        if (!exhibit) continue;
        const previous = exhibit.plaque.material.map;
        exhibit.plaque.material.map = createPoiLabelTexture(definition);
        track(exhibit.plaque.material.map, 'textures');
        exhibit.plaque.material.needsUpdate = true;
        previous?.dispose();
      }
    },
    resourceCounts: Object.freeze({
      geometries: Object.keys(geometries).length + 1,
      materials: Object.keys(materials).length + plaqueMaterials.length + 1,
      textures: definitions.length,
    }),
    getResourceLifecycle: () => ({
      created: { ...created },
      disposed: { ...released },
      isDisposed: disposed,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      meshes.forEach((mesh) => mesh.dispose());
      plaqueMaterials.forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
      hitMaterial.dispose();
      plaqueGeometry.dispose();
      Object.values(geometries).forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
      group.removeFromParent();
      group.clear();
    },
  };
}
