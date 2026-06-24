export type MiniatureCoverageKind = 'shared-source' | 'proxy' | 'excluded';
export interface MiniatureSceneComponentCoverage {
  id: string;
  kind: MiniatureCoverageKind;
  sourceFiles: readonly string[];
  proxyFiles: readonly string[];
  syncRevision: number;
  syncNote: string;
}

export const MINIATURE_SCENE_COMPONENT_COVERAGE = [
  {
    id: 'house-topology-floors-rooms-walls-doors',
    kind: 'shared-source',
    sourceFiles: [
      'src/scene/level/portfolioLevel.ts',
      'src/scene/structures/wallSegmentsMesh.ts',
      'src/scene/structures/doorwayOpenings.ts',
    ],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote:
      'Prompt 4b generates floor slabs, room bounds, walls, and door openings from shared topology.',
  },
  {
    id: 'staircase-upper-landing',
    kind: 'shared-source',
    sourceFiles: [
      'src/scene/structures/staircase.ts',
      'src/scene/structures/upperStairwellLanding.ts',
    ],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote:
      'Miniature staircase and landing are generated from shared stair builder dimensions.',
  },
  {
    id: 'backyard-bounds-environment',
    kind: 'proxy',
    sourceFiles: ['src/scene/environments/backyard.ts'],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote:
      'Backyard terrain, path, fence, shrubs, and fixtures require simplified non-POI proxies.',
  },

  {
    id: 'ceiling-panels-and-floor-tiles',
    kind: 'shared-source',
    sourceFiles: [
      'src/scene/structures/ceilingPanels.ts',
      'src/scene/structures/floorTiles.ts',
      'src/scene/structures/upperLandingFloorCutouts.ts',
    ],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote:
      'Generated from shared house surface data where miniature floors and cutouts are built.',
  },
  {
    id: 'greenhouse-environment-structure',
    kind: 'proxy',
    sourceFiles: ['src/scene/structures/greenhouse.ts'],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote: 'Visible greenhouse shell receives a simplified miniature proxy.',
  },
  {
    id: 'multiplayer-projection-decor',
    kind: 'proxy',
    sourceFiles: ['src/scene/structures/multiplayerProjection.ts'],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote:
      'Visible projection dais/screen represented by noninteractive proxy geometry.',
  },
  {
    id: 'selfie-mirror-decor',
    kind: 'proxy',
    sourceFiles: ['src/scene/structures/selfieMirror.ts'],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote: 'Visible mirror fixture represented by a static miniature proxy.',
  },
  {
    id: 'media-wall-star-bridge',
    kind: 'proxy',
    sourceFiles: ['src/scene/structures/mediaWallStarBridge.ts'],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote: 'Decorative star bridge represented as simplified accent rails.',
  },
  {
    id: 'visible-avatar',
    kind: 'excluded',
    sourceFiles: ['src/scene/avatar/mannequin.ts'],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote:
      'Excluded because Prompt 4b will add a dedicated live miniature avatar.',
  },
  {
    id: 'visible-lighting-fixtures',
    kind: 'proxy',
    sourceFiles: ['src/scene/lighting/ledStrips.ts'],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote:
      'Visible LED strips are represented as simplified fixture strips; light objects themselves are excluded.',
  },
  {
    id: 'poi-markers-and-labels',
    kind: 'excluded',
    sourceFiles: [
      'src/scene/poi/markers.ts',
      'src/scene/poi/worldTooltip.ts',
      'src/scene/poi/visitedBadge.ts',
    ],
    proxyFiles: ['src/scene/miniature/sceneComponentRegistry.ts'],
    syncRevision: 1,
    syncNote:
      'POI orbs, halos, labels, badges, hit areas, and tooltips are interaction UI, not miniature geometry.',
  },
] as const satisfies readonly MiniatureSceneComponentCoverage[];

export const AUDITED_MINIATURE_SOURCE_DIRS = [
  'src/scene/structures',
  'src/scene/environments',
  'src/scene/level',
  'src/scene/avatar',
  'src/scene/poi',
  'src/scene/lighting',
] as const;

export const MINIATURE_EXCLUDED_SOURCE_FILES = [
  'src/scene/structures/triangleCount.ts',
  'src/scene/structures/colliderHelpers.ts',
] as const;
