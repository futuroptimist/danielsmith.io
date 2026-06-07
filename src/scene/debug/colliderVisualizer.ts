import { BoxGeometry, Color, Group, Mesh, MeshBasicMaterial } from 'three';

import type { RectCollider } from '../../systems/collision';
import type { FloorId } from '../../systems/movement/stairs';

export type ColliderDebugCategory =
  | 'ground'
  | 'upper'
  | 'static'
  | 'stairs'
  | 'transition';

export interface ColliderDebugEntry {
  floor: FloorId | 'all';
  category: ColliderDebugCategory;
  name: string;
  bounds: RectCollider;
  elevation?: number;
}

export interface ColliderDebugMetadata extends ColliderDebugEntry {
  visible: boolean;
}

export interface ColliderVisualizerState {
  enabled: boolean;
  visibleColliderCount: number;
  totalColliderCount: number;
}

export interface ColliderVisualizer {
  group: Group;
  setEnabled(enabled: boolean): void;
  setActiveFloorId(floorId: FloorId): void;
  getState(): ColliderVisualizerState;
  getColliders(): ColliderDebugMetadata[];
  dispose(): void;
}

interface ColliderVisualNode {
  entry: ColliderDebugEntry;
  mesh: Mesh;
}

const COLLIDER_VISUAL_HEIGHT = 0.08;
const COLLIDER_VISUAL_Y = 0.08;
const CATEGORY_COLORS: Record<ColliderDebugCategory, number> = {
  ground: 0x36d399,
  upper: 0x60a5fa,
  static: 0xf59e0b,
  stairs: 0xf472b6,
  transition: 0xc084fc,
};

function cloneColliderBounds(bounds: RectCollider): RectCollider {
  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
  };
}

function isEntryVisibleOnFloor(
  entry: ColliderDebugEntry,
  floorId: FloorId
): boolean {
  return entry.floor === 'all' || entry.floor === floorId;
}

function createColliderMesh(entry: ColliderDebugEntry): Mesh {
  const width = Math.max(entry.bounds.maxX - entry.bounds.minX, 0.01);
  const depth = Math.max(entry.bounds.maxZ - entry.bounds.minZ, 0.01);
  const geometry = new BoxGeometry(width, COLLIDER_VISUAL_HEIGHT, depth);
  const material = new MeshBasicMaterial({
    color: new Color(CATEGORY_COLORS[entry.category]),
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    toneMapped: false,
    wireframe: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = `DebugCollider:${entry.floor}:${entry.category}:${entry.name}`;
  mesh.position.set(
    entry.bounds.minX + width / 2,
    (entry.elevation ?? 0) + COLLIDER_VISUAL_Y,
    entry.bounds.minZ + depth / 2
  );
  mesh.renderOrder = 999;
  mesh.userData = {
    ...mesh.userData,
    debugOnly: true,
    nonInteractive: true,
    colliderDebug: {
      floor: entry.floor,
      category: entry.category,
      name: entry.name,
    },
  };
  mesh.raycast = () => undefined;
  return mesh;
}

export function createColliderVisualizer(
  entries: readonly ColliderDebugEntry[],
  initialFloorId: FloorId = 'ground'
): ColliderVisualizer {
  const group = new Group();
  group.name = 'DebugColliderVisualizer';
  group.visible = false;
  group.userData = {
    ...group.userData,
    debugOnly: true,
    nonInteractive: true,
  };

  let enabled = false;
  let activeFloorId = initialFloorId;
  const nodes: ColliderVisualNode[] = entries.map((entry) => {
    const clonedEntry: ColliderDebugEntry = {
      floor: entry.floor,
      category: entry.category,
      name: entry.name,
      bounds: cloneColliderBounds(entry.bounds),
      elevation: entry.elevation,
    };
    const mesh = createColliderMesh(clonedEntry);
    group.add(mesh);
    return { entry: clonedEntry, mesh };
  });

  const syncVisibility = () => {
    group.visible = enabled;
    for (const node of nodes) {
      node.mesh.visible =
        enabled && isEntryVisibleOnFloor(node.entry, activeFloorId);
    }
  };

  syncVisibility();

  return {
    group,
    setEnabled(nextEnabled: boolean) {
      enabled = nextEnabled;
      syncVisibility();
    },
    setActiveFloorId(floorId: FloorId) {
      activeFloorId = floorId;
      syncVisibility();
    },
    getState() {
      return {
        enabled,
        visibleColliderCount: nodes.filter((node) => node.mesh.visible).length,
        totalColliderCount: nodes.length,
      };
    },
    getColliders() {
      return nodes.map(({ entry, mesh }) => ({
        floor: entry.floor,
        category: entry.category,
        name: entry.name,
        bounds: cloneColliderBounds(entry.bounds),
        elevation: entry.elevation,
        visible: mesh.visible,
      }));
    },
    dispose() {
      for (const node of nodes) {
        node.mesh.geometry.dispose();
        if (Array.isArray(node.mesh.material)) {
          node.mesh.material.forEach((material) => material.dispose());
        } else {
          node.mesh.material.dispose();
        }
      }
      group.clear();
    },
  };
}

export function createColliderDebugEntries(input: {
  groundColliders: readonly RectCollider[];
  upperFloorColliders: readonly RectCollider[];
  staticColliders: readonly RectCollider[];
  upperFloorElevation?: number;
}): ColliderDebugEntry[] {
  const entries: ColliderDebugEntry[] = [];
  input.groundColliders.forEach((bounds, index) => {
    entries.push({
      floor: 'ground',
      category: 'ground',
      name: `ground-${index + 1}`,
      bounds,
    });
  });
  input.upperFloorColliders.forEach((bounds, index) => {
    entries.push({
      floor: 'upper',
      category: 'upper',
      name: `upper-${index + 1}`,
      bounds,
      elevation: input.upperFloorElevation,
    });
  });
  input.staticColliders.forEach((bounds, index) => {
    entries.push({
      floor: 'ground',
      category: 'static',
      name: `static-${index + 1}`,
      bounds,
    });
  });
  return entries;
}
