import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import { getFloorTopElevation } from '../level/floorElevations';
import { PORTFOLIO_LEVEL } from '../level/portfolioLevel';
import type { SceneObjectDefinition } from '../level/schema';

import type { PoiDefinition, PoiId } from './types';

const getFloorStandingInteractionAnchorY = (
  floorId: SceneObjectDefinition['floorId']
): number => getFloorTopElevation(floorId) + 0.75;

const getSceneObjectPoiPlacement = (
  object: SceneObjectDefinition
): PoiPlacementOverride | null => {
  if (!object.roomId) return null;
  return {
    roomId: object.roomId,
    position: { ...object.position },
    interactionAnchorPosition: {
      x: object.position.x,
      y: getFloorStandingInteractionAnchorY(object.floorId),
      z: object.position.z,
    },
    headingRadians: object.orientation,
  };
};

type PoiPlacementOverride = {
  roomId: string;
  position: { x: number; y?: number; z: number };
  interactionAnchorPosition?: { x: number; y: number; z: number };
  headingRadians?: number;
};

const toWorldPoiPlacement = (
  placement: PoiPlacementOverride
): PoiPlacementOverride => ({
  ...placement,
  position: {
    ...placement.position,
    x: placement.position.x * FLOOR_PLAN_SCALE,
    z: placement.position.z * FLOOR_PLAN_SCALE,
  },
  interactionAnchorPosition: placement.interactionAnchorPosition
    ? {
        x: placement.interactionAnchorPosition.x * FLOOR_PLAN_SCALE,
        y: placement.interactionAnchorPosition.y,
        z: placement.interactionAnchorPosition.z * FLOOR_PLAN_SCALE,
      }
    : undefined,
});

const SCENE_OBJECT_POI_PLACEMENTS: Record<string, PoiPlacementOverride> =
  Object.fromEntries(
    PORTFOLIO_LEVEL.floors.flatMap((floor) =>
      (floor.sceneObjects ?? []).flatMap((object) => {
        const placement = getSceneObjectPoiPlacement(object);
        return placement ? [[object.id, toWorldPoiPlacement(placement)]] : [];
      })
    )
  );

const getSceneObjectPoiPlacementOverride = (
  id: PoiId
): PoiPlacementOverride | undefined => SCENE_OBJECT_POI_PLACEMENTS[id];

// Manual downstairs placements (world units). TV remains a wall display and is left as-is.
export const MANUAL_POI_PLACEMENTS: Partial<
  Record<
    PoiId,
    {
      roomId: string;
      position: { x: number; y?: number; z: number };
      interactionAnchorPosition?: { x: number; y: number; z: number };
      headingRadians?: number;
    }
  >
> = {
  'futuroptimist-living-room-tv': {
    roomId: 'livingRoom',
    position: { x: -29.5, y: getFloorTopElevation('ground'), z: -29 },
    headingRadians: Math.PI * 0.5,
  },
  'tokenplace-studio-cluster': {
    roomId: 'livingRoom',
    position: { x: -22.34, y: getFloorTopElevation('ground'), z: -22.61 },
    interactionAnchorPosition: {
      x: -22.34,
      y: getFloorStandingInteractionAnchorY('ground'),
      z: -22.61,
    },
    headingRadians: Math.PI * 0.05,
  },
  'sugarkube-backyard-greenhouse': {
    roomId: 'livingRoom',
    position: { x: -8.74, y: getFloorTopElevation('ground'), z: -22.92 },
    interactionAnchorPosition: {
      x: -8.74,
      y: getFloorStandingInteractionAnchorY('ground'),
      z: -22.92,
    },
    headingRadians: Math.PI * 0.55,
  },
  'danielsmith-portfolio-table': {
    roomId: 'kitchen',
    position: { x: -21.6, y: getFloorTopElevation('ground'), z: 1.63 },
    interactionAnchorPosition: {
      x: -21.6,
      y: getFloorStandingInteractionAnchorY('ground'),
      z: 1.63,
    },
    headingRadians: 0,
  },
  'f2clipboard-kitchen-console': {
    roomId: 'creatorsStudio',
    position: { x: -2.8, y: getFloorTopElevation('upper'), z: -11.8 },
    interactionAnchorPosition: {
      x: -2.8,
      y: getFloorStandingInteractionAnchorY('upper'),
      z: -11.8,
    },
    headingRadians: Math.PI * 0.5,
  },
  'sigma-kitchen-workbench': {
    roomId: 'focusPods',
    position: { x: 16.4, y: getFloorTopElevation('upper'), z: 18.2 },
    interactionAnchorPosition: {
      x: 16.4,
      y: getFloorStandingInteractionAnchorY('upper'),
      z: 18.2,
    },
    headingRadians: Math.PI * 0.08,
  },
  'gitshelves-living-room-installation': {
    roomId: 'loftLibrary',
    position: { x: 6.8, y: getFloorTopElevation('upper'), z: -0.8 },
    interactionAnchorPosition: {
      x: 6.8,
      y: getFloorStandingInteractionAnchorY('upper'),
      z: -0.8,
    },
    headingRadians: 0,
  },
  'gabriel-studio-sentry': {
    roomId: 'upperLanding',
    position: { x: 16.8, y: getFloorTopElevation('upper'), z: -24.1 },
    interactionAnchorPosition: {
      x: 16.8,
      y: getFloorStandingInteractionAnchorY('upper'),
      z: -24.1,
    },
    headingRadians: -Math.PI * 0.5,
  },
};

export function applyManualPoiPlacements(
  defs: PoiDefinition[]
): PoiDefinition[] {
  return defs.map((d) => {
    const override =
      getSceneObjectPoiPlacementOverride(d.id) ?? MANUAL_POI_PLACEMENTS[d.id];
    if (!override) return d;
    return {
      ...d,
      roomId: override.roomId ?? d.roomId,
      position: {
        x: override.position.x,
        y: override.position.y ?? d.position.y,
        z: override.position.z,
      },
      interactionAnchorPosition: override.interactionAnchorPosition
        ? { ...override.interactionAnchorPosition }
        : d.interactionAnchorPosition,
      headingRadians: override.headingRadians ?? d.headingRadians,
    };
  });
}

export function getPoiInteractionAnchorPosition(definition: PoiDefinition): {
  x: number;
  y: number;
  z: number;
} {
  return definition.interactionAnchorPosition ?? definition.position;
}
