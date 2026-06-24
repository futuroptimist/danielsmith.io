import type { SceneObjectDefinition } from './schema';

export const FLOOR_TOP_ELEVATIONS = {
  ground: 0,
  upper: 5,
} as const;

type FloorTopElevationId = keyof typeof FLOOR_TOP_ELEVATIONS;

export const GROUND_FLOOR_TOP_ELEVATION = FLOOR_TOP_ELEVATIONS.ground;
export const UPPER_FLOOR_TOP_ELEVATION = FLOOR_TOP_ELEVATIONS.upper;

const isFloorTopElevationId = (
  floorId: SceneObjectDefinition['floorId']
): floorId is FloorTopElevationId => floorId in FLOOR_TOP_ELEVATIONS;

export const getFloorTopElevation = (
  floorId: SceneObjectDefinition['floorId']
): number => {
  if (!isFloorTopElevationId(floorId)) {
    throw new Error(`Unknown floor elevation for floor '${floorId}'.`);
  }
  return FLOOR_TOP_ELEVATIONS[floorId];
};
