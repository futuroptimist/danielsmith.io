import type { MiniatureProxyDefinition } from './types';

export type MiniatureCoverageKind = 'shared-source' | 'proxy' | 'excluded';

export interface MiniatureSceneComponentCoverage {
  id: string;
  kind: MiniatureCoverageKind;
  sourceFiles: readonly string[];
  proxyFiles?: readonly string[];
  syncRevision: number;
  syncNote?: string;
  reason?: string;
}

const SELF_FILE = 'src/scene/miniature/sceneComponentRegistry.ts';

export const MINIATURE_SCENE_COMPONENT_COVERAGE = [
  {
    id: 'level:portfolio-layout',
    kind: 'shared-source',
    sourceFiles: [
      'src/scene/level/portfolioLevel.ts',
      'src/scene/level/schema.ts',
      'src/assets/floorPlan/index.ts',
    ],
    syncRevision: 1,
    syncNote:
      'Miniature house will derive floors, room bounds, and door openings from shared level data.',
  },
  {
    id: 'level:floors-walls',
    kind: 'shared-source',
    sourceFiles: [
      'src/scene/level/generateFloorSurfaces.ts',
      'src/scene/level/generateWalls.ts',
      'src/scene/structures/wallSegmentsMesh.ts',
      'src/scene/structures/floorTiles.ts',
    ],
    syncRevision: 1,
    syncNote: 'Floor and wall shells are generated from shared topology.',
  },
  {
    id: 'level:stairs-landing',
    kind: 'shared-source',
    sourceFiles: [
      'src/scene/structures/staircase.ts',
      'src/scene/structures/upperLandingFloorCutouts.ts',
      'src/scene/structures/upperStairwellLanding.ts',
      'src/scene/level/upperStairwellLandingSegments.ts',
    ],
    syncRevision: 1,
    syncNote: 'Stairs and upper landing have shared dimensions.',
  },
  {
    id: 'environment:backyard',
    kind: 'shared-source',
    sourceFiles: ['src/scene/environments/backyard.ts'],
    syncRevision: 1,
    syncNote:
      'Backyard bounds, path, fence, lantern, shrubs, and barrier require miniature review when source changes.',
  },
  {
    id: 'lighting:visible-fixtures',
    kind: 'proxy',
    sourceFiles: [
      'src/scene/lighting/ledStrips.ts',
      'src/scene/lighting/bakedLightmaps.ts',
    ],
    proxyFiles: [SELF_FILE],
    syncRevision: 1,
    syncNote:
      'Visible LED strips are represented as simplified fixture strips; invisible light contribution is excluded.',
  },
  {
    id: 'decor:ceiling-panels',
    kind: 'proxy',
    sourceFiles: ['src/scene/structures/ceilingPanels.ts'],
    proxyFiles: [SELF_FILE],
    syncRevision: 1,
    syncNote: 'Ceiling panel fixtures need simplified caps in the tabletop.',
  },
  {
    id: 'avatar:overworld-player',
    kind: 'excluded',
    sourceFiles: [
      'src/scene/avatar/mannequin.ts',
      'src/scene/avatar/accessories.ts',
    ],
    syncRevision: 1,
    reason:
      'Prompt 4b will add a dedicated live miniature avatar instead of cloning the overworld player.',
  },
  {
    id: 'poi:markers-labels',
    kind: 'excluded',
    sourceFiles: [
      'src/scene/poi/markers.ts',
      'src/scene/poi/worldTooltip.ts',
      'src/scene/poi/visitedBadge.ts',
    ],
    syncRevision: 1,
    reason:
      'POI orbs, halos, labels, hit areas, and badges are interaction UI, not miniature geometry.',
  },
  {
    id: 'debug:visualizers',
    kind: 'excluded',
    sourceFiles: [
      'src/scene/debug/colliderVisualizer.ts',
      'src/scene/debug/solidVisualizer.ts',
    ],
    syncRevision: 1,
    reason: 'Debug visualizers are not production miniature geometry.',
  },
  {
    id: 'audit:src:scene:avatar:accessoryManager',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/accessoryManager.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:avatar:accessoryPresets',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/accessoryPresets.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:avatar:assetPipeline',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/assetPipeline.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:avatar:footIkController',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/footIkController.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:avatar:importer',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/importer.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:avatar:interactionAnimator',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/interactionAnimator.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:avatar:locomotionAnimator',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/locomotionAnimator.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:avatar:variantManager',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/variantManager.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:avatar:variants',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/variants.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:backyardCollisionPolicies',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/backyardCollisionPolicies.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:compileLegacyFloorPlan',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/compileLegacyFloorPlan.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:floorElevations',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/floorElevations.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:mediaWallPolicy',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/mediaWallPolicy.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:sceneObjects',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/sceneObjects.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:sourceCollision',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/sourceCollision.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:sourceCollisionValidation',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/sourceCollisionValidation.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:sourceIds',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/sourceIds.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:stairSafetyColliders',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/stairSafetyColliders.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:level:wallColliderDebugIdentity',
    kind: 'excluded',
    sourceFiles: ['src/scene/level/wallColliderDebugIdentity.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:lighting:debugControls',
    kind: 'excluded',
    sourceFiles: ['src/scene/lighting/debugControls.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:lighting:environmentAnimator',
    kind: 'excluded',
    sourceFiles: ['src/scene/lighting/environmentAnimator.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:lighting:ledPulsePrograms',
    kind: 'excluded',
    sourceFiles: ['src/scene/lighting/ledPulsePrograms.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:lighting:lightmapBounceAnimator',
    kind: 'excluded',
    sourceFiles: ['src/scene/lighting/lightmapBounceAnimator.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:lighting:seasonalPresets',
    kind: 'excluded',
    sourceFiles: ['src/scene/lighting/seasonalPresets.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:analytics',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/analytics.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:emphasis',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/emphasis.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:githubMetrics',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/githubMetrics.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:guidedTourChannel',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/guidedTourChannel.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:interactionManager',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/interactionManager.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:modelTriangles',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/modelTriangles.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:physicalMetadata',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/physicalMetadata.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:structuredData',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/structuredData.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:tooltipOverlay',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/tooltipOverlay.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:tourGuide',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/tourGuide.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:validation',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/validation.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:poi:visitedState',
    kind: 'excluded',
    sourceFiles: ['src/scene/poi/visitedState.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:structures:doorwayOpenings',
    kind: 'excluded',
    sourceFiles: ['src/scene/structures/doorwayOpenings.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:structures:greenhouse',
    kind: 'excluded',
    sourceFiles: ['src/scene/structures/greenhouse.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:structures:mediaWallStarBridge',
    kind: 'excluded',
    sourceFiles: ['src/scene/structures/mediaWallStarBridge.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:structures:multiplayerProjection',
    kind: 'excluded',
    sourceFiles: ['src/scene/structures/multiplayerProjection.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
  {
    id: 'audit:src:scene:structures:triangleCount',
    kind: 'excluded',
    sourceFiles: ['src/scene/structures/triangleCount.ts'],
    syncRevision: 1,
    reason:
      'Audited support or non-miniature runtime source; visible geometry impact is covered by POI or shared component entries.',
  },
] as const satisfies readonly MiniatureSceneComponentCoverage[];

export const MINIATURE_SCENE_COMPONENT_PROXIES: readonly MiniatureProxyDefinition[] =
  [
    {
      id: 'component:lighting-visible-fixtures',
      displayName: 'Visible lighting fixture proxy',
      syncRevision: 1,
      syncNote: 'Simplified visible LED strip fixtures.',
      sourceFiles: ['src/scene/lighting/ledStrips.ts'],
      proxyFiles: [SELF_FILE],
      primitives: [
        {
          kind: 'box',
          name: 'miniature-led-strip-fixture',
          size: [1.2, 0.035, 0.08],
          position: [0, 0.2, 0],
          color: 0xfef08a,
        },
      ],
    },
    {
      id: 'component:ceiling-panels',
      displayName: 'Ceiling panel proxy',
      syncRevision: 1,
      syncNote: 'Simplified visible ceiling panel.',
      sourceFiles: ['src/scene/structures/ceilingPanels.ts'],
      proxyFiles: [SELF_FILE],
      primitives: [
        {
          kind: 'box',
          name: 'miniature-ceiling-panel',
          size: [1, 0.025, 0.7],
          position: [0, 0.25, 0],
          color: 0xe2e8f0,
        },
      ],
    },
  ];
