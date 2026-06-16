import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createColliderDebugId } from '../colliderVisualizer';
import { createSolidDebugId, createSolidVisualizer } from '../solidVisualizer';

const createSolid = (name = 'solid') => {
  const mesh = new Mesh(
    new BoxGeometry(1, 2, 3),
    new MeshBasicMaterial({ color: 'red' })
  );
  mesh.name = name;
  return mesh;
};

const getOverlayCounts = (
  visualizer: ReturnType<typeof createSolidVisualizer>
) => ({
  labels: visualizer.group.children.filter((child) => child.type === 'Sprite')
    .length,
  wireframes: visualizer.group.children.filter(
    (child) => child.type === 'LineSegments'
  ).length,
});

describe('createSolidDebugId', () => {
  const metadata = {
    name: 'Wall',
    path: 'Scene/Wall',
    parentPath: 'Scene',
    meshType: 'Mesh',
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 2, z: 3 } },
    material: 'MeshBasicMaterial:#ff0000',
  };

  it('is deterministic, uppercase hex, and changes for meaningful metadata', () => {
    expect(createSolidDebugId(metadata)).toBe(createSolidDebugId(metadata));
    expect(createSolidDebugId(metadata)).toMatch(/^[0-9A-F]{6}$/);
    expect(createSolidDebugId(metadata)).not.toBe(
      createSolidDebugId({ ...metadata, path: 'Scene/WallMoved' })
    );
  });

  it('avoids reserved collider IDs', () => {
    const colliderId = createColliderDebugId({
      floor: 'ground',
      category: 'walls',
      name: 'reserved',
      bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
    });
    expect(createSolidDebugId(metadata, new Set([colliderId]))).not.toBe(
      colliderId
    );
  });
});

