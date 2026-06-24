import type { PoiId } from '../poi/types';

import type { MiniaturePrimitive, MiniatureProxyDefinition } from './types';

const proxyFile = 'src/scene/miniature/poiProxyRegistry.ts';
const commonSource = [
  'src/scene/poi/registry.ts',
  'src/scene/poi/placements.ts',
];
const part = (
  name: string,
  kind: MiniaturePrimitive['kind'],
  extra: Omit<MiniaturePrimitive, 'name' | 'kind'> = {}
): MiniaturePrimitive => ({ name, kind, ...extra });
const box = (
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: MiniaturePrimitive['material'] = 'base',
  extra = {}
) => part(name, 'box', { size, position, material, ...extra });
const cyl = (
  name: string,
  radius: number,
  height: number,
  position: readonly [number, number, number],
  material: MiniaturePrimitive['material'] = 'metal',
  extra = {}
) => part(name, 'cylinder', { radius, height, position, material, ...extra });
const sphere = (
  name: string,
  radius: number,
  position: readonly [number, number, number],
  material: MiniaturePrimitive['material'] = 'accent',
  extra = {}
) => part(name, 'sphere', { radius, position, material, ...extra });
const ring = (
  name: string,
  position: readonly [number, number, number],
  extra = {}
) =>
  part(name, 'ring', {
    innerRadius: 0.22,
    outerRadius: 0.28,
    position,
    material: 'accent',
    rotation: [-Math.PI / 2, 0, 0],
    ...extra,
  });

function def(
  poiId: PoiId,
  semanticName: string,
  source: string[],
  parts: MiniaturePrimitive[],
  options: Partial<MiniatureProxyDefinition> = {}
): MiniatureProxyDefinition {
  return {
    id: poiId,
    poiId,
    semanticName,
    parts,
    ...options,
    sync: {
      id: poiId,
      overworldSourceFiles: [...commonSource, ...source],
      proxySourceFiles: [proxyFile],
      syncRevision: 1,
      syncNote: 'Initial miniature proxy coverage.',
    },
  };
}

