import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import {
  SCENE_DETAIL_LEVELS,
  getSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import { POI_MINIATURE_PROXY_REGISTRY } from '../scene/miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../scene/miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_COVERAGE } from '../scene/miniature/sceneComponentRegistry';
import { getPoiDefinitions } from '../scene/poi/registry';
import { countObjectTriangles } from '../scene/structures/triangleCount';

describe('miniature POI proxy registry', () => {
  it('covers every current POI exactly once', () => {
    expect(Object.keys(POI_MINIATURE_PROXY_REGISTRY).sort()).toEqual(
      getPoiDefinitions()
        .map((poi) => poi.id)
        .sort()
    );
  });

  it('marks danielsmith.io as a nonrecursive recursion boundary', () => {
    const proxy = POI_MINIATURE_PROXY_REGISTRY['danielsmith-portfolio-table'];
    expect(proxy.recursionBoundary).toBe(true);
    expect(
      proxy.primitives.map((primitive) => primitive.name).join(' ')
    ).toContain('white-table');
  });

  it('includes required Sugarkube and token.place semantic components', () => {
    const sugarkube = POI_MINIATURE_PROXY_REGISTRY[
      'sugarkube-backyard-greenhouse'
    ].primitives.map((primitive) => primitive.name);
    expect(sugarkube.join(' ')).toContain('table');
    expect(sugarkube.join(' ')).toContain('switch');
    expect(sugarkube.join(' ')).toContain('yellow-rack-tier');
    expect(sugarkube.join(' ')).toContain('node');
    expect(sugarkube.join(' ')).toContain('cable');

    const tokenplace = POI_MINIATURE_PROXY_REGISTRY[
      'tokenplace-studio-cluster'
    ].primitives.map((primitive) => primitive.name);
    for (const name of [
      'desk',
      'pc-tower',
      'gaming-chair',
      'monitor-left',
      'monitor-right',
      'keyboard',
      'mouse',
    ]) {
      expect(tokenplace.join(' ')).toContain(name);
    }
  });

  it('builds finite, visible, noninteractive geometry at every detail level', () => {
    for (const level of SCENE_DETAIL_LEVELS) {
      const context = {
        detailLevel: level,
        detailPolicy: getSceneDetailPolicy(level),
      };
      for (const proxy of Object.values(POI_MINIATURE_PROXY_REGISTRY)) {
        const { root } = buildMiniatureProxy(proxy, context);
        expect(countObjectTriangles(root)).toBeGreaterThan(0);
        root.traverse((object: Object3D) => {
          expect(object.type).not.toMatch(/Light|Camera|Audio/);
          expect(object.name).not.toMatch(
            /collider|hit-area|label|badge|halo/i
          );
          expect(Number.isFinite(object.position.x)).toBe(true);
          expect(Number.isFinite(object.position.y)).toBe(true);
          expect(Number.isFinite(object.position.z)).toBe(true);
        });
      }
    }
  });

  it('classifies current visible non-POI scene geometry sources', () => {
    const classified = new Set<string>(
      MINIATURE_SCENE_COMPONENT_COVERAGE.flatMap((entry) => [
        ...entry.sourceFiles,
      ])
    );
    for (const expected of [
      'src/scene/level/portfolioLevel.ts',
      'src/scene/environments/backyard.ts',
      'src/scene/structures/staircase.ts',
      'src/scene/lighting/ledStrips.ts',
      'src/scene/avatar/mannequin.ts',
    ]) {
      expect(classified.has(expected)).toBe(true);
    }
  });

  it('keeps proxy triangle totals decreasing across all five levels', () => {
    const totals = SCENE_DETAIL_LEVELS.map((level) => {
      const context = {
        detailLevel: level,
        detailPolicy: getSceneDetailPolicy(level),
      };
      return Object.values(POI_MINIATURE_PROXY_REGISTRY).reduce(
        (sum, proxy) =>
          sum + countObjectTriangles(buildMiniatureProxy(proxy, context).root),
        0
      );
    });
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    for (let index = 1; index < totals.length; index += 1) {
      expect(totals[index]).toBeLessThanOrEqual(totals[index - 1]);
    }
  });
});
