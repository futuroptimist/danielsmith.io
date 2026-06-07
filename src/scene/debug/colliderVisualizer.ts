import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  type ColorRepresentation,
  type Object3D,
} from 'three';

import type { RectCollider } from '../../systems/collision';
import type { FloorId } from '../../systems/movement/stairs';

export type DebugColliderFloor = FloorId | 'all';

export interface DebugColliderMetadata {
  floor: DebugColliderFloor;
  category: string;
  name: string;
  bounds: RectCollider;
}

export interface DebugColliderRegistration extends DebugColliderMetadata {
  elevation?: number;
  height?: number;
  color?: ColorRepresentation;
}

export interface DebugColliderVisualizerState {
  enabled: boolean;
  visibleColliderCount: number;
  totalColliderCount: number;
}

interface DebugColliderVisualEntry {
  metadata: DebugColliderMetadata;
  mesh: Mesh<BoxGeometry, MeshBasicMaterial>;
}

export interface ColliderVisualizer {
  readonly group: Group;
  register(colliders: readonly DebugColliderRegistration[]): void;
  setEnabled(enabled: boolean): void;
  setActiveFloor(floorId: FloorId): void;
  getState(): DebugColliderVisualizerState;
  getColliders(): DebugColliderMetadata[];
  dispose(): void;
}

const DEFAULT_HEIGHT = 0.08;
const MIN_DIMENSION = 0.02;
const DEFAULT_COLOR = 0x66e6ff;
const FLOOR_COLORS: Record<DebugColliderFloor, number> = {
  ground: 0x2ee66b,
  upper: 0xf7c948,
  all: 0x66e6ff,
};

const cloneBounds = (bounds: RectCollider): RectCollider => ({
  minX: bounds.minX,
  maxX: bounds.maxX,
  minZ: bounds.minZ,
  maxZ: bounds.maxZ,
});

const isVisibleOnFloor = (
  colliderFloor: DebugColliderFloor,
  activeFloorId: FloorId
): boolean => colliderFloor === 'all' || colliderFloor === activeFloorId;

export function createColliderVisualizer(options: {
  activeFloorId: FloorId;
  enabled?: boolean;
}): ColliderVisualizer {
  const group = new Group();
  group.name = 'DebugColliderVisualizer';
  group.visible = options.enabled ?? false;
  group.userData.debugOnly = true;

  const entries: DebugColliderVisualEntry[] = [];
  let enabled = options.enabled ?? false;
  let activeFloorId = options.activeFloorId;

  const applyVisibility = () => {
    group.visible = enabled;
    for (const entry of entries) {
      entry.mesh.visible =
        enabled && isVisibleOnFloor(entry.metadata.floor, activeFloorId);
    }
  };

  const register = (colliders: readonly DebugColliderRegistration[]) => {
    for (const collider of colliders) {
      const width = Math.max(
        collider.bounds.maxX - collider.bounds.minX,
        MIN_DIMENSION
      );
      const depth = Math.max(
        collider.bounds.maxZ - collider.bounds.minZ,
        MIN_DIMENSION
      );
      const height = collider.height ?? DEFAULT_HEIGHT;
      const geometry = new BoxGeometry(width, height, depth);
      const material = new MeshBasicMaterial({
        color: collider.color ?? FLOOR_COLORS[collider.floor] ?? DEFAULT_COLOR,
        depthWrite: false,
        opacity: 0.42,
        transparent: true,
        wireframe: true,
      });
      const mesh = new Mesh(geometry, material);
      mesh.name = `DebugCollider:${collider.floor}:${collider.category}:${collider.name}`;
      mesh.position.set(
        (collider.bounds.minX + collider.bounds.maxX) / 2,
        (collider.elevation ?? 0) + height / 2,
        (collider.bounds.minZ + collider.bounds.maxZ) / 2
      );
      mesh.renderOrder = 10_000;
      mesh.userData.debugOnly = true;
      mesh.userData.colliderDebug = {
        floor: collider.floor,
        category: collider.category,
        name: collider.name,
      };
      mesh.raycast = () => undefined;
      group.add(mesh);
      entries.push({
        metadata: {
          floor: collider.floor,
          category: collider.category,
          name: collider.name,
          bounds: cloneBounds(collider.bounds),
        },
        mesh,
      });
    }
    applyVisibility();
  };

  const getVisibleColliderCount = () =>
    enabled
      ? entries.filter((entry) =>
          isVisibleOnFloor(entry.metadata.floor, activeFloorId)
        ).length
      : 0;

  return {
    group,
    register,
    setEnabled(next: boolean) {
      enabled = next;
      applyVisibility();
    },
    setActiveFloor(next: FloorId) {
      activeFloorId = next;
      applyVisibility();
    },
    getState() {
      return {
        enabled,
        visibleColliderCount: getVisibleColliderCount(),
        totalColliderCount: entries.length,
      };
    },
    getColliders() {
      return entries.map((entry) => ({
        floor: entry.metadata.floor,
        category: entry.metadata.category,
        name: entry.metadata.name,
        bounds: cloneBounds(entry.metadata.bounds),
      }));
    },
    dispose() {
      for (const entry of entries) {
        group.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
      }
      entries.length = 0;
      const parent = group.parent as Object3D | null;
      parent?.remove(group);
    },
  };
}
