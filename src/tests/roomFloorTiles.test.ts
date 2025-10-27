import { describe, expect, it, vi } from 'vitest';

import { BoxGeometry, MeshStandardMaterial, Texture } from 'three';

import type { RoomDefinition } from '../assets/floorPlan';
import { createRoomFloorTiles } from '../scene/structures/floorTiles';

describe('createRoomFloorTiles', () => {
  const livingRoom: RoomDefinition = {
    id: 'living',
    name: 'Living Room',
    bounds: { minX: -6, maxX: 6, minZ: -8, maxZ: 0 },
    ledColor: 0xffffff,
  };

  const studio: RoomDefinition = {
    id: 'studio',
    name: 'Studio',
    bounds: { minX: -2, maxX: 6, minZ: 0, maxZ: 10 },
    ledColor: 0xff8800,
  };

  const backyard: RoomDefinition = {
    id: 'backyard',
    name: 'Backyard',
    bounds: { minX: -8, maxX: 8, minZ: 10, maxZ: 18 },
    ledColor: 0x00ff00,
    category: 'exterior',
  };

  it('creates a floor tile for each interior room', () => {
    const { group, tiles } = createRoomFloorTiles([
      livingRoom,
      studio,
      backyard,
    ]);

    expect(group.name).toBe('RoomFloorTiles');
    expect(tiles.map((tile) => tile.roomId)).toEqual(['living', 'studio']);

    const livingTile = tiles[0];
    expect(livingTile.mesh.position.x).toBeCloseTo(0);
    expect(livingTile.mesh.position.z).toBeCloseTo(-4);
    // Default thickness of 0.12 lowers the center beneath the elevation (0).
    expect(livingTile.mesh.position.y).toBeCloseTo(-0.06, 5);

    const livingGeometry = livingTile.mesh.geometry as BoxGeometry;
    expect(livingGeometry.parameters.width).toBeCloseTo(12);
    expect(livingGeometry.parameters.depth).toBeCloseTo(8);
    expect(livingGeometry.parameters.height).toBeCloseTo(0.12);
    expect(livingGeometry.getAttribute('uv2')).toBeDefined();
  });

  it('supports exterior rooms, insets, and custom group names', () => {
    const { group, tiles } = createRoomFloorTiles(
      [livingRoom, studio, backyard],
      {
        includeExterior: true,
        inset: 0.5,
        groupName: 'GroundFloor',
      }
    );

    expect(group.name).toBe('GroundFloor');
    expect(tiles.map((tile) => tile.roomId)).toEqual([
      'living',
      'studio',
      'backyard',
    ]);

    const backyardGeometry = tiles[2].mesh.geometry as BoxGeometry;
    // Width and depth shrink by inset from both sides.
    expect(backyardGeometry.parameters.width).toBeCloseTo(15);
    expect(backyardGeometry.parameters.depth).toBeCloseTo(7);
  });

  it('applies custom materials and baked lightmaps per room', () => {
    const texture = new Texture();
    const materialFactory = vi.fn((room: RoomDefinition) => {
      const material = new MeshStandardMaterial({ color: room.ledColor });
      material.name = `material-${room.id}`;
      return material;
    });

    const { tiles } = createRoomFloorTiles([livingRoom, studio], {
      materialFactory,
      lightMap: texture,
      lightMapIntensity: 0.42,
    });

    expect(materialFactory).toHaveBeenCalledTimes(2);
    tiles.forEach((tile) => {
      const material = tile.mesh.material as MeshStandardMaterial;
      expect(material.name).toBe(`material-${tile.roomId}`);
      expect(material.lightMap).toBe(texture);
      expect(material.lightMapIntensity).toBeCloseTo(0.42);
    });
  });

  it('reuses the provided material and honors intensity overrides without a lightmap', () => {
    const sharedMaterial = new MeshStandardMaterial();

    const { tiles } = createRoomFloorTiles([livingRoom], {
      material: sharedMaterial,
      lightMapIntensity: 0.18,
    });

    const tileMaterial = tiles[0].mesh.material as MeshStandardMaterial;
    expect(tileMaterial).toBe(sharedMaterial);
    expect(tileMaterial.lightMapIntensity).toBeCloseTo(0.18);
  });

  it('skips rooms that are too small after inset adjustments', () => {
    const tightRoom: RoomDefinition = {
      id: 'micro',
      name: 'Micro Room',
      bounds: { minX: 0, maxX: 0.1, minZ: 0, maxZ: 0.15 },
      ledColor: 0xffffff,
    };

    const { tiles } = createRoomFloorTiles([tightRoom], { inset: 0.2 });
    expect(tiles).toHaveLength(0);
  });
});
