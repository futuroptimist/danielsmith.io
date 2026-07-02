import { Mesh, Texture, TextureLoader, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { DEFAULT_LOWER_FLOOR_FURNISHINGS } from '../lowerFloorFurnishings';
import { WALL_THICKNESS } from '../portfolioSceneLayout';
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

const EXPECTED_RENDER_PARTS = [
  'backing',
  'mat',
  'image',
  'left-rail',
  'right-rail',
  'top-rail',
  'bottom-rail',
] as const;

function getPartName(childName: string): string {
  return childName.split(':').at(-1) ?? childName;
}

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

    expect(variants.size).toBeGreaterThan(1);
    expect(WALL_PAINTING_CONFIGS.every((config) => config.size > 0)).toBe(true);
  });

  it('resolves every painting to a visible wall-mounted pose', () => {
    WALL_PAINTING_CONFIGS.forEach((config) => {
      const pose = resolveWallPaintingMountPose(config);
      const normalLength = new Vector3(
        pose.outwardNormal.x,
        pose.outwardNormal.y,
        pose.outwardNormal.z
      ).length();

      expect(['x', 'z']).toContain(pose.wallAxis);
      expect(normalLength).toBeGreaterThan(0);

      if (config.wallOrientation === 'west') {
        expect(pose.wallAxis).toBe('x');
        expect(Math.abs(pose.outwardNormal.x)).toBe(1);
        expect(pose.outwardNormal.z).toBe(0);
        expect(Math.abs(pose.position.x - config.position.x)).toBeGreaterThan(
          0
        );
        expect(Math.sign(pose.position.x - config.position.x)).toBe(
          pose.offsetDirection
        );
      } else {
        expect(pose.wallAxis).toBe('z');
        expect(Math.abs(pose.outwardNormal.z)).toBe(1);
        expect(pose.outwardNormal.x).toBe(0);
        expect(Math.abs(pose.position.z - config.position.z)).toBeGreaterThan(
          0
        );
        expect(Math.sign(pose.position.z - config.position.z)).toBe(
          pose.offsetDirection
        );
      }
    });
  });

  it('mounts the 3D-printer painting on the visible positive side of the interior wall', () => {
    const printerPainting = WALL_PAINTING_CONFIGS.find(
      (config) => config.id === '3d-printer-loft-library-west'
    );

    expect(printerPainting).toBeDefined();

    const pose = resolveWallPaintingMountPose(printerPainting!);
    expect(pose.wallAxis).toBe('x');
    expect(pose.offsetDirection).toBe(1);
    expect(pose.outwardNormal).toEqual({ x: 1, y: 0, z: 0 });
    const interiorWallCenterX = 2 * FLOOR_PLAN_SCALE;
    const wallPositiveFaceX = interiorWallCenterX + WALL_THICKNESS / 2;
    const backingDepth = printerPainting!.frame.backingDepth ?? 0.06;

    expect(printerPainting!.mountSurfaceOffset).toBe(WALL_THICKNESS / 2);
    expect(pose.position.x).toBeGreaterThan(wallPositiveFaceX);
    expect(pose.position.x - backingDepth / 2).toBeGreaterThan(
      wallPositiveFaceX
    );
    expect(pose.position.z).toBeCloseTo(-2);
    expect(pose.rotationY).toBeCloseTo(Math.PI / 2);
  });
});

describe('createWallPaintings', () => {
  beforeEach(() => {
    vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((path) => {
      const texture = new Texture();
      texture.name = `mock:${String(path)}`;
      return texture;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds every painting with backing, mat, image, and four frame rails', () => {
    const build = createWallPaintings();

    [...build.groundGroup.children, ...build.upperGroup.children].forEach(
      (painting) => {
        const partNames = painting.children.map((child) =>
          getPartName(child.name)
        );
        expect(partNames.sort()).toEqual([...EXPECTED_RENDER_PARTS].sort());

        const backing = painting.children.find(
          (child) => getPartName(child.name) === 'backing'
        ) as Mesh | undefined;
        const mat = painting.children.find(
          (child) => getPartName(child.name) === 'mat'
        ) as Mesh | undefined;
        const image = painting.children.find(
          (child) => getPartName(child.name) === 'image'
        ) as Mesh | undefined;

        expect(backing).toBeDefined();
        expect(mat).toBeDefined();
        expect(image).toBeDefined();
        expect(image!.position.z).toBeGreaterThan(mat!.position.z);
        expect(mat!.position.z).toBeGreaterThan(backing!.position.z);
      }
    );

    build.dispose();
  });

  it('places each image plane in front of the backing on the resolved outward side', () => {
    const build = createWallPaintings();
    const allPaintings = [
      ...build.groundGroup.children,
      ...build.upperGroup.children,
    ];

    WALL_PAINTING_CONFIGS.forEach((config) => {
      const painting = allPaintings.find(
        (candidate) => candidate.name === `WallPainting:${config.id}`
      );
      const pose = resolveWallPaintingMountPose(config);

      expect(painting).toBeDefined();

      const image = painting!.children.find(
        (child) => getPartName(child.name) === 'image'
      ) as Mesh | undefined;
      const imageNormal = new Vector3(0, 0, 1).applyEuler(painting!.rotation);

      expect(painting!.position.x).toBeCloseTo(pose.position.x);
      expect(painting!.position.z).toBeCloseTo(pose.position.z);
      expect(painting!.rotation.y).toBeCloseTo(pose.rotationY);
      expect(image).toBeDefined();
      expect(image!.position.z).toBeGreaterThan(0);
      expect(imageNormal.x).toBeCloseTo(pose.outwardNormal.x);
      expect(imageNormal.y).toBeCloseTo(pose.outwardNormal.y);
      expect(imageNormal.z).toBeCloseTo(pose.outwardNormal.z);
    });

    build.dispose();
  });
});
