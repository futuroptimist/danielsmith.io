import { Group, type Object3D } from 'three';

import type { PoiInstance } from '../poi/markers';

export type SceneFloorId = 'ground' | 'upper';

export interface FloorVisibilityGroups {
  /** Ground-level architecture that remains visible unless callers choose otherwise. */
  readonly groundArchitecture?: Object3D;
  /** Ground-only POI markers, labels, badges, and hit/display affordances. */
  readonly groundPoi?: Object3D;
  /** Ground-only LED strip meshes. */
  readonly groundLed?: Object3D;
  /** Ground-only LED fill lights. */
  readonly groundLedFillLights?: Object3D;
  /** Upper-floor-only slab, walls, and landing visuals. */
  readonly upperArchitecture?: Object3D;
}

export interface FloorVisibilityPoiOptions {
  readonly instances: readonly PoiInstance[];
  readonly floorForPoi: (instance: PoiInstance) => SceneFloorId;
}

export interface FloorVisibilityControllerOptions {
  readonly groups?: FloorVisibilityGroups;
  readonly poi?: FloorVisibilityPoiOptions;
}

export interface FloorVisibilityController {
  readonly activeFloor: SceneFloorId;
  setActiveFloor(next: SceneFloorId): void;
  apply(): void;
}

const setGroupVisible = (group: Object3D | undefined, visible: boolean) => {
  if (group) {
    group.visible = visible;
  }
};

export const isPoiOnFloor = (
  instance: PoiInstance,
  floorForPoi: (instance: PoiInstance) => SceneFloorId,
  floorId: SceneFloorId
): boolean => floorForPoi(instance) === floorId;

export const applyPoiFloorVisibility = (
  instances: readonly PoiInstance[],
  floorForPoi: (instance: PoiInstance) => SceneFloorId,
  activeFloor: SceneFloorId
): void => {
  instances.forEach((instance) => {
    const visible = isPoiOnFloor(instance, floorForPoi, activeFloor);
    instance.group.visible = visible;

    if (instance.label && instance.labelMaterial) {
      instance.labelMaterial.opacity = visible
        ? instance.labelMaterial.opacity
        : 0;
      instance.label.visible = visible && instance.labelMaterial.opacity > 0.05;
    }

    if (instance.visitedHighlight) {
      instance.visitedHighlight.material.opacity = visible
        ? instance.visitedHighlight.material.opacity
        : 0;
      instance.visitedHighlight.mesh.visible =
        visible && instance.visitedHighlight.material.opacity > 0.02;
    }

    if (instance.visitedBadge) {
      instance.visitedBadge.mesh.visible = visible && instance.visited;
    }
  });
};

export const applyFloorVisibility = (
  activeFloor: SceneFloorId,
  options: FloorVisibilityControllerOptions
): void => {
  const groups = options.groups ?? {};
  const showingGround = activeFloor === 'ground';

  setGroupVisible(groups.groundArchitecture, true);
  setGroupVisible(groups.groundPoi, showingGround);
  setGroupVisible(groups.groundLed, showingGround);
  setGroupVisible(groups.groundLedFillLights, showingGround);
  setGroupVisible(groups.upperArchitecture, activeFloor === 'upper');

  if (options.poi) {
    applyPoiFloorVisibility(
      options.poi.instances,
      options.poi.floorForPoi,
      activeFloor
    );
  }
};

export const createFloorVisibilityController = (
  options: FloorVisibilityControllerOptions,
  initialFloor: SceneFloorId = 'ground'
): FloorVisibilityController => {
  let activeFloor = initialFloor;

  const controller: FloorVisibilityController = {
    get activeFloor() {
      return activeFloor;
    },
    setActiveFloor(next) {
      activeFloor = next;
      applyFloorVisibility(activeFloor, options);
    },
    apply() {
      applyFloorVisibility(activeFloor, options);
    },
  };

  controller.apply();
  return controller;
};

export const createNamedFloorGroup = (name: string): Group => {
  const group = new Group();
  group.name = name;
  return group;
};
