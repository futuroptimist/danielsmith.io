import { PORTFOLIO_LEVEL } from './portfolioLevel';
import type {
  Bounds2D,
  LevelDefinition,
  SemanticRoomDefinition,
} from './schema';

export type ProductionRoomBounds = Readonly<Bounds2D>;

const cloneBounds = (bounds: Bounds2D): Bounds2D => ({ ...bounds });

const findRoom = (
  level: LevelDefinition,
  semanticRoomId: string
): SemanticRoomDefinition | undefined =>
  level.floors
    .flatMap((floor) => floor.rooms)
    .find((room) => room.id === semanticRoomId);

export const getProductionRoomBounds = (
  semanticRoomId: string,
  level: LevelDefinition = PORTFOLIO_LEVEL
): ProductionRoomBounds => {
  const room = findRoom(level, semanticRoomId);
  if (!room) {
    const knownIds = level.floors
      .flatMap((floor) => floor.rooms.map((candidate) => candidate.id))
      .sort();
    throw new Error(
      `Missing production room "${semanticRoomId}". Known rooms: ${knownIds.join(', ')}`
    );
  }

  return Object.freeze(cloneBounds(room.bounds));
};
