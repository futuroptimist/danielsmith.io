import { Mesh, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';

import {
  WALL_PAINTING_CONFIGS,
  createWallPaintings,
} from '../scene/structures/wallPaintings';

const EXPECTED_IMAGE_PATHS = [
  '/images/3dprinted_rocket_nosecone.jpg',
  '/images/3dprinter.jpg',
  '/images/democratizedspace.jpg',
  '/images/hydroponic_lamp.jpg',
  '/images/hypercar_grassy.jpg',
  '/images/launch.jpg',
];

describe('wall paintings', () => {
  it('places exactly one configured painting for each public image asset', () => {
    expect(WALL_PAINTING_CONFIGS).toHaveLength(6);
    expect(
      WALL_PAINTING_CONFIGS.map(({ imagePath }) => imagePath).sort()
    ).toEqual([...EXPECTED_IMAGE_PATHS].sort());
  });

  it('splits visible wall paintings across north and west walls on both floors', () => {
    expect(
      WALL_PAINTING_CONFIGS.filter(({ floor }) => floor === 'ground')
    ).toHaveLength(3);
    expect(
      WALL_PAINTING_CONFIGS.filter(({ floor }) => floor === 'upper')
    ).toHaveLength(3);
    expect(
      WALL_PAINTING_CONFIGS.every(({ wallOrientation }) =>
        ['north', 'west'].includes(wallOrientation)
      )
    ).toBe(true);
    expect(
      new Set(WALL_PAINTING_CONFIGS.map(({ roomId }) => roomId)).size
    ).toBe(6);
  });

  it('builds framed image planes with SRGB textures and floor metadata', () => {
    const build = createWallPaintings();
    expect(build.group.children).toHaveLength(6);
    build.group.children.forEach((painting) => {
      expect(painting.name).toMatch(/^WallPainting:/);
      expect(['ground', 'upper']).toContain(painting.userData.floor);
      expect(['north', 'west']).toContain(painting.userData.wallOrientation);
      const image = painting.children.find((child) =>
        child.name.endsWith(':image')
      );
      expect(image).toBeInstanceOf(Mesh);
      const material = (image as Mesh).material;
      expect(Array.isArray(material)).toBe(false);
      if (!Array.isArray(material)) {
        expect(material).toBeInstanceOf(MeshBasicMaterial);
        expect((material as MeshBasicMaterial).map?.colorSpace).toBe(
          SRGBColorSpace
        );
      }
      expect(painting.children.length).toBeGreaterThanOrEqual(6);
    });
    build.dispose();
  });
});
