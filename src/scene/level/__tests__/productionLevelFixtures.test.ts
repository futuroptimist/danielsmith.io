import { describe, expect, it } from 'vitest';

import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { getProductionRoomBounds } from '../productionLevelFixtures';

const findProductionRoomBounds = (roomId: string) =>
  PORTFOLIO_LEVEL.floors
    .flatMap((floor) => floor.rooms)
    .find((room) => room.id === roomId)?.bounds;

describe('production level fixture helpers', () => {
  it('returns cloned canonical room bounds by semantic room ID', () => {
    const expected = findProductionRoomBounds('backyard');
    const bounds = getProductionRoomBounds('backyard');

    expect(bounds).toEqual(expected);
    expect(bounds).not.toBe(expected);
    expect(Object.isFrozen(bounds)).toBe(true);
  });

  it('throws a useful error for missing room IDs', () => {
    expect(() => getProductionRoomBounds('missing-room')).toThrow(
      /Missing production room "missing-room".+backyard/s
    );
  });
});
