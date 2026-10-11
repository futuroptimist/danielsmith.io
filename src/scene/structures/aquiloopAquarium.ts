import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Matrix4,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from 'three';

import type { RectCollider } from '../collision';
import type { PoiInstanceOverride } from '../poi/markers';

import { AQUILOOP, createAquiloopClock } from './aquiloopCycle';

export const AQUILOOP_POSITION = { x: 0, z: -28 };
export const AQUILOOP_BOUNDS = { width: 6.4, depth: 2.4, height: 2.7 };
const WATER_HEIGHT = 0.509;
const WATER_BOTTOM = 0.92;

/** No lights, transmission, textures, timers, or recursive miniature builders. */
export function createAquiloopAquarium(position: {
  x: number;
  y: number;
  z: number;
}) {
  const group = new Group();
  group.name = 'AquiloopAquarium';
  group.position.set(position.x, position.y, position.z);
  const box = new BoxGeometry(1, 1, 1);
  const cylinder = new CylinderGeometry(1, 0.9, 1, 10);
  const bucketShell = new CylinderGeometry(1, 0.9, 1, 10, 1, true);
  const sphere = new SphereGeometry(1, 6, 4);
  const ring = new TorusGeometry(1, 0.09, 3, 8);
  const geometries = [box, cylinder, sphere, ring, bucketShell];
  const palette = {
    steel: 0x35454f,
    wood: 0x997655,
    water: 0x46bcc7,
    amber: 0xc68a32,
    blue: 0x326bbc,
    green: 0x318255,
    red: 0xe85243,
    sand: 0xb8a57d,
    black: 0x172e36,
    silver: 0xb4ced0,
    yellow: 0xe9c16b,
  };
  type Color = keyof typeof palette;
  const materials = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => [
      key,
      new MeshBasicMaterial({ color }),
    ])
  ) as Record<Color, MeshBasicMaterial>;
  const batches = new Map<
    string,
    {
      geometry: typeof box | typeof cylinder | typeof sphere | typeof ring;
      color: Color;
      transforms: Object3D[];
    }
  >();
  const stamp = (
    name: string,
    color: Color,
    size: number[],
    at: number[],
    geometry: typeof box | typeof cylinder | typeof sphere | typeof ring = box,
    rotation: number[] = [0, 0, 0]
  ) => {
    const key = `${geometry.id}:${color}`;
    const batch = batches.get(key) ?? { geometry, color, transforms: [] };
    const transform = new Object3D();
    transform.name = name;
    transform.position.set(at[0], at[1], at[2]);
    transform.scale.set(size[0], size[1], size[2]);
    transform.rotation.set(rotation[0], rotation[1], rotation[2]);
    transform.updateMatrix();
    batch.transforms.push(transform);
    batches.set(key, batch);
  };
  const beam = (
    name: string,
    a: number[],
    b: number[],
    thickness = 0.04,
    color: Color = 'steel'
  ) => {
    const transform = new Object3D();
    transform.position.set(
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      (a[2] + b[2]) / 2
    );
    const target = new Object3D();
    target.position.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    transform.quaternion.setFromUnitVectors(
      Object3D.DEFAULT_UP,
      target.position
    );
    stamp(
      name,
      color,
      [thickness, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), thickness],
      transform.position.toArray(),
      box,
      [transform.rotation.x, transform.rotation.y, transform.rotation.z]
    );
  };
  // Continuous top, six substantial legs, lower ties and diagonal braces.
  stamp('stand-top', 'steel', [2.03, 0.13, 0.82], [0, 0.84, 0]);
  stamp('stand-lower-shelf', 'wood', [2.03, 0.09, 0.82], [0, 0.18, 0]);
  for (const x of [-0.91, 0, 0.91])
    for (const z of [-0.32, 0.32]) {
      stamp('stand-leg', 'steel', [0.12, 0.8, 0.12], [x, 0.4, z]);
      stamp('stand-foot', 'steel', [0.22, 0.06, 0.22], [x, 0.03, z]);
    }
  beam('stand-cross-brace-a', [-0.91, 0.22, -0.34], [0.91, 0.78, -0.34], 0.075);
  beam('stand-cross-brace-b', [0.91, 0.22, -0.34], [-0.91, 0.78, -0.34], 0.075);
  stamp('substrate', 'sand', [1.83, 0.045, 0.61], [0, 0.92, 0]);
  // Open front cutaway makes small animals readable without expensive glass layers.
  stamp('tank-back', 'black', [1.87, 0.58, 0.025], [0, 1.2, -0.32]);
  for (const x of [-0.94, 0.94]) {
    stamp('tank-corner', 'silver', [0.025, 0.58, 0.65], [x, 1.2, 0]);
  }
  for (const y of [0.91, 1.49])
    for (const z of [-0.32, 0.32])
      stamp('tank-rim', 'silver', [1.91, 0.025, 0.025], [0, y, z]);
  stamp('aquarium-light-bar', 'yellow', [1.6, 0.025, 0.05], [0, 1.56, -0.12]);
  stamp(
    'sponge-filter',
    'black',
    [0.075, 0.18, 0.075],
    [-0.73, 1.03, -0.19],
    cylinder
  );
  beam(
    'filter-uplift',
    [-0.73, 1.04, -0.19],
    [-0.73, 1.4, -0.19],
    0.025,
    'silver'
  );
  stamp('thermometer', 'silver', [0.025, 0.31, 0.025], [0.84, 1.23, 0.28]);
  stamp('logbook', 'wood', [0.25, 0.02, 0.18], [0.57, 0.25, 0.03]);
  const water = new Mesh(
    box,
    new MeshBasicMaterial({
      color: palette.water,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    })
  );
  materials.water.dispose();
  materials.water = water.material;
  water.name = 'aquiloop-water-volume';
  group.add(water);
  const bucketPositions: number[][][] = [[], []];
  for (let bank = 0; bank < 2; bank++) {
    const x = bank === 0 ? -1.6 : 1.6;
    const color = bank === 0 ? 'amber' : 'blue';
    for (let i = 0; i < 8; i++) {
      const at = [
        x + (i % 2 ? 0.2 : -0.2),
        bank === 0 ? 0.08 : 1.62,
        -0.65 + Math.floor(i / 2) * 0.42,
      ];
      bucketPositions[bank].push(at);
      stamp(
        'five-gallon-bucket',
        color,
        [0.17, 0.37, 0.17],
        [at[0], at[1] + 0.185, at[2]],
        bucketShell
      );
      stamp(
        'bucket-rim',
        'silver',
        [0.17, 0.17, 0.17],
        [at[0], at[1] + 0.38, at[2]],
        ring,
        [Math.PI / 2, 0, 0]
      );
      // A front level window shows each bucket's actual fill, even through opaque walls.
      stamp(
        'bucket-level-window',
        'black',
        [0.11, 0.32, 0.015],
        [at[0], at[1] + 0.19, at[2] + 0.168]
      );
      beam(
        'bucket-tube',
        [at[0], at[1] + 0.4, at[2]],
        [x, bank === 0 ? 0.65 : 2.15, at[2]],
        0.018,
        color
      );
    }
    const shelfY = bank === 0 ? 0.05 : 1.59;
    stamp('bucket-rack-deck', 'steel', [0.86, 0.06, 1.75], [x, shelfY, 0]);
    for (const z of [-0.79, 0.79])
      for (const dx of [-0.38, 0.38])
        stamp(
          'rack-post',
          'steel',
          [0.07, Math.max(0.1, shelfY), 0.07],
          [x + dx, shelfY / 2, z]
        );
    beam(
      'bank-manifold',
      [x, bank === 0 ? 0.65 : 2.15, -0.7],
      [x, bank === 0 ? 0.65 : 2.15, 0.7],
      0.022,
      color
    );
  }
  beam('drain-tube', [-0.8, 1.31, 0.1], [-1.6, 0.65, 0.1], 0.025, 'amber');
  beam('fresh-tube-to-pump', [1.6, 2.15, 0.1], [1.08, 1.1, 0.1], 0.025, 'blue');
  beam('pump-return-tube', [1.08, 1.1, 0.1], [0.7, 1.48, 0.1], 0.025, 'blue');
  stamp('peristaltic-housing', 'steel', [0.28, 0.28, 0.13], [1.12, 1.08, 0.29]);
  stamp(
    'peristaltic-tube-loop',
    'blue',
    [0.105, 0.105, 0.105],
    [1.12, 1.08, 0.38],
    ring
  );
  const pump = new Group();
  pump.name = 'peristaltic-rollers';
  pump.position.set(1.12, 1.08, 0.4);
  for (let i = 0; i < 3; i++) {
    const roller = new Mesh(sphere, materials.silver);
    roller.scale.setScalar(0.027);
    roller.position.set(
      Math.cos((i * Math.PI * 2) / 3) * 0.07,
      Math.sin((i * Math.PI * 2) / 3) * 0.07,
      0
    );
    pump.add(roller);
  }
  group.add(pump);
  // Giant split-leaf silhouette, with gaps between leaf lobes rather than alpha maps.
  stamp('monstera-pot', 'wood', [0.33, 0.48, 0.33], [2.65, 0.24, 0], cylinder);
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.4;
    const tip = [
      2.65 + Math.cos(angle) * 0.38,
      1.1 + i * 0.2,
      Math.sin(angle) * 0.35,
    ];
    beam('monstera-stem', [2.65, 0.4, 0], tip, 0.035, 'green');
    for (let lobe = 0; lobe < 4; lobe++)
      for (const sign of [-1, 1])
        stamp(
          'split-monstera-leaf',
          'green',
          [0.2, 0.015, 0.055],
          [tip[0] + sign * 0.12, tip[1] + lobe * 0.02, tip[2] + lobe * 0.1],
          sphere,
          [0, sign * 0.6, sign * 0.2]
        );
  }
  const animalParts = new Map<
    MeshBasicMaterial,
    { root: Group; local: Matrix4 }[]
  >();
  const animals: { root: Group; kind: string; phase: number }[] = [];
  for (const [kind, count] of [
    ['guppy', 6],
    ['kuhli', 3],
    ['shrimp', 5],
    ['snail', 3],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const root = new Group();
      root.name = kind;
      const part = (color: Color, size: number[], at: number[]) => {
        const mesh = new Mesh(sphere, materials[color]);
        mesh.scale.set(size[0], size[1], size[2]);
        mesh.position.set(at[0], at[1], at[2]);
        root.add(mesh);
      };
      if (kind === 'guppy') {
        part('silver', [0.035, 0.015, 0.014], [0, 0, 0]);
        part(i % 2 ? 'red' : 'yellow', [0.025, 0.03, 0.008], [-0.045, 0, 0]);
      } else if (kind === 'kuhli') {
        for (let j = 0; j < 9; j++)
          part(
            j % 2 ? 'black' : 'yellow',
            [0.012, 0.012, 0.012],
            [j * 0.014, Math.sin(j) * 0.004, 0]
          );
      } else if (kind === 'shrimp') {
        part('red', [0.025, 0.013, 0.011], [0, 0, 0]);
        for (let j = 0; j < 3; j++)
          for (const side of [-1, 1])
            part(
              'red',
              [0.003, 0.012, 0.003],
              [j * 0.01 - 0.01, -0.008, side * 0.009]
            );
        part('red', [0.021, 0.002, 0.002], [0.025, 0.01, 0]);
      } else {
        part('yellow', [0.025, 0.025, 0.016], [0, 0.016, 0]);
        part('black', [0.012, 0.012, 0.018], [0, 0.016, 0]);
        part('sand', [0.035, 0.009, 0.016], [0.008, -0.004, 0]);
      }
      for (const child of root.children) {
        child.updateMatrix();
        const material = (child as Mesh).material as MeshBasicMaterial;
        const parts = animalParts.get(material) ?? [];
        parts.push({ root, local: child.matrix.clone() });
        animalParts.set(material, parts);
      }
      root.clear();
      animals.push({ root, kind, phase: i * 1.7 });
      group.add(root);
    }
  }
  // All animals share five material batches, including their legs, bands and tails.
  const animalBatches = [...animalParts].map(([material, parts]) => {
    const mesh = new InstancedMesh(sphere, material, parts.length);
    mesh.name = 'aquiloop-animals-' + material.color.getHexString();
    group.add(mesh);
    return { mesh, parts };
  });
  const animalMatrix = new Matrix4();
  for (const batch of batches.values()) {
    const mesh = new InstancedMesh(
      batch.geometry,
      materials[batch.color],
      batch.transforms.length
    );
    mesh.name = `aquiloop-${batch.color}-parts`;
    mesh.userData.partNames = batch.transforms.map((t) => t.name);
    batch.transforms.forEach((t, i) => mesh.setMatrixAt(i, t.matrix));
    group.add(mesh);
  }
  const levels = new InstancedMesh(
    box,
    new MeshBasicMaterial({ color: 0x85e4eb }),
    16
  );
  levels.name = 'bucket-volume-gauges';
  group.add(levels);
  const surfaces = new InstancedMesh(cylinder, levels.material, 16);
  surfaces.name = 'bucket-water-surfaces';
  group.add(surfaces);
  const transform = new Object3D();
  const clock = createAquiloopClock();
  const colliders: RectCollider[] = [
    { minX: -1.03, maxX: 1.27, minZ: -0.43, maxZ: 0.46 },
    { minX: -2.04, maxX: -1.16, minZ: -0.9, maxZ: 0.9 },
    { minX: 1.16, maxX: 2.04, minZ: -0.9, maxZ: 0.9 },
    { minX: 2.3, maxX: 3, minZ: -0.35, maxZ: 0.35 },
  ].map((c) => ({
    minX: c.minX + position.x,
    maxX: c.maxX + position.x,
    minZ: c.minZ + position.z,
    maxZ: c.maxZ + position.z,
  }));
  let lastDraw = -Infinity;
  const update = (
    now: number,
    options: {
      running?: boolean;
      visible?: boolean;
      reducedMotion?: boolean;
      lowTier?: boolean;
    } = {}
  ) => {
    const state = clock.sample(now, options.running ?? true);
    if (
      options.visible === false ||
      now - lastDraw < (options.lowTier ? 0.25 : 1 / 30)
    )
      return state;
    lastDraw = now;
    water.scale.set(1.83, WATER_HEIGHT * state.waterHeightFraction, 0.61);
    water.position.set(0, WATER_BOTTOM + water.scale.y / 2, 0);
    bucketPositions.forEach((bank, b) =>
      bank.forEach((at, i) => {
        const gallons = b === 0 ? state.receiverGallons : state.supplyGallons;
        const height = Math.max(
          0.001,
          (0.32 * gallons) / AQUILOOP.bucketCapacity
        );
        transform.position.set(at[0], at[1] + 0.03 + height / 2, at[2] + 0.18);
        transform.scale.set(0.085, height, 0.015);
        transform.updateMatrix();
        levels.setMatrixAt(b * 8 + i, transform.matrix);
        transform.position.set(at[0], at[1] + 0.03 + height, at[2]);
        transform.scale.set(0.145, 0.003, 0.145);
        transform.updateMatrix();
        surfaces.setMatrixAt(b * 8 + i, transform.matrix);
      })
    );
    levels.instanceMatrix.needsUpdate = true;
    levels.computeBoundingSphere();
    surfaces.instanceMatrix.needsUpdate = true;
    surfaces.computeBoundingSphere();
    const time = options.reducedMotion ? 0 : clock.elapsed;
    animals.forEach(({ root, kind, phase }) => {
      const t = time * (kind === 'guppy' ? 0.35 : 0.025) + phase;
      root.position.set(
        Math.sin(t) * 0.62,
        kind === 'guppy' ? 1.08 + Math.sin(t * 0.7) * 0.035 : 0.957,
        Math.cos(t) * 0.19
      );
      root.rotation.y = Math.atan2(Math.cos(t) * 0.62, -Math.sin(t) * 0.19);
      root.updateMatrix();
    });
    for (const { mesh, parts } of animalBatches) {
      parts.forEach(({ root, local }, i) =>
        mesh.setMatrixAt(i, animalMatrix.multiplyMatrices(root.matrix, local))
      );
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    if (!options.reducedMotion && state.phase === 'refill')
      pump.rotation.z = time * 3;
    return state;
  };
  update(0);
  clock.suspend();
  let disposed = false;
  return {
    group,
    colliders,
    update,
    poiOverride: {
      mode: 'display',
      hitArea: water,
      highlight: {
        mesh: water,
        material: water.material,
        baseOpacity: 0.14,
        focusOpacity: 0.22,
      },
    } satisfies PoiInstanceOverride,
    suspend: () => clock.suspend(),
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      levels.material.dispose();
      group.traverse((o) => {
        if (o instanceof InstancedMesh) o.dispose();
      });
    },
  };
}
