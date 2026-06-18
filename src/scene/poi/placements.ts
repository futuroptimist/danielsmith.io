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

const SCENE_OBJECT_POI_PLACEMENTS = Object.fromEntries(
  PORTFOLIO_LEVEL.floors.flatMap((floor) =>
    (floor.sceneObjects ?? []).flatMap((object) => {
      const placement = getSceneObjectPoiPlacement(object);
      return placement ? [[object.id, placement]] : [];
    })
  )
) as Partial<
  Record<
    PoiId,
    {
      roomId: string;
      position: { x: number; y?: number; z: number };
      headingRadians?: number;
    }
  >
>;

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
  // Living room (center-biased spread)
  'gitshelves-living-room-installation': {
    roomId: 'livingRoom',
    position: { x: -15, z: -25 },
    headingRadians: Math.PI * 0.1,
  },
  'danielsmith-portfolio-table': {
    roomId: 'livingRoom',
    position: { x: 3, z: -28 },
    headingRadians: 0,
  },
  'gabriel-studio-sentry': {
    roomId: 'studio',
    position: { x: 2, z: 8 },
    headingRadians: -Math.PI * 0.3,
  },
  'tokenplace-studio-cluster': {
    roomId: 'studio',
    position: { x: 6, z: 2 },
    headingRadians: Math.PI * 0.05,
  },

  // Kitchen (three exhibits around center)
  'f2clipboard-kitchen-console': {
    roomId: 'kitchen',
    position: { x: -20, z: -4 },
    headingRadians: Math.PI * 0.5,
  },
  'sigma-kitchen-workbench': {
    roomId: 'kitchen',
    position: { x: -25, z: 6 },
    headingRadians: Math.PI * 0.1,
  },
};

export function applyManualPoiPlacements(
  defs: PoiDefinition[]
): PoiDefinition[] {
  return defs.map((d) => {
    const override =
      SCENE_OBJECT_POI_PLACEMENTS[d.id] ?? MANUAL_POI_PLACEMENTS[d.id];
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
