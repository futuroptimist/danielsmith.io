import type { PoiId } from '../poi/types';
import { buildMiniatureProxy } from './proxyBuilder';
import type {
  MiniaturePart,
  MiniatureProxyDefinition,
  MiniatureBuildOptions,
} from './types';

const proxyFile = 'src/scene/miniature/poiProxyRegistry.ts';
const part = (
  name: string,
  kind: MiniaturePart['kind'],
  material: MiniaturePart['material'],
  extra: Partial<MiniaturePart> = {}
): MiniaturePart => ({ name, kind, material, ...extra });
const generic = (
  id: PoiId,
  sourceFiles: string[],
  icon: MiniaturePart[]
): MiniatureProxyDefinition => ({
  id,
  label: id,
  sourceFiles,
  proxyFiles: [proxyFile],
  syncRevision: 1,
  syncNote: 'Initial miniature proxy coverage.',
  parts: [
    part('base-plinth', 'box', 'base', {
      size: [1.4, 0.1, 1],
      color: 0x293241,
    }),
    ...icon,
  ],
});

export const MINIATURE_POI_PROXY_REGISTRY = {
  'futuroptimist-living-room-tv': generic(
    'futuroptimist-living-room-tv',
    ['src/scene/structures/mediaWall.ts'],
    [
      part('tv-screen', 'box', 'screen', {
        size: [1.2, 0.55, 0.06],
        position: [0, 0.45, 0],
        color: 0x101820,
      }),
      part('soundbar', 'box', 'accent', {
        size: [0.8, 0.08, 0.08],
        position: [0, 0.17, 0.35],
        color: 0x5acbff,
      }),
    ]
  ),
  'flywheel-studio-flywheel': generic(
    'flywheel-studio-flywheel',
    ['src/scene/structures/flywheel.ts'],
    [
      part('flywheel-ring', 'ring', 'accent', {
        innerRadius: 0.32,
        outerRadius: 0.44,
        position: [0, 0.55, 0],
        rotation: [-Math.PI / 2, 0, 0],
        color: 0x48ffd4,
      }),
      part('flywheel-axle', 'cylinder', 'metal', {
        radius: 0.12,
        height: 0.24,
        position: [0, 0.55, 0],
        color: 0xcfd8dc,
      }),
    ]
  ),
  'jobbot-studio-terminal': generic(
    'jobbot-studio-terminal',
    ['src/scene/structures/jobbotTerminal.ts'],
    [
      part('terminal-screen', 'box', 'screen', {
        size: [0.95, 0.5, 0.05],
        position: [0, 0.55, -0.18],
        color: 0x6ee7ff,
      }),
      part('terminal-keyboard', 'box', 'accent', {
        size: [0.8, 0.06, 0.35],
        position: [0, 0.16, 0.28],
        color: 0x222222,
      }),
    ]
  ),
  'dspace-backyard-rocket': generic(
    'dspace-backyard-rocket',
    ['src/scene/structures/modelRocket.ts'],
    [
      part('rocket-body', 'cylinder', 'white', {
        radius: 0.18,
        height: 1.05,
        position: [0, 0.65, 0],
        color: 0xf5f5f5,
      }),
      part('rocket-flame', 'cylinder', 'accent', {
        radius: 0.12,
        height: 0.24,
        position: [0, 0.08, 0],
        color: 0xff8a00,
      }),
    ]
  ),
  'sugarkube-backyard-greenhouse': generic(
    'sugarkube-backyard-greenhouse',
    ['src/scene/structures/sugarkubeDeployment.ts'],
    [
      part('sugarkube-table', 'box', 'wood', {
        size: [1.1, 0.16, 0.75],
        position: [0, 0.25, 0],
        color: 0x6b3f21,
      }),
      part('sugarkube-switch', 'box', 'metal', {
        size: [0.5, 0.12, 0.3],
        position: [-0.25, 0.43, 0],
        color: 0x15191d,
      }),
      part('sugarkube-yellow-three-tier-rack', 'box', 'accent', {
        size: [0.55, 0.06, 0.35],
        position: [0.28, 0.52, 0],
        repeat: { count: 3, offset: [0, 0.17, 0] },
        color: 0xf3c623,
      }),
      part('sugarkube-node', 'box', 'base', {
        size: [0.16, 0.08, 0.12],
        position: [0.1, 0.63, -0.18],
        repeat: { count: 3, offset: [0.16, 0.02, 0.16] },
        color: 0x2f80ed,
      }),
      part('sugarkube-cable-silhouette', 'tube', 'cable', {
        points: [
          [-0.25, 0.5, 0],
          [0.32, 0.74, 0.22],
        ],
        radius: 0.018,
        color: 0x111111,
      }),
    ]
  ),
  'tokenplace-studio-cluster': generic(
    'tokenplace-studio-cluster',
    ['src/scene/structures/tokenPlaceWorkstation.ts'],
    [
      part('tokenplace-desk', 'box', 'wood', {
        size: [1.25, 0.12, 0.65],
        position: [0, 0.32, 0],
        color: 0x664022,
      }),
      part('tokenplace-pc-tower', 'box', 'metal', {
        size: [0.28, 0.58, 0.38],
        position: [-0.55, 0.42, 0.18],
        color: 0x15191d,
      }),
      part('tokenplace-gaming-chair', 'cylinder', 'accent', {
        radius: 0.22,
        height: 0.45,
        position: [0, 0.38, 0.72],
        color: 0x8b1e3f,
      }),
      part('tokenplace-left-monitor', 'box', 'screen', {
        size: [0.5, 0.32, 0.04],
        position: [-0.27, 0.62, -0.24],
        color: 0x39ff88,
      }),
      part('tokenplace-right-monitor', 'box', 'screen', {
        size: [0.5, 0.32, 0.04],
        position: [0.27, 0.62, -0.24],
        color: 0x39ff88,
      }),
      part('tokenplace-keyboard', 'box', 'base', {
        size: [0.55, 0.035, 0.18],
        position: [0, 0.41, 0.08],
        color: 0x222222,
      }),
      part('tokenplace-mouse', 'sphere', 'base', {
        radius: 0.07,
        position: [0.42, 0.43, 0.1],
        color: 0x222222,
      }),
    ]
  ),
  'gabriel-studio-sentry': generic(
    'gabriel-studio-sentry',
    ['src/scene/structures/gabrielSentry.ts'],
    [
      part('sentry-body', 'cylinder', 'metal', {
        radius: 0.28,
        height: 0.9,
        position: [0, 0.55, 0],
        color: 0x607d8b,
      }),
      part('sentry-eye', 'sphere', 'accent', {
        radius: 0.13,
        position: [0, 0.82, -0.2],
        color: 0xff3344,
      }),
    ]
  ),
  'f2clipboard-kitchen-console': generic(
    'f2clipboard-kitchen-console',
    ['src/scene/structures/f2ClipboardConsole.ts'],
    [
      part('clipboard-console', 'box', 'screen', {
        size: [0.85, 0.45, 0.08],
        position: [0, 0.5, 0],
        color: 0x00d1ff,
      }),
      part('clipboard-sheet', 'plane', 'white', {
        size: [0.4, 0, 0.55],
        position: [0.32, 0.75, 0],
        color: 0xffffff,
      }),
    ]
  ),
  'axel-studio-tracker': generic(
    'axel-studio-tracker',
    ['src/scene/structures/axelNavigator.ts'],
    [
      part('tracker-table', 'cylinder', 'wood', {
        radius: 0.45,
        height: 0.18,
        position: [0, 0.28, 0],
        color: 0x553311,
      }),
      part('tracker-ring', 'ring', 'accent', {
        innerRadius: 0.22,
        outerRadius: 0.34,
        position: [0, 0.42, 0],
        rotation: [-Math.PI / 2, 0, 0],
        color: 0xffc857,
      }),
    ]
  ),
  'sigma-kitchen-workbench': generic(
    'sigma-kitchen-workbench',
    ['src/scene/structures/sigmaWorkbench.ts'],
    [
      part('sigma-bench', 'box', 'wood', {
        size: [1.15, 0.16, 0.72],
        position: [0, 0.28, 0],
        color: 0x6d4c41,
      }),
      part('sigma-spool', 'ring', 'accent', {
        innerRadius: 0.14,
        outerRadius: 0.24,
        position: [0.28, 0.48, 0],
        rotation: [Math.PI / 2, 0, 0],
        color: 0x80cbc4,
      }),
    ]
  ),
  'gitshelves-living-room-installation': generic(
    'gitshelves-living-room-installation',
    ['src/scene/structures/gitshelves.ts'],
    [
      part('gitshelves-case', 'box', 'wood', {
        size: [0.95, 0.9, 0.25],
        position: [0, 0.55, 0],
        color: 0x4e342e,
      }),
      part('gitshelves-commit-block', 'box', 'accent', {
        size: [0.16, 0.1, 0.12],
        position: [-0.3, 0.45, 0],
        repeat: { count: 4, offset: [0.2, 0.08, 0] },
        color: 0x7e57c2,
      }),
    ]
  ),
  'wove-kitchen-loom': generic(
    'wove-kitchen-loom',
    ['src/scene/structures/woveLoom.ts'],
    [
      part('loom-frame', 'box', 'wood', {
        size: [0.9, 0.75, 0.12],
        position: [0, 0.55, 0],
        color: 0x8d6e63,
      }),
      part('loom-thread', 'box', 'accent', {
        size: [0.04, 0.65, 0.04],
        position: [-0.3, 0.56, 0],
        repeat: { count: 5, offset: [0.15, 0, 0] },
        color: 0xff80ab,
      }),
    ]
  ),
  'pr-reaper-backyard-console': generic(
    'pr-reaper-backyard-console',
    ['src/scene/structures/prReaperConsole.ts'],
    [
      part('reaper-console', 'box', 'metal', {
        size: [0.9, 0.4, 0.5],
        position: [0, 0.35, 0],
        color: 0x263238,
      }),
      part('reaper-scythe', 'tube', 'accent', {
        points: [
          [-0.35, 0.45, 0],
          [0.35, 0.85, 0],
        ],
        radius: 0.02,
        color: 0xe0e0e0,
      }),
    ]
  ),
  'danielsmith-portfolio-table': {
    ...generic(
      'danielsmith-portfolio-table',
      ['src/main.ts'],
      [
        part('portfolio-nonrecursive-white-table', 'box', 'white', {
          size: [1.05, 0.12, 0.72],
          position: [0, 0.35, 0],
          color: 0xffffff,
        }),
      ]
    ),
    recursionBoundary: true,
    syncNote: 'Recursion boundary: nonrecursive white-table proxy only.',
  },
} satisfies Record<PoiId, MiniatureProxyDefinition>;

export const MINIATURE_POI_PROXY_ENTRIES = Object.values(
  MINIATURE_POI_PROXY_REGISTRY
);
export const buildPoiMiniatureProxy = (
  id: PoiId,
  options: MiniatureBuildOptions
) => buildMiniatureProxy(MINIATURE_POI_PROXY_REGISTRY[id], options);
