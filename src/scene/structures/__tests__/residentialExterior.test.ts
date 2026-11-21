import { Box3, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { FLOOR_PLAN_SCALE, WALL_THICKNESS } from '../../../assets/floorPlan';
import { createDoorController } from '../../../systems/doors/controller';
import { createExteriorDoorDefinitions } from '../../level/exteriorLayout';
import { generateWallSegmentInstances } from '../../level/generateWalls';
import { PORTFOLIO_LEVEL } from '../../level/portfolioLevel';
import { AVATAR_COLLISION_RADIUS, TARGET_ROOM_CLEAR_HEIGHT } from '../../units';
import { createResidentialExterior } from '../residentialExterior';

describe('original front entry exterior geometry', () => {
  it('shares a single primitive, has source-backed solids and disposes once', () => {
    const doors = createExteriorDoorDefinitions(2).map(createDoorController);
    const build = createResidentialExterior(
      PORTFOLIO_LEVEL.floors.find((floor) => floor.id === 'ground')!,
      2,
      doors
    );
    const geometries = new Set<unknown>();
    build.group.traverse((object) => {
      if (object instanceof Mesh) geometries.add(object.geometry);
    });
    expect(geometries.size).toBe(1);
    expect(
      build.solids.filter(
        (solid) => solid.definition.kind === 'exterior.planter'
      )
    ).toHaveLength(2);
    expect(
      build.solids.filter((solid) =>
        solid.definition.kind.startsWith('garage.')
      )
    ).toHaveLength(2);
    expect(
      build.solids.every(
        (solid) => solid.definition.colliderPolicy?.kind === 'solid'
      )
    ).toBe(true);
    const instanceDisposals: ReturnType<typeof vi.fn>[] = [];
    build.group.traverse((object) => {
      if (object instanceof InstancedMesh) {
        const callback = vi.fn();
        object.addEventListener('dispose', callback);
        instanceDisposals.push(callback);
      }
    });
    const geometry = [...geometries][0] as { dispose(): void };
    const dispose = vi.spyOn(geometry, 'dispose');
    build.dispose();
    build.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(instanceDisposals.length).toBeGreaterThan(0);
    instanceDisposals.forEach((dispose) =>
      expect(dispose).toHaveBeenCalledTimes(1)
    );
    expect(build.getLifecycle().isDisposed).toBe(true);
  });
  it('renders the same authoritative progress as collision and state', () => {
    const doors = createExteriorDoorDefinitions(2).map(createDoorController);
    const build = createResidentialExterior(
      PORTFOLIO_LEVEL.floors.find((floor) => floor.id === 'ground')!,
      2,
      doors
    );
    const door = doors[0];
    const occupant = { x: 28, z: -15, radius: 1.125, floorId: 'ground' };
    door.request(1, occupant);
    door.update(door.definition.duration / 2, occupant);
    build.update();
    const panel = build.group.getObjectByName('DoorPanel:front-door')!;
    expect(panel.position.z).toBeCloseTo(-15 + door.definition.travel / 2);
    expect(panel.children[0].scale.z).toBeCloseTo(door.definition.width);
    const trim = build.group.getObjectByName(
      `Exterior:${door.definition.sourceId}:wood`
    ) as InstancedMesh;
    const unit = new Box3(
      new Vector3(-0.5, -0.5, -0.5),
      new Vector3(0.5, 0.5, 0.5)
    );
    const matrix = new Matrix4();
    const jambs = Array.from({ length: trim.count }, (_, i) => {
      trim.getMatrixAt(i, matrix);
      return unit.clone().applyMatrix4(matrix);
    })
      .filter((bounds) => bounds.min.y < door.definition.height / 2)
      .sort((a, b) => a.min.z - b.min.z);
    expect(jambs).toHaveLength(2);
    expect(jambs[0].max.z).toBeCloseTo(door.definition.blockingBounds.minZ);
    expect(jambs[1].min.z).toBeCloseTo(door.definition.blockingBounds.maxZ);
    expect(door.snapshot().blocked).toBe(true);
    build.dispose();
  });
  it('recesses the wider front panel and its matching sweep into the existing away-from-garage wall', () => {
    const ground = PORTFOLIO_LEVEL.floors.find(
      (floor) => floor.id === 'ground'
    )!;
    const doors =
      createExteriorDoorDefinitions(FLOOR_PLAN_SCALE).map(createDoorController);
    const front = doors.find(
      ({ definition }) => definition.id === 'front-door'
    )!;
    const garage = doors.find(
      ({ definition }) => definition.id === 'house-garage-door'
    )!;
    const d = front.definition;
    const build = createResidentialExterior(ground, FLOOR_PLAN_SCALE, doors);
    const pocket = build.group.getObjectByName(
      `Exterior:${d.sourceId}:slate`
    ) as InstancedMesh;
    const slab = build.group.getObjectByName('DoorPanel:front-door')!
      .children[0];
    const matrix = new Matrix4();
    expect(pocket.count).toBe(1);
    pocket.getMatrixAt(0, matrix);
    const pocketBounds = new Box3(
      new Vector3(-0.5, -0.5, -0.5),
      new Vector3(0.5, 0.5, 0.5)
    ).applyMatrix4(matrix);
    const walls = generateWallSegmentInstances(ground, {
      coordinateScale: FLOOR_PLAN_SCALE,
      baseElevation: 0,
      wallHeight: TARGET_ROOM_CLEAR_HEIGHT,
      wallThickness: WALL_THICKNESS,
      fenceHeight: 2.4,
      fenceThickness: 0.28,
      getRoomCategory: (id) =>
        ground.rooms.find((room) => room.id === id)?.category ?? 'interior',
    });
    const pocketWall = walls.find(
      ({ sourceId, collider: c }) =>
        sourceId === 'ground.living_room.east_wall' &&
        pocketBounds.min.x > c.minX &&
        pocketBounds.max.x < c.maxX &&
        pocketBounds.min.z > c.minZ &&
        pocketBounds.max.z < c.maxZ
    );
    expect(pocketWall).toBeDefined();
    expect(pocketBounds.max.z).toBeLessThan(d.blockingBounds.minZ);
    expect(pocketBounds.max.z).toBeLessThan(
      garage.definition.blockingBounds.minZ
    );
    expect(garage.definition.travel).toBeGreaterThan(0);

    const occupant = {
      ...d.center,
      x: d.center.x + 1.4,
      radius: AVATAR_COLLISION_RADIUS,
      floorId: d.floorId,
    };
    expect(front.snapshot()).toMatchObject({ state: 'closed', blocked: true });
    front.request(1, occupant);
    front.update(d.duration, occupant);
    build.update();
    build.group.updateMatrixWorld(true);
    const open = new Box3().setFromObject(slab);
    expect(pocketBounds.containsBox(open)).toBe(true);
    expect(open.max.z).toBeLessThan(d.blockingBounds.minZ);
    expect(d.sweep.minZ).toBeCloseTo(open.min.z);
    expect(d.sweep.maxZ).toBe(d.blockingBounds.maxZ);
    expect(front.snapshot()).toMatchObject({ state: 'open', blocked: false });
    expect(front.request(0, occupant)).toMatchObject({
      target: 1,
      occupied: true,
    });
    expect(
      front.request(0, { ...occupant, x: d.center.x, z: open.min.z }).occupied
    ).toBe(true);
    const clear = { ...occupant, x: d.center.x + 6 };
    expect(front.request(0, clear)).toMatchObject({
      target: 0,
      occupied: false,
    });
    front.update(d.duration, clear);
    expect(front.snapshot()).toMatchObject({ state: 'closed', blocked: true });
    build.dispose();
  });
});

describe('attached garage overhead visuals', () => {
  it('uses actual panel lower-edge height for the clearance gate', () => {
    const doors = createExteriorDoorDefinitions(2).map(createDoorController);
    const build = createResidentialExterior(
      PORTFOLIO_LEVEL.floors.find((floor) => floor.id === 'ground')!,
      2,
      doors
    );
    const door = doors.find((door) => door.definition.id === 'garage-door')!;
    const outside = { x: 46, z: 4, radius: 1.125, floorId: 'ground' };
    door.request(1, outside);
    const panel = build.group.getObjectByName('DoorPanel:garage-door')!;
    for (const delta of [0.2, 0.3, 0.7, 0.6]) {
      door.update(delta, outside);
      build.update();
      build.group.updateMatrixWorld(true);
      const lowerEdge =
        panel.position.y - (door.definition.height * panel.scale.y) / 2;
      if (door.snapshot().progress < 1)
        expect(lowerEdge).toBeCloseTo(
          door.snapshot().progress * door.definition.height
        );
      expect(door.snapshot().blocked).toBe(lowerEdge + 0.001 < 3.075);
    }
    expect(panel.visible).toBe(false);
    build.dispose();
  });
});

it('cuts away the closed overhead visual inside the garage without changing collision', () => {
  const doors = createExteriorDoorDefinitions(2).map(createDoorController);
  const build = createResidentialExterior(
    PORTFOLIO_LEVEL.floors.find((floor) => floor.id === 'ground')!,
    2,
    doors
  );
  const door = doors.find((door) => door.definition.id === 'garage-door')!;
  build.update({ x: 47, z: 4, floorId: 'ground' });
  expect(build.getCutawaySourceIds()).toEqual(['ground.garage.vehicleDoor']);
  expect(door.snapshot()).toMatchObject({ progress: 0, blocked: true });
  const panel = build.group.getObjectByName('DoorPanel:garage-door')!;
  const slab = panel.children[0] as Mesh;
  const material = slab.material as {
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
  };
  expect(material).toMatchObject({
    opacity: 0.8,
    transparent: true,
    depthWrite: false,
  });
  const front = build.group.getObjectByName('DoorPanel:front-door')!
    .children[0] as Mesh;
  expect((front.material as { opacity: number }).opacity).toBe(1);
  build.update({ x: 53, z: 4, floorId: 'ground' });
  expect(build.getCutawaySourceIds()).toEqual([]);
  expect(material).toMatchObject({
    opacity: 1,
    transparent: false,
    depthWrite: true,
  });
  build.update({ x: 47, z: 4, floorId: 'basement' });
  expect(material).toMatchObject({
    opacity: 1,
    transparent: false,
    depthWrite: true,
  });
  const materialDisposals: ReturnType<typeof vi.fn>[] = [];
  const owned = new Set();
  build.group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const entry of materials) {
      if (owned.has(entry)) continue;
      owned.add(entry);
      materialDisposals.push(vi.spyOn(entry, 'dispose'));
    }
  });
  build.dispose();
  build.dispose();
  materialDisposals.forEach((dispose) =>
    expect(dispose).toHaveBeenCalledTimes(1)
  );
});
