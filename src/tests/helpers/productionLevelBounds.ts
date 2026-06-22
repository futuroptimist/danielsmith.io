import { PORTFOLIO_LEVEL } from '../../scene/level/portfolioLevel';
import type {
  Bounds2D,
  FloorDefinition,
  LevelDefinition,
} from '../../scene/level/schema';

const cloneBounds = (bounds: Bounds2D): Bounds2D => ({
  minX: bounds.minX,
  maxX: bounds.maxX,
  minZ: bounds.minZ,
  maxZ: bounds.maxZ,
});

const getProductionFloor = (
  floorId: string,
  level: LevelDefinition = PORTFOLIO_LEVEL
): FloorDefinition => {
  const floor = level.floors.find((candidate) => candidate.id === floorId);
  if (!floor) {
    throw new Error(`Production level floor "${floorId}" was not found.`);
  }
  return floor;
};

export const getProductionRoomBounds = (
  floorId: string,
  roomId: string,
  level: LevelDefinition = PORTFOLIO_LEVEL
): Bounds2D => {
  const floor = getProductionFloor(floorId, level);
  const room = floor.rooms.find((candidate) => candidate.id === roomId);
  if (!room) {
    throw new Error(
      `Production level room "${floorId}:${roomId}" was not found.`
    );
  }
  return cloneBounds(room.bounds);
};

export const getProductionFloorOutlineBounds = (
  floorId: string,
  level: LevelDefinition = PORTFOLIO_LEVEL
): Bounds2D => {
  const floor = getProductionFloor(floorId, level);
  const xs = floor.outline.map(([x]) => x);
  const zs = floor.outline.map(([, z]) => z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
};
