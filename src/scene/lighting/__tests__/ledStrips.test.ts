import { BoxGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import type {
  FloorPlanDefinition,
  RoomCategory,
} from '../../../assets/floorPlan';
import { LED_STRIP_DEPTH, createRoomLedStrips } from '../ledStrips';

const TEST_PLAN: FloorPlanDefinition = {
  outline: [
    [0, 0],
    [8, 0],
    [8, 6],
    [0, 6],
  ],
  rooms: [
    {
      id: 'left',
      name: 'Left',
      bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
      ledColor: 0x112233,
      category: 'interior',
    },
    {
      id: 'right',
      name: 'Right',
      bounds: { minX: 4, maxX: 8, minZ: 0, maxZ: 4 },
      ledColor: 0x332211,
      category: 'interior',
    },
    {
      id: 'nook',
      name: 'Nook',
      bounds: { minX: 0, maxX: 0.4, minZ: 4, maxZ: 4.4 },
      ledColor: 0xabcdef,
      category: 'interior',
    },
    {
      id: 'porch',
      name: 'Porch',
      bounds: { minX: 0, maxX: 8, minZ: 4.4, maxZ: 6 },
      ledColor: 0xffffff,
      category: 'exterior',
    },
  ],
};

const categoryByRoom = new Map<string, RoomCategory>(
  TEST_PLAN.rooms.map((room) => [room.id, room.category ?? 'interior'])
);

const getRoomCategory = (roomId: string): RoomCategory =>
  categoryByRoom.get(roomId) ?? 'interior';

describe('createRoomLedStrips', () => {
  it('builds LED strips and fill lights for interior rooms only', () => {
    const build = createRoomLedStrips({
      plan: TEST_PLAN,
      getRoomCategory,
      ledHeight: 3,
      baseColor: 0x101623,
      emissiveIntensity: 2.2,
      fillLightIntensity: 1.4,
      wallThickness: 0.5,
    });

    expect(build.materialsByRoom.size).toBe(3);
    expect(build.materialsByRoom.has('porch')).toBe(false);
    expect(
      build.materials.map((material) => material.emissiveIntensity)
    ).toEqual([2.2, 2.2, 2.2]);

    const interiorRoomIds = ['left', 'right', 'nook'];
    interiorRoomIds.forEach((roomId) => {
      expect(build.fillLightsByRoom.get(roomId)).toBeDefined();
      expect(build.stripMeshesByRoom.get(roomId)).toBeDefined();
    });

    expect(build.fillLights.length).toBe(interiorRoomIds.length * 5);
    expect(build.seasonalTargets.map((target) => target.roomId)).toEqual(
      expect.arrayContaining(interiorRoomIds)
    );
    const rightCenterLight = build.fillLightsByRoom.get('right');
    expect(rightCenterLight?.intensity).toBeCloseTo(1.4);
    const leftTarget = build.seasonalTargets.find(
      (target) => target.roomId === 'left'
    );
    expect(leftTarget?.fillLights).toHaveLength(5);
  });

  it('offsets strips for shared walls and skips segments below the edge buffer', () => {
    const build = createRoomLedStrips({
      plan: TEST_PLAN,
      getRoomCategory,
      ledHeight: 3,
      baseColor: 0x101623,
      emissiveIntensity: 2.2,
      fillLightIntensity: 1.4,
      wallThickness: 0.5,
    });

    const leftStrips = build.stripMeshesByRoom.get('left') ?? [];
    const rightStrips = build.stripMeshesByRoom.get('right') ?? [];
    expect(leftStrips.length).toBeGreaterThan(0);
    expect(rightStrips.length).toBeGreaterThan(0);

    const sharedLeft = leftStrips.find(
      (mesh) => Math.abs(mesh.position.x - 3.64) < 1e-3
    );
    const sharedRight = rightStrips.find(
      (mesh) => Math.abs(mesh.position.x - 4.36) < 1e-3
    );

    expect(sharedLeft).toBeDefined();
    expect(sharedRight).toBeDefined();
    expect(sharedLeft?.position.y).toBeCloseTo(3);
    expect(sharedRight?.position.y).toBeCloseTo(3);

    const sharedLeftGeometry = sharedLeft?.geometry as BoxGeometry | undefined;
    expect(sharedLeftGeometry?.parameters.width).toBeCloseTo(LED_STRIP_DEPTH);

    const nookStrips = build.stripMeshesByRoom.get('nook') ?? [];
    expect(nookStrips).toHaveLength(0);
  });
});
