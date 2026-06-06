import type { Object3D } from 'three';

import type { FloorId } from '../../systems/movement/stairs';
import type { PoiInstance } from '../poi/markers';

export interface FloorVisibilityControllerOptions {
  readonly activeFloorId?: FloorId;
  readonly upperFloorGroups?: Object3D[];
  readonly groundPoiInstances?: PoiInstance[];
  readonly upperPoiInstances?: PoiInstance[];
  readonly groundLedGroups?: Object3D[];
  readonly upperLedGroups?: Object3D[];
}

export interface FloorVisibilityController {
  getActiveFloorId(): FloorId;
  setActiveFloorId(next: FloorId): void;
  isPoiVisible(poi: PoiInstance): boolean;
  applyPoiVisibility(poi: PoiInstance): boolean;
}

function setObjectVisible(target: Object3D | undefined, visible: boolean) {
  if (target) {
    target.visible = visible;
  }
}

function hidePoiVisuals(poi: PoiInstance) {
  setObjectVisible(poi.group, false);
  setObjectVisible(poi.label, false);
  setObjectVisible(poi.visitedHighlight?.mesh, false);
  setObjectVisible(poi.visitedBadge?.mesh, false);
  setObjectVisible(poi.halo, false);
  setObjectVisible(poi.displayHighlight?.mesh, false);

  if (poi.labelMaterial) {
    poi.labelMaterial.opacity = 0;
  }
  if (poi.visitedHighlight) {
    poi.visitedHighlight.material.opacity = 0;
  }
  if (poi.visitedBadge) {
    poi.visitedBadge.material.opacity = 0;
  }
  if (poi.haloMaterial) {
    poi.haloMaterial.opacity = 0;
  }
  if (poi.displayHighlight) {
    poi.displayHighlight.material.opacity = 0;
  }
}

function showPoiVisuals(poi: PoiInstance) {
  setObjectVisible(poi.group, true);
}

export function createFloorVisibilityController(
  options: FloorVisibilityControllerOptions
): FloorVisibilityController {
  let activeFloorId = options.activeFloorId ?? 'ground';
  const groundPoiInstances = new Set(options.groundPoiInstances ?? []);
  const upperPoiInstances = new Set(options.upperPoiInstances ?? []);

  const isPoiVisible = (poi: PoiInstance): boolean => {
    if (groundPoiInstances.has(poi)) {
      return activeFloorId === 'ground';
    }
    if (upperPoiInstances.has(poi)) {
      return activeFloorId === 'upper';
    }
    return true;
  };

  const applyPoiVisibility = (poi: PoiInstance): boolean => {
    const visible = isPoiVisible(poi);
    if (visible) {
      showPoiVisuals(poi);
    } else {
      hidePoiVisuals(poi);
    }
    return visible;
  };

  const apply = () => {
    const showUpper = activeFloorId === 'upper';
    for (const group of options.upperFloorGroups ?? []) {
      group.visible = showUpper;
    }
    for (const group of options.groundLedGroups ?? []) {
      group.visible = activeFloorId === 'ground';
    }
    for (const group of options.upperLedGroups ?? []) {
      group.visible = showUpper;
    }
    for (const poi of groundPoiInstances) {
      applyPoiVisibility(poi);
    }
    for (const poi of upperPoiInstances) {
      applyPoiVisibility(poi);
    }
  };

  apply();

  return {
    getActiveFloorId() {
      return activeFloorId;
    },
    setActiveFloorId(next: FloorId) {
      if (activeFloorId === next) {
        apply();
        return;
      }
      activeFloorId = next;
      apply();
    },
    isPoiVisible,
    applyPoiVisibility,
  };
}
