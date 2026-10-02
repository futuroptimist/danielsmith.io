import type { Object3D } from 'three';

import type { FloorPlanLevel } from '../../assets/floorPlan';
import {
  isConnectionAdjacent,
  type StairConnection,
} from '../../systems/movement/floorConnections';
import { isFloorId, type FloorId } from '../level/floorElevations';
import type { PoiInstance } from '../poi/markers';
import type { PoiDefinition } from '../poi/types';

export interface FloorVisualGroups {
  readonly id: FloorId;
  readonly groups: readonly Object3D[];
  readonly lightingGroups?: readonly Object3D[];
}

export interface FloorVisibilityControllerOptions {
  readonly floors?: readonly FloorVisualGroups[];
  readonly connections?: readonly Pick<
    StairConnection,
    'id' | 'lowerFloorId' | 'upperFloorId' | 'groups'
  >[];
  readonly initialFloorId?: FloorId;
  readonly groundGroups?: Object3D[];
  readonly upperGroups?: Object3D[];
  readonly groundLedGroups?: Object3D[];
  readonly upperLedGroups?: Object3D[];
  readonly poiInstances?: PoiInstance[];
  readonly getPoiFloorId: (poi: PoiDefinition) => FloorId;
}

export interface FloorVisibilityController {
  getActiveFloorId(): FloorId;
  setActiveFloorId(next: FloorId): void;
  isPoiVisibleOnActiveFloor(poi: PoiDefinition): boolean;
  applyPoiVisualState(poi: PoiInstance): boolean;
}

export function createPoiFloorResolver(
  levels: readonly Pick<FloorPlanLevel, 'id' | 'plan'>[]
): (poi: PoiDefinition) => FloorId {
  const roomFloorIds = new Map<string, FloorId>();
  levels.forEach((level) => {
    const floorId = level.id;
    if (!isFloorId(floorId)) throw new Error(`Unknown POI floor '${floorId}'.`);
    level.plan.rooms.forEach((room) => {
      if (roomFloorIds.has(room.id))
        throw new Error(`Ambiguous POI room '${room.id}'.`);
      roomFloorIds.set(room.id, floorId);
    });
  });

  return (poi) => {
    const floorId = roomFloorIds.get(poi.roomId);
    if (!floorId) throw new Error(`Unknown POI room '${poi.roomId}'.`);
    return floorId;
  };
}

export function createFloorVisibilityController(
  options: FloorVisibilityControllerOptions
): FloorVisibilityController {
  const floors = options.floors ?? [
    {
      id: 'ground' as const,
      groups: options.groundGroups ?? [],
      lightingGroups: options.groundLedGroups,
    },
    {
      id: 'upper' as const,
      groups: options.upperGroups ?? [],
      lightingGroups: options.upperLedGroups,
    },
  ];
  const floorIds = new Set(floors.map((floor) => floor.id));
  if (
    floorIds.size !== floors.length ||
    floors.some((floor) => !isFloorId(floor.id))
  ) {
    throw new Error('Invalid or duplicate floor visibility registration.');
  }
  const assertFloor = (id: FloorId) => {
    if (!floorIds.has(id)) throw new Error(`Unknown floor visibility '${id}'.`);
  };
  options.connections?.forEach((connection) => {
    assertFloor(connection.lowerFloorId);
    assertFloor(connection.upperFloorId);
  });
  let activeFloorId = options.initialFloorId ?? 'ground';
  assertFloor(activeFloorId);

  const setVisible = (
    objects: readonly Object3D[] | undefined,
    visible: boolean
  ) => {
    objects?.forEach((object) => {
      object.visible = visible;
    });
  };

  const isPoiVisibleOnActiveFloor = (poi: PoiDefinition): boolean =>
    options.getPoiFloorId(poi) === activeFloorId;

  const applyPoiVisualState = (poi: PoiInstance): boolean => {
    const visible = isPoiVisibleOnActiveFloor(poi.definition);
    poi.group.visible = visible;

    if (!visible) {
      if (poi.labelMaterial) {
        poi.labelMaterial.opacity = 0;
      }
      if (poi.label) {
        poi.label.visible = false;
      }
      if (poi.visitedHighlight) {
        poi.visitedHighlight.material.opacity = 0;
        poi.visitedHighlight.mesh.visible = false;
      }
      if (poi.visitedBadge) {
        poi.visitedBadge.mesh.visible = false;
      }
      if (poi.displayHighlight) {
        poi.displayHighlight.material.opacity = 0;
        poi.displayHighlight.mesh.visible = false;
      }
    }

    return visible;
  };

  const apply = () => {
    floors.forEach((floor) => {
      setVisible(floor.groups, floor.id === activeFloorId);
      setVisible(floor.lightingGroups, floor.id === activeFloorId);
    });
    options.connections?.forEach((connection) => {
      setVisible(
        connection.groups,
        isConnectionAdjacent(connection, activeFloorId)
      );
    });
    options.poiInstances?.forEach(applyPoiVisualState);
  };

  apply();

  return {
    getActiveFloorId() {
      return activeFloorId;
    },
    setActiveFloorId(next: FloorId) {
      assertFloor(next);
      if (activeFloorId === next) {
        return;
      }
      activeFloorId = next;
      apply();
    },
    isPoiVisibleOnActiveFloor,
    applyPoiVisualState,
  };
}
