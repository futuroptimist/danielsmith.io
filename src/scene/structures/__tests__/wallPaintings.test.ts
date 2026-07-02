import { describe, expect, it } from 'vitest';

import { WALL_PAINTING_CONFIGS } from '../wallPaintings';

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

  it('centers the dresser painting by accounting for the anchored frame edge', () => {
    const dresserCenterX = -24;
    const rocketPainting = WALL_PAINTING_CONFIGS.find(
      (config) => config.id === 'rocket-nosecone-living-room-north'
    );

    expect(rocketPainting).toBeDefined();
    const frameSize =
      rocketPainting!.size +
      rocketPainting!.frame.matBorder * 2 +
      rocketPainting!.frame.frameThickness * 2;

    expect(rocketPainting!.position.x + frameSize / 2).toBeCloseTo(
      dresserCenterX
    );
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
