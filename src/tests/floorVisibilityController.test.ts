import { Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../assets/floorPlan';
import {
  createFloorVisibilityController,
  createPoiFloorResolver,
} from '../scene/floors/visibilityController';
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
    const upperGroup = new Object3D();
    const groundLedGroup = new Object3D();
    const upperLedGroup = new Object3D();
    const controller = createFloorVisibilityController({
      groundGroups: [groundGroup],
      upperGroups: [upperGroup],
      groundLedGroups: [groundLedGroup],
      upperLedGroups: [upperLedGroup],
      getPoiFloorId: () => 'ground',
    });

    expect(groundGroup.visible).toBe(true);
    expect(groundLedGroup.visible).toBe(true);
    expect(upperGroup.visible).toBe(false);
    expect(upperLedGroup.visible).toBe(false);

    controller.setActiveFloorId('upper');

    expect(groundGroup.visible).toBe(false);
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
