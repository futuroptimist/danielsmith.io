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
import {
  MINIATURE_SCENE_COMPONENT_COVERAGE,
  MINIATURE_SCENE_COMPONENT_PROXIES,
} from '../scene/miniature/sceneComponentRegistry';
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
        'sugarkube-pi-node-0-0',
        'sugarkube-pi-node-1-1',
        'sugarkube-pi-node-2-2',
        'sugarkube-cable-silhouette',
      ])
    );
    expect(
      sugarkube.filter((name) => name.startsWith('sugarkube-pi-node-'))
    ).toHaveLength(9);
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

  it('keeps the PR Reaper proxy aligned to the static silhouette', () => {
    const definition =
      MINIATURE_POI_PROXY_REGISTRY['pr-reaper-backyard-console'];
    const primitiveNames = definition.primitives.map(
      (primitive) => primitive.name
    );
    const primitiveByName = new Map(
      definition.primitives.map((primitive) => [primitive.name, primitive])
    );

    expect(definition.syncRevision).toBeGreaterThanOrEqual(4);
    expect(definition.sourceFiles).toContain(
      'src/scene/structures/prReaperInstallationContract.ts'
    );
    expect(definition.sourceFiles).toEqual(
      expect.arrayContaining([
        'src/scene/structures/prReaperArmKinematics.ts',
        'src/scene/structures/prReaperReapingController.ts',
      ])
    );
    expect(primitiveNames).toEqual(
      expect.arrayContaining([
        'reaper-projector-base',
        'reaper-projector-lens',
        'reaper-hologram-screen-9x21',
        'reaper-hologram-top-edge',
        'reaper-hologram-bottom-edge',
        'reaper-robot-yaw-base',
        'reaper-robot-yaw-column',
        'reaper-robot-pitch-link',
        'reaper-tool-flange-laser-gun',
        'reaper-short-green-beam-hint',
      ])
    );
    expect(primitiveNames).not.toEqual(
      expect.arrayContaining([
        'reaper-console',
        'reaper-scythe-screen',
        'reaper-review-dial',
      ])
    );

    const screen = primitiveByName.get('reaper-hologram-screen-9x21');
    expect(screen?.kind).toBe('box');
    expect(screen?.size?.[1]).toBeCloseTo((screen?.size?.[0] ?? 0) * (21 / 9));
    expect(screen?.color).toBe(0x38bdf8);
    expect(primitiveByName.get('reaper-hologram-top-edge')?.color).toBe(
      0x7dd3fc
    );
    expect(primitiveByName.get('reaper-hologram-bottom-edge')?.color).toBe(
      0x7dd3fc
    );

    expect(
      definition.primitives.filter((primitive) =>
        primitive.name.startsWith('reaper-pr-red-hint')
      )
    ).toHaveLength(3);
    expect(
      definition.primitives.filter((primitive) =>
        primitive.name.startsWith('reaper-pr-green-hint')
      )
    ).toHaveLength(1);
    expect(primitiveByName.get('reaper-robot-yaw-base')?.kind).toBe('cylinder');
    expect(primitiveByName.get('reaper-robot-yaw-column')?.kind).toBe(
      'cylinder'
    );
    expect(primitiveByName.get('reaper-robot-pitch-link')?.kind).toBe('box');
    expect(primitiveByName.get('reaper-tool-flange-laser-gun')?.kind).toBe(
      'box'
    );
    expect(primitiveByName.get('reaper-tool-flange-laser-gun')?.color).toBe(
      0x5b676d
    );
    expect(primitiveByName.get('reaper-short-green-beam-hint')?.color).toBe(
      0x22c55e
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

  it('builds required visible component proxies at every detail level', () => {
    expect(MINIATURE_SCENE_COMPONENT_PROXIES.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'component:greenhouse',
        'component:media-wall-star-bridge',
        'component:multiplayer-projection',
      ])
    );
    for (const level of ORDERED_SCENE_DETAIL_LEVELS) {
      for (const definition of MINIATURE_SCENE_COMPONENT_PROXIES) {
        const { root, semanticNames } = buildMiniatureProxy(
          definition,
          getSceneDetailPolicy(level)
        );
        expect(semanticNames.length).toBeGreaterThan(0);
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
        'structure:greenhouse',
        'structure:media-wall-star-bridge',
        'structure:multiplayer-projection',
      ])
    );
  });
});
