import { Group } from 'three';
import {
  SCENE_DETAIL_LEVELS,
  getSceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';
import { countObjectTriangles } from '../structures/triangleCount';
import { MINIATURE_POI_PROXY_ENTRIES } from './poiProxyRegistry';
import { buildMiniatureProxy } from './proxyBuilder';

import type { SceneDetailLevel } from '../graphics/sceneDetailPolicy';

export function buildMiniatureProxyCatalog(
  level: SceneDetailLevel = 'balanced'
): Group {
  const group = new Group();
  const detailPolicy = getSceneDetailPolicy(level);
  MINIATURE_POI_PROXY_ENTRIES.forEach((entry) =>
    group.add(buildMiniatureProxy(entry, { detailPolicy }))
  );
  return group;
}

export function getMiniatureProxyTriangleCounts(): Record<string, number> {
  return Object.fromEntries(
    SCENE_DETAIL_LEVELS.map((level) => [
      level,
      countObjectTriangles(buildMiniatureProxyCatalog(level)),
    ])
  );
}
