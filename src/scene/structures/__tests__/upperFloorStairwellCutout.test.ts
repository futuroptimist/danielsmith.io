import { BoxGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { createRoomFloorTiles } from '../floorTiles';

const upperLandingRoom = {
  id: 'upperLanding',
  name: 'Upper Landing',
  bounds: { minX: 4, maxX: 20, minZ: -32, maxZ: -16 },
  ledColor: 0xffba52,
  doorways: [],
};

const opening = { minX: 9, maxX: 15, minZ: -31.5, maxZ: -10 };

describe('upper floor stairwell cutout', () => {
  it('does not leave any upper landing floor mesh fully covering the stairwell opening', () => {
    const result = createRoomFloorTiles([upperLandingRoom], {
      elevation: 4,
      thickness: 0.4,
      cutoutsByRoom: { upperLanding: [opening] },
    });

    const clippedOpening = {
      ...opening,
      maxZ: upperLandingRoom.bounds.maxZ,
    };

    result.tiles.forEach(({ mesh }) => {
      const geometry = mesh.geometry as BoxGeometry;
      const halfWidth = geometry.parameters.width / 2;
      const halfDepth = geometry.parameters.depth / 2;
      const bounds = {
        minX: mesh.position.x - halfWidth,
        maxX: mesh.position.x + halfWidth,
        minZ: mesh.position.z - halfDepth,
        maxZ: mesh.position.z + halfDepth,
      };

      expect(
        bounds.minX <= clippedOpening.minX &&
          bounds.maxX >= clippedOpening.maxX &&
          bounds.minZ <= clippedOpening.minZ &&
          bounds.maxZ >= clippedOpening.maxZ
      ).toBe(false);
    });
  });
});
