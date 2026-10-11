import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  LOD,
  MeshStandardMaterial,
  Object3D,
} from 'three';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import type { SceneDetailLevel } from '../graphics/sceneDetailPolicy';
import { getFloorTopElevation } from '../level/floorElevations';
import {
  WORKSHOP_DESCRIPTION,
  WORKSHOP_BODY_SCALE,
  WORKSHOP_STATIONS,
} from '../level/woodworkingLayout';

type Palette = 'wood' | 'endgrain' | 'metal' | 'paint' | 'dark';
type Vector = [number, number, number];
interface Part {
  name: string;
  color: Palette;
  position: Vector;
  size: Vector;
  round?: boolean;
  rotation?: Vector;
  detail?: boolean;
}

/** Static silhouettes remain recognizable in every tier. No machine animations or lights. */
export function createWoodworkingWorkshop(
  level: SceneDetailLevel = 'balanced'
) {
  const group = new Group();
  group.name = 'WoodworkingWorkshop';
  group.userData.description = WORKSHOP_DESCRIPTION;
  const geometry = {
    box: new BoxGeometry(1, 1, 1),
    round: new CylinderGeometry(0.5, 0.5, 1, 8),
  };
  const colors = {
    wood: 0xc49b6d,
    endgrain: 0x866044,
    metal: 0xa2aab0,
    paint: 0x447f79,
    dark: 0x29313a,
  };
  const materials = Object.fromEntries(
    Object.entries(colors).map(([key, color]) => [
      key,
      new MeshStandardMaterial({ color, roughness: 0.85 }),
    ])
  ) as Record<Palette, MeshStandardMaterial>;
  const meshes: InstancedMesh[] = [];
  const detailed = level === 'cinematic' || level === 'balanced';
  const transform = new Object3D();
  const stations = WORKSHOP_STATIONS.map((station) => {
    const root = new Group();
    root.name = `Woodworking:${station.id}`;
    root.scale.setScalar(WORKSHOP_BODY_SCALE);
    root.position.set(
      station.x * FLOOR_PLAN_SCALE,
      getFloorTopElevation('basement'),
      station.z * FLOOR_PLAN_SCALE
    );
    const parts: Part[] = [];
    const box = (
      name: string,
      color: Palette,
      position: Vector,
      size: Vector,
      detail = false
    ) => {
      parts.push({ name, color, position, size, detail });
    };
    const round = (
      name: string,
      color: Palette,
      position: Vector,
      size: Vector,
      rotation?: Vector
    ) => {
      parts.push({ name, color, position, size, round: true, rotation });
    };
    if (station.id.endsWith('bench')) {
      box(
        'thick-workbench-top',
        'wood',
        [0, 1.6, 0],
        [station.width, 0.22, 2.2]
      );
      for (const x of [-1, 1])
        for (const z of [-1, 1]) {
          box(
            'bench-leg',
            'endgrain',
            [x * (station.width / 2 - 0.2), 0.75, z * 0.8],
            [0.22, 1.5, 0.22]
          );
        }
      box(
        'lower-lumber-shelf',
        'endgrain',
        [0, 0.4, 0],
        [station.width - 0.3, 0.14, 1.8]
      );
      box('tool-rack', 'endgrain', [0, 3, -0.95], [station.width, 1.4, 0.12]);
      for (let i = 0; i < 5; i++) {
        const x = ((i - 2) * station.width) / 6;
        box(
          'hanging-tool-handle',
          'wood',
          [x, 2.9, -0.8],
          [0.1, 0.5, 0.1],
          true
        );
        box(
          i % 2 ? 'chisel-head' : 'hammer-head',
          'metal',
          [x, 3.2, -0.8],
          [i % 2 ? 0.12 : 0.35, 0.16, 0.12],
          true
        );
      }
      if (station.id === 'assembly-bench') {
        // Birdhouse shell and separate pitched roof board: visibly awaiting assembly.
        box('birdhouse-floor', 'wood', [-1.4, 1.78, 0], [1, 0.12, 0.9]);
        for (const x of [-1.85, -0.95])
          box('birdhouse-side', 'wood', [x, 2.15, 0], [0.1, 0.7, 0.9]);
        box('birdhouse-front', 'wood', [-1.4, 2.15, 0.42], [1, 0.7, 0.1]);
        round(
          'birdhouse-entry',
          'dark',
          [-1.4, 2.23, 0.48],
          [0.27, 0.015, 0.27],
          [Math.PI / 2, 0, 0]
        );
        box(
          'detached-roof-panel',
          'endgrain',
          [-0.4, 1.77, 0.1],
          [0.55, 0.1, 1]
        );
        for (const x of [0.4, 1.8])
          box('picture-frame-side', 'wood', [x, 1.8, 0.05], [0.13, 0.15, 1.3]);
        for (const z of [-0.55, 0.65])
          box('picture-frame-rail', 'wood', [1.1, 1.8, z], [1.5, 0.15, 0.13]);
        box(
          'frame-bar-clamp',
          'metal',
          [1.1, 1.95, 0.05],
          [1.9, 0.08, 0.09],
          true
        );
        for (const x of [0.2, 2])
          box('clamp-jaw', 'paint', [x, 1.84, 0.05], [0.12, 0.3, 0.25], true);
      } else {
        for (const x of [-0.85, -0.15])
          for (const z of [-0.4, 0.3]) {
            box('unfinished-stool-leg', 'wood', [x, 2.1, z], [0.12, 0.8, 0.12]);
          }
        box(
          'stool-side-rail',
          'endgrain',
          [-0.5, 2.4, -0.4],
          [0.8, 0.13, 0.12]
        );
        box('detached-stool-top', 'wood', [-0.5, 1.77, 0], [0.9, 0.1, 0.8]);
        box('planter-bottom', 'wood', [0.65, 1.8, 0], [0.8, 0.12, 1.1]);
        for (const y of [1.95, 2.2, 2.45]) {
          box('planter-slatted-side', 'wood', [0.3, y, 0], [0.1, 0.18, 1.1]);
          box(
            'planter-slatted-back',
            'wood',
            [0.65, y, -0.5],
            [0.8, 0.18, 0.1]
          );
        }
        box('planter-loose-slat', 'endgrain', [1.05, 1.87, 0], [0.12, 0.12, 1]);
      }
    } else if (station.id === 'bookshelf') {
      for (const x of [-1.3, 1.3])
        box('bookshelf-side', 'wood', [x, 1.5, 0], [0.2, 3, 1.4]);
      for (const y of [0.12, 1.25, 3.05])
        box('installed-shelf', 'wood', [0, y, 0], [2.8, 0.18, 1.4]);
      box('loose-shelf-stack', 'endgrain', [0, 0.4, 0], [2.3, 0.3, 1.2]);
      box('squaring-clamp', 'metal', [0, 2.7, 0], [2.8, 0.08, 0.1], true);
    } else {
      box('machine-base', 'dark', [0, 0.15, 0], [1.5, 0.3, 1.5]);
      box('machine-table', 'metal', [0, 1.65, 0], [1.45, 0.15, 1.4]);
      if (station.id === 'band-saw') {
        box('band-saw-pedestal', 'paint', [0, 0.85, 0], [0.85, 1.4, 0.85]);
        box('band-saw-spine', 'paint', [-0.5, 2.3, -0.25], [0.3, 1.65, 0.55]);
        round(
          'enclosed-upper-wheel',
          'paint',
          [0, 2.85, -0.25],
          [1.3, 0.65, 1.3],
          [Math.PI / 2, 0, 0]
        );
        box(
          'stationary-blade-guard',
          'dark',
          [0.4, 2.1, -0.25],
          [0.12, 0.7, 0.18]
        );
      } else {
        round('drill-column', 'metal', [0, 1.6, -0.45], [0.18, 2.9, 0.18]);
        box('drill-motor-head', 'paint', [0, 2.95, -0.1], [0.8, 0.5, 1.2]);
        round('stationary-chuck', 'dark', [0, 2.55, 0.35], [0.2, 0.3, 0.2]);
        box('feed-handle', 'metal', [0.45, 2.8, 0], [0.5, 0.1, 0.1], true);
      }
    }
    const buildBatches = (includeDetails: boolean) => {
      const batches = new Map<string, Part[]>();
      for (const part of parts.filter((p) => includeDetails || !p.detail)) {
        const key = `${part.round ? 'round' : 'box'}:${part.color}`;
        batches.set(key, [...(batches.get(key) ?? []), part]);
      }
      const result = new Group();
      batches.forEach((batch, key) => {
        const first = batch[0];
        const mesh = new InstancedMesh(
          geometry[first.round ? 'round' : 'box'],
          materials[first.color],
          batch.length
        );
        mesh.name = `${station.id}:${key}`;
        mesh.userData.partNames = batch.map((part) => part.name);
        mesh.userData.collisionPolicy = 'solid';
        mesh.userData.collisionRationale =
          'Static parts contained in the station footprint.';
        batch.forEach((part, index) => {
          transform.position.set(...part.position);
          transform.scale.set(...part.size);
          transform.rotation.set(...(part.rotation ?? [0, 0, 0]));
          transform.updateMatrix();
          mesh.setMatrixAt(index, transform.matrix);
        });
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
        result.add(mesh);
        meshes.push(mesh);
      });
      return result;
    };
    const lod = new LOD();
    lod.addLevel(buildBatches(detailed), 0);
    if (detailed) {
      const distant = buildBatches(false);
      distant.visible = false; // The initial static miniature snapshot must not copy both LODs.
      lod.addLevel(distant, 45);
    }
    root.add(lod);
    group.add(root);
    return {
      id: `woodworking-${station.id}`,
      group: root,
      collider: getWorkshopCollider(station),
      parts,
    };
  });
  let disposed = false;
  return {
    group,
    stations,
    dispose() {
      if (disposed) return;
      disposed = true;
      meshes.forEach((mesh) => mesh.dispose());
      Object.values(geometry).forEach((value) => value.dispose());
      Object.values(materials).forEach((value) => value.dispose());
      group.removeFromParent();
      group.clear();
    },
  };
}

export const getWorkshopCollider = (
  station: (typeof WORKSHOP_STATIONS)[number]
) => ({
  minX:
    station.x * FLOOR_PLAN_SCALE - (station.width * WORKSHOP_BODY_SCALE) / 2,
  maxX:
    station.x * FLOOR_PLAN_SCALE + (station.width * WORKSHOP_BODY_SCALE) / 2,
  minZ:
    station.z * FLOOR_PLAN_SCALE - (station.depth * WORKSHOP_BODY_SCALE) / 2,
  maxZ:
    station.z * FLOOR_PLAN_SCALE + (station.depth * WORKSHOP_BODY_SCALE) / 2,
  minY: getFloorTopElevation('basement'),
  maxY: getFloorTopElevation('basement') + station.height * WORKSHOP_BODY_SCALE,
});
