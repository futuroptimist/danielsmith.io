import { Camera, Light, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import {
  SCENE_DETAIL_LEVELS,
  getSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import {
  MINIATURE_POI_PROXY_ENTRIES,
  MINIATURE_POI_PROXY_REGISTRY,
} from '../scene/miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../scene/miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_COVERAGE } from '../scene/miniature/sceneComponentRegistry';
import { countObjectTriangles } from '../scene/structures/triangleCount';
import { getPoiDefinitions } from '../scene/poi/registry';

describe('miniature proxy registry', () => {
  it('covers every POI exactly once', () => {
    expect(MINIATURE_POI_PROXY_ENTRIES.map((p) => p.id).sort()).toEqual(
      getPoiDefinitions()
        .map((p) => p.id)
        .sort()
    );
  });
  it('contains required semantic parts and recursion boundary', () => {
    const names = (id: keyof typeof MINIATURE_POI_PROXY_REGISTRY) =>
      MINIATURE_POI_PROXY_REGISTRY[id].parts.map((p) => p.name);
    expect(names('sugarkube-backyard-greenhouse')).toEqual(
      expect.arrayContaining([
        'sugarkube-table',
        'sugarkube-switch',
        'sugarkube-yellow-three-tier-rack',
        'sugarkube-node',
        'sugarkube-cable-silhouette',
      ])
    );
    expect(names('tokenplace-studio-cluster')).toEqual(
      expect.arrayContaining([
        'tokenplace-desk',
        'tokenplace-pc-tower',
        'tokenplace-gaming-chair',
        'tokenplace-left-monitor',
        'tokenplace-right-monitor',
        'tokenplace-keyboard',
        'tokenplace-mouse',
      ])
    );
    expect(
      MINIATURE_POI_PROXY_REGISTRY['danielsmith-portfolio-table']
        .recursionBoundary
    ).toBe(true);
    expect(names('danielsmith-portfolio-table')).toContain(
      'portfolio-nonrecursive-white-table'
    );
  });
  it('builds finite visible noninteractive geometry at all levels', () => {
    for (const level of SCENE_DETAIL_LEVELS)
      for (const entry of MINIATURE_POI_PROXY_ENTRIES) {
        const root = buildMiniatureProxy(entry, {
          detailPolicy: getSceneDetailPolicy(level),
        });
        expect(countObjectTriangles(root)).toBeGreaterThan(0);
        root.traverse((object: Object3D) => {
          expect(object).not.toBeInstanceOf(Light);
          expect(object).not.toBeInstanceOf(Camera);
          expect(object.name.toLowerCase()).not.toContain('collider');
          expect(object.name.toLowerCase()).not.toContain('hitarea');
          expect(object.name.toLowerCase()).not.toContain('label');
        });
      }
  });
  it('classifies visible non-POI coverage', () => {
    expect(MINIATURE_SCENE_COMPONENT_COVERAGE.length).toBeGreaterThan(5);
    expect(
      MINIATURE_SCENE_COMPONENT_COVERAGE.map((entry) => entry.kind)
    ).toEqual(expect.arrayContaining(['shared-source', 'proxy', 'excluded']));
  });
});
