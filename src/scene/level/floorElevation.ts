export type FloorElevationId = 'ground' | 'upper';

export const FLOOR_TOP_ELEVATIONS: Readonly<Record<FloorElevationId, number>> =
  {
    ground: 0,
    upper: 5,
  };

export const GROUND_FLOOR_TOP_ELEVATION = FLOOR_TOP_ELEVATIONS.ground;
export const UPPER_FLOOR_TOP_ELEVATION = FLOOR_TOP_ELEVATIONS.upper;

export const isFloorElevationId = (
  floorId: string
): floorId is FloorElevationId => floorId === 'ground' || floorId === 'upper';

export const getFloorTopElevation = (floorId: string): number => {
  if (!isFloorElevationId(floorId)) {
    throw new Error(`Unknown floor elevation id: ${floorId}`);
  }
  return FLOOR_TOP_ELEVATIONS[floorId];
};
