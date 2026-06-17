import { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN, FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { createWallSegmentInstances } from '../../../assets/floorPlan/wallSegments';
import { createWallSegmentMeshes } from '../../structures/wallSegmentsMesh';
import { generateWallInstances } from '../generateWalls';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import type { LevelDefinition } from '../schema';
import { assertLevelSourceId } from '../sourceIds';

const wallOptions = {
  baseElevation: 0,
  wallHeight: 3,
  wallThickness: 0.5,
  fenceHeight: 1.2,
  fenceThickness: 0.25,
  getRoomCategory(roomId: string) {
    return roomId === 'backyard' ? 'exterior' : 'interior';
  },
} as const;

describe('generateWallInstances', () => {
  it('matches legacy ground wall bounds while using source wall IDs', () => {
    for (const [floorId, plan] of [['ground', FLOOR_PLAN]] as const) {
      const legacy = createWallSegmentInstances(plan, {
        ...wallOptions,
        floorId,
      });
      const generated = generateWallInstances(PORTFOLIO_LEVEL, {
        ...wallOptions,
        floorId,
        coordinateScale: FLOOR_PLAN_SCALE,
      });

      expect(generated.map(snapshotInstance).sort(compareSnapshots)).toEqual(
        legacy.map(snapshotInstance).sort(compareSnapshots)
      );
      expect(
        generated.every(
          (instance) => !String(instance.sourceId).includes('generated_wall')
        )
      ).toBe(true);
    }
  });

  it('attaches source IDs to every generated wall mesh', () => {
    const material = new MeshBasicMaterial();
    const build = createWallSegmentMeshes({
      instances: generateWallInstances(PORTFOLIO_LEVEL, {
        ...wallOptions,
        floorId: 'ground',
        coordinateScale: FLOOR_PLAN_SCALE,
      }),
      getMaterial: () => material,
    });

    expect(build.meshes.length).toBeGreaterThan(0);
    expect(build.meshes.every((mesh) => mesh.userData.levelSourceId)).toBe(
      true
    );
    expect(
      build.meshes.every(
        (mesh) => mesh.userData.levelSource?.sourceType === 'wall'
      )
    ).toBe(true);
    material.dispose();
  });

  it('reflects declarative wall additions and removals without consuming connections', () => {
    const edited: LevelDefinition = structuredClone(PORTFOLIO_LEVEL);
    const ground = edited.floors.find((floor) => floor.id === 'ground');
    expect(ground).toBeDefined();
    ground!.walls = ground!.walls.filter(
      (wall) => wall.id !== 'living-room-south-wall'
    );
    ground!.walls.push({
      id: 'fixture-short-wall',
      sourceId: assertLevelSourceId('ground.fixture.short_wall'),
      floorId: 'ground',
      wallKind: 'wall',
      rooms: ['livingRoom'],
      segments: [{ start: { x: -4, z: -16 }, end: { x: 0, z: -16 } }],
    });
    ground!.roomConnections = [
      ...(ground!.roomConnections ?? []),
      {
        id: 'fixture-connection',
        sourceId: assertLevelSourceId('ground.fixture.connection'),
        floorId: 'ground',
        rooms: ['livingRoom', 'kitchen'],
      },
    ];

    const generated = generateWallInstances(edited, {
      ...wallOptions,
      floorId: 'ground',
      coordinateScale: FLOOR_PLAN_SCALE,
    });

    expect(
      generated.some(
        (instance) => instance.sourceId === 'ground.living_room.south_wall'
      )
    ).toBe(false);
    expect(
      generated.filter(
        (instance) => instance.sourceId === 'ground.fixture.short_wall'
      )
    ).toHaveLength(1);
    expect(
      generated.some(
        (instance) => instance.sourceId === 'ground.fixture.connection'
      )
    ).toBe(false);
  });
});

function snapshotInstance(
  instance: ReturnType<typeof createWallSegmentInstances>[number]
) {
  return {
    center: roundObject(instance.center),
    dimensions: roundObject(instance.dimensions),
    collider: roundObject(instance.collider),
    isFence: instance.isFence,
    isSharedInterior: instance.isSharedInterior,
    thickness: instance.thickness,
  };
}

function roundObject<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      Number((entry as number).toFixed(6)),
    ])
  ) as T;
}

function compareSnapshots(
  a: ReturnType<typeof snapshotInstance>,
  b: ReturnType<typeof snapshotInstance>
): number {
  return JSON.stringify(a).localeCompare(JSON.stringify(b));
}