describe('createSolidVisualizer', () => {
  it('registers mesh solids, excludes debug-only meshes, and returns metadata copies', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const solid = createSolid('VisibleWall');
    const debugOnly = createSolid('DebugColliderMesh');
    debugOnly.userData.debugOnly = true;
    scene.add(solid, debugOnly);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    const solids = visualizer.getSolids();
    expect(solids).toHaveLength(1);
    expect(solids[0]).toMatchObject({ name: 'VisibleWall', meshType: 'Mesh' });
    expect(visualizer.getSolidById(solids[0].id)).toEqual(solids[0]);
    solids[0].bounds.min.x = 99;
    expect(visualizer.getSolids()[0].bounds.min.x).not.toBe(99);
  });

  it('reads levelSourceId userData and looks up solid metadata by source ID', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const solid = createSolid('SourceWall');
    solid.userData.levelSourceId = 'wall:gallery:east';
    scene.add(solid);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    expect(visualizer.getSolids()[0]).toMatchObject({
      name: 'SourceWall',
      sourceId: 'wall:gallery:east',
    });
    expect(visualizer.getSolidBySourceId('wall:gallery:east')).toEqual(
      visualizer.getSolids()[0]
    );
    expect(visualizer.getSolidsBySourceId('wall:gallery:east')).toEqual([
      visualizer.getSolids()[0],
    ]);
  });

  it('reads nested levelSource userData metadata without changing solid IDs', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const solid = createSolid('NestedSourceWall');
    solid.userData.levelSource = {
      sourceId: 'floor:studio:main',
      sourceType: 'floor-surface',
      purpose: 'rendering',
    };
    scene.add(solid);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    const [solidMetadata] = visualizer.getSolids();
    const comparisonScene = new Group();
    comparisonScene.name = 'Scene';
    comparisonScene.add(createSolid('NestedSourceWall'));
    const comparisonVisualizer = createSolidVisualizer({ enabled: true });
    comparisonVisualizer.register(comparisonScene);

    const { sourceId, sourceType, purpose } = solidMetadata;
    expect(solidMetadata.id).toBe(comparisonVisualizer.getSolids()[0].id);
    expect({ sourceId, sourceType, purpose }).toEqual({
      sourceId: 'floor:studio:main',
      sourceType: 'floor-surface',
      purpose: 'rendering',
    });
  });

  it('keeps objects without source IDs compatible with existing lookups', () => {
    const scene = new Group();
    scene.name = 'Scene';
    scene.add(createSolid('OrdinaryWall'));

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    expect(visualizer.getSolids()[0]).not.toHaveProperty('sourceId');
    expect(visualizer.getSolidBySourceId('')).toBeUndefined();
    expect(visualizer.getSolidBySourceId(null)).toBeUndefined();
    expect(visualizer.getSolidBySourceId('missing')).toBeUndefined();
    expect(visualizer.getSolidsBySourceId(1234)).toEqual([]);
  });

  it('creates matching non-raycasting debug wireframes and labels without ID collisions', () => {
    const scene = new Group();
    scene.name = 'Scene';
    scene.add(createSolid('WallA'), createSolid('WallB'));
    const reservedId = createColliderDebugId({
      floor: 'ground',
      category: 'walls',
      name: 'WallA',
      bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
    });

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene, new Set([reservedId]));

    const solids = visualizer.getSolids();
    expect(new Set(solids.map((solid) => solid.id)).size).toBe(solids.length);
    expect(solids.some((solid) => solid.id === reservedId)).toBe(false);

    const wireframe = visualizer.group.children.find(
      (child) => child.type === 'LineSegments'
    );
    const label = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    );
    expect(wireframe?.userData.debugOnly).toBe(true);
    expect(label?.userData.debugOnly).toBe(true);
    expect(wireframe?.raycast({} as never, [] as never)).toBeUndefined();
    expect(label?.raycast({} as never, [] as never)).toBeUndefined();
    expect(
      (
        wireframe as { material: { color: { getHex(): number } } }
      ).material.color.getHex()
    ).toBe(
      (
        label as { material: { color: { getHex(): number } } }
      ).material.color.getHex()
    );
  });

  it('registers stable scene solids while hiding currently ineffective entries', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const visible = createSolid('VisibleWall');
    const ownHidden = createSolid('OwnHiddenWall');
    ownHidden.visible = false;
    const hiddenParent = new Group();
    hiddenParent.visible = false;
    hiddenParent.add(createSolid('HiddenAncestorWall'));
    const debugParent = new Group();
    debugParent.userData.debugOnly = true;
    debugParent.add(createSolid('DebugChildWall'));
    const poiHit = createSolid('POI_HIT:demo');
    const transparentHitArea = createSolid('TransparentInteractionHitArea');
    transparentHitArea.material.transparent = true;
    transparentHitArea.material.opacity = 0;
    const player = createSolid('PlayerAvatarMesh');
    const mannequin = createSolid('PortfolioMannequinCollisionProxy');
    scene.add(
      visible,
      ownHidden,
      hiddenParent,
      debugParent,
      poiHit,
      transparentHitArea,
      player,
      mannequin
    );

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    expect(
      visualizer
        .getSolids()
        .map((solid) => solid.name)
        .sort()
    ).toEqual(['HiddenAncestorWall', 'OwnHiddenWall', 'VisibleWall']);
    expect(visualizer.getState()).toMatchObject({
      totalSolidCount: 3,
      visibleSolidCount: 1,
      visibleLabelCount: 1,
    });

    hiddenParent.visible = true;
    visualizer.update();

    expect(visualizer.getState()).toMatchObject({
      totalSolidCount: 3,
      visibleSolidCount: 2,
      visibleLabelCount: 2,
    });
  });

  it('excludes POI marker implementation children while keeping ordinary solids', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const poiGroup = new Group();
    poiGroup.name = 'POI:futuroptimist-living-room-tv';
    poiGroup.add(createSolid(''));
    poiGroup.add(createSolid('Halo'));
    poiGroup.add(createSolid('MarkerLabel'));
    const transparentHit = createSolid('POI_HIT:futuroptimist-living-room-tv');
    transparentHit.material.transparent = true;
    transparentHit.material.opacity = 0;
    scene.add(poiGroup, transparentHit, createSolid('OrdinarySceneWall'));

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    expect(visualizer.getSolids().map((solid) => solid.name)).toEqual([
      'OrdinarySceneWall',
    ]);
    expect(visualizer.getState()).toMatchObject({
      totalSolidCount: 1,
      visibleSolidCount: 1,
      visibleLabelCount: 1,
    });
  });

  it('keeps multiplayer projection solids while excluding player/avatar meshes', () => {
    const scene = new Group();
    scene.name = 'Scene';
    scene.add(createSolid('BackyardMultiplayerProjection'));
    scene.add(createSolid('MultiplayerProjectionPanel'));
    scene.add(createSolid('PlayerControllerMesh'));
    scene.add(createSolid('PlayerAvatarMesh'));

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    expect(
      visualizer
        .getSolids()
        .map((solid) => solid.name)
        .sort()
    ).toEqual(['BackyardMultiplayerProjection', 'MultiplayerProjectionPanel']);
  });

  it('registers own-hidden animated solids and shows them after they become visible', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const animatedHidden = createSolid('FlywheelDocsCallout');
    animatedHidden.visible = false;
    scene.add(animatedHidden);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    expect(visualizer.getSolids().map((solid) => solid.name)).toEqual([
      'FlywheelDocsCallout',
    ]);
    expect(visualizer.getState()).toMatchObject({
      totalSolidCount: 1,
      visibleSolidCount: 0,
      visibleLabelCount: 0,
    });

    animatedHidden.visible = true;
    visualizer.update();

    expect(visualizer.getState()).toMatchObject({
      totalSolidCount: 1,
      visibleSolidCount: 1,
      visibleLabelCount: 1,
    });
  });

  it('registers opacity-animated solids but hides them while fully transparent', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const animated = createSolid('SigmaWorkbenchHologram');
    animated.material.transparent = true;
    animated.material.opacity = 0;
    scene.add(animated);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    expect(visualizer.getSolids().map((solid) => solid.name)).toEqual([
      'SigmaWorkbenchHologram',
    ]);
    expect(visualizer.getState()).toMatchObject({
      totalSolidCount: 1,
      visibleSolidCount: 0,
      visibleLabelCount: 0,
    });

    animated.material.opacity = 1;
    visualizer.update();

    expect(visualizer.getState()).toMatchObject({
      totalSolidCount: 1,
      visibleSolidCount: 1,
      visibleLabelCount: 1,
    });
  });

  it('does not duplicate overlays after repeated enable-disable cycles', () => {
    const scene = new Group();
    scene.name = 'Scene';
    scene.add(createSolid('WallA'), createSolid('WallB'));
    const visualizer = createSolidVisualizer();

    visualizer.register(scene);
    const initialCounts = getOverlayCounts(visualizer);
    visualizer.setEnabled(true);
    visualizer.setEnabled(false);
    visualizer.setEnabled(true);

    expect(getOverlayCounts(visualizer)).toEqual(initialCounts);
    expect(visualizer.getState()).toMatchObject({
      enabled: true,
      totalSolidCount: 2,
      totalLabelCount: 2,
      visibleSolidCount: 2,
      visibleLabelCount: 2,
    });
  });

  it('does not leave computed bounding boxes on source geometry', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const solid = createSolid('NoSourceBoundingBoxMutation');
    solid.geometry.boundingBox = null;
    scene.add(solid);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    expect(visualizer.getSolids()).toHaveLength(1);
    expect(solid.geometry.boundingBox).toBeNull();
  });

  it('updates animated solid transforms and keeps solid labels out of collider metadata', () => {
    const scene = new Group();
    scene.name = 'Scene';
    const visible = createSolid('AnimatedWall');
    scene.add(visible);

    const visualizer = createSolidVisualizer({ enabled: true });
    visualizer.register(scene);

    const wireframe = visualizer.group.children.find(
      (child) => child.type === 'LineSegments'
    );
    const label = visualizer.group.children.find(
      (child) => child.type === 'Sprite'
    );
    expect(label?.userData.colliderDebugLabel).toBeUndefined();

    visible.position.x = 4;
    visualizer.update();
    expect(wireframe?.position.x).toBe(4);
  });
});
