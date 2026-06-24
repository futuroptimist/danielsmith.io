import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../scene/avatar/mannequin';
import {
  getSceneDetailPolicy,
  getMiniatureSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import { getPoiDefinitions } from '../scene/poi/registry';
import {
  createPortfolioMiniatureTable,
  createPortfolioTableShell,
} from '../scene/structures/portfolioMiniatureTable';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const pois = getPoiDefinitions('en');

function build(
  heading = 0,
  quality: 'cinematic' | 'balanced' | 'performance' = 'balanced'
) {
  return createPortfolioMiniatureTable({
    position: { x: 8, y: 0, z: -12 },
    orientationRadians: heading,
    tableDetailPolicy: getSceneDetailPolicy(quality),
    miniatureDetailPolicy: getMiniatureSceneDetailPolicy(quality),
    poiDefinitions: pois,
  });
}

describe('PortfolioMiniatureTable', () => {
  it('builds a centered unit-scale white shell with one collider and one miniature root', () => {
    const shell = createPortfolioTableShell(getSceneDetailPolicy('balanced'));
    expect(shell.name).toBe('PortfolioMiniatureTableShell');
    expect(shell.position.toArray()).toEqual([0, 0, 0]);

    const table = build();
    expect(table.group.name).toBe('PortfolioMiniatureTable');
    expect(table.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(table.collider.minX).toBeLessThan(table.collider.maxX);
    expect(table.collider.minZ).toBeLessThan(table.collider.maxZ);
    expect(
      table.group.getObjectsByProperty('name', 'MiniatureWorldRoot')
    ).toHaveLength(1);
    table.dispose();
  });

  it('contains both floors, backyard, stairs, landing, self proxy, scene proxies, POI proxies, and a player', () => {
    const table = build();
    for (const name of [
      'MiniatureGroundFloor',
      'MiniatureUpperFloor',
      'MiniatureBackyard',
      'MiniatureStaircase',
      'MiniatureUpperLanding',
      'MiniatureSceneComponentRoot',
      'MiniaturePoiRoot',
      'MiniaturePlayer',
      'MiniatureSelfProxy',
    ]) {
      expect(table.group.getObjectByName(name)).toBeTruthy();
    }
    expect(
      table.selfProxy.getObjectByName('MiniatureWorldRoot')
    ).toBeUndefined();
    for (const poi of pois) {
      const matches = table.group.getObjectsByProperty(
        'name',
        poi.id === 'danielsmith-portfolio-table'
          ? 'MiniatureSelfProxy'
          : `MiniaturePoiRoot:${poi.id}`
      );
      expect(matches).toHaveLength(1);
      expect(matches[0]?.scale.toArray()).toEqual([1, 1, 1]);
    }
    table.dispose();
  });

  it('uses one uniform affine miniature transform and round-trips positions', () => {
    const table = build(Math.PI / 5);
    const a = new Vector3(-4, 0, -2);
    const b = new Vector3(7, 5, 11);
    const ma = table.transform.mapWorldPosition(a);
    const mb = table.transform.mapWorldPosition(b);
    expect(ma.distanceTo(mb)).toBeCloseTo(
      a.distanceTo(b) * table.transform.uniformScale,
      6
    );
    expect(
      table.transform.invertMiniaturePosition(ma).distanceTo(a)
    ).toBeLessThan(1e-6);
    expect(table.transform.mapWorldYaw(1.2)).toBeCloseTo(1.2);
    table.dispose();
  });

  it('keeps the live miniature player bottom anchored and palette-updatable', () => {
    const table = build();
    expect(table.miniaturePlayer.userData.height).toBe(
      PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT
    );
    const world = new Vector3(1, 2.5, 3);
    table.update({
      playerWorldPosition: world,
      playerWorldYaw: 0.75,
      activeFloor: 'ground',
    });
    expect(table.miniaturePlayer.position.toArray()).toEqual(world.toArray());
    expect(table.miniaturePlayer.rotation.y).toBeCloseTo(0.75);
    table.setPlayerPalette({
      base: '#000001',
      accent: '#000002',
      trim: '#000003',
    });
    expect(
      table.miniaturePlayer.getObjectByName('MiniaturePlayerTorso')
    ).toBeTruthy();
    table.dispose();
    table.update({
      playerWorldPosition: new Vector3(9, 9, 9),
      playerWorldYaw: 2,
    });
  });

  it('maps public graphics modes two steps down and lowers triangle counts', () => {
    const builds = ['cinematic', 'balanced', 'performance'].map((quality) =>
      build(0, quality as 'cinematic' | 'balanced' | 'performance')
    );
    expect(builds.map((entry) => entry.miniatureWorldRoot.scale.x)).toSatisfy(
      (values: number[]) => values.every((value) => value === values[0])
    );
    expect(countObjectTriangles(builds[0].group)).toBeGreaterThan(
      countObjectTriangles(builds[2].group)
    );
    builds.forEach((entry) => entry.dispose());
  });
});
