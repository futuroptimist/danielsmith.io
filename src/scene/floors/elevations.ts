import type { FloorId } from '../../systems/movement/stairs';

export const GROUND_FLOOR_ELEVATION = 0;
export const UPPER_FLOOR_ELEVATION = 5;

export const FLOOR_ELEVATION_BY_ID: Readonly<Record<FloorId, number>> = {
  ground: GROUND_FLOOR_ELEVATION,
  upper: UPPER_FLOOR_ELEVATION,
};

export const getFloorElevation = (floorId: FloorId): number =>
  FLOOR_ELEVATION_BY_ID[floorId];
