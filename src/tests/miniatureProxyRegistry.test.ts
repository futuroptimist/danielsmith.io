import { Camera, Light, Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import { SCENE_DETAIL_LEVELS } from '../scene/graphics/sceneDetailPolicy';
import {
  MINIATURE_POI_PROXIES,
  MINIATURE_POI_PROXY_REGISTRY,
} from '../scene/miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../scene/miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_COVERAGE } from '../scene/miniature/sceneComponentRegistry';
import { getPoiDefinitions } from '../scene/poi/registry';
import { countObjectTriangles } from '../scene/structures/triangleCount';

describe('miniature proxy registry', () => {
  it('covers every POI exactly once without copying placement data', () => {
    const poiIds = getPoiDefinitions()
      .map((poi) => poi.id)
      .sort();
    expect(Object.keys(MINIATURE_POI_PROXY_REGISTRY).sort()).toEqual(poiIds);
    expect(
      new Set(MINIATURE_POI_PROXIES.map((proxy) => proxy.poiId)).size
    ).toBe(poiIds.length);
    expect(JSON.stringify(MINIATURE_POI_PROXY_REGISTRY)).not.toMatch(
      'headingRadians'
    );
  });
  it('includes required semantic components for Sugarkube and token.place', () => {
    const names = (id: keyof typeof MINIATURE_POI_PROXY_REGISTRY) =>
      MINIATURE_POI_PROXY_REGISTRY[id].parts.map((part) => part.name);
    expect(names('sugarkube-backyard-greenhouse')).toEqual(
      expect.arrayContaining([
        'sugarkube-table',
        'sugarkube-switch',
        'sugarkube-yellow-rack-tier',
        'sugarkube-node',
        'sugarkube-cable-silhouette',
      ])
    );
    expect(names('tokenplace-studio-cluster')).toEqual(
      expect.arrayContaining([
        'tokenplace-desk',
        'tokenplace-pc-tower',
        'tokenplace-gaming-chair',
        'tokenplace-chair-back',
        'tokenplace-monitor',
        'tokenplace-keyboard',
        'tokenplace-mouse',
      ])
    );
  });
  it('marks danielsmith.io as nonrecursive and builds safe visible geometry at every level', () => {
    expect(
      MINIATURE_POI_PROXY_REGISTRY['danielsmith-portfolio-table']
        .recursionBoundary
    ).toBe(true);
    expect(
      MINIATURE_POI_PROXY_REGISTRY['danielsmith-portfolio-table'].allowRecursion
    ).toBe(false);
    for (const proxy of MINIATURE_POI_PROXIES) {
      for (const detailLevel of SCENE_DETAIL_LEVELS) {
        const built = buildMiniatureProxy(proxy, { detailLevel });
        expect(countObjectTriangles(built.root)).toBeGreaterThan(0);
        built.root.traverse((object: Object3D) => {
          expect(object).not.toBeInstanceOf(Light);
          expect(object).not.toBeInstanceOf(Camera);
          if (object instanceof Mesh)
            expect(
              Number.isFinite(object.geometry.boundingSphere?.radius ?? 1)
            ).toBe(true);
          expect(object.name).not.toMatch(
            /collider|hitArea|label|halo|badge|renderer/i
          );
        });
      }
    }
  });
  it('classifies visible non-POI scene coverage', () => {
    expect(
      MINIATURE_SCENE_COMPONENT_COVERAGE.some(
        (entry) =>
          entry.id === 'house-topology-layout' && entry.kind === 'shared-source'
      )
    ).toBe(true);
    expect(
      MINIATURE_SCENE_COMPONENT_COVERAGE.some((entry) => entry.kind === 'proxy')
    ).toBe(true);
    expect(
      MINIATURE_SCENE_COMPONENT_COVERAGE.every(
        (entry) => entry.kind !== 'excluded' || entry.reason
      )
    ).toBe(true);
  });
  it('proxy catalog triangles decrease with detail level', () => {
    const totals = SCENE_DETAIL_LEVELS.map((detailLevel) =>
      MINIATURE_POI_PROXIES.reduce(
        (sum, proxy) =>
          sum +
          countObjectTriangles(
            buildMiniatureProxy(proxy, { detailLevel }).root
          ),
        0
      )
    );
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(totals[0]).toBeGreaterThan(totals[totals.length - 1]);
  });
});
