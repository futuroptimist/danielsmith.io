import { Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../assets/floorPlan';
import {
  createFloorVisibilityController,
  createPoiFloorResolver,
} from '../scene/floors/visibilityController';
import type { FloorId } from '../scene/level/floorElevations';
import type { PoiInstance } from '../scene/poi/markers';
import type { PoiDefinition } from '../scene/poi/types';

function createPoi(roomId: string): PoiDefinition {
  return {
    id: `${roomId}-poi`,
    title: roomId,
    category: 'project',
    roomId,
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 2,
    footprint: { width: 1, depth: 1 },
    links: [],
  } as PoiDefinition;
}

function createPoiInstance(roomId: string): PoiInstance {
  const group = new Group();
  const labelMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.75,
  });
  const label = new Mesh(new PlaneGeometry(1, 0.5), labelMaterial);
  label.visible = true;
  const visitedMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.5,
  });
  const visitedRing = new Mesh(new PlaneGeometry(1, 1), visitedMaterial);
  visitedRing.visible = true;
  const visitedBadge = new Mesh(
    new PlaneGeometry(0.5, 0.5),
    new MeshBasicMaterial()
  );
  visitedBadge.visible = true;
  const displayHighlightMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.8,
  });
  const displayHighlight = new Mesh(
    new PlaneGeometry(1, 1),
    displayHighlightMaterial
  );
  displayHighlight.visible = true;
  group.add(label, visitedRing, visitedBadge);

  return {
    definition: createPoi(roomId),
    group,
    hitArea: new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial()),
    label,
    labelMaterial,
    labelWorldPosition: group.position.clone(),
    floatPhase: 0,
    floatSpeed: 0,
    floatAmplitude: 0,
    activation: 0,
    pulseOffset: 0,
    focus: 0,
    focusTarget: 0,
    visualMode: 'pedestal',
    visited: true,
    visitedStrength: 1,
    visitedHighlight: { mesh: visitedRing, material: visitedMaterial },
    visitedBadge: {
      mesh: visitedBadge,
      material: new MeshBasicMaterial(),
      baseHeight: 1,
      rotationSpeed: 0,
    },
    displayHighlight: {
      mesh: displayHighlight,
      material: displayHighlightMaterial,
      baseOpacity: 0.8,
      focusOpacity: 1,
    },
  } as PoiInstance;
}

describe('floor visibility controller', () => {
  it('toggles floor-specific groups and LED groups with the active floor', () => {
    const groundGroup = new Object3D();
    const groundStructureGroup = new Object3D();
    const upperGroup = new Object3D();
    const groundLedGroup = new Object3D();
    const upperLedGroup = new Object3D();
    const controller = createFloorVisibilityController({
      groundGroups: [groundGroup, groundStructureGroup],
      upperGroups: [upperGroup],
      groundLedGroups: [groundLedGroup],
      upperLedGroups: [upperLedGroup],
      getPoiFloorId: () => 'ground',
    });

    expect(groundGroup.visible).toBe(true);
    expect(groundStructureGroup.visible).toBe(true);
    expect(groundLedGroup.visible).toBe(true);
    expect(upperGroup.visible).toBe(false);
    expect(upperLedGroup.visible).toBe(false);

    controller.setActiveFloorId('upper');

    expect(groundGroup.visible).toBe(false);
    expect(groundStructureGroup.visible).toBe(false);
    expect(groundLedGroup.visible).toBe(false);
    expect(upperGroup.visible).toBe(true);
    expect(upperLedGroup.visible).toBe(true);
  });

  it('hides ground POI labels and visited checkmarks on the upper floor', () => {
    const groundPoi = createPoiInstance('studio');
    const controller = createFloorVisibilityController({
      initialFloorId: 'upper',
      poiInstances: [groundPoi],
      getPoiFloorId: createPoiFloorResolver(FLOOR_PLAN_LEVELS),
    });

    expect(controller.isPoiVisibleOnActiveFloor(groundPoi.definition)).toBe(
      false
    );
    expect(groundPoi.group.visible).toBe(false);
    expect(groundPoi.label?.visible).toBe(false);
    expect(groundPoi.labelMaterial?.opacity).toBe(0);
    expect(groundPoi.visitedHighlight?.mesh.visible).toBe(false);
    expect(groundPoi.visitedHighlight?.material.opacity).toBe(0);
    expect(groundPoi.visitedBadge?.mesh.visible).toBe(false);
    expect(groundPoi.displayHighlight?.mesh.visible).toBe(false);
    expect(groundPoi.displayHighlight?.material.opacity).toBe(0);
  });

  it('keeps hidden ground POI chrome suppressed when animations re-apply visuals upstairs', () => {
    const groundPoi = createPoiInstance('studio');
    const controller = createFloorVisibilityController({
      initialFloorId: 'upper',
      poiInstances: [groundPoi],
      getPoiFloorId: createPoiFloorResolver(FLOOR_PLAN_LEVELS),
    });

    groundPoi.label!.visible = true;
    groundPoi.labelMaterial!.opacity = 0.9;
    groundPoi.visitedHighlight!.mesh.visible = true;
    groundPoi.visitedHighlight!.material.opacity = 0.7;
    groundPoi.visitedBadge!.mesh.visible = true;
    groundPoi.displayHighlight!.mesh.visible = true;
    groundPoi.displayHighlight!.material.opacity = 0.6;

    expect(controller.applyPoiVisualState(groundPoi)).toBe(false);
    expect(groundPoi.group.visible).toBe(false);
    expect(groundPoi.label?.visible).toBe(false);
    expect(groundPoi.labelMaterial?.opacity).toBe(0);
    expect(groundPoi.visitedHighlight?.mesh.visible).toBe(false);
    expect(groundPoi.visitedHighlight?.material.opacity).toBe(0);
    expect(groundPoi.visitedBadge?.mesh.visible).toBe(false);
    expect(groundPoi.displayHighlight?.mesh.visible).toBe(false);
    expect(groundPoi.displayHighlight?.material.opacity).toBe(0);
  });

  it('keeps upper POIs visible when the upper floor is active', () => {
    const upperPoi = createPoiInstance('loftLibrary');
    const controller = createFloorVisibilityController({
      initialFloorId: 'upper',
      poiInstances: [upperPoi],
      getPoiFloorId: createPoiFloorResolver(FLOOR_PLAN_LEVELS),
    });

    expect(controller.isPoiVisibleOnActiveFloor(upperPoi.definition)).toBe(
      true
    );
    expect(upperPoi.group.visible).toBe(true);
  });
});

