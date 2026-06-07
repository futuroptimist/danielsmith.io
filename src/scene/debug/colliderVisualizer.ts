import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
} from 'three';

import type { RectCollider } from '../../systems/collision';
import type { FloorId } from '../../systems/movement/stairs';

export type DebugColliderCategory = 'ground' | 'upper' | 'static' | 'stair';

export interface DebugColliderRegistration {
  floor: FloorId | 'all';
  category: DebugColliderCategory;
  name: string;
  collider: RectCollider;
}

export interface DebugColliderMetadata {
  floor: FloorId | 'all';
  category: DebugColliderCategory;
  name: string;
  bounds: RectCollider;
}

export interface ColliderVisualizerState {
  enabled: boolean;
  visibleColliderCount: number;
  totalColliderCount: number;
}

export interface ColliderVisualizerHandle {
  group: Group;
  setEnabled(enabled: boolean): void;
  setActiveFloor(floorId: FloorId): void;
  getState(): ColliderVisualizerState;
  getColliders(): DebugColliderMetadata[];
  dispose(): void;
}

interface ColliderVisualizerOptions {
  colliders: readonly DebugColliderRegistration[];
  activeFloor: FloorId;
  floorHeights?: Partial<Record<FloorId, number>>;
}

interface VisualizedCollider extends DebugColliderRegistration {
  mesh: Mesh<BoxGeometry, MeshBasicMaterial>;
}

const DEFAULT_FLOOR_HEIGHTS: Record<FloorId, number> = {
  ground: 0,
  upper: 5.6,
};

const CATEGORY_COLORS: Record<DebugColliderCategory, Color> = {
  ground: new Color(0x4cc9f0),
  upper: new Color(0xb5179e),
  static: new Color(0xffb703),
  stair: new Color(0x80ed99),
};

const COLLIDER_OVERLAY_HEIGHT = 0.32;
const MIN_COLLIDER_OVERLAY_SIZE = 0.05;

function disableRaycast(object: Object3D): void {
  object.raycast = () => undefined;
}

function cloneColliderBounds(collider: RectCollider): RectCollider {
  return {
    minX: collider.minX,
    maxX: collider.maxX,
    minZ: collider.minZ,
    maxZ: collider.maxZ,
  };
}

function shouldShowCollider(
  collider: DebugColliderRegistration,
  activeFloor: FloorId
): boolean {
  if (collider.floor === 'all') {
    return true;
  }
  return collider.floor === activeFloor;
}

export function createColliderVisualizer({
  colliders,
  activeFloor,
  floorHeights = {},
}: ColliderVisualizerOptions): ColliderVisualizerHandle {
  const group = new Group();
  group.name = 'DebugColliderVisualizer';
  group.visible = false;
  disableRaycast(group);

  const resolvedFloorHeights = { ...DEFAULT_FLOOR_HEIGHTS, ...floorHeights };
  let enabled = false;
  let currentFloor = activeFloor;

  const visualizedColliders: VisualizedCollider[] = colliders.map(
    (registration, index) => {
      const color = CATEGORY_COLORS[registration.category];
      const material = new MeshBasicMaterial({
        color,
        depthWrite: false,
        opacity: 0.28,
        transparent: true,
        wireframe: true,
      });
      const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
      const bounds = registration.collider;
      const width = Math.max(
        Math.abs(bounds.maxX - bounds.minX),
        MIN_COLLIDER_OVERLAY_SIZE
      );
      const depth = Math.max(
        Math.abs(bounds.maxZ - bounds.minZ),
        MIN_COLLIDER_OVERLAY_SIZE
      );
      const floorHeight =
        registration.floor === 'all'
          ? resolvedFloorHeights[currentFloor]
          : resolvedFloorHeights[registration.floor];

      mesh.name = `DebugCollider:${registration.category}:${registration.name}:${index}`;
      mesh.position.set(
        (bounds.minX + bounds.maxX) / 2,
        floorHeight + COLLIDER_OVERLAY_HEIGHT / 2,
        (bounds.minZ + bounds.maxZ) / 2
      );
      mesh.scale.set(width, COLLIDER_OVERLAY_HEIGHT, depth);
      mesh.renderOrder = 1000;
      mesh.userData = {
        ...mesh.userData,
        debugCollider: true,
        nonInteractive: true,
      };
      mesh.visible = false;
      disableRaycast(mesh);
      group.add(mesh);

      return { ...registration, mesh };
    }
  );

  const syncVisibility = () => {
    group.visible = enabled;
    for (const visualizedCollider of visualizedColliders) {
      const isVisible =
        enabled && shouldShowCollider(visualizedCollider, currentFloor);
      visualizedCollider.mesh.visible = isVisible;
      if (visualizedCollider.floor === 'all') {
        visualizedCollider.mesh.position.y =
          resolvedFloorHeights[currentFloor] + COLLIDER_OVERLAY_HEIGHT / 2;
      }
    }
  };

  const getVisibleColliderCount = () =>
    enabled
      ? visualizedColliders.filter((collider) =>
          shouldShowCollider(collider, currentFloor)
        ).length
      : 0;

  syncVisibility();

  return {
    group,
    setEnabled(nextEnabled: boolean) {
      enabled = nextEnabled;
      syncVisibility();
    },
    setActiveFloor(floorId: FloorId) {
      currentFloor = floorId;
      syncVisibility();
    },
    getState() {
      return {
        enabled,
        visibleColliderCount: getVisibleColliderCount(),
        totalColliderCount: visualizedColliders.length,
      };
    },
    getColliders() {
      return visualizedColliders.map((collider) => ({
        floor: collider.floor,
        category: collider.category,
        name: collider.name,
        bounds: cloneColliderBounds(collider.collider),
      }));
    },
    dispose() {
      group.removeFromParent();
      for (const { mesh } of visualizedColliders) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      group.clear();
    },
  };
}
