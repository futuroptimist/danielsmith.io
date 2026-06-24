import {
  Audio,
  Camera,
  Light,
  Object3D,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { describe, expect, it } from 'vitest';

import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../scene/avatar/mannequin';
import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import { localizePoiDefinitions } from '../scene/poi/registry';
import {
  PORTFOLIO_MINIATURE_TABLE_CONTRACT,
  computeMiniatureWorldEnvelope,
  createMiniatureWorldTransform,
  createPortfolioMiniatureTable,
  createPortfolioTableShell,
} from '../scene/structures/portfolioMiniatureTable';

const poiDefinitions = localizePoiDefinitions();
const tablePoi = poiDefinitions.find(
  (definition) => definition.id === 'danielsmith-portfolio-table'
)!;

const buildTable = (heading = 0) =>
  createPortfolioMiniatureTable({
    position: tablePoi.position,
    orientationRadians: heading,
    tableDetailPolicy: getSceneDetailPolicy('balanced'),
    miniatureDetailPolicy: getSceneDetailPolicy('micro'),
    poiDefinitions,
  });

const collectNames = (root: Object3D) => {
  const names: string[] = [];
  root.traverse((object) => names.push(object.name));
  return names;
};

describe('PortfolioMiniatureTable', () => {
  it('builds a unit-scale white table with one collider and one miniature root', () => {
    const shell = createPortfolioTableShell(getSceneDetailPolicy('balanced'));
    expect(shell.name).toBe('PortfolioMiniatureTableShell');
    expect(shell.position.toArray()).toEqual([0, 0, 0]);

    const build = buildTable();
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(build.colliders).toHaveLength(1);
    expect(
      collectNames(build.group).filter((name) => name === 'MiniatureWorldRoot')
    ).toHaveLength(1);
    expect(build.miniatureWorldRoot.scale.x).toBeCloseTo(build.transform.scale);
    expect(build.miniatureWorldRoot.scale.x).toBe(
      build.miniatureWorldRoot.scale.y
    );
    expect(build.miniatureWorldRoot.scale.y).toBe(
      build.miniatureWorldRoot.scale.z
    );
    build.dispose();
  });

  it('contains both floors, backyard, staircase, upper landing, POIs, components, and self proxy once', () => {
    const build = buildTable();
    const names = collectNames(build.group);
    expect(names).toContain('MiniatureGroundFloor');
    expect(names).toContain('MiniatureUpperFloor');
    expect(names.some((name) => name.includes('backyard'))).toBe(true);
    expect(names).toContain('MiniatureStaircase');
    expect(names).toContain('MiniatureUpperLanding');
    expect(names.filter((name) => name === 'MiniatureSelfProxy')).toHaveLength(
      1
    );
    expect(
      names.filter((name) => name.startsWith('MiniaturePoi:')).length + 1
    ).toBe(poiDefinitions.length);
    expect(
      names.filter((name) => name.startsWith('MiniatureSceneComponent:')).length
    ).toBeGreaterThan(0);
    expect(collectNames(build.selfProxy)).not.toContain('MiniatureWorldRoot');
    build.dispose();
  });

  it('maps world positions with one uniform affine transform and round trips', () => {
    const transform = createMiniatureWorldTransform();
    const a = new Vector3(-4, 1.5, 2);
    const b = new Vector3(3, 5, -9);
    const ma = transform.mapWorldPosition(a);
    const mb = transform.mapWorldPosition(b);
    expect(ma.distanceTo(mb)).toBeCloseTo(a.distanceTo(b) * transform.scale, 8);
    expect(transform.inverseMapPosition(ma).distanceTo(a)).toBeLessThan(1e-8);
    expect(transform.mapWorldPosition(new Vector3(0, 0, 0)).y).toBeCloseTo(
      transform.modelBedOffset.y
    );
    expect(transform.mapWorldYaw(Math.PI / 3)).toBeCloseTo(Math.PI / 3);
    const envelope = computeMiniatureWorldEnvelope();
    expect(envelope.maxX - envelope.minX).toBeGreaterThan(0);
    expect(envelope.maxZ - envelope.minZ).toBeGreaterThan(0);
  });

  it('keeps player updates exact and palette updates in place', () => {
    const build = buildTable(Math.PI / 4);
    const target = new Vector3(1.25, 2.5, -3.75);
    build.update({ playerWorldPosition: target, playerYaw: Math.PI / 2 });
    expect(build.miniaturePlayer.position.toArray()).toEqual(target.toArray());
    expect(build.miniaturePlayer.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(
      build.miniaturePlayer.getObjectByName('MiniaturePlayerHead')
    ).toBeDefined();
    expect(
      build.miniaturePlayer.getObjectByName('MiniaturePlayerTorso')
    ).toBeDefined();
    expect(
      build.miniaturePlayer.getObjectByName('MiniaturePlayerLeftLeg')?.position
        .y
    ).toBeGreaterThan(0);
    expect(PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT).toBeCloseTo(2.6);
    const before = build.miniatureWorldRoot.uuid;
    build.setPlayerPalette({
      base: '#123456',
      accent: '#abcdef',
      trim: '#fedcba',
    });
    expect(build.miniatureWorldRoot.uuid).toBe(before);
    build.dispose();
    build.update({ playerWorldPosition: new Vector3(), playerYaw: 0 });
  });

  it('rotates the conservative collider for nonzero headings', () => {
    const build = buildTable(Math.PI / 4);
    const collider = build.colliders[0];
    expect(collider.maxX - collider.minX).toBeGreaterThan(
      PORTFOLIO_MINIATURE_TABLE_CONTRACT.table.width
    );
    expect(collider.maxZ - collider.minZ).toBeGreaterThan(
      PORTFOLIO_MINIATURE_TABLE_CONTRACT.table.depth
    );
    build.dispose();
  });

  it('does not create forbidden runtime descendants or hidden LOD roots', () => {
    const build = buildTable();
    const forbidden: string[] = [];
    build.miniatureWorldRoot.traverse((object) => {
      if (
        object instanceof Light ||
        object instanceof Camera ||
        object instanceof Scene ||
        object instanceof Audio ||
        object instanceof WebGLRenderer
      ) {
        forbidden.push(object.name || object.type);
      }
    });
    expect(forbidden).toEqual([]);
    expect(
      collectNames(build.miniatureWorldRoot).filter((name) =>
        name.includes('LOD')
      )
    ).toEqual([]);
    expect(build.triangleStats.table).toBeGreaterThan(0);
    expect(build.triangleStats.poiProxies).toBeGreaterThan(0);
    expect(build.triangleStats.tinyPlayer).toBeGreaterThan(0);
    build.dispose();
    build.dispose();
  });
});
