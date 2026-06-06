import { BoxGeometry, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { UPPER_FLOOR_PLAN } from '../../../assets/floorPlan';
import { createRoomFloorTiles } from '../floorTiles';

describe('createRoomFloorTiles', () => {
  it('builds opaque upper-floor slabs without sealing the stair landing room', () => {
    const material = new MeshStandardMaterial({
      transparent: false,
      opacity: 1,
      depthWrite: true,
    });
    const build = createRoomFloorTiles(
      UPPER_FLOOR_PLAN.rooms.filter((room) => room.id !== 'upperLanding'),
      {
        material,
        elevation: 4,
        thickness: 0.45,
        groupName: 'UpperFloorTiles',
      }
    );

    expect(build.group.name).toBe('UpperFloorTiles');
    expect(build.tiles.map((tile) => tile.roomId)).not.toContain(
      'upperLanding'
    );
    expect(build.tiles.length).toBeGreaterThan(0);

    for (const tile of build.tiles) {
      const geometry = tile.mesh.geometry as BoxGeometry;
      expect(geometry.parameters.height).toBeCloseTo(0.45);
      expect(tile.mesh.position.y).toBeCloseTo(4 - 0.45 / 2);
      expect(tile.mesh.material).toBe(material);
    }

    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
  });
});
