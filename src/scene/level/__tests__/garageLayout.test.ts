import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { createDoorController } from '../../../systems/doors/controller';
import { createExteriorDoorDefinitions } from '../exteriorLayout';
import { createGarageDoorDefinitions, GARAGE_DOOR } from '../garageLayout';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { validateLevelDefinition } from '../schema';

const ground = PORTFOLIO_LEVEL.floors.find((floor) => floor.id === 'ground')!;

describe('attached garage topology and safety', () => {
  it('connects house, garage and driveway as ground-floor regions', () => {
    expect(validateLevelDefinition(PORTFOLIO_LEVEL).errors).toEqual([]);
    expect(ground.rooms.find((room) => room.id === 'garage')).toMatchObject({
      category: 'interior',
      bounds: { minX: 16, maxX: 25, minZ: -4, maxZ: 8 },
    });
    expect(
      ground.roomConnections?.filter((connection) =>
        connection.rooms.includes('garage')
      )
    ).toHaveLength(2);
    expect(
      ground.walls
        .find((wall) => wall.id === 'studio-east-wall')
        ?.run?.gaps?.some((gap) => gap.label === 'studio-to-garage')
    ).toBe(true);
    expect(
      ground.walls.find((wall) => wall.id === 'garage-east-wall')?.run
        ?.gaps?.[0].label
    ).toBe('garage-to-driveway');
  });
  it('keeps a continuous sidewalk surface across the driveway without overlap', () => {
    const sidewalk = ground.floorSurfaces.find(
      (surface) => surface.roomId === 'sidewalk'
    )!;
    const driveway = ground.floorSurfaces.find(
      (surface) => surface.roomId === 'driveway'
    )!;
    expect(driveway.bounds.maxX).toBe(sidewalk.bounds.minX);
    expect(
      ground.walls.find((wall) => wall.id === 'front-yard-north-boundary')?.run
        ?.start.x
    ).toBe(25);
    expect(
      ground.walls.find((wall) => wall.id === 'garage-south-wall')?.run?.end.x
    ).toBe(25);
  });
  it('requires avatar headroom before opening overhead passability', () => {
    const definition = createGarageDoorDefinitions(FLOOR_PLAN_SCALE).find(
      (door) => door.kind === 'overhead'
    )!;
    expect(definition.width).toBeCloseTo(14);
    expect(definition.height).toBe(4.8);
    expect(definition.clearanceProgress * definition.height).toBeCloseTo(
      GARAGE_DOOR.minimumHeadroom
    );
    const door = createDoorController(definition);
    const outside = { x: 46, z: 4, radius: 0.75, floorId: 'ground' };
    door.request(1, outside);
    expect(door.update(definition.duration * 0.5, outside)).toMatchObject({
      blocked: true,
      state: 'opening',
    });
    expect(door.update(definition.duration * 0.2, outside)).toMatchObject({
      blocked: false,
      state: 'opening',
    });
    door.request(0, outside);
    expect(
      door.update(definition.duration, { ...outside, x: 50 })
    ).toMatchObject({ blocked: false, target: 1, occupied: true });
  });
  it('reopens a moving overhead panel before its headroom collision gate', () => {
    const definition = createGarageDoorDefinitions(FLOOR_PLAN_SCALE).find(
      (door) => door.kind === 'overhead'
    )!;
    const door = createDoorController(definition);
    const outside = { x: 53, z: 4, radius: 0.75, floorId: 'ground' };
    door.request(1, outside);
    door.update(definition.duration, outside);
    door.request(0, outside);
    expect(door.update(definition.duration * 0.1, outside)).toMatchObject({
      progress: 0.9,
      state: 'closing',
      blocked: false,
      occupied: false,
    });
    expect(
      door.update(definition.duration, { ...outside, x: 51.25 })
    ).toMatchObject({ progress: 1, target: 1, occupied: true, blocked: false });
  });
  it('protects both sides of all three doors and never crosses floors', () => {
    const doors = createExteriorDoorDefinitions(FLOOR_PLAN_SCALE);
    expect(doors).toHaveLength(3);
    for (const definition of doors) {
      const door = createDoorController(definition);
      const far = {
        x: definition.center.x - 4,
        z: definition.center.z,
        radius: 0.75,
        floorId: 'ground',
      };
      door.request(1, far);
      door.update(5, far);
      for (const side of [-1, 1]) {
        expect(
          door.request(0, { ...far, x: definition.center.x + side })
        ).toMatchObject({ occupied: true, blocked: false, target: 1 });
      }
      expect(
        door.isInRange({ ...far, x: definition.center.x, floorId: 'basement' })
      ).toBe(false);
    }
  });
});

const clearGarageApproachTitle =
  'keeps the house approach clear without moving or deleting ' +
  'the existing dresser and monstera';
it(clearGarageApproachTitle, async () => {
  const { DEFAULT_LOWER_FLOOR_FURNISHINGS } = await import(
    '../../structures/lowerFloorFurnishings'
  );
  const dresser = DEFAULT_LOWER_FLOOR_FURNISHINGS.find(
    (item) => item.id === 'studio-east-dresser'
  )!;
  const plant = DEFAULT_LOWER_FLOOR_FURNISHINGS.find(
    (item) => item.id === 'studio-monstera'
  )!;
  expect(dresser.position).toEqual({ x: 31, z: 4.1 });
  expect(plant.position).toEqual({ x: 30.6, z: -5.4 });
  const centerZ = createGarageDoorDefinitions(FLOOR_PLAN_SCALE)[0].center.z;
  expect(centerZ).toBeCloseTo(-2);
  for (let x = 29; x <= 35; x += 0.25)
    for (let z = -3.5; z <= -0.5; z += 0.25) {
      for (const bounds of [dresser.solidBounds!, plant.solidBounds!]) {
        const nearestX = Math.max(bounds.minX, Math.min(x, bounds.maxX));
        const nearestZ = Math.max(bounds.minZ, Math.min(z, bounds.maxZ));
        expect(Math.hypot(nearestX - x, nearestZ - z)).toBeGreaterThan(0.75);
      }
    }
});
