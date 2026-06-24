import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../scene/avatar/mannequin';
import {
  getSceneDetailPolicy,
  getMiniatureSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import { getPoiDefinitions } from '../scene/poi/registry';
import {
  PORTFOLIO_MINIATURE_TABLE_CONTRACT,
  createPortfolioMiniatureTable,
  createPortfolioMiniatureTransform,
  createPortfolioTableShell,
} from '../scene/structures/portfolioMiniatureTable';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const definitions = getPoiDefinitions('en');
const position = new Vector3(-21.6, 0, 1.63);

const build = (
  level: 'cinematic' | 'balanced' | 'performance' = 'balanced',
  yaw = 0
) =>
  createPortfolioMiniatureTable({
    position,
    orientationRadians: yaw,
    tableDetailPolicy: getSceneDetailPolicy(level),
    miniatureDetailPolicy: getMiniatureSceneDetailPolicy(level),
    poiDefinitions: definitions,
  });

describe('createPortfolioMiniatureTable', () => {
  it('builds a unit-scale white shell with one collider and one miniature world root', () => {
    const table = build();
    expect(table.group.name).toBe('PortfolioMiniatureTable');
    expect(table.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(table.miniatureWorldRoot.name).toBe('MiniatureWorldRoot');
    expect(
      table.group.getObjectsByProperty('name', 'MiniatureWorldRoot')
    ).toHaveLength(1);
    expect(table.collider.maxX - table.collider.minX).toBeGreaterThan(0);
    expect(table.collider.maxZ - table.collider.minZ).toBeGreaterThan(0);
    table.dispose();
  });

  it('keeps the shell centered and within the physical metadata bounds', () => {
    const shell = createPortfolioTableShell(getSceneDetailPolicy('cinematic'));
    const box = new Box3().setFromObject(shell);
    const center = new Vector3();
    const size = new Vector3();
    box.getCenter(center);
    box.getSize(size);
    expect(Math.abs(center.x)).toBeLessThan(1e-6);
    expect(Math.abs(center.z)).toBeLessThan(1e-6);
    expect(size.x).toBeLessThanOrEqual(
      PORTFOLIO_MINIATURE_TABLE_CONTRACT.intendedSceneBounds.width
    );
    expect(size.z).toBeLessThanOrEqual(
      PORTFOLIO_MINIATURE_TABLE_CONTRACT.intendedSceneBounds.depth
    );
    expect(size.y).toBeLessThanOrEqual(
      PORTFOLIO_MINIATURE_TABLE_CONTRACT.intendedSceneBounds.height
    );
  });

  it('maps world positions with one uniform affine miniature transform', () => {
    const transform = createPortfolioMiniatureTransform();
    const a = new Vector3(-20, 0, -10);
    const b = new Vector3(-10, 5, 8);
    const ma = transform.mapWorldPosition(a);
    const mb = transform.mapWorldPosition(b);
    expect(ma.distanceTo(mb)).toBeCloseTo(
      a.distanceTo(b) * transform.uniformScale,
      6
    );
    expect(transform.inverseMapPosition(ma).distanceTo(a)).toBeLessThan(1e-6);
    expect(
      transform.mapWorldPosition(
        new Vector3(transform.worldOrigin.x, 0, transform.worldOrigin.z)
      ).y
    ).toBeCloseTo(PORTFOLIO_MINIATURE_TABLE_CONTRACT.modelBed.y, 6);
  });

  it('represents both floors, backyard, staircase, every POI, and the finite self proxy', () => {
    const table = build('cinematic');
    expect(table.group.getObjectByName('MiniatureBackyard')).toBeDefined();
    expect(table.group.getObjectByName('MiniatureUpperLanding')).toBeDefined();
    expect(table.group.getObjectByName('MiniatureStaircase')).toBeDefined();
    expect(
      table.group.getObjectByName('MiniaturePoiRoot')?.children
    ).toHaveLength(definitions.length);
    expect(
      table.group.getObjectsByProperty('name', 'MiniatureSelfProxy')
    ).toHaveLength(1);
    expect(
      table.selfProxy.getObjectByName('MiniatureWorldRoot')
    ).toBeUndefined();
    table.dispose();
  });

  it('updates the tiny player from exact world position, yaw, and palette without rebuilding', () => {
    const table = build('balanced', Math.PI / 4);
    const before = countObjectTriangles(table.group);
    const playerPosition = new Vector3(1, 2.5, 3);
    table.update({
      playerWorldPosition: playerPosition,
      playerYaw: 1.2,
      activeFloor: 'upper',
    });
    expect(
      table.miniaturePlayer.position.distanceTo(playerPosition)
    ).toBeLessThan(1e-9);
    expect(table.miniaturePlayer.rotation.y).toBeCloseTo(1.2, 6);
    table.setPlayerPalette({
      base: '#111111',
      accent: '#22ccff',
      trim: '#ffeeaa',
    });
    expect(countObjectTriangles(table.group)).toBe(before);
    table.dispose();
    table.update({ playerWorldPosition: new Vector3(9, 9, 9), playerYaw: 0 });
  });

  it('uses the canonical mannequin visual height before the parent miniature scale', () => {
    const table = build('performance');
    const box = new Box3().setFromObject(table.miniaturePlayer);
    const size = new Vector3();
    box.getSize(size);
    expect(size.y).toBeGreaterThan(PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT * 0.75);
    expect(size.y).toBeLessThan(PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT * 1.05);
    table.dispose();
  });

  it('reduces total triangles across public graphics modes', () => {
    const cinematic = build('cinematic');
    const balanced = build('balanced');
    const performance = build('performance');
    expect(cinematic.triangles.total).toBeGreaterThan(balanced.triangles.total);
    expect(balanced.triangles.total).toBeGreaterThan(
      performance.triangles.total
    );
    cinematic.dispose();
    balanced.dispose();
    performance.dispose();
  });
});
