import { readFileSync } from 'node:fs';

import {
  Box3,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../assets/floorPlan';
import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../scene/avatar/mannequin';
import { createPoiFloorResolver } from '../scene/floors/visibilityController';
import {
  getMiniatureSceneDetailPolicy,
  getSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import { getPoiPhysicalMetadata } from '../scene/poi/physicalMetadata';
import { getPoiDefinitions } from '../scene/poi/registry';
import {
  createMiniatureWorldTransform,
  createPortfolioMiniatureTable,
  createPortfolioTableShell,
  resolveGroundFloorMiniaturePoiPlacements,
  type MiniaturePoiPlacement,
  getPortfolioMiniatureTableVisibleBounds,
} from '../scene/structures/portfolioMiniatureTable';
import { PORTFOLIO_MINIATURE_TABLE_DIMENSIONS } from '../scene/structures/portfolioMiniatureTableContract';
import { STAIRCASE_CONFIG } from '../scene/structures/portfolioSceneLayout';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const poiDefinitions = getPoiDefinitions('en');
const getPoiFloorId = createPoiFloorResolver(FLOOR_PLAN_LEVELS);

const createResolvedPlacements = (
  definitions = poiDefinitions
): MiniaturePoiPlacement[] =>
  definitions
    .filter((definition) => (definition.position.y ?? 0) < 3)
    .map((definition) => ({
      id: definition.id,
      position: {
        x: definition.position.x,
        y: definition.position.y ?? 0,
        z: definition.position.z,
      },
      headingRadians: definition.headingRadians ?? 0,
      floor: 'ground' as const,
      roomId: definition.roomId,
      footprint: definition.footprint,
      definition,
      anchorKind: 'floor',
      placementSource: 'visual-model-anchor',
    }));

function standardMaterialFor(table: ReturnType<typeof build>, name: string) {
  const object = table.group.getObjectByName(name);
  expect(object).toBeInstanceOf(Mesh);
  const material = (object as Mesh).material;
  expect(material).toBeInstanceOf(MeshStandardMaterial);
  return material as MeshStandardMaterial;
}

function build(
  level: 'cinematic' | 'balanced' | 'performance' = 'balanced',
  heading = 0
) {
  return createPortfolioMiniatureTable({
    position: { x: -21.6, y: 0, z: 1.63 },
    orientationRadians: heading,
    tableDetailPolicy: getSceneDetailPolicy(level),
    miniatureDetailPolicy: getMiniatureSceneDetailPolicy(level),
    poiDefinitions,
    poiPlacements: createResolvedPlacements(),
  });
}

const getRoomBounds = (roomId: string) =>
  FLOOR_PLAN_LEVELS.flatMap((level) => level.plan.rooms).find(
    (room) => room.id === roomId
  )?.bounds;

describe('PortfolioMiniatureTable', () => {
  it('resolves only ground-floor miniature placements from visual anchors', () => {
    const definitions = poiDefinitions.slice(0, 4);
    const groundDefinitions = definitions.filter(
      (definition) => (definition.position.y ?? 0) < 3
    );
    const missingGroundId = groundDefinitions[0]?.id;
    const result = resolveGroundFloorMiniaturePoiPlacements(
      definitions,
      (id) => {
        if (id === missingGroundId) return null;
        return {
          worldPosition: new Vector3(10, 0.5, -12),
          worldYaw: Math.PI / 3,
          kind: 'environment',
        };
      },
      (definition) => ((definition.position.y ?? 0) >= 3 ? 'upper' : 'ground')
    );

    expect(result.missingAnchorIds).toEqual(
      missingGroundId ? [missingGroundId] : []
    );
    expect(
      result.placements.every((placement) => placement.floor === 'ground')
    ).toBe(true);
    expect(
      result.placements.every(
        (placement) => placement.placementSource === 'visual-model-anchor'
      )
    ).toBe(true);
    expect(
      result.placements.every((placement) => placement.position.x === 10)
    ).toBe(true);
  });

  it('has a physical metadata contract and unit outer root', () => {
    const metadata = getPoiPhysicalMetadata('danielsmith-portfolio-table');
    expect(metadata?.anchor).toBe('bottom-center');
    expect(metadata?.realWorldReference).toContain('architectural scale model');
    expect(metadata?.realWorldDimensionsMeters).toEqual(
      PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.realWorldDimensionsMeters
    );
    const table = build();
    expect(table.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(table.collider.maxX - table.collider.minX).toBeGreaterThan(0);
    table.dispose();
  });

  it('creates a centered white shell without miniature content', () => {
    const shell = createPortfolioTableShell(getSceneDetailPolicy('cinematic'));
    const bounds = new Box3().setFromObject(shell);
    expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(0);
    expect((bounds.min.z + bounds.max.z) / 2).toBeCloseTo(0);
    expect(shell.getObjectByName('MiniatureWorldRoot')).toBeUndefined();
  });

  it('contains the finite ground-floor miniature topology and every ground-floor POI once', () => {
    const table = build('cinematic');
    expect(table.miniatureWorldRoot.name).toBe('MiniatureWorldRoot');
    expect(
      table.group.getObjectByName('MiniatureGroundFloor:kitchen')
    ).toBeTruthy();
    expect(
      table.group.getObjectByName('MiniatureUpperFloor:focusPods')
    ).toBeUndefined();
    expect(
      table.group
        .getObjectsByProperty('type', 'Mesh')
        .some((object) => object.name.startsWith('MiniatureUpperFloor:'))
    ).toBe(false);
    expect(
      table.group
        .getObjectsByProperty('type', 'Mesh')
        .some((object) => object.name.startsWith('MiniatureUpperFloorRim:'))
    ).toBe(false);
    expect(table.group.getObjectByName('MiniatureBackyard')).toBeTruthy();
    expect(table.group.getObjectByName('MiniatureStaircase')).toBeTruthy();
    const staircaseLandingMatches = table.group.getObjectsByProperty(
      'name',
      'StaircaseLanding'
    );
    expect(staircaseLandingMatches).toHaveLength(1);
    const staircaseLanding = staircaseLandingMatches[0] as Mesh;
    expect(staircaseLanding.position.x).toBeCloseTo(
      STAIRCASE_CONFIG.basePosition.x
    );
    expect(staircaseLanding.position.y).toBeCloseTo(
      STAIRCASE_CONFIG.basePosition.y +
        STAIRCASE_CONFIG.step.count * STAIRCASE_CONFIG.step.rise +
        STAIRCASE_CONFIG.landing.thickness / 2
    );
    const staircaseDirection =
      STAIRCASE_CONFIG.direction === 'negativeZ' ? -1 : 1;
    expect(staircaseLanding.position.z).toBeCloseTo(
      STAIRCASE_CONFIG.basePosition.z +
        staircaseDirection *
          (STAIRCASE_CONFIG.step.run * STAIRCASE_CONFIG.step.count +
            STAIRCASE_CONFIG.landing.depth / 2)
    );
    const landingParameters = (staircaseLanding.geometry as BoxGeometry)
      .parameters;
    expect(landingParameters.width).toBeCloseTo(STAIRCASE_CONFIG.step.width);
    expect(landingParameters.height).toBeCloseTo(
      STAIRCASE_CONFIG.landing.thickness
    );
    expect(landingParameters.depth).toBeCloseTo(STAIRCASE_CONFIG.landing.depth);
    expect(
      table.group.getObjectByName('MiniatureUpperLanding')
    ).toBeUndefined();
    for (const poi of poiDefinitions.filter(
      (definition) => (definition.position.y ?? 0) < 3
    )) {
      const name =
        poi.id === 'danielsmith-portfolio-table'
          ? 'MiniatureSelfProxy'
          : `MiniaturePoi:${poi.id}`;
      const matches = table.group.getObjectsByProperty('name', name);
      expect(matches, poi.id).toHaveLength(1);
      if (poi.id === 'danielsmith-portfolio-table') {
        expect(matches[0]?.scale.toArray()).toEqual([1, 1, 1]);
      } else {
        expect(matches[0]?.children[0]?.scale.x).toBeGreaterThan(0);
      }
    }

    for (const poi of poiDefinitions.filter(
      (definition) => (definition.position.y ?? 0) >= 3
    )) {
      expect(
        table.group.getObjectByName(`MiniaturePoi:${poi.id}`),
        poi.id
      ).toBeUndefined();
    }
    expect(
      table.group.getObjectByName('MiniaturePoi:gabriel-studio-sentry')
    ).toBeUndefined();
    expect(
      table.selfProxy.getObjectByName('MiniatureWorldRoot')
    ).toBeUndefined();
    table.dispose();
  });

  it('includes Wove in complete ground-floor anchor resolution', () => {
    const finiteSelf = createResolvedPlacements().find(
      (placement) => placement.id === 'danielsmith-portfolio-table'
    );
    expect(finiteSelf).toBeDefined();

    const woveDefinition = poiDefinitions.find(
      (definition) => definition.id === 'wove-kitchen-loom'
    )!;
    const groundDefinitions = [
      ...poiDefinitions.filter(
        (definition) => getPoiFloorId(definition) === 'ground'
      ),
      { ...woveDefinition, roomId: 'kitchen' },
    ];

    const result = resolveGroundFloorMiniaturePoiPlacements(
      groundDefinitions,
      (id) => ({
        worldPosition: new Vector3(
          id === 'wove-kitchen-loom' ? -20.5 : 10,
          0.5,
          id === 'wove-kitchen-loom' ? -7.25 : -12
        ),
        worldYaw: id === 'wove-kitchen-loom' ? Math.PI / 4 : Math.PI / 3,
        kind: 'floor',
      }),
      getPoiFloorId,
      finiteSelf
    );

    expect(result.missingAnchorIds).toEqual([]);
    expect(result.placements.map((placement) => placement.id)).toContain(
      'wove-kitchen-loom'
    );

    const table = createPortfolioMiniatureTable({
      position: { x: -21.6, y: 0, z: 1.63 },
      tableDetailPolicy: getSceneDetailPolicy('balanced'),
      miniatureDetailPolicy: getMiniatureSceneDetailPolicy('balanced'),
      poiDefinitions,
      poiPlacements: result.placements,
    });

    expect(
      table.group.getObjectsByProperty('name', 'MiniaturePoi:wove-kitchen-loom')
    ).toHaveLength(1);
    table.dispose();
  });

  it('uses overworld-style material roles without upper-floor geometry', () => {
    const table = build('balanced');
    const ground = standardMaterialFor(
      table,
      'MiniatureGroundFloor:livingRoom'
    );
    const backyard = standardMaterialFor(table, 'MiniatureBackyard');

    expect(ground.name).toBe('MiniatureMaterial:livingRoomFloor');
    expect(ground.color.getHex()).toBe(0x0b1220);
    expect(
      table.group.getObjectByName('MiniatureUpperFloor:focusPods')
    ).toBeUndefined();
    expect(backyard.color.getHex()).toBe(0x052e16);
    const wallMesh = (
      table.group.getObjectsByProperty('type', 'Mesh') as Mesh[]
    ).find(
      (object) =>
        object.name.startsWith('MiniatureWall:') && !object.userData.isFence
    ) as Mesh;
    expect((wallMesh.material as MeshStandardMaterial).color.getHex()).toBe(
      0x111827
    );
    const led = (
      table.group.getObjectsByProperty('type', 'Mesh') as Mesh[]
    ).find((object) => object.name.startsWith('MiniatureLedStrip:')) as Mesh;
    expect(led).toBeInstanceOf(Mesh);
    expect(led.material).toBeInstanceOf(MeshBasicMaterial);

    const architectureColors = new Set<number>();
    table.group.getObjectByName('MiniatureArchitecture')?.traverse((object) => {
      if (
        object instanceof Mesh &&
        object.material instanceof MeshStandardMaterial
      ) {
        architectureColors.add(object.material.color.getHex());
      }
    });
    expect(architectureColors.size).toBeGreaterThanOrEqual(6);
    expect(architectureColors).not.toEqual(new Set([0x808080]));
    table.dispose();
  });

  it('keeps the ground floor dominant and components source-placed', () => {
    const table = build('balanced');
    const opaqueAreas: number[] = [];
    table.group.getObjectByName('MiniatureArchitecture')?.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.userData.opaqueFilledFloor) {
        opaqueAreas.push(object.userData.filledFloorArea as number);
      }
      expect(object.name.startsWith('MiniatureUpperFloor:')).toBe(false);
      expect(object.name.startsWith('MiniatureUpperFloorRim:')).toBe(false);
    });
    expect(Math.max(...opaqueAreas)).toBeGreaterThan(0);
    expect(
      table.group.getObjectByName('MiniatureUpperLanding')
    ).toBeUndefined();

    expect(
      table.group.getObjectByName('component:lighting-visible-fixtures')
    ).toBeUndefined();
    expect(
      table.group.getObjectByName('component:ceiling-panels')
    ).toBeUndefined();
    expect(
      table.group.getObjectByName('component:media-wall-star-bridge')
    ).toBeUndefined();
    expect(
      table.group.getObjectsByProperty('name', 'component:greenhouse')
    ).toHaveLength(1);
    expect(
      table.group.getObjectsByProperty(
        'name',
        'component:multiplayer-projection'
      )
    ).toHaveLength(1);
    table.dispose();
  });

  it('scales key POI proxies to readable miniature footprints', () => {
    const table = build('balanced');
    const token = table.group.getObjectByName(
      'MiniaturePoi:tokenplace-studio-cluster'
    );
    const sugarkube = table.group.getObjectByName(
      'MiniaturePoi:sugarkube-backyard-greenhouse'
    );
    expect(token?.children[0]?.scale.x).toBeGreaterThan(0.5);
    expect(sugarkube?.children[0]?.scale.x).toBeGreaterThan(0.5);
    expect(token?.getObjectByName('tokenplace-monitor-left')).toBeTruthy();
    expect(token?.getObjectByName('tokenplace-monitor-right')).toBeTruthy();
    expect(sugarkube?.getObjectByName('sugarkube-table')).toBeTruthy();
    expect(
      sugarkube?.getObjectByName('sugarkube-yellow-rack-tier-top')
    ).toBeTruthy();
    table.dispose();
  });

  it('places miniature POIs from resolved overworld positions and room floors', () => {
    const table = build('balanced');
    const expected = new Map(poiDefinitions.map((poi) => [poi.id, poi]));
    const cases = [
      'futuroptimist-living-room-tv',
      'sugarkube-backyard-greenhouse',
      'danielsmith-portfolio-table',
      'tokenplace-studio-cluster',
    ] as const;

    for (const id of cases) {
      const poi = expected.get(id);
      expect(poi).toBeDefined();
      const proxyName =
        id === 'danielsmith-portfolio-table'
          ? 'MiniatureSelfProxy'
          : `MiniaturePoi:${id}`;
      const proxy = table.group.getObjectByName(proxyName);
      expect(proxy, id).toBeTruthy();
      expect(proxy?.userData.placementSource).toBe('visual-model-anchor');
      expect(proxy?.position.x).toBeCloseTo(poi!.position.x);
      expect(proxy?.position.y).toBeCloseTo(poi!.position.y ?? 0);
      expect(proxy?.position.z).toBeCloseTo(poi!.position.z);
      expect(proxy?.rotation.y).toBeCloseTo(poi!.headingRadians ?? 0);
      expect(proxy?.userData.sourceWorldPosition).toEqual({
        x: poi!.position.x,
        y: poi!.position.y ?? 0,
        z: poi!.position.z,
      });
    }

    const tv = expected.get('futuroptimist-living-room-tv')!;
    const tvBounds = getRoomBounds(tv.roomId)!;
    expect(tv.roomId).toBe('livingRoom');
    expect(tv.position.x).toBeLessThan(tvBounds.minX + 3);
    expect(tv.position.z).toBeLessThan(-20);

    const sugarkube = expected.get('sugarkube-backyard-greenhouse')!;
    const sugarkubeBounds = getRoomBounds(sugarkube.roomId)!;
    expect(sugarkube.roomId).toBe('livingRoom');
    expect(sugarkube.position.x).toBeCloseTo(-8.74);
    expect(sugarkube.position.z).toBeCloseTo(-22.92);
    expect(sugarkube.position.x).toBeGreaterThanOrEqual(sugarkubeBounds.minX);
    expect(sugarkube.position.x).toBeLessThanOrEqual(sugarkubeBounds.maxX);
    expect(sugarkube.position.z).toBeGreaterThanOrEqual(sugarkubeBounds.minZ);
    expect(sugarkube.position.z).toBeLessThanOrEqual(sugarkubeBounds.maxZ);

    const portfolio = expected.get('danielsmith-portfolio-table')!;
    const portfolioBounds = getRoomBounds(portfolio.roomId)!;
    expect(portfolio.roomId).toBe('kitchen');
    expect(portfolio.position.x).toBeGreaterThanOrEqual(portfolioBounds.minX);
    expect(portfolio.position.x).toBeLessThanOrEqual(portfolioBounds.maxX);

    expect(
      table.group.getObjectByName('MiniaturePoi:gabriel-studio-sentry')
    ).toBeUndefined();
    const poiRoot = table.group.getObjectByName('MiniaturePoiRoot');
    const renderedProxies = poiRoot?.children ?? [];
    expect(renderedProxies.length).toBeGreaterThan(0);
    expect(
      renderedProxies.every((proxy) => proxy.userData.floor === 'ground')
    ).toBe(true);
    table.dispose();
  });

  it('prefers resolved live miniature placements over stale registry positions', () => {
    const staleDefinitions = poiDefinitions.map((definition) =>
      definition.id === 'sugarkube-backyard-greenhouse'
        ? {
            ...definition,
            roomId: 'backyard',
            position: { x: 12, y: 0, z: 26 },
          }
        : definition
    );
    const liveDefinition = poiDefinitions.find(
      (definition) => definition.id === 'sugarkube-backyard-greenhouse'
    )!;
    const livePlacements: MiniaturePoiPlacement[] = staleDefinitions
      .filter((definition) => (definition.position.y ?? 0) < 3)
      .map((definition) => ({
        id: definition.id,
        position:
          definition.id === 'sugarkube-backyard-greenhouse'
            ? { x: -8.74, y: 0, z: -22.92 }
            : definition.position,
        headingRadians:
          definition.id === 'sugarkube-backyard-greenhouse'
            ? Math.PI * 0.55
            : (definition.headingRadians ?? 0),
        floor: (definition.position.y ?? 0) >= 3 ? 'upper' : 'ground',
        roomId:
          definition.id === 'sugarkube-backyard-greenhouse'
            ? 'livingRoom'
            : definition.roomId,
        footprint: definition.footprint,
        definition:
          definition.id === 'sugarkube-backyard-greenhouse'
            ? liveDefinition
            : definition,
        anchorKind: 'floor',
        placementSource: 'visual-model-anchor',
      }));

    const table = createPortfolioMiniatureTable({
      position: { x: -21.6, y: 0, z: 1.63 },
      tableDetailPolicy: getSceneDetailPolicy('balanced'),
      miniatureDetailPolicy: getMiniatureSceneDetailPolicy('balanced'),
      poiDefinitions: staleDefinitions,
      poiPlacements: livePlacements,
    });
    const sugarkube = table.group.getObjectByName(
      'MiniaturePoi:sugarkube-backyard-greenhouse'
    );
    expect(sugarkube?.userData.placementSource).toBe('visual-model-anchor');
    expect(sugarkube?.position.x).toBeCloseTo(-8.74);
    expect(sugarkube?.position.z).toBeCloseTo(-22.92);
    expect(sugarkube?.userData.roomId).toBe('livingRoom');
    expect(sugarkube?.position.z).not.toBeCloseTo(26);
    table.dispose();
  });

  it('keeps first-floor walls visible and avoids ceilings or second-floor blankets', () => {
    const table = build('balanced');
    const allObjects = table.group.getObjectsByProperty(
      'type',
      'Mesh'
    ) as Mesh[];
    const walls = allObjects.filter((object) =>
      object.name.startsWith('MiniatureWall:')
    );
    const leds = allObjects.filter((object) =>
      object.name.startsWith('MiniatureLedStrip:')
    );
    expect(walls.length).toBeGreaterThan(8);
    expect(leds.length).toBeGreaterThan(8);
    for (const wall of walls) {
      expect(wall.visible).toBe(true);
      expect([0x111827, 0x3f2f1f]).toContain(
        (wall.material as MeshStandardMaterial).color.getHex()
      );
    }

    expect(
      allObjects.some((object) =>
        object.name.startsWith('MiniatureUpperFloor:')
      )
    ).toBe(false);
    expect(
      allObjects.some((object) =>
        object.name.startsWith('MiniatureUpperFloorRim:')
      )
    ).toBe(false);
    expect(table.group.getObjectByName('MiniatureCeiling')).toBeUndefined();
    table.dispose();
  });

  it('keeps resolved ground-floor POI proxy centers inside rooms and off walls', () => {
    const table = build('balanced');
    const wallBoxes = table.group
      .getObjectsByProperty('name', 'MiniatureWall:ground')
      .filter((object) => object instanceof Mesh)
      .map((wall) => new Box3().setFromObject(wall));

    for (const poi of poiDefinitions.filter((definition) => {
      const y = definition.position.y ?? 0;
      return (
        y < 1 &&
        ['livingRoom', 'kitchen', 'studio', 'backyard'].includes(
          definition.roomId
        )
      );
    })) {
      const proxyName =
        poi.id === 'danielsmith-portfolio-table'
          ? 'MiniatureSelfProxy'
          : `MiniaturePoi:${poi.id}`;
      const proxy = table.group.getObjectByName(proxyName);
      expect(proxy, poi.id).toBeTruthy();
      const bounds = getRoomBounds(poi.roomId)!;
      expect(proxy!.position.x, poi.id).toBeGreaterThanOrEqual(bounds.minX);
      expect(proxy!.position.x, poi.id).toBeLessThanOrEqual(bounds.maxX);
      expect(proxy!.position.z, poi.id).toBeGreaterThanOrEqual(bounds.minZ);
      expect(proxy!.position.z, poi.id).toBeLessThanOrEqual(bounds.maxZ);

      const proxyBox = new Box3().setFromObject(proxy!);
      const intersectsWall = wallBoxes.some((wallBox) =>
        wallBox.intersectsBox(proxyBox)
      );
      expect(intersectsWall, poi.id).toBe(false);
    }
    table.dispose();
  });

  it('uses one uniform affine mapping for positions and yaw', () => {
    const transform = createMiniatureWorldTransform(Math.PI / 3);
    const a = new Vector3(-20, 0, 2);
    const b = new Vector3(-10, 5, -8);
    const mappedA = transform.mapWorldPosition(a);
    const mappedB = transform.mapWorldPosition(b);
    expect(mappedA.distanceTo(mappedB)).toBeCloseTo(
      a.distanceTo(b) * transform.uniformScale
    );
    expect(transform.inverseMapPosition(mappedB).distanceTo(b)).toBeLessThan(
      1e-6
    );
    expect(transform.mapWorldPosition(new Vector3(0, 0, 0)).y).toBeCloseTo(
      transform.modelBedOffset.y
    );
    expect(
      transform.mapWorldPosition(new Vector3(0, 5, 0)).y -
        transform.modelBedOffset.y
    ).toBeCloseTo(5 * transform.uniformScale);
    expect(transform.mapWorldYaw(1.2)).toBeCloseTo(1.2);

    const table = build('balanced', Math.PI / 3);
    const worldRoot = table.group.getObjectByName('MiniatureWorldRoot');
    expect(worldRoot).toBeTruthy();
    expect(table.group.rotation.y).toBeCloseTo(Math.PI / 3);
    table.update({
      playerWorldPosition: new Vector3(-12, 0, -12),
      playerYaw: 1.2,
      activeFloor: 'ground',
    });
    expect(table.miniaturePlayer.rotation.y).toBeCloseTo(
      transform.mapWorldYaw(1.2)
    );
    expect(
      table.miniaturePlayer.rotation.y - worldRoot!.rotation.y
    ).toBeCloseTo(1.2);
    table.dispose();
  });

  it('keeps miniature proxy naming single-assignment after wrapping content', () => {
    const source = readFileSync(
      'src/scene/structures/portfolioMiniatureTable.ts',
      'utf8'
    );

    expect(source).not.toContain(
      "built.name =\n      poi.id === 'danielsmith-portfolio-table'"
    );
    expect(source).toContain('built.name = `${proxyRoot.name}:Model`;');
  });

  it('updates tiny player exactly and syncs palette without rebuilding', () => {
    const table = build('balanced', Math.PI / 4);
    const before = countObjectTriangles(table.group);
    const world = new Vector3(-12, 2.5, 3);
    table.update({
      playerWorldPosition: world,
      playerYaw: 0.75,
      activeFloor: 'ground',
    });
    expect(table.miniaturePlayer.position.distanceTo(world)).toBeLessThan(1e-6);
    expect(table.miniaturePlayer.rotation.y).toBeCloseTo(0.75);
    expect(
      table.miniaturePlayer.getObjectByName('MiniaturePlayerHead')
    ).toBeTruthy();
    expect(PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT).toBeGreaterThan(2);
    table.setPlayerPalette({
      base: '#ff0000',
      accent: '#00ff00',
      trim: '#0000ff',
    });
    expect(countObjectTriangles(table.group)).toBe(before);
    table.dispose();
    table.update({ playerWorldPosition: new Vector3(), playerYaw: 0 });
  });

  it('fits intended bounds and triangle counts decrease by public quality', () => {
    const totals: number[] = [];
    for (const level of ['cinematic', 'balanced', 'performance'] as const) {
      const table = build(level);
      const bounds = getPortfolioMiniatureTableVisibleBounds(table);
      const size = bounds.getSize(new Vector3());
      expect(size.x).toBeLessThanOrEqual(
        PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.intendedSceneBounds.width
      );
      expect(size.z).toBeLessThanOrEqual(
        PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.intendedSceneBounds.depth
      );
      expect(size.y).toBeLessThanOrEqual(
        PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.intendedSceneBounds.height
      );
      expect(table.triangleStats.tableShell).toBeGreaterThan(0);
      expect(table.triangleStats.tinyPlayer).toBeGreaterThan(0);
      totals.push(table.triangleStats.total);
      table.dispose();
    }
    expect(totals[0]).toBeGreaterThan(totals[1]!);
    expect(totals[1]).toBeGreaterThan(totals[2]!);
  });
});
