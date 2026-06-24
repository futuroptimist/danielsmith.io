import type { PoiId } from '../poi/types';

import type { MiniaturePrimitive, PoiMiniatureProxyDefinition } from './types';

const proxyFile = 'src/scene/miniature/poiProxyRegistry.ts';

const baseSourceFiles = ['src/scene/poi/types.ts', 'src/scene/poi/registry.ts'];

const box = (
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  color?: number
): MiniaturePrimitive => ({
  kind: 'box',
  name,
  material: 'base',
  size,
  position,
  color,
});
const cyl = (
  name: string,
  radius: number,
  height: number,
  position: readonly [number, number, number],
  color?: number
): MiniaturePrimitive => ({
  kind: 'cylinder',
  name,
  material: 'metal',
  radius,
  height,
  position,
  color,
});
const screen = (
  name: string,
  position: readonly [number, number, number]
): MiniaturePrimitive => ({
  kind: 'box',
  name,
  material: 'screen',
  size: [0.62, 0.38, 0.04],
  position,
});
const detailRing = (name: string, radius = 0.42): MiniaturePrimitive => ({
  kind: 'ring',
  name,
  material: 'accent',
  radius,
  tubeRadius: 0.04,
  position: [0, 0.62, 0],
  rotation: [-Math.PI / 2, 0, 0],
  maxDetail: 'performance',
});

function simpleProxy(
  poiId: PoiId,
  label: string,
  primitives: readonly MiniaturePrimitive[],
  sourceFiles: readonly string[] = baseSourceFiles
): PoiMiniatureProxyDefinition {
  return {
    id: `poi:${poiId}`,
    poiId,
    label,
    primitives,
    sourceFiles,
    proxyFiles: [proxyFile],
    syncRevision: 1,
    syncNote: 'Initial miniature proxy coverage for tabletop infrastructure.',
  };
}