export const MINIATURE_POI_PROXY_REGISTRY = {
  'futuroptimist-living-room-tv': def(
    'futuroptimist-living-room-tv',
    'MiniatureFuturOptimistTv',
    [
      'src/scene/structures/mediaWall.ts',
      'src/scene/structures/mediaWallStarBridge.ts',
    ],
    [
      box('tv-console', [1.3, 0.12, 0.35], [0, 0.1, 0], 'wood'),
      box('tv-screen', [1.25, 0.75, 0.06], [0, 0.65, -0.16], 'screen'),
      box('tv-glow-strip', [1.1, 0.04, 0.04], [0, 1.05, -0.2], 'accent', {
        includeUntil: 'performance',
      }),
    ]
  ),
  'flywheel-studio-flywheel': def(
    'flywheel-studio-flywheel',
    'MiniatureFlywheel',
    ['src/scene/structures/flywheel.ts'],
    [
      cyl('flywheel-dais', 0.55, 0.16, [0, 0.08, 0]),
      ring('flywheel-rotor', [0, 0.55, 0], { rotation: [0, 0, 0] }),
      box('flywheel-spoke', [0.7, 0.04, 0.04], [0, 0.55, 0], 'accent'),
      sphere('flywheel-orbit', 0.08, [0.45, 0.7, 0], 'accent', {
        includeUntil: 'balanced',
      }),
    ]
  ),
  'jobbot-studio-terminal': def(
    'jobbot-studio-terminal',
    'MiniatureJobbotTerminal',
    ['src/scene/structures/jobbotTerminal.ts'],
    [
      box('jobbot-desk', [1.2, 0.12, 0.55], [0, 0.35, 0], 'wood'),
      box('jobbot-screen', [0.8, 0.5, 0.05], [0, 0.8, -0.22], 'screen'),
      cyl('jobbot-hologram-base', 0.22, 0.12, [0.48, 0.48, 0]),
      sphere('jobbot-hologram-core', 0.14, [0.48, 0.78, 0], 'accent', {
        includeUntil: 'performance',
      }),
    ]
  ),
  'dspace-backyard-rocket': def(
    'dspace-backyard-rocket',
    'MiniatureDSpaceRocket',
    ['src/scene/structures/modelRocket.ts'],
    [
      cyl('rocket-stand', 0.35, 0.12, [0, 0.06, 0]),
      cyl('rocket-body', 0.18, 0.9, [0, 0.55, 0], 'white'),
      box('rocket-fin', [0.12, 0.25, 0.04], [0.22, 0.25, 0], 'warning'),
      box('rocket-window', [0.08, 0.08, 0.02], [0, 0.7, -0.18], 'glass', {
        includeUntil: 'low',
      }),
    ]
  ),
  'sugarkube-backyard-greenhouse': def(
    'sugarkube-backyard-greenhouse',
    'MiniatureSugarkubeDeployment',
    ['src/scene/structures/sugarkubeDeployment.ts'],
    [
      box('sugarkube-table', [1.25, 0.12, 0.7], [0, 0.35, 0], 'wood'),
      box('sugarkube-switch', [0.55, 0.1, 0.32], [-0.2, 0.48, 0], 'metal'),
      box(
        'sugarkube-yellow-rack-tier',
        [0.5, 0.05, 0.36],
        [0.32, 0.62, 0],
        'warning',
        { repeat: { count: 3, offset: [0, 0.18, 0] } }
      ),
      cyl('sugarkube-node', 0.08, 0.08, [-0.35, 0.62, 0.2], 'accent', {
        repeat: { count: 3, offset: [0.18, 0.06, -0.12] },
      }),
      part('sugarkube-cable-silhouette', 'tube', {
        points: [
          [-0.35, 0.62, 0.2],
          [0.35, 0.85, -0.1],
        ],
        radius: 0.025,
        material: 'metal',
      }),
    ]
  ),
  'tokenplace-studio-cluster': def(
    'tokenplace-studio-cluster',
    'MiniatureTokenPlaceWorkstation',
    ['src/scene/structures/tokenPlaceWorkstation.ts'],
    [
      box('tokenplace-desk', [1.35, 0.12, 0.55], [0, 0.45, 0], 'wood'),
      box(
        'tokenplace-pc-tower',
        [0.25, 0.62, 0.36],
        [-0.82, 0.38, 0.05],
        'metal'
      ),
      box(
        'tokenplace-gaming-chair',
        [0.45, 0.18, 0.42],
        [0.25, 0.25, 0.65],
        'base'
      ),
      box(
        'tokenplace-chair-back',
        [0.5, 0.58, 0.1],
        [0.25, 0.65, 0.85],
        'base'
      ),
      box(
        'tokenplace-monitor',
        [0.48, 0.32, 0.04],
        [-0.3, 0.8, -0.25],
        'screen',
        { repeat: { count: 2, offset: [0.58, 0, 0] } }
      ),
      box('tokenplace-keyboard', [0.62, 0.04, 0.18], [0, 0.55, 0.05], 'metal'),
      sphere('tokenplace-mouse', 0.08, [0.48, 0.56, 0.08], 'metal'),
    ]
  ),
  'gabriel-studio-sentry': def(
    'gabriel-studio-sentry',
    'MiniatureGabrielSentry',
    ['src/scene/structures/gabrielSentry.ts'],
    [
      cyl('gabriel-base', 0.4, 0.14, [0, 0.07, 0]),
      cyl('gabriel-core', 0.22, 0.8, [0, 0.5, 0]),
      sphere('gabriel-sensor', 0.2, [0, 1.0, 0], 'screen'),
      ring('gabriel-shield-ring', [0, 0.8, 0], { includeUntil: 'performance' }),
    ]
  ),
  'f2clipboard-kitchen-console': def(
    'f2clipboard-kitchen-console',
    'MiniatureF2ClipboardConsole',
    ['src/scene/structures/f2ClipboardConsole.ts'],
    [
      cyl('f2-dais', 0.45, 0.14, [0, 0.07, 0]),
      box('f2-console', [0.9, 0.35, 0.55], [0, 0.38, 0], 'metal'),
      box('f2-clipboard', [0.24, 0.34, 0.03], [0.25, 0.7, -0.2], 'white'),
    ]
  ),
  'axel-studio-tracker': def(
    'axel-studio-tracker',
    'MiniatureAxelTracker',
    ['src/scene/structures/axelNavigator.ts'],
    [
      cyl('axel-round-table', 0.5, 0.2, [0, 0.2, 0], 'metal'),
      ring('axel-route-ring', [0, 0.42, 0]),
      box('axel-console-slate', [0.7, 0.04, 0.36], [0, 0.45, -0.05], 'screen'),
    ]
  ),
  'sigma-kitchen-workbench': def(
    'sigma-kitchen-workbench',
    'MiniatureSigmaWorkbench',
    ['src/scene/structures/sigmaWorkbench.ts'],
    [
      box('sigma-workbench', [1.1, 0.14, 0.62], [0, 0.42, 0], 'wood'),
      cyl('sigma-beaker', 0.12, 0.2, [-0.35, 0.62, 0], 'glass'),
      ring('sigma-spool', [0.35, 0.65, 0]),
    ]
  ),
  'gitshelves-living-room-installation': def(
    'gitshelves-living-room-installation',
    'MiniatureGitshelves',
    ['src/scene/structures/gitshelves.ts'],
    [
      box('gitshelves-cabinet', [1.05, 0.75, 0.35], [0, 0.45, 0], 'wood'),
      box('gitshelves-shelf', [0.9, 0.05, 0.28], [0, 0.35, 0], 'metal', {
        repeat: { count: 3, offset: [0, 0.18, 0] },
      }),
      box(
        'gitshelves-commit-cube',
        [0.12, 0.1, 0.12],
        [-0.3, 0.45, 0],
        'accent',
        { includeUntil: 'low', repeat: { count: 4, offset: [0.2, 0.07, 0] } }
      ),
    ]
  ),
  'wove-kitchen-loom': def(
    'wove-kitchen-loom',
    'MiniatureWoveLoom',
    ['src/scene/structures/woveLoom.ts'],
    [
      box('wove-table', [1, 0.12, 0.6], [0, 0.36, 0], 'wood'),
      box('wove-loom-frame', [0.75, 0.55, 0.08], [0, 0.72, -0.18], 'metal'),
      box('wove-thread-bar', [0.7, 0.03, 0.03], [0, 0.68, -0.24], 'accent', {
        repeat: { count: 3, offset: [0, 0.12, 0] },
      }),
    ]
  ),
  'pr-reaper-backyard-console': def(
    'pr-reaper-backyard-console',
    'MiniaturePrReaperConsole',
    ['src/scene/structures/prReaperConsole.ts'],
    [
      box('reaper-console-deck', [1.1, 0.16, 0.62], [0, 0.26, 0], 'metal'),
      box('reaper-screen', [0.7, 0.55, 0.05], [0, 0.72, -0.25], 'screen'),
      ring('reaper-scan-ring', [0, 0.75, -0.3], {
        includeUntil: 'performance',
      }),
    ]
  ),
  'danielsmith-portfolio-table': def(
    'danielsmith-portfolio-table',
    'MiniatureDanielsmithRecursionBoundary',
    ['src/scene/structures/selfieMirror.ts'],
    [
      box('danielsmith-white-table', [0.9, 0.12, 0.7], [0, 0.35, 0], 'white'),
      box(
        'danielsmith-nonrecursive-card',
        [0.55, 0.04, 0.35],
        [0, 0.46, 0],
        'screen'
      ),
    ],
    { recursionBoundary: true, allowRecursion: false }
  ),
} satisfies Record<PoiId, MiniatureProxyDefinition>;

export const MINIATURE_POI_PROXIES = Object.values(
  MINIATURE_POI_PROXY_REGISTRY
);
