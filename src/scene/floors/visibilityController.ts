import type { Object3D } from 'three';

import type { FloorPlanLevel } from '../../assets/floorPlan';
import type { FloorId } from '../../systems/movement/stairs';
import type { PoiInstance } from '../poi/markers';
import type { PoiDefinition } from '../poi/types';

export interface FloorVisibilityControllerOptions {
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
  levels: readonly FloorPlanLevel[]
): (poi: PoiDefinition) => FloorId {
  const roomFloorIds = new Map<string, FloorId>();
  levels.forEach((level) => {
    const floorId = level.id === 'upper' ? 'upper' : 'ground';
    level.plan.rooms.forEach((room) => {
      roomFloorIds.set(room.id, floorId);
    });
  });

  return (poi) => roomFloorIds.get(poi.roomId) ?? 'ground';
}

export function createFloorVisibilityController(
  options: FloorVisibilityControllerOptions
): FloorVisibilityController {
  let activeFloorId = options.initialFloorId ?? 'ground';

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
    const showGround = activeFloorId === 'ground';
    setVisible(options.groundGroups, showGround);
    setVisible(options.upperGroups, !showGround);
    setVisible(options.groundLedGroups, showGround);
    setVisible(options.upperLedGroups, !showGround);
    options.poiInstances?.forEach(applyPoiVisualState);
  };

  apply();

  return {
    getActiveFloorId() {
      return activeFloorId;
    },
    setActiveFloorId(next: FloorId) {
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
