import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import { compileLegacyFloorPlan } from '../../scene/level/compileLegacyFloorPlan';
import { PORTFOLIO_LEVEL } from '../../scene/level/portfolioLevel';
import type { Bounds2D, LevelDefinition } from '../../scene/level/schema';

const cloneBounds = (bounds: Bounds2D): Bounds2D => ({ ...bounds });

const scaleBounds = (bounds: Bounds2D): Bounds2D => ({
  minX: bounds.minX * FLOOR_PLAN_SCALE,
  maxX: bounds.maxX * FLOOR_PLAN_SCALE,
  minZ: bounds.minZ * FLOOR_PLAN_SCALE,
  maxZ: bounds.maxZ * FLOOR_PLAN_SCALE,
});

const getFloor = (level: LevelDefinition, floorId: string) => {
  const floor = level.floors.find((candidate) => candidate.id === floorId);
  if (!floor) {
    throw new Error(
      `Missing production floor "${floorId}" in level "${level.id}".`
    );
  }
  return floor;
};

export const getProductionRoomBounds = (
  floorId: string,
  roomId: string,
  level: LevelDefinition = PORTFOLIO_LEVEL
): Bounds2D => {
  getFloor(level, floorId);
  const plan = compileLegacyFloorPlan(level, floorId, {
    includeDoorwaysFromWallGaps: true,
  });
  const room = plan.rooms.find((candidate) => candidate.id === roomId);
  if (!room) {
    throw new Error(
      `Missing production room "${roomId}" on floor "${floorId}" in level "${level.id}".`
    );
  }
  return scaleBounds(room.bounds);
};

export const getProductionFloorBounds = (
  floorId: string,
  level: LevelDefinition = PORTFOLIO_LEVEL
): Bounds2D => {
  const floor = getFloor(level, floorId);
  const xs = floor.outline.map(([x]) => x * FLOOR_PLAN_SCALE);
  const zs = floor.outline.map(([, z]) => z * FLOOR_PLAN_SCALE);
  return cloneBounds({
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  });
};
