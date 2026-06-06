import type { Group } from 'three';

import type { FloorId } from '../../systems/movement/stairs';
import type { PoiInstance } from '../poi/markers';
import type { PoiDefinition } from '../poi/types';

export interface FloorVisibilityControllerOptions {
  readonly upperFloorGroup: Group;
  readonly groundPoiGroup: Group;
  readonly groundLedGroups?: readonly (Group | null | undefined)[];
  readonly groundPoiInstances?: readonly PoiInstance[];
}

export interface FloorVisibilityController {
  readonly activeFloorId: FloorId;
  setActiveFloor(next: FloorId): void;
  applyPoiVisibility(poi: PoiInstance): boolean;
}

export function getPoiFloorId(definition: PoiDefinition): FloorId {
  return definition.floorId ?? 'ground';
}

export function isPoiVisibleOnFloor(
  definition: PoiDefinition,
  activeFloorId: FloorId
): boolean {
  return getPoiFloorId(definition) === activeFloorId;
}

export function hidePoiFloorVisuals(poi: PoiInstance): void {
  poi.group.visible = false;
  if (poi.label) {
    poi.label.visible = false;
  }
  if (poi.labelMaterial) {
    poi.labelMaterial.opacity = 0;
  }
  if (poi.visitedBadge) {
    poi.visitedBadge.mesh.visible = false;
  }
  if (poi.visitedHighlight) {
    poi.visitedHighlight.mesh.visible = false;
    poi.visitedHighlight.material.opacity = 0;
  }
  if (poi.halo) {
    poi.halo.visible = false;
  }
  if (poi.haloMaterial) {
    poi.haloMaterial.opacity = 0;
  }
  if (poi.displayHighlight) {
    poi.displayHighlight.mesh.visible = false;
    poi.displayHighlight.material.opacity = 0;
  }
}

export function createFloorVisibilityController(
  options: FloorVisibilityControllerOptions
): FloorVisibilityController {
  let activeFloorId: FloorId = 'ground';

  const setGroundPoiVisibility = (visible: boolean) => {
    options.groundPoiGroup.visible = visible;
    options.groundPoiInstances?.forEach((poi) => {
      if (visible) {
        poi.group.visible = true;
      } else {
        hidePoiFloorVisuals(poi);
      }
    });
  };

  const setGroundLedVisibility = (visible: boolean) => {
    options.groundLedGroups?.forEach((group) => {
      if (group) {
        group.visible = visible;
      }
    });
  };

  const controller: FloorVisibilityController = {
    get activeFloorId() {
      return activeFloorId;
    },
    setActiveFloor(next: FloorId) {
      activeFloorId = next;
      const isUpper = next === 'upper';
      options.upperFloorGroup.visible = isUpper;
      setGroundPoiVisibility(!isUpper);
      setGroundLedVisibility(!isUpper);
    },
    applyPoiVisibility(poi: PoiInstance) {
      const visible = isPoiVisibleOnFloor(poi.definition, activeFloorId);
      if (!visible) {
        hidePoiFloorVisuals(poi);
        return false;
      }
      poi.group.visible = true;
      return true;
    },
  };

  controller.setActiveFloor(activeFloorId);
  return controller;
}
