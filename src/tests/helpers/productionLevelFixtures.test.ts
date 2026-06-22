import { describe, expect, it } from 'vitest';

import type { LevelDefinition } from '../../scene/level/schema';
import { assertLevelSourceId } from '../../scene/level/sourceIds';

import {
  getProductionFloorBounds,
  getProductionRoomBounds,
} from './productionLevelFixtures';

const expectBoundsToBeCloseTo = (
  actual: ReturnType<typeof getProductionRoomBounds>,
  expected: ReturnType<typeof getProductionRoomBounds>
) => {
  expect(actual.minX).toBeCloseTo(expected.minX);
  expect(actual.maxX).toBeCloseTo(expected.maxX);
  expect(actual.minZ).toBeCloseTo(expected.minZ);
  expect(actual.maxZ).toBeCloseTo(expected.maxZ);
};

const fixtureLevel: LevelDefinition = {
  id: 'fixture-level',
  floors: [
    {
      id: 'ground',
      name: 'Ground',
      outline: [
        [-1, -2],
        [3, -2],
        [3, 4],
        [-1, 4],
      ],
      rooms: [
        {
          id: 'livingRoom',
          sourceId: assertLevelSourceId('ground.livingRoom.room'),
          name: 'Living Room',
          bounds: { minX: -1, maxX: 3, minZ: -2, maxZ: 1 },
          ledColor: 0xffffff,
        },
      ],
      walls: [],
      floorSurfaces: [],
    },
  ],
};

describe('production level fixture helpers', () => {
  it('looks up room bounds by floor and room semantic IDs', () => {
    expectBoundsToBeCloseTo(
      getProductionRoomBounds('ground', 'livingRoom', fixtureLevel),
      {
        minX: -2,
        maxX: 6,
        minZ: -4,
        maxZ: 2,
      }
    );
  });

  it('looks up floor bounds by floor ID', () => {
    expectBoundsToBeCloseTo(getProductionFloorBounds('ground', fixtureLevel), {
      minX: -2,
      maxX: 6,
      minZ: -4,
      maxZ: 8,
    });
  });

  it('returns cloned room bounds', () => {
    const bounds = getProductionRoomBounds(
      'ground',
      'livingRoom',
      fixtureLevel
    );

    bounds.minX = 999;

    expect(
      getProductionRoomBounds('ground', 'livingRoom', fixtureLevel).minX
    ).toBeCloseTo(-2);
  });

  it('throws for missing floors', () => {
    expect(() => getProductionFloorBounds('upper', fixtureLevel)).toThrow(
      'Missing production floor "upper" in level "fixture-level".'
    );
  });

  it('throws for missing rooms', () => {
    expect(() =>
      getProductionRoomBounds('ground', 'studio', fixtureLevel)
    ).toThrow(
      'Missing production room "studio" on floor "ground" in level "fixture-level".'
    );
  });
});