export const POI_MINIATURE_PROXY_REGISTRY = {
  'futuroptimist-living-room-tv': simpleProxy(
    'futuroptimist-living-room-tv',
    'Futur Optimist TV',
    [
      box('tv-console', [1.4, 0.18, 0.38], [0, 0.09, 0]),
      screen('large-tv-screen', [0, 0.75, -0.12]),
      detailRing('optimist-signal-ring'),
    ]
  ),
  'flywheel-studio-flywheel': simpleProxy(
    'flywheel-studio-flywheel',
    'Flywheel',
    [
      cyl('flywheel-base', 0.36, 0.18, [0, 0.09, 0]),
      {
        kind: 'ring',
        name: 'upright-flywheel-ring',
        material: 'accent',
        radius: 0.48,
        tubeRadius: 0.06,
        position: [0, 0.58, 0],
        rotation: [0, 0, Math.PI / 2],
      },
      cyl('flywheel-axle', 0.08, 0.74, [0, 0.58, 0], 0x202833),
    ]
  ),
  'jobbot-studio-terminal': simpleProxy(
    'jobbot-studio-terminal',
    'JobBot terminal',
    [
      box('terminal-desk', [1.1, 0.18, 0.62], [0, 0.09, 0]),
      screen('terminal-screen', [0, 0.58, -0.2]),
      box('terminal-keyboard', [0.62, 0.04, 0.2], [0, 0.22, 0.18], 0x222936),
      detailRing('jobbot-telemetry-ring'),
    ]
  ),
  'dspace-backyard-rocket': simpleProxy(
    'dspace-backyard-rocket',
    'Democratized Space rocket',
    [
      cyl('rocket-body', 0.18, 1.2, [0, 0.68, 0], 0xf1f4f8),
      {
        kind: 'cylinder',
        name: 'rocket-nose',
        material: 'warning',
        radius: 0.2,
        height: 0.28,
        position: [0, 1.42, 0],
      },
      box('rocket-fin-left', [0.08, 0.26, 0.3], [-0.22, 0.24, 0]),
      box('rocket-fin-right', [0.08, 0.26, 0.3], [0.22, 0.24, 0]),
    ]
  ),
  'sugarkube-backyard-greenhouse': simpleProxy(
    'sugarkube-backyard-greenhouse',
    'Sugarkube deployment',
    [
      box('sugarkube-table', [1.25, 0.16, 0.72], [0, 0.32, 0], 0x6b4a2f),
      box('sugarkube-switch', [0.52, 0.08, 0.28], [-0.22, 0.46, 0], 0x273545),
      box(
        'sugarkube-yellow-rack-tier',
        [0.58, 0.05, 0.34],
        [0.32, 0.54, 0],
        0xffd447
      ),
      {
        kind: 'box',
        name: 'sugarkube-yellow-rack-tier',
        material: 'warning',
        size: [0.58, 0.05, 0.34],
        position: [0.32, 0.7, 0],
        repeat: {
          count: 2,
          offset: [0, 0.16, 0],
          namePrefix: 'sugarkube-yellow-rack-tier',
        },
      },
      {
        kind: 'sphere',
        name: 'sugarkube-node',
        material: 'accent',
        radius: 0.08,
        position: [0.12, 0.58, 0.24],
        repeat: {
          count: 4,
          offset: [0.14, 0.08, -0.14],
          namePrefix: 'sugarkube-node',
        },
      },
      {
        kind: 'tube',
        name: 'sugarkube-cable-silhouette',
        material: 'cable',
        tubeRadius: 0.018,
        points: [
          [-0.2, 0.52, 0],
          [0.12, 0.66, 0.18],
          [0.46, 0.82, -0.12],
        ],
      },
    ],
    [...baseSourceFiles, 'src/scene/structures/sugarkubeDeployment.ts']
  ),
  'tokenplace-studio-cluster': simpleProxy(
    'tokenplace-studio-cluster',
    'token.place workstation',
    [
      box('tokenplace-desk', [1.35, 0.16, 0.72], [0, 0.32, 0], 0x5c4032),
      box(
        'tokenplace-pc-tower',
        [0.28, 0.62, 0.42],
        [-0.62, 0.42, 0.05],
        0x151a22
      ),
      cyl('tokenplace-gaming-chair', 0.26, 0.42, [0.58, 0.4, 0.24], 0x252b38),
      screen('tokenplace-monitor-left', [-0.23, 0.64, -0.24]),
      screen('tokenplace-monitor-right', [0.39, 0.64, -0.24]),
      box(
        'tokenplace-keyboard',
        [0.58, 0.04, 0.18],
        [0.05, 0.43, 0.12],
        0x0f1720
      ),
      box('tokenplace-mouse', [0.14, 0.04, 0.2], [0.48, 0.43, 0.13], 0x0f1720),
    ],
    [...baseSourceFiles, 'src/scene/structures/tokenPlaceWorkstation.ts']
  ),
  'gabriel-studio-sentry': simpleProxy(
    'gabriel-studio-sentry',
    'Gabriel sentry',
    [
      cyl('sentry-base', 0.3, 0.14, [0, 0.07, 0]),
      cyl('sentry-column', 0.12, 0.74, [0, 0.48, 0]),
      screen('sentry-face-screen', [0, 0.88, -0.08]),
    ]
  ),
  'f2clipboard-kitchen-console': simpleProxy(
    'f2clipboard-kitchen-console',
    'F2Clipboard console',
    [
      box('clipboard-console', [0.95, 0.18, 0.55], [0, 0.18, 0]),
      screen('clipboard-screen', [0, 0.52, -0.16]),
      box(
        'clipboard-sheet-stack',
        [0.42, 0.06, 0.32],
        [0.2, 0.32, 0.12],
        0xf6f0dc
      ),
    ]
  ),
  'axel-studio-tracker': simpleProxy('axel-studio-tracker', 'Axel tracker', [
    box('tracker-plinth', [0.84, 0.16, 0.52], [0, 0.08, 0]),
    {
      kind: 'sphere',
      name: 'tracker-orbit-node',
      material: 'accent',
      radius: 0.14,
      position: [0, 0.48, 0],
    },
    detailRing('tracker-orbit-ring', 0.36),
  ]),
  'sigma-kitchen-workbench': simpleProxy(
    'sigma-kitchen-workbench',
    'Sigma workbench',
    [
      box('sigma-bench', [1.15, 0.16, 0.7], [0, 0.32, 0]),
      cyl('sigma-vessel', 0.16, 0.28, [-0.3, 0.54, 0]),
      {
        kind: 'tube',
        name: 'sigma-arm',
        material: 'metal',
        tubeRadius: 0.025,
        points: [
          [0.2, 0.48, 0.2],
          [0.32, 0.72, 0],
          [0.1, 0.78, -0.18],
        ],
      },
    ]
  ),
  'gitshelves-living-room-installation': simpleProxy(
    'gitshelves-living-room-installation',
    'Git shelves',
    [
      box('git-shelf-frame', [1.1, 0.72, 0.18], [0, 0.44, 0]),
      {
        kind: 'box',
        name: 'git-shelf-row',
        material: 'accent',
        size: [0.96, 0.05, 0.2],
        position: [0, 0.24, 0],
        repeat: { count: 4, offset: [0, 0.15, 0], namePrefix: 'git-shelf-row' },
      },
    ]
  ),
  'wove-kitchen-loom': simpleProxy('wove-kitchen-loom', 'Wove loom', [
    box('loom-frame', [1, 0.72, 0.16], [0, 0.42, 0]),
    {
      kind: 'tube',
      name: 'loom-thread-arc',
      material: 'accent',
      tubeRadius: 0.018,
      points: [
        [-0.4, 0.25, 0],
        [0, 0.7, 0],
        [0.4, 0.25, 0],
      ],
    },
  ]),
  'pr-reaper-backyard-console': simpleProxy(
    'pr-reaper-backyard-console',
    'PR Reaper console',
    [
      box('reaper-console', [1, 0.16, 0.58], [0, 0.18, 0]),
      screen('reaper-dashboard', [0, 0.52, -0.16]),
      {
        kind: 'cylinder',
        name: 'reaper-scythe-arc',
        material: 'metal',
        radius: 0.38,
        height: 0.035,
        position: [0.36, 0.64, 0],
        rotation: [Math.PI / 2, 0, 0],
        maxDetail: 'performance',
      },
    ]
  ),
  'danielsmith-portfolio-table': {
    ...simpleProxy(
      'danielsmith-portfolio-table',
      'danielsmith.io recursion boundary table',
      [
        box(
          'portfolio-white-table',
          [1.05, 0.14, 0.74],
          [0, 0.34, 0],
          0xf8f5ee
        ),
        box(
          'portfolio-nonrecursive-miniature-marker',
          [0.42, 0.04, 0.28],
          [0, 0.45, 0],
          0xd9e1ea
        ),
      ]
    ),
    recursionBoundary: true,
    syncNote:
      'Recursion boundary: build only a simple nonrecursive white table proxy.',
  },
} satisfies Record<PoiId, PoiMiniatureProxyDefinition>;

export const POI_MINIATURE_PROXIES = Object.values(
  POI_MINIATURE_PROXY_REGISTRY
);
