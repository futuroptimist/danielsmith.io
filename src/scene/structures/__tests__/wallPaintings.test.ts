import { Euler, Mesh, Texture, TextureLoader, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_LOWER_FLOOR_FURNISHINGS } from '../lowerFloorFurnishings';
import {
  WALL_PAINTING_CONFIGS,
  createWallPaintings,
  getFurnishingCenter,
  resolveWallPaintingMountPose,
} from '../wallPaintings';

const EXPECTED_IMAGE_PATHS = [
  '/images/3dprinted_rocket_nosecone.jpg',
  '/images/3dprinter.jpg',
  '/images/democratizedspace.jpg',
  '/images/hydroponic_lamp.jpg',
  '/images/hypercar_grassy.jpg',
  '/images/launch.jpg',
] as const;

const EXPECTED_PART_SUFFIXES = [
  'backing',
  'mat',
  'image',
  'left-rail',
  'right-rail',
  'top-rail',
  'bottom-rail',
] as const;

describe('WALL_PAINTING_CONFIGS', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    expect(variants.size).toBeGreaterThan(1);
    expect(WALL_PAINTING_CONFIGS.every((config) => config.size > 0)).toBe(true);
  });

  it('resolves every painting to an outward-facing north or west wall mount', () => {
    WALL_PAINTING_CONFIGS.forEach((config) => {
      const pose = resolveWallPaintingMountPose(config);
      const normalLength = new Vector3(
        pose.outwardNormal.x,
        pose.outwardNormal.y,
        pose.outwardNormal.z
      ).length();

      expect(['x', 'z']).toContain(pose.wallAxis);
      expect(normalLength).toBeCloseTo(1);

      if (config.wallOrientation === 'west') {
        expect(pose.wallAxis).toBe('x');
        expect(pose.position.z).toBe(config.position.z);
        expect(pose.outwardNormal.x).toBe(pose.offsetDirection);
        expect(pose.outwardNormal.z).toBe(0);
        if (config.wallSide === 'negative') {
          expect(pose.position.x).toBeLessThan(config.position.x);
        } else {
          expect(pose.position.x).toBeGreaterThan(config.position.x);
        }
      } else {
        expect(pose.wallAxis).toBe('z');
        expect(pose.position.x).toBe(config.position.x);
        expect(pose.outwardNormal.x).toBe(0);
        expect(pose.outwardNormal.z).toBe(pose.offsetDirection);
        if (config.wallSide === 'negative') {
          expect(pose.position.z).toBeLessThan(config.position.z);
        } else {
          expect(pose.position.z).toBeGreaterThan(config.position.z);
        }
      }
    });
  });

  it('builds each painting with visible image, mat, backing, and four frame rails', () => {
    vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((path) => {
      const texture = new Texture();
      texture.name = `MockTexture:${path}`;
      return texture;
    });

    const wallPaintings = createWallPaintings();
    const paintings = [
      ...wallPaintings.groundGroup.children,
      ...wallPaintings.upperGroup.children,
    ];

    try {
      expect(paintings).toHaveLength(WALL_PAINTING_CONFIGS.length);

      WALL_PAINTING_CONFIGS.forEach((config) => {
        const group = paintings.find(
          (painting) => painting.name === `WallPainting:${config.id}`
        );
        const pose = resolveWallPaintingMountPose(config);

        expect(group).toBeDefined();
        expect(group!.position.x).toBeCloseTo(pose.position.x);
        expect(group!.position.y).toBeCloseTo(pose.position.y);
        expect(group!.position.z).toBeCloseTo(pose.position.z);
        expect(group!.rotation.y).toBeCloseTo(pose.rotationY);

        EXPECTED_PART_SUFFIXES.forEach((suffix) => {
          expect(
            group!.getObjectByName(`WallPainting:${config.id}:${suffix}`)
          ).toBeDefined();
        });

        const image = group!.getObjectByName(
          `WallPainting:${config.id}:image`
        ) as Mesh;
        const mat = group!.getObjectByName(
          `WallPainting:${config.id}:mat`
        ) as Mesh;
        const backing = group!.getObjectByName(
          `WallPainting:${config.id}:backing`
        ) as Mesh;
        const imageNormal = new Vector3(0, 0, 1).applyEuler(
          new Euler(0, group!.rotation.y, 0)
        );

        expect(image.position.z).toBeGreaterThan(mat.position.z);
        expect(mat.position.z).toBeGreaterThan(backing.position.z);
        expect(imageNormal.x).toBeCloseTo(pose.outwardNormal.x);
        expect(imageNormal.y).toBeCloseTo(pose.outwardNormal.y);
        expect(imageNormal.z).toBeCloseTo(pose.outwardNormal.z);
      });
    } finally {
      wallPaintings.dispose();
    }
  });

  it('mounts the 3D printer image on the negative-X side of the interior west wall', () => {
    const printerPainting = WALL_PAINTING_CONFIGS.find(
      (config) => config.id === '3d-printer-loft-library-west'
    );

    expect(printerPainting).toBeDefined();

    const pose = resolveWallPaintingMountPose(printerPainting!);

    expect(printerPainting!.wallOrientation).toBe('west');
    expect(printerPainting!.wallSide).toBe('negative');
    expect(pose.wallAxis).toBe('x');
    expect(pose.position.x).toBeLessThan(printerPainting!.position.x);
    expect(pose.outwardNormal).toEqual({ x: -1, y: 0, z: 0 });
    expect(pose.rotationY).toBeCloseTo(-Math.PI / 2);
  });
});
