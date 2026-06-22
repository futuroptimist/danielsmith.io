import { PORTFOLIO_LEVEL } from '../../scene/level/portfolioLevel';
import type { Bounds2D } from '../../scene/level/schema';

const cloneBounds = (bounds: Bounds2D): Bounds2D => ({ ...bounds });

export const getProductionRoomBounds = (roomId: string): Bounds2D => {
  for (const floor of PORTFOLIO_LEVEL.floors) {
    const room = floor.rooms.find((candidate) => candidate.id === roomId);
    if (room) return cloneBounds(room.bounds);
  }

  throw new Error(`Missing production room "${roomId}" in PORTFOLIO_LEVEL.`);
};

export const getProductionFloorBounds = (floorId: string): Bounds2D => {
  const floor = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === floorId
  );
  if (!floor) {
    throw new Error(
      `Missing production floor "${floorId}" in PORTFOLIO_LEVEL.`
    );
  }

  const xs = floor.outline.map(([x]) => x);
  const zs = floor.outline.map(([, z]) => z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
};
