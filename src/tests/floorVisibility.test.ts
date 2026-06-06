import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createFloorVisibilityController,
  isPoiVisibleOnFloor,
} from '../scene/floors/floorVisibility';
import type { PoiInstance } from '../scene/poi/markers';
import type { PoiDefinition } from '../scene/poi/types';

const createDefinition = (
  overrides: Partial<PoiDefinition> = {}
): PoiDefinition => ({
  id: 'gitshelves-living-room-installation',
  title: 'Gitshelves Installation',
  summary: 'Automation-ready showcase artifact.',
  interactionPrompt: 'Inspect Gitshelves Installation',
  category: 'project',
  interaction: 'inspect',
  roomId: 'livingRoom',
  position: { x: 0, y: 0, z: 0 },
  interactionRadius: 2.4,
  footprint: { width: 2.8, depth: 2.2 },
  ...overrides,
});

const createPoiInstance = (
  definition: PoiDefinition = createDefinition()
): PoiInstance => {
  const group = new Group();
  const labelMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 1,
  });
  const label = new Mesh(new BoxGeometry(1, 1, 1), labelMaterial);
  const visitedMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 1,
  });
  const visitedMesh = new Mesh(new BoxGeometry(1, 1, 1), visitedMaterial);
  const badgeMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  label.visible = true;
  visitedMesh.visible = true;
  badgeMesh.visible = true;
  group.add(label, visitedMesh, badgeMesh);

  return {
    definition,
    group,
    label,
    labelMaterial,
    labelWorldPosition: label.position.clone(),
    floatPhase: 0,
    floatSpeed: 0,
    floatAmplitude: 0,
    activation: 0,
    pulseOffset: 0,
    hitArea: new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()),
    focus: 0,
    focusTarget: 0,
    visualMode: 'pedestal',
    visited: true,
    visitedStrength: 1,
    visitedHighlight: { mesh: visitedMesh, material: visitedMaterial },
    visitedBadge: {
      mesh: badgeMesh,
      material: badgeMesh.material as MeshBasicMaterial,
      baseHeight: 1,
      rotationSpeed: 0,
    },
  };
};

describe('floor visibility controller', () => {
  it('toggles upper floor, ground POI, and ground LED group visibility', () => {
    const upperFloorGroup = new Group();
    const groundPoiGroup = new Group();
    const ledStripGroup = new Group();
    const ledFillLightGroup = new Group();
    const groundPoi = createPoiInstance();
    groundPoiGroup.add(groundPoi.group);

    const controller = createFloorVisibilityController({
      upperFloorGroup,
      groundPoiGroup,
      groundLedGroups: [ledStripGroup, ledFillLightGroup],
      groundPoiInstances: [groundPoi],
    });

    expect(controller.activeFloorId).toBe('ground');
    expect(upperFloorGroup.visible).toBe(false);
    expect(groundPoiGroup.visible).toBe(true);
    expect(ledStripGroup.visible).toBe(true);
    expect(ledFillLightGroup.visible).toBe(true);

    controller.setActiveFloor('upper');

    expect(controller.activeFloorId).toBe('upper');
    expect(upperFloorGroup.visible).toBe(true);
    expect(groundPoiGroup.visible).toBe(false);
    expect(ledStripGroup.visible).toBe(false);
    expect(ledFillLightGroup.visible).toBe(false);
  });

  it('hides ground marker labels and checkmarks while upstairs', () => {
    const groundPoi = createPoiInstance();
    const controller = createFloorVisibilityController({
      upperFloorGroup: new Group(),
      groundPoiGroup: new Group(),
      groundPoiInstances: [groundPoi],
    });

    controller.setActiveFloor('upper');

    expect(controller.applyPoiVisibility(groundPoi)).toBe(false);
    expect(groundPoi.group.visible).toBe(false);
    expect(groundPoi.label?.visible).toBe(false);
    expect(groundPoi.labelMaterial?.opacity).toBe(0);
    expect(groundPoi.visitedBadge?.mesh.visible).toBe(false);
    expect(groundPoi.visitedHighlight?.mesh.visible).toBe(false);
    expect(groundPoi.visitedHighlight?.material.opacity).toBe(0);
  });

  it('preserves existing ground-floor POI marker behavior on the ground floor', () => {
    const groundPoi = createPoiInstance();
    const controller = createFloorVisibilityController({
      upperFloorGroup: new Group(),
      groundPoiGroup: new Group(),
      groundPoiInstances: [groundPoi],
    });

    controller.setActiveFloor('ground');

    expect(controller.applyPoiVisibility(groundPoi)).toBe(true);
    expect(groundPoi.group.visible).toBe(true);
    expect(isPoiVisibleOnFloor(groundPoi.definition, 'ground')).toBe(true);
    expect(isPoiVisibleOnFloor(groundPoi.definition, 'upper')).toBe(false);
  });
});