describe('three-floor connection visibility', () => {
  const ids: FloorId[] = ['basement', 'ground', 'upper'];
  const levels = ids.map((id) => ({
    id,
    plan: {
      outline: [] as Array<[number, number]>,
      rooms: [
        {
          id: `${id}Room`,
          name: id,
          ledColor: 0,
          bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
        },
      ],
    },
  }));

  it('shows only the active floor and adjacent stairs, including their rails', () => {
    const floors = ids.map((id) => ({
      id,
      groups: [new Group()],
      lightingGroups: [new Group()],
    }));
    const upstairs = {
      id: 'upstairs',
      lowerFloorId: 'ground' as const,
      upperFloorId: 'upper' as const,
      groups: [new Group(), new Group()],
    };
    const downstairs = {
      id: 'downstairs',
      lowerFloorId: 'basement' as const,
      upperFloorId: 'ground' as const,
      groups: [new Group(), new Group()],
    };
    const pois = ids.map((id) => createPoiInstance(`${id}Room`));
    const controller = createFloorVisibilityController({
      floors,
      connections: [upstairs, downstairs],
      poiInstances: pois,
      getPoiFloorId: createPoiFloorResolver(levels),
    });
    for (const active of ids) {
      controller.setActiveFloorId(active);
      floors.forEach((floor) => {
        expect(floor.groups[0].visible).toBe(floor.id === active);
        expect(floor.lightingGroups[0].visible).toBe(floor.id === active);
      });
      upstairs.groups.forEach((group) =>
        expect(group.visible).toBe(active !== 'basement')
      );
      downstairs.groups.forEach((group) =>
        expect(group.visible).toBe(active !== 'upper')
      );
      pois.forEach((poi, index) => {
        const visible = ids[index] === active;
        expect(controller.isPoiVisibleOnActiveFloor(poi.definition)).toBe(
          visible
        );
        expect(poi.group.visible).toBe(visible);
        if (!visible) {
          expect(poi.label?.visible).toBe(false);
          expect(poi.labelMaterial?.opacity).toBe(0);
          expect(poi.visitedBadge?.mesh.visible).toBe(false);
          expect(poi.visitedHighlight?.mesh.visible).toBe(false);
          expect(poi.displayHighlight?.mesh.visible).toBe(false);
        }
      });
    }
  });

  it('rejects unbuilt visibility IDs instead of falling back to another floor', () => {
    const controller = createFloorVisibilityController({
      getPoiFloorId: () => 'ground',
    });
    expect(() => controller.setActiveFloorId('basement')).toThrow(
      /Unknown floor visibility/
    );
    expect(() => controller.setActiveFloorId('attic' as FloorId)).toThrow(
      /Unknown floor visibility/
    );
    expect(controller.getActiveFloorId()).toBe('ground');
  });

  it('resolves basement rooms and rejects unknown or ambiguous POI membership', () => {
    const resolve = createPoiFloorResolver(levels);
    expect(resolve(createPoi('basementRoom'))).toBe('basement');
    expect(() => resolve(createPoi('missing'))).toThrow(/Unknown POI room/);
    expect(() =>
      createPoiFloorResolver([{ ...levels[0], id: 'attic' }])
    ).toThrow(/Unknown POI floor/);
    expect(() => createPoiFloorResolver([levels[0], levels[0]])).toThrow(
      /Ambiguous POI room/
    );
  });
});
