import {
  BoxGeometry,
  Mesh,
  PlaneGeometry,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';
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

  it('resolves each painting to a wall-mounted pose on the allowed axes', () => {
    WALL_PAINTING_CONFIGS.forEach((config) => {
      const pose = resolveWallPaintingMountPose(config);
      const normal = new Vector3(
        pose.outwardNormal.x,
        pose.outwardNormal.y,
        pose.outwardNormal.z
      );

      expect(['x', 'z']).toContain(pose.wallAxis);
      expect(normal.length()).toBeCloseTo(1);

      if (config.wallOrientation === 'west') {
        expect(pose.wallAxis).toBe('x');
        expect(Math.abs(pose.outwardNormal.x)).toBe(1);
        expect(pose.outwardNormal.z).toBe(0);
        expect(Math.sign(pose.position.x - config.position.x)).toBe(
          Math.sign(pose.outwardNormal.x)
        );
      } else {
        expect(pose.wallAxis).toBe('z');
        expect(Math.abs(pose.outwardNormal.z)).toBe(1);
        expect(pose.outwardNormal.x).toBe(0);
        expect(Math.sign(pose.position.z - config.position.z)).toBe(
          Math.sign(pose.outwardNormal.z)
        );
      }
    });
  });

  it('mounts the 3D-printer painting on the west side of the interior wall', () => {
    const config = WALL_PAINTING_CONFIGS.find(
      (entry) => entry.id === '3d-printer-loft-library-west'
    );

    expect(config).toBeDefined();

    const pose = resolveWallPaintingMountPose(config!);
    expect(config!.surfaceSide).toBe('negative');
    expect(pose.wallAxis).toBe('x');
    expect(pose.outwardNormal).toMatchObject({ x: -1, y: 0, z: 0 });
    expect(pose.position.x).toBeLessThan(config!.position.x);
    expect(pose.rotation.y).toBeCloseTo(-Math.PI / 2);
  });

  it('builds visible painting parts with image planes in front of the backing', () => {
    vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(
      () => new Texture()
    );

    const build = createWallPaintings();
    const paintings = [
      ...build.groundGroup.children,
      ...build.upperGroup.children,
    ];

    expect(paintings).toHaveLength(WALL_PAINTING_CONFIGS.length);

    paintings.forEach((painting) => {
      const config = WALL_PAINTING_CONFIGS.find(
        (entry) => painting.name === `WallPainting:${entry.id}`
      );
      expect(config).toBeDefined();

      const expectedParts = [
        'backing',
        'mat',
        'image',
        'left-rail',
        'right-rail',
        'top-rail',
        'bottom-rail',
      ];
      const childrenByPart = new Map(
        painting.children.map((child) => [child.name.split(':').at(-1), child])
      );

      expectedParts.forEach((part) =>
        expect(childrenByPart.has(part)).toBe(true)
      );
      expect(painting.children).toHaveLength(expectedParts.length);

      expect(childrenByPart.get('backing')).toBeInstanceOf(Mesh);
      expect((childrenByPart.get('backing') as Mesh).geometry).toBeInstanceOf(
        BoxGeometry
      );
      expect((childrenByPart.get('mat') as Mesh).geometry).toBeInstanceOf(
        PlaneGeometry
      );
      expect((childrenByPart.get('image') as Mesh).geometry).toBeInstanceOf(
        PlaneGeometry
      );

      const pose = resolveWallPaintingMountPose(config!);
      const normal = new Vector3(
        pose.outwardNormal.x,
        pose.outwardNormal.y,
        pose.outwardNormal.z
      );
      const image = childrenByPart.get('image')!;
      const backing = childrenByPart.get('backing')!;

      painting.updateWorldMatrix(true, true);
      const imageWorldPosition = image.getWorldPosition(new Vector3());
      const backingWorldPosition = backing.getWorldPosition(new Vector3());
      const imageNormal = new Vector3(0, 0, 1)
        .applyQuaternion(image.getWorldQuaternion(image.quaternion.clone()))
        .normalize();

      expect(imageNormal.dot(normal)).toBeCloseTo(1);
      expect(
        imageWorldPosition.sub(backingWorldPosition).dot(normal)
      ).toBeGreaterThan(0);
    });

    build.dispose();
  });
});
