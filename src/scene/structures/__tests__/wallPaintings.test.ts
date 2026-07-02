import { Mesh, Texture, TextureLoader, Vector3 } from 'three';
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

const REQUIRED_PARTS = [
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

  it('resolves each painting to a visible wall-mounted pose on its wall axis', () => {
    WALL_PAINTING_CONFIGS.forEach((config) => {
      const pose = resolveWallPaintingMountPose(config);
      const normalLength = Math.hypot(
        pose.outwardNormal.x,
        pose.outwardNormal.y,
        pose.outwardNormal.z
      );

      expect(['x', 'z']).toContain(pose.wallAxis);
      expect(normalLength).toBeGreaterThan(0);
      expect(pose.outwardNormal.y).toBe(0);

      if (config.wallOrientation === 'west') {
        expect(pose.wallAxis).toBe('x');
        expect(pose.position.z).toBeCloseTo(config.position.z);
        expect(pose.outwardNormal.x).toBe(pose.offsetDirection);
        expect(pose.outwardNormal.z).toBe(0);
        expect(Math.sign(pose.position.x - config.position.x)).toBe(
          pose.offsetDirection
        );
      } else {
        expect(pose.wallAxis).toBe('z');
        expect(pose.position.x).toBeCloseTo(config.position.x);
        expect(pose.outwardNormal.x).toBe(0);
        expect(pose.outwardNormal.z).toBe(pose.offsetDirection);
        expect(Math.sign(pose.position.z - config.position.z)).toBe(
          pose.offsetDirection
        );
      }
    });
  });

  it('builds backing, mat, image plane, and four frame rails for every painting', () => {
    vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((path) => {
      const texture = new Texture();
      texture.name = `MockTexture:${String(path)}`;
      return texture;
    });

    const build = createWallPaintings();
    const paintings = [
      ...build.groundGroup.children,
      ...build.upperGroup.children,
    ];

    expect(paintings).toHaveLength(WALL_PAINTING_CONFIGS.length);

    paintings.forEach((painting) => {
      REQUIRED_PARTS.forEach((partName) => {
        const part = painting.getObjectByName(`${painting.name}:${partName}`);
        expect(part, `${painting.name} missing ${partName}`).toBeInstanceOf(
          Mesh
        );
      });
    });

    build.dispose();
  });

  it('keeps each image plane in front of its backing on the resolved outward side', () => {
    vi.spyOn(TextureLoader.prototype, 'load').mockReturnValue(new Texture());

    const build = createWallPaintings();
    const worldNormal = new Vector3();
    const expectedNormal = new Vector3();

    WALL_PAINTING_CONFIGS.forEach((config) => {
      const floorGroup =
        config.floor === 'upper' ? build.upperGroup : build.groundGroup;
      const painting = floorGroup.getObjectByName(`WallPainting:${config.id}`)!;
      const backing = painting.getObjectByName(`${painting.name}:backing`)!;
      const image = painting.getObjectByName(`${painting.name}:image`)!;
      const pose = resolveWallPaintingMountPose(config);

      image.getWorldPosition(worldNormal);
      backing.getWorldPosition(expectedNormal);
      worldNormal.sub(expectedNormal);
      expectedNormal.set(
        pose.outwardNormal.x,
        pose.outwardNormal.y,
        pose.outwardNormal.z
      );

      expect(worldNormal.dot(expectedNormal)).toBeGreaterThan(0);
      const resolvedImageNormal = new Vector3(0, 0, 1).applyEuler(
        painting.rotation
      );
      expect(resolvedImageNormal.x).toBeCloseTo(expectedNormal.x);
      expect(resolvedImageNormal.y).toBeCloseTo(expectedNormal.y);
      expect(resolvedImageNormal.z).toBeCloseTo(expectedNormal.z);
    });

    build.dispose();
  });

  it('mounts the upstairs 3D-printer image on the negative-X side of its interior wall', () => {
    const printerPainting = WALL_PAINTING_CONFIGS.find(
      (config) => config.id === '3d-printer-loft-library-west'
    )!;
    const pose = resolveWallPaintingMountPose(printerPainting);

    expect(printerPainting.imagePath).toBe('/images/3dprinter.jpg');
    expect(printerPainting.wallOrientation).toBe('west');
    expect(printerPainting.surfaceSide).toBe('negative');
    expect(pose.wallAxis).toBe('x');
    expect(pose.outwardNormal).toEqual({ x: -1, y: 0, z: 0 });
    expect(pose.position.x).toBeLessThan(printerPainting.position.x);
    expect(pose.rotationY).toBeCloseTo(-Math.PI / 2);
  });
});
