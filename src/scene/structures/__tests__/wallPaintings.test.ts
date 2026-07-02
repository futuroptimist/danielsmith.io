import { describe, expect, it } from 'vitest';

import { DEFAULT_LOWER_FLOOR_FURNISHINGS } from '../lowerFloorFurnishings';
import { WALL_PAINTING_CONFIGS, getFurnishingCenter } from '../wallPaintings';

const EXPECTED_IMAGE_PATHS = [
  '/images/3dprinted_rocket_nosecone.jpg',
  '/images/3dprinter.jpg',
  '/images/democratizedspace.jpg',
  '/images/hydroponic_lamp.jpg',
  '/images/hypercar_grassy.jpg',
  '/images/launch.jpg',
] as const;

describe('WALL_PAINTING_CONFIGS', () => {
  it('places exactly one painting for each public image asset', () => {
    expect(WALL_PAINTING_CONFIGS).toHaveLength(EXPECTED_IMAGE_PATHS.length);
    expect(
      WALL_PAINTING_CONFIGS.map((config) => config.imagePath).sort()
    ).toEqual([...EXPECTED_IMAGE_PATHS].sort());
  });

  it('keeps paintings on visible west or north walls across both floors', () => {
    expect(
      WALL_PAINTING_CONFIGS.filter((config) => config.floor === 'ground')
    ).toHaveLength(3);
    expect(
      WALL_PAINTING_CONFIGS.filter((config) => config.floor === 'upper')
    ).toHaveLength(3);

    expect(
      new Set(WALL_PAINTING_CONFIGS.map((config) => config.wallOrientation))
    ).toEqual(new Set(['north', 'west']));
    expect(
      WALL_PAINTING_CONFIGS.every((config) =>
        ['north', 'west'].includes(config.wallOrientation)
      )
    ).toBe(true);
  });

  it('centers the dresser painting from lower-floor furnishing geometry', () => {
    const dresser = DEFAULT_LOWER_FLOOR_FURNISHINGS.find(
      (definition) => definition.id === 'living-room-south-bookcase-west'
    );
    const rocketPainting = WALL_PAINTING_CONFIGS.find(
      (config) => config.id === 'rocket-nosecone-living-room-north'
    );

    expect(dresser?.solidBounds).toBeDefined();
    expect(rocketPainting).toBeDefined();

    const dresserCenter = getFurnishingCenter(dresser!.id);
    expect(rocketPainting!.position.x).toBeCloseTo(dresserCenter.x);
    expect(rocketPainting!.position.z).toBeCloseTo(dresserCenter.z);
  });

  it('varies the frame treatments while keeping square image dimensions', () => {
    const variants = new Set(
      WALL_PAINTING_CONFIGS.map((config) =>
        [
          config.frame.frameColor,
          config.frame.matColor,
          config.frame.frameThickness,
          config.frame.frameDepth,
          config.frame.matBorder,
          config.size,
        ].join(':')
      )
    );

    expect(variants.size).toBe(WALL_PAINTING_CONFIGS.length);
    expect(WALL_PAINTING_CONFIGS.every((config) => config.size > 0)).toBe(true);
  });
});
