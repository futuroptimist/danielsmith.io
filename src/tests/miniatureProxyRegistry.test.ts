import { Camera, Light, Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import {
  ORDERED_SCENE_DETAIL_LEVELS,
  getSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import {
  MINIATURE_POI_PROXY_DEFINITIONS,
  MINIATURE_POI_PROXY_REGISTRY,
} from '../scene/miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../scene/miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_COVERAGE } from '../scene/miniature/sceneComponentRegistry';
import type { PoiId } from '../scene/poi/types';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const expectedPoiIds: PoiId[] = [
  'futuroptimist-living-room-tv',
  'flywheel-studio-flywheel',
  'jobbot-studio-terminal',
  'dspace-backyard-rocket',
  'sugarkube-backyard-greenhouse',
  'tokenplace-studio-cluster',
  'gabriel-studio-sentry',
  'f2clipboard-kitchen-console',
  'axel-studio-tracker',
  'sigma-kitchen-workbench',
  'gitshelves-living-room-installation',
  'wove-kitchen-loom',
  'pr-reaper-backyard-console',
  'danielsmith-portfolio-table',
];

describe('miniature POI proxy registry', () => {
  it('covers every current POI exactly once', () => {
    expect(Object.keys(MINIATURE_POI_PROXY_REGISTRY).sort()).toEqual(
      [...expectedPoiIds].sort()
    );
    expect(
      new Set(MINIATURE_POI_PROXY_DEFINITIONS.map((entry) => entry.poiId)).size
    ).toBe(expectedPoiIds.length);
  });

  it('contains required Sugarkube, token.place, and nonrecursive self components', () => {
    const sugarkube = MINIATURE_POI_PROXY_REGISTRY[
      'sugarkube-backyard-greenhouse'
    ].primitives.map((p) => p.name);
    expect(sugarkube).toEqual(
      expect.arrayContaining([
        'sugarkube-table',
        'sugarkube-network-switch',
        'sugarkube-yellow-rack-tier-top',
        'sugarkube-node-stack',
        'sugarkube-cable-silhouette',
      ])
    );
    const tokenplace = MINIATURE_POI_PROXY_REGISTRY[
      'tokenplace-studio-cluster'
    ].primitives.map((p) => p.name);
    expect(tokenplace).toEqual(
      expect.arrayContaining([
        'tokenplace-desk',
        'tokenplace-pc-tower',
        'tokenplace-gaming-chair-back',
        'tokenplace-monitor-left',
        'tokenplace-monitor-right',
        'tokenplace-keyboard',
        'tokenplace-mouse',
      ])
    );
    const self = MINIATURE_POI_PROXY_REGISTRY['danielsmith-portfolio-table'];
    expect(self.recursionBoundary).toBe(true);
    expect(self.primitives.map((p) => p.name)).toContain(
      'danielsmith-white-tabletop'
    );
  });

  it('builds finite visible-only geometry at every detail level', () => {
    for (const level of ORDERED_SCENE_DETAIL_LEVELS) {
      for (const definition of MINIATURE_POI_PROXY_DEFINITIONS) {
        const { root } = buildMiniatureProxy(
          definition,
          getSceneDetailPolicy(level)
        );
        let meshCount = 0;
        root.traverse((object) => {
          expect(object).not.toBeInstanceOf(Light);
          expect(object).not.toBeInstanceOf(Camera);
          if (object !== root) {
            expect(object.userData.collider).toBeUndefined();
            expect(object.userData.interactionHandler).toBeUndefined();
          }
          if ((object as Object3D & { isMesh?: boolean }).isMesh)
            meshCount += 1;
        });
        expect(meshCount).toBeGreaterThan(0);
        expect(countObjectTriangles(root)).toBeGreaterThan(0);
      }
    }
  });

  it('keeps proxy catalog triangles monotonic without filler geometry', () => {
    const totals = ORDERED_SCENE_DETAIL_LEVELS.map((level) =>
      MINIATURE_POI_PROXY_DEFINITIONS.reduce(
        (sum, definition) =>
          sum +
          countObjectTriangles(
            buildMiniatureProxy(definition, getSceneDetailPolicy(level)).root
          ),
        0
      )
    );
    for (let index = 1; index < totals.length; index += 1) {
      expect(totals[index]).toBeLessThanOrEqual(totals[index - 1]);
    }
  });

  it('classifies non-POI scene coverage', () => {
    expect(MINIATURE_SCENE_COMPONENT_COVERAGE.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'level:portfolio-layout',
        'level:floors-walls',
        'level:stairs-landing',
        'environment:backyard',
      ])
    );
  });
});
