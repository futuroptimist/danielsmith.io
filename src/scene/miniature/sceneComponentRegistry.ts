import type {
  MiniaturePrimitive,
  MiniatureProxyDefinition,
  MiniatureSyncEntry,
} from './types';

export type MiniatureCoverageKind = 'shared-source' | 'proxy' | 'excluded';
export interface MiniatureSceneComponentCoverage {
  id: string;
  kind: MiniatureCoverageKind;
  sourceFiles: readonly string[];
  proxy?: MiniatureProxyDefinition;
  reason?: string;
  sync?: MiniatureSyncEntry;
}
const proxyFile = 'src/scene/miniature/sceneComponentRegistry.ts';
const p = (
  name: string,
  kind: MiniaturePrimitive['kind'],
  extra: Omit<MiniaturePrimitive, 'name' | 'kind'>
): MiniaturePrimitive => ({ name, kind, ...extra });
const sync = (
  id: string,
  sourceFiles: readonly string[],
  note: string
): MiniatureSyncEntry => ({
  id,
  overworldSourceFiles: sourceFiles,
  proxySourceFiles: [proxyFile],
  syncRevision: 1,
  syncNote: note,
});
const proxy = (
  id: string,
  sourceFiles: readonly string[],
  parts: readonly MiniaturePrimitive[],
  note = 'Initial non-POI miniature proxy coverage.'
): MiniatureSceneComponentCoverage => ({
  id,
  kind: 'proxy',
  sourceFiles,
  proxy: { id, semanticName: id, parts, sync: sync(id, sourceFiles, note) },
  sync: sync(id, sourceFiles, note),
});
const shared = (
  id: string,
  sourceFiles: readonly string[],
  reason: string
): MiniatureSceneComponentCoverage => ({
  id,
  kind: 'shared-source',
  sourceFiles,
  reason,
  sync: sync(id, sourceFiles, reason),
});
const excluded = (
  id: string,
  sourceFiles: readonly string[],
  reason: string
): MiniatureSceneComponentCoverage => ({
  id,
  kind: 'excluded',
  sourceFiles,
  reason,
});

export const MINIATURE_SCENE_COMPONENT_COVERAGE = [
  shared(
    'house-topology-layout',
    [
      'src/scene/level/portfolioLevel.ts',
      'src/scene/level/floorElevations.ts',
      'src/scene/level/generateFloorSurfaces.ts',
      'src/scene/level/generateWalls.ts',
      'src/scene/level/sceneObjects.ts',
      'src/scene/level/schema.ts',
      'src/scene/level/sourceIds.ts',
      'src/scene/level/upperStairwellLandingSegments.ts',
    ],
    'Miniature house floors, room bounds, walls, and door openings are generated from shared level topology.'
  ),
  shared(
    'floor-wall-ceiling-builders',
    [
      'src/scene/structures/floorTiles.ts',
      'src/scene/structures/wallSegmentsMesh.ts',
      'src/scene/structures/doorwayOpenings.ts',
      'src/scene/structures/ceilingPanels.ts',
      'src/scene/structures/upperLandingFloorCutouts.ts',
    ],
    'Prompt 4b can derive simplified floors, walls, ceilings, and openings from shared builders and level data.'
  ),
  shared(
    'stairs-and-upper-landing',
    [
      'src/scene/structures/staircase.ts',
      'src/scene/structures/upperStairwellLanding.ts',
    ],
    'Staircase and landing are generated from shared topology constants.'
  ),
  shared(
    'backyard-bounds-and-paths',
    ['src/scene/environments/backyard.ts'],
    'Backyard bounds, terrain, fences, paths, shrubs, and fixtures are represented from backyard source data.'
  ),
  proxy(
    'visible-led-fixtures',
    ['src/scene/lighting/ledStrips.ts'],
    [
      p('mini-led-strip', 'box', {
        size: [1.2, 0.03, 0.05],
        position: [0, 0.05, 0],
        material: 'accent',
      }),
    ]
  ),
  proxy(
    'generic-room-decor',
    ['src/scene/structures/greenhouse.ts'],
    [
      p('mini-greenhouse-frame', 'box', {
        size: [1, 0.7, 0.05],
        position: [0, 0.45, 0],
        material: 'glass',
      }),
      p('mini-greenhouse-planter', 'box', {
        size: [0.6, 0.18, 0.32],
        position: [0, 0.18, 0.2],
        material: 'plant',
      }),
    ]
  ),
  excluded(
    'overworld-player-avatar',
    ['src/avatar', 'src/scene/avatar'],
    'Prompt 4b will represent the live player with a dedicated miniature avatar.'
  ),
  excluded(
    'poi-markers-and-labels',
    [
      'src/scene/poi/markers.ts',
      'src/scene/poi/worldTooltip.ts',
      'src/scene/poi/visitedBadge.ts',
    ],
    'Generic interaction orbs, halos, labels, badges, and hit areas are non-world miniature UI.'
  ),
  excluded(
    'debug-and-collider-visualizers',
    ['src/scene/debug', 'src/scene/colliders'],
    'Invisible colliders, nav meshes, and debug visualizers are intentionally not miniature geometry.'
  ),
  excluded(
    'type-and-runtime-nonvisual-support',
    [
      'src/scene/poi',
      'src/scene/level/backyardCollisionPolicies.ts',
      'src/scene/level/compileLegacyFloorPlan.ts',
      'src/scene/level/mediaWallPolicy.ts',
      'src/scene/level/sourceCollision.ts',
      'src/scene/level/sourceCollisionValidation.ts',
      'src/scene/level/stairSafetyColliders.ts',
      'src/scene/level/wallColliderDebugIdentity.ts',
      'src/scene/lighting/bakedLightmaps.ts',
      'src/scene/lighting/debugControls.ts',
      'src/scene/lighting/environmentAnimator.ts',
      'src/scene/lighting/ledPulsePrograms.ts',
      'src/scene/lighting/lightmapBounceAnimator.ts',
      'src/scene/lighting/seasonalPresets.ts',
      'src/scene/structures/multiplayerProjection.ts',
    ],
    'Analytics, metadata, collision policy, debug lighting, and type support are non-visible or represented by tracked builders.'
  ),
  excluded(
    'audio-hud-and-dom',
    ['src/ui', 'src/audio'],
    'HUD, DOM, and audio objects are not visible miniature scene geometry.'
  ),
] as const satisfies readonly MiniatureSceneComponentCoverage[];

export const MINIATURE_AUDITED_SOURCE_DIRECTORIES = [
  'src/scene/structures',
  'src/scene/environments',
  'src/scene/level',
  'src/scene/poi',
  'src/scene/lighting',
  'src/avatar',
] as const;
