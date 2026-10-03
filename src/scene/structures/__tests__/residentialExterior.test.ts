import { InstancedMesh, Mesh } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { createDoorController } from '../../../systems/doors/controller';
import { createExteriorDoorDefinitions } from '../../level/exteriorLayout';
import { PORTFOLIO_LEVEL } from '../../level/portfolioLevel';
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
    const occupant = { x: 28, z: -15, radius: 0.75, floorId: 'ground' };
    door.request(1, occupant);
    door.update(door.definition.duration / 2, occupant);
    build.update();
    const panel = build.group.getObjectByName('DoorPanel:front-door')!;
    expect(panel.position.z).toBeCloseTo(-15 + door.definition.travel / 2);
    expect(door.snapshot().blocked).toBe(true);
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
    const outside = { x: 46, z: 4, radius: 0.75, floorId: 'ground' };
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
      expect(door.snapshot().blocked).toBe(lowerEdge + 0.001 < 3.1);
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
  expect((slab.material as { opacity: number }).opacity).toBe(0.22);
  build.update({ x: 53, z: 4, floorId: 'ground' });
  expect(build.getCutawaySourceIds()).toEqual([]);
  expect((slab.material as { opacity: number }).opacity).toBe(1);
  build.dispose();
});
