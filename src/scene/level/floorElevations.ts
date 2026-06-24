import type { FloorDefinition, SceneObjectDefinition } from './schema';

export type FloorId = FloorDefinition['id'];

export const FLOOR_TOP_ELEVATIONS = {
  ground: 0,
  upper: 5,
} as const satisfies Record<string, number>;

export const GROUND_FLOOR_TOP_ELEVATION = FLOOR_TOP_ELEVATIONS.ground;
export const UPPER_FLOOR_TOP_ELEVATION = FLOOR_TOP_ELEVATIONS.upper;

export const getFloorTopElevation = (
  floorId: FloorId | SceneObjectDefinition['floorId']
): number => {
  const elevation =
    FLOOR_TOP_ELEVATIONS[floorId as keyof typeof FLOOR_TOP_ELEVATIONS];
  if (elevation === undefined) {
    throw new Error(`Unknown floor elevation for floor '${floorId}'.`);
  }
  return elevation;
};
