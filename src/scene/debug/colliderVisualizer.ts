import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  type Scene,
} from 'three';

import type { RectCollider } from '../../systems/collision';
import type { FloorId } from '../../systems/movement/stairs';

export type ColliderDebugFloor = FloorId | 'all';

export interface ColliderDebugDescriptor {
  floor: ColliderDebugFloor;
  category: string;
  name: string;
  bounds: RectCollider;
  elevation?: number;
}

export interface ColliderDebugMetadata {
  floor: ColliderDebugFloor;
  category: string;
  name: string;
  bounds: RectCollider;
}

export interface ColliderVisualizerOptions {
  colliders: readonly ColliderDebugDescriptor[];
  scene: Scene;
  activeFloorId: FloorId;
  enabled?: boolean;
}

export interface ColliderVisualizerHandle {
  group: Group;
  setEnabled(enabled: boolean): void;
  setActiveFloorId(floorId: FloorId): void;
  getState(): {
    enabled: boolean;
    visibleColliderCount: number;
    totalColliderCount: number;
  };
  getColliders(): ColliderDebugMetadata[];
  dispose(): void;
}

const COLLIDER_HEIGHT = 0.18;
const COLLIDER_Y_OFFSET = 0.11;
const MIN_COLLIDER_DIMENSION = 0.02;

const MATERIALS_BY_FLOOR: Record<ColliderDebugFloor, MeshBasicMaterial> = {
  ground: new MeshBasicMaterial({
    color: 0x35c4ff,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  }),
  upper: new MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  }),
  all: new MeshBasicMaterial({
    color: 0xd764ff,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }),
};

const disableRaycast = (object: Object3D) => {
  object.raycast = () => undefined;
  object.traverse((child) => {
    child.raycast = () => undefined;
  });
};

const isColliderVisibleForFloor = (
  colliderFloor: ColliderDebugFloor,
  activeFloorId: FloorId
): boolean => colliderFloor === 'all' || colliderFloor === activeFloorId;

const createColliderMesh = (descriptor: ColliderDebugDescriptor): Mesh => {
  const { bounds } = descriptor;
  const width = Math.max(bounds.maxX - bounds.minX, MIN_COLLIDER_DIMENSION);
  const depth = Math.max(bounds.maxZ - bounds.minZ, MIN_COLLIDER_DIMENSION);
  const geometry = new BoxGeometry(width, COLLIDER_HEIGHT, depth);
  const material = MATERIALS_BY_FLOOR[descriptor.floor];
  const mesh = new Mesh(geometry, material);
  mesh.name = `DebugCollider:${descriptor.floor}:${descriptor.category}:${descriptor.name}`;
  mesh.position.set(
    (bounds.minX + bounds.maxX) / 2,
    (descriptor.elevation ?? 0) + COLLIDER_Y_OFFSET,
    (bounds.minZ + bounds.maxZ) / 2
  );
  mesh.renderOrder = 10_000;
  mesh.userData = {
    ...mesh.userData,
    debugOnly: true,
    colliderDebug: {
      floor: descriptor.floor,
      category: descriptor.category,
      name: descriptor.name,
    },
  };
  disableRaycast(mesh);
  return mesh;
};

export function createColliderVisualizer({
  colliders,
  scene,
  activeFloorId,
  enabled = false,
}: ColliderVisualizerOptions): ColliderVisualizerHandle {
  let currentFloorId = activeFloorId;
  let isEnabled = enabled;
  const group = new Group();
  group.name = 'DebugColliderVisualizer';
  group.userData = { ...group.userData, debugOnly: true };
  disableRaycast(group);

  const entries = colliders.map((descriptor) => ({
    descriptor,
    mesh: createColliderMesh(descriptor),
  }));
  entries.forEach(({ mesh }) => group.add(mesh));
  scene.add(group);

  const syncVisibility = () => {
    group.visible = isEnabled;
    entries.forEach(({ descriptor, mesh }) => {
      mesh.visible =
        isEnabled &&
        isColliderVisibleForFloor(descriptor.floor, currentFloorId);
    });
  };

  syncVisibility();

  return {
    group,
    setEnabled(nextEnabled: boolean) {
      isEnabled = nextEnabled;
      syncVisibility();
    },
    setActiveFloorId(floorId: FloorId) {
      currentFloorId = floorId;
      syncVisibility();
    },
    getState() {
      const visibleColliderCount = isEnabled
        ? entries.filter(({ descriptor }) =>
            isColliderVisibleForFloor(descriptor.floor, currentFloorId)
          ).length
        : 0;
      return {
        enabled: isEnabled,
        visibleColliderCount,
        totalColliderCount: entries.length,
      };
    },
    getColliders() {
      return entries.map(({ descriptor }) => ({
        floor: descriptor.floor,
        category: descriptor.category,
        name: descriptor.name,
        bounds: { ...descriptor.bounds },
      }));
    },
    dispose() {
      group.removeFromParent();
      entries.forEach(({ mesh }) => mesh.geometry.dispose());
    },
  };
}
