import type { Object3D } from 'three';

import type { FloorPlanDefinition } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import type { NavMesh } from '../../systems/navigation/navMesh';
import { isFloorId, type FloorId } from '../level/floorElevations';

export interface RuntimeFloor {
  readonly id: FloorId;
  /** World elevation: never multiply by the horizontal floor-plan scale. */
  readonly elevation: number;
  readonly plan: FloorPlanDefinition;
  readonly groups: readonly Object3D[];
  readonly lightingGroups: readonly Object3D[];
  readonly poiGroup: Object3D;
  readonly structureGroup: Object3D;
  readonly colliders: RectCollider[];
  readonly additionalColliderCollections?: readonly (readonly RectCollider[])[];
  readonly navMesh: NavMesh;
}

export interface FloorRegistry {
  get(id: string): RuntimeFloor;
  all(): readonly RuntimeFloor[];
  getSnapshot(): Array<{
    id: FloorId;
    elevation: number;
    roomIds: string[];
    colliderCount: number;
    navigation: RectCollider[];
    visible: boolean;
    lightsVisible: boolean;
  }>;
}

export const getFloorCollisionCollections = (
  floor: RuntimeFloor
): readonly (readonly RectCollider[])[] => [
  floor.colliders,
  ...(floor.additionalColliderCollections ?? []),
];

/** Only built floors are registered; knowing an elevation does not create a room. */
export function createFloorRegistry(
  entries: readonly RuntimeFloor[]
): FloorRegistry {
  const floors = new Map<FloorId, RuntimeFloor>();
  for (const floor of entries) {
    if (!isFloorId(floor.id) || !Number.isFinite(floor.elevation)) {
      throw new Error(`Invalid floor registration '${floor.id}'.`);
    }
    if (floors.has(floor.id)) {
      throw new Error(`Duplicate floor registration '${floor.id}'.`);
    }
    floors.set(floor.id, floor);
  }
  const all = Object.freeze([...floors.values()]);

  return {
    get(id) {
      const floor = isFloorId(id) ? floors.get(id) : undefined;
      if (!floor) throw new Error(`Unknown or unbuilt floor '${id}'.`);
      return floor;
    },
    all: () => all,
    getSnapshot: () =>
      all.map((floor) => ({
        id: floor.id,
        elevation: floor.elevation,
        roomIds: floor.plan.rooms.map((room) => room.id),
        colliderCount: getFloorCollisionCollections(floor).reduce(
          (count, colliders) => count + colliders.length,
          0
        ),
        navigation: floor.navMesh.polygons.map((bounds) => ({ ...bounds })),
        visible: floor.groups.some((group) => group.visible),
        lightsVisible: floor.lightingGroups.some((group) => group.visible),
      })),
  };
}
