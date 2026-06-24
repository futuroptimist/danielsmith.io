import type { SceneComponentCoverageEntry } from './types';

const proxyFile = 'src/scene/miniature/sceneComponentRegistry.ts';

export const MINIATURE_SCENE_COMPONENT_COVERAGE = [
  {
    id: 'shared:floor-plan-levels',
    label:
      'House floors, rooms, walls, doors, stair openings, and upper landing',
    kind: 'shared-source',
    sourceFiles: [
      'src/scene/level/portfolioLevel.ts',
      'src/scene/level/generateFloorSurfaces.ts',
      'src/scene/level/generateWalls.ts',
      'src/scene/structures/staircase.ts',
      'src/scene/structures/upperLandingFloorCutouts.ts',
      'src/scene/structures/upperStairwellLanding.ts',
    ],
    proxyFiles: [proxyFile],
    primitives: [],
    syncRevision: 1,
    syncNote:
      'Prompt 4b should derive topology directly from shared level data.',
  },
  {
    id: 'shared:backyard-environment',
    label:
      'Backyard bounds, terrain, path, fence, shrubs, lantern fixtures, and barrier',
    kind: 'shared-source',
    sourceFiles: ['src/scene/environments/backyard.ts'],
    proxyFiles: [proxyFile],
    primitives: [],
    syncRevision: 1,
    syncNote:
      'Miniature should derive bounds and major environment features from backyard source data.',
  },
  {
    id: 'proxy:house-visible-fixtures',
    label: 'Visible house fixtures and decor',
    kind: 'proxy',
    sourceFiles: [
      'src/scene/structures/ceilingPanels.ts',
      'src/scene/structures/doorwayOpenings.ts',
      'src/scene/structures/floorTiles.ts',
      'src/scene/structures/mediaWall.ts',
      'src/scene/structures/mediaWallStarBridge.ts',
      'src/scene/structures/selfieMirror.ts',
      'src/scene/structures/wallSegmentsMesh.ts',
      'src/scene/lighting/ledStrips.ts',
    ],
    proxyFiles: [proxyFile],
    primitives: [
      {
        kind: 'box',
        name: 'miniature-media-wall-fixture',
        material: 'screen',
        size: [1.2, 0.08, 0.52],
        position: [0, 0.4, 0],
      },
      {
        kind: 'box',
        name: 'miniature-led-strip-fixture',
        material: 'accent',
        size: [1.4, 0.04, 0.04],
        position: [0, 0.82, -0.34],
      },
      {
        kind: 'box',
        name: 'miniature-selfie-mirror-fixture',
        material: 'glass',
        size: [0.42, 0.04, 0.7],
        position: [0.72, 0.48, 0],
      },
    ],
    syncRevision: 1,
    syncNote:
      'Visible fixtures that are not pure topology get simplified proxy coverage.',
  },
  {
    id: 'excluded:runtime-non-geometry',
    label: 'Runtime systems without miniature geometry',
    kind: 'excluded',
    reason:
      'Collision, debug visualizers, HUD/DOM, audio, cameras, invisible interaction meshes, POI markers, labels, badges, and the overworld player are intentionally not miniature proxy geometry.',
    sourceFiles: [
      'src/scene/collision.ts',
      'src/scene/debug/colliderVisualizer.ts',
      'src/scene/debug/solidVisualizer.ts',
      'src/scene/poi/markers.ts',
      'src/scene/poi/tooltipOverlay.ts',
      'src/scene/poi/visitedBadge.ts',
      'src/scene/poi/worldTooltip.ts',
      'src/scene/avatar/mannequin.ts',
      'src/scene/avatar/accessories.ts',
    ],
    proxyFiles: [proxyFile],
    primitives: [],
    syncRevision: 1,
    syncNote: 'The live miniature player is deferred to Prompt 4b.',
  },
] as const satisfies readonly SceneComponentCoverageEntry[];
