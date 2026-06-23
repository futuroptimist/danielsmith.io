import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import { PORTFOLIO_LEVEL } from '../level/portfolioLevel';
import type { SceneObjectDefinition } from '../level/schema';

import type { PoiDefinition, PoiId } from './types';

const getSceneObjectPoiPlacement = (
  object: SceneObjectDefinition
): {
  roomId: string;
  position: { x: number; y?: number; z: number };
  headingRadians?: number;
} | null => {
  if (!object.roomId) return null;
  return {
    roomId: object.roomId,
    position: { ...object.position },
    headingRadians: object.orientation,
  };
};

type PoiPlacementOverride = {
  roomId: string;
  position: { x: number; y?: number; z: number };
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
      headingRadians?: number;
    }
  >
> = {
  'futuroptimist-living-room-tv': {
    roomId: 'livingRoom',
    position: { x: -31.68, y: 0.75, z: -24 },
    headingRadians: Math.PI * 0.5,
  },
  'tokenplace-studio-cluster': {
    roomId: 'livingRoom',
    position: { x: -22.34, y: 0.75, z: -22.61 },
    headingRadians: Math.PI * 0.05,
  },
  'sugarkube-backyard-greenhouse': {
    roomId: 'livingRoom',
    position: { x: -8.74, y: 0.75, z: -22.92 },
    headingRadians: Math.PI * 0.55,
  },
  'danielsmith-portfolio-table': {
    roomId: 'kitchen',
    position: { x: -21.6, y: 0.75, z: 1.63 },
    headingRadians: 0,
  },
  'f2clipboard-kitchen-console': {
    roomId: 'focusPods',
    position: { x: -0.63, y: 4.91, z: 14.03 },
    headingRadians: Math.PI * 0.5,
  },
  'sigma-kitchen-workbench': {
    roomId: 'focusPods',
    position: { x: 16.59, y: 4.91, z: 17.66 },
    headingRadians: Math.PI * 0.1,
  },
  'gitshelves-living-room-installation': {
    roomId: 'focusPods',
    position: { x: -16.87, y: 4.91, z: 17.23 },
    headingRadians: Math.PI * 0.1,
  },
  'gabriel-studio-sentry': {
    roomId: 'creatorsStudio',
    position: { x: -17.28, y: 4.91, z: -7.02 },
    headingRadians: -Math.PI * 0.3,
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
      headingRadians: override.headingRadians ?? d.headingRadians,
    };
  });
}
