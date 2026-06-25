import {
  Box3,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';

import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../scene/avatar/mannequin';
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
  getPortfolioMiniatureTableVisibleBounds,
} from '../scene/structures/portfolioMiniatureTable';
import { PORTFOLIO_MINIATURE_TABLE_DIMENSIONS } from '../scene/structures/portfolioMiniatureTableContract';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const poiDefinitions = getPoiDefinitions('en');

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
  });
}

describe('PortfolioMiniatureTable', () => {
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

  it('contains the finite miniature topology and every POI once', () => {
    const table = build('cinematic');
    expect(table.miniatureWorldRoot.name).toBe('MiniatureWorldRoot');
    expect(
      table.group.getObjectByName('MiniatureGroundFloor:kitchen')
    ).toBeTruthy();
    expect(
      table.group.getObjectByName('MiniatureUpperFloor:focusPods')
    ).toBeTruthy();
    expect(table.group.getObjectByName('MiniatureBackyard')).toBeTruthy();
    expect(table.group.getObjectByName('MiniatureStaircase')).toBeTruthy();
    expect(table.group.getObjectByName('MiniatureUpperLanding')).toBeTruthy();
    for (const poi of poiDefinitions) {
      const name =
        poi.id === 'danielsmith-portfolio-table'
          ? 'MiniatureSelfProxy'
          : `MiniaturePoi:${poi.id}`;
      const matches = table.group.getObjectsByProperty('name', name);
      expect(matches, poi.id).toHaveLength(1);
      if (poi.id === 'danielsmith-portfolio-table') {
        expect(matches[0]?.scale.toArray()).toEqual([1, 1, 1]);
      } else {
        expect(matches[0]?.scale.x).toBeGreaterThanOrEqual(1.6);
      }
    }
    expect(
      table.selfProxy.getObjectByName('MiniatureWorldRoot')
    ).toBeUndefined();
    table.dispose();
  });

  it('uses overworld-style material roles with a transparent upper-floor cutaway', () => {
    const table = build('balanced');
    const ground = standardMaterialFor(
      table,
      'MiniatureGroundFloor:livingRoom'
    );
    const upper = standardMaterialFor(table, 'MiniatureUpperFloor:focusPods');
    const upperRim = standardMaterialFor(
      table,
      'MiniatureUpperFloorRim:focusPods:north'
    );
    const backyard = standardMaterialFor(table, 'MiniatureBackyard');
    const staircase = standardMaterialFor(table, 'MiniatureStaircase');

    expect(ground.name).toBe('MiniatureMaterial:livingRoomFloor');
    expect(ground.color.getHex()).toBe(0x0b1220);
    expect(upper.name).toBe('MiniatureMaterial:upperFloorGhost');
    expect(upper.color.getHex()).toBe(0x38bdf8);
    expect(upper.transparent).toBe(true);
    expect(upper.depthWrite).toBe(false);
    expect(upper.opacity).toBeLessThanOrEqual(0.03);
    expect(upperRim.transparent).toBe(true);
    expect(upperRim.opacity).toBeGreaterThan(upper.opacity);
    expect(backyard.color.getHex()).toBe(0x052e16);
    expect(staircase.color.getHex()).toBe(0x475569);
    const wall = standardMaterialFor(table, 'MiniatureWall:ground');
    expect(wall.color.getHex()).toBe(0x111827);
    const led = table.group.getObjectByName('MiniatureLedStrip:ground') as Mesh;
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

  it('keeps the ground floor dominant, upper floor ghosted, and components source-placed', () => {
    const table = build('balanced');
    const opaqueAreas: number[] = [];
    const upperAreas: number[] = [];
    table.group.getObjectByName('MiniatureArchitecture')?.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.userData.opaqueFilledFloor) {
        opaqueAreas.push(object.userData.filledFloorArea as number);
      }
      if (object.userData.floor === 'upper') {
        upperAreas.push(object.userData.filledFloorArea as number);
        expect((object.material as MeshStandardMaterial).transparent).toBe(
          true
        );
        expect(
          (object.material as MeshStandardMaterial).opacity
        ).toBeLessThanOrEqual(0.03);
      }
    });
    expect(Math.max(...opaqueAreas)).toBeGreaterThan(
      Math.max(...upperAreas) * 0.4
    );

    const lighting = table.group.getObjectByName(
      'component:lighting-visible-fixtures'
    );
    const greenhouse = table.group.getObjectByName('component:greenhouse');
    const bridge = table.group.getObjectByName(
      'component:media-wall-star-bridge'
    );
    expect(lighting?.position.toArray()).toEqual([0, 0.9, -2]);
    expect(greenhouse?.position.toArray()).toEqual([-16, 0, 21]);
    expect(bridge?.position.toArray()).toEqual([-10.5, 0, -13.5]);
    expect(lighting?.position.x).not.toBe(-26);
    expect(greenhouse?.position.x).not.toBe(-23);
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
    expect(token?.scale.x).toBeGreaterThan(1.5);
    expect(sugarkube?.scale.x).toBeGreaterThan(1.5);
    expect(token?.getObjectByName('tokenplace-monitor-left')).toBeTruthy();
    expect(token?.getObjectByName('tokenplace-monitor-right')).toBeTruthy();
    expect(sugarkube?.getObjectByName('sugarkube-table')).toBeTruthy();
    expect(
      sugarkube?.getObjectByName('sugarkube-yellow-rack-tier-top')
    ).toBeTruthy();
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
