export type PortfolioFloorId = 'ground' | 'upper';

export const GROUND_FLOOR_ELEVATION = 0;
export const UPPER_FLOOR_ELEVATION = 5;

export const FLOOR_ELEVATION_BY_ID: Readonly<Record<PortfolioFloorId, number>> =
  {
    ground: GROUND_FLOOR_ELEVATION,
    upper: UPPER_FLOOR_ELEVATION,
  };

export const getFloorElevation = (
  floorId: PortfolioFloorId | string
): number => {
  if (floorId === 'ground' || floorId === 'upper') {
    return FLOOR_ELEVATION_BY_ID[floorId];
  }

  throw new Error(`Unknown portfolio floor elevation for floor "${floorId}".`);
};
