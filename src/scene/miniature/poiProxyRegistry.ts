import type { PoiId } from '../poi/types';

import type {
  MiniaturePoiProxyDefinition,
  MiniaturePrimitiveDefinition,
} from './types';

const SELF_FILE = 'src/scene/miniature/poiProxyRegistry.ts';
const box = (
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  color: number
): MiniaturePrimitiveDefinition => ({
  kind: 'box',
  name,
  size,
  position,
  color,
});
const cyl = (
  name: string,
  radius: number,
  height: number,
  position: [number, number, number],
  color: number
): MiniaturePrimitiveDefinition => ({
  kind: 'cylinder',
  name,
  radius,
  height,
  position,
  color,
});
const sphere = (
  name: string,
  radius: number,
  position: [number, number, number],
  color: number
): MiniaturePrimitiveDefinition => ({
  kind: 'sphere',
  name,
  radius,
  position,
  color,
});
const cable = (
  name: string,
  points: [number, number, number][]
): MiniaturePrimitiveDefinition => ({
  kind: 'tube',
  name,
  radius: 0.025,
  points,
  color: 0x111827,
  minDetail: 'cinematic',
});

const baseFiles = ['src/scene/poi/registry.ts', 'src/scene/poi/placements.ts'];

export const MINIATURE_POI_PROXY_REGISTRY = {
  'futuroptimist-living-room-tv': {
    poiId: 'futuroptimist-living-room-tv',
    id: 'poi:futuroptimist-living-room-tv',
    displayName: 'Futur Optimist TV proxy',
    syncRevision: 1,
    syncNote: 'Initial iconic television and media console proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/mediaWall.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('media-console', [1.4, 0.22, 0.45], [0, 0.11, 0], 0x334155),
      box('wide-tv-screen', [1.55, 0.9, 0.08], [0, 0.78, -0.2], 0x0f172a),
      box(
        'optimist-screen-accent',
        [1.3, 0.04, 0.09],
        [0, 1.18, -0.25],
        0x38bdf8
      ),
      cyl('hologram-dial', 0.2, 0.08, [0.48, 0.3, 0.05], 0x60a5fa),
    ],
  },
  'flywheel-studio-flywheel': {
    poiId: 'flywheel-studio-flywheel',
    id: 'poi:flywheel-studio-flywheel',
    displayName: 'Flywheel proxy',
    syncRevision: 1,
    syncNote: 'Initial flywheel dais proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/flywheel.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      cyl('flywheel-dais', 0.7, 0.18, [0, 0.09, 0], 0x0f766e),
      {
        kind: 'ring',
        name: 'flywheel-rotor-ring',
        radius: 0.55,
        tube: 0.08,
        position: [0, 0.65, 0],
        rotation: [Math.PI / 2, 0, 0],
        color: 0x2dd4bf,
      },
      box('flywheel-spoke', [1, 0.05, 0.06], [0, 0.65, 0], 0xccfbf1),
      box(
        'flywheel-counterweight',
        [0.18, 0.16, 0.18],
        [0.44, 0.65, 0],
        0xf59e0b
      ),
    ],
  },
  'jobbot-studio-terminal': {
    poiId: 'jobbot-studio-terminal',
    id: 'poi:jobbot-studio-terminal',
    displayName: 'Jobbot terminal proxy',
    syncRevision: 1,
    syncNote: 'Initial desk terminal proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/jobbotTerminal.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('jobbot-desk', [1.25, 0.16, 0.75], [0, 0.45, 0], 0x475569),
      box('jobbot-terminal-body', [0.8, 0.5, 0.18], [0, 0.82, -0.2], 0x1e293b),
      box(
        'jobbot-green-screen',
        [0.68, 0.34, 0.04],
        [0, 0.86, -0.31],
        0x22c55e
      ),
      cyl('jobbot-hologram-core', 0.18, 0.5, [0.48, 0.8, 0.1], 0x38bdf8),
    ],
  },
  'dspace-backyard-rocket': {
    poiId: 'dspace-backyard-rocket',
    id: 'poi:dspace-backyard-rocket',
    displayName: 'dSpace rocket proxy',
    syncRevision: 1,
    syncNote: 'Initial launch pad proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/modelRocket.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      cyl('rocket-body', 0.22, 1.2, [0, 0.7, 0], 0xf8fafc),
      cyl('launch-pad', 0.72, 0.12, [0, 0.06, 0], 0x64748b),
      box('rocket-fin-left', [0.08, 0.3, 0.28], [-0.22, 0.25, 0], 0xef4444),
      box('rocket-fin-right', [0.08, 0.3, 0.28], [0.22, 0.25, 0], 0xef4444),
      sphere('rocket-nose', 0.23, [0, 1.33, 0], 0xef4444),
    ],
  },
  'sugarkube-backyard-greenhouse': {
    poiId: 'sugarkube-backyard-greenhouse',
    id: 'poi:sugarkube-backyard-greenhouse',
    displayName: 'Sugarkube deployment proxy',
    syncRevision: 1,
    syncNote:
      'Covers merged table, switch, yellow rack, nodes, and cable silhouette.',
    sourceFiles: [...baseFiles, 'src/scene/structures/sugarkubeDeployment.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('sugarkube-table', [1.55, 0.14, 1.0], [0, 0.42, 0], 0x92400e),
      box(
        'sugarkube-network-switch',
        [0.74, 0.12, 0.26],
        [-0.28, 0.55, -0.18],
        0x111827
      ),
      box(
        'sugarkube-yellow-rack-tier-bottom',
        [0.72, 0.08, 0.42],
        [0.32, 0.62, 0.12],
        0xfacc15
      ),
      box(
        'sugarkube-yellow-rack-tier-middle',
        [0.72, 0.08, 0.42],
        [0.32, 0.86, 0.12],
        0xfacc15
      ),
      box(
        'sugarkube-yellow-rack-tier-top',
        [0.72, 0.08, 0.42],
        [0.32, 1.1, 0.12],
        0xfacc15
      ),
      box(
        'sugarkube-node-stack',
        [0.26, 0.18, 0.22],
        [0.32, 0.98, 0.12],
        0xe2e8f0
      ),
      cable('sugarkube-cable-silhouette', [
        [-0.28, 0.64, -0.18],
        [0.05, 0.75, 0.05],
        [0.32, 0.92, 0.12],
      ]),
    ],
  },
  'tokenplace-studio-cluster': {
    poiId: 'tokenplace-studio-cluster',
    id: 'poi:tokenplace-studio-cluster',
    displayName: 'token.place workstation proxy',
    syncRevision: 1,
    syncNote:
      'Covers merged desk, tower, chair, dual monitors, keyboard, and mouse.',
    sourceFiles: [
      ...baseFiles,
      'src/scene/structures/tokenPlaceWorkstation.ts',
    ],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('tokenplace-desk', [1.6, 0.14, 0.8], [0, 0.46, 0], 0x78350f),
      box(
        'tokenplace-pc-tower',
        [0.28, 0.7, 0.34],
        [-0.72, 0.35, 0.12],
        0x111827
      ),
      box(
        'tokenplace-gaming-chair-back',
        [0.48, 0.74, 0.12],
        [0, 0.66, 0.65],
        0x7f1d1d
      ),
      box(
        'tokenplace-monitor-left',
        [0.58, 0.36, 0.05],
        [-0.35, 0.86, -0.28],
        0x0f172a
      ),
      box(
        'tokenplace-monitor-right',
        [0.58, 0.36, 0.05],
        [0.35, 0.86, -0.28],
        0x0f172a
      ),
      box('tokenplace-keyboard', [0.72, 0.04, 0.18], [0, 0.56, 0.05], 0x020617),
      sphere('tokenplace-mouse', 0.09, [0.55, 0.58, 0.08], 0x1e293b),
    ],
  },
  'gabriel-studio-sentry': {
    poiId: 'gabriel-studio-sentry',
    id: 'poi:gabriel-studio-sentry',
    displayName: 'Gabriel sentry proxy',
    syncRevision: 1,
    syncNote: 'Initial sentry proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/gabrielSentry.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      cyl('gabriel-base', 0.5, 0.18, [0, 0.09, 0], 0x1e293b),
      cyl('gabriel-core', 0.28, 0.9, [0, 0.55, 0], 0x334155),
      sphere('gabriel-sensor-eye', 0.24, [0, 1.08, 0], 0x60a5fa),
      box('gabriel-shield', [0.85, 0.2, 0.12], [0, 0.55, -0.38], 0x93c5fd),
    ],
  },
  'f2clipboard-kitchen-console': {
    poiId: 'f2clipboard-kitchen-console',
    id: 'poi:f2clipboard-kitchen-console',
    displayName: 'f2clipboard console proxy',
    syncRevision: 1,
    syncNote: 'Initial clipboard console proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/f2ClipboardConsole.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('f2-console', [1.1, 0.5, 0.55], [0, 0.25, 0], 0x475569),
      box('f2-clipboard-screen', [0.5, 0.7, 0.06], [0, 0.78, -0.16], 0xf8fafc),
      box('f2-clip', [0.22, 0.08, 0.08], [0, 1.16, -0.2], 0xfbbf24),
    ],
  },
  'axel-studio-tracker': {
    poiId: 'axel-studio-tracker',
    id: 'poi:axel-studio-tracker',
    displayName: 'Axel tracker proxy',
    syncRevision: 1,
    syncNote: 'Initial navigation tracker proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/axelNavigator.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('axel-map-table', [1.1, 0.16, 0.75], [0, 0.42, 0], 0x334155),
      {
        kind: 'ring',
        name: 'axel-compass-ring',
        radius: 0.38,
        tube: 0.04,
        position: [0, 0.56, 0],
        rotation: [Math.PI / 2, 0, 0],
        color: 0x22d3ee,
      },
      box('axel-route-line', [0.72, 0.04, 0.04], [0, 0.59, 0], 0xf97316),
    ],
  },
  'sigma-kitchen-workbench': {
    poiId: 'sigma-kitchen-workbench',
    id: 'poi:sigma-kitchen-workbench',
    displayName: 'Sigma workbench proxy',
    syncRevision: 1,
    syncNote: 'Initial workbench proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/sigmaWorkbench.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('sigma-workbench', [1.15, 0.18, 0.7], [0, 0.45, 0], 0x854d0e),
      cyl('sigma-flask', 0.13, 0.42, [-0.28, 0.72, 0], 0xa78bfa),
      sphere('sigma-orbital-sample', 0.16, [0.28, 0.72, 0.06], 0x14b8a6),
    ],
  },
  'gitshelves-living-room-installation': {
    poiId: 'gitshelves-living-room-installation',
    id: 'poi:gitshelves-living-room-installation',
    displayName: 'Gitshelves proxy',
    syncRevision: 1,
    syncNote: 'Initial shelves proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/gitshelves.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('gitshelves-frame', [1.25, 0.9, 0.18], [0, 0.55, 0], 0x713f12),
      box('gitshelves-shelf-top', [1.2, 0.06, 0.2], [0, 0.82, 0], 0xf59e0b),
      box('gitshelves-shelf-middle', [1.2, 0.06, 0.2], [0, 0.56, 0], 0xf59e0b),
      box('gitshelves-repo-books', [0.85, 0.22, 0.16], [0, 0.68, 0], 0x38bdf8),
    ],
  },
  'wove-kitchen-loom': {
    poiId: 'wove-kitchen-loom',
    id: 'poi:wove-kitchen-loom',
    displayName: 'Wove loom proxy',
    syncRevision: 1,
    syncNote: 'Initial loom proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/woveLoom.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('wove-loom-frame', [1.15, 0.85, 0.12], [0, 0.55, 0], 0x7c2d12),
      box('wove-warp-threads', [0.9, 0.68, 0.04], [0, 0.56, -0.04], 0xfef3c7),
      box('wove-shuttle', [0.46, 0.08, 0.08], [0.18, 0.54, -0.1], 0xdb2777),
    ],
  },
  'pr-reaper-backyard-console': {
    poiId: 'pr-reaper-backyard-console',
    id: 'poi:pr-reaper-backyard-console',
    displayName: 'PR Reaper console proxy',
    syncRevision: 1,
    syncNote: 'Initial console proxy.',
    sourceFiles: [...baseFiles, 'src/scene/structures/prReaperConsole.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box('reaper-console', [1.1, 0.45, 0.65], [0, 0.28, 0], 0x1f2937),
      box(
        'reaper-scythe-screen',
        [0.72, 0.42, 0.05],
        [0, 0.74, -0.18],
        0x7f1d1d
      ),
      cyl('reaper-review-dial', 0.18, 0.08, [0.38, 0.55, 0.12], 0xf97316),
    ],
  },
  'danielsmith-portfolio-table': {
    poiId: 'danielsmith-portfolio-table',
    id: 'poi:danielsmith-portfolio-table',
    displayName: 'danielsmith.io recursion boundary table proxy',
    recursionBoundary: true,
    syncRevision: 1,
    syncNote: 'Nonrecursive self-proxy: simple white portfolio table only.',
    sourceFiles: [...baseFiles, 'src/scene/structures/selfieMirror.ts'],
    proxyFiles: [SELF_FILE],
    primitives: [
      box(
        'danielsmith-white-tabletop',
        [1.15, 0.12, 1.15],
        [0, 0.55, 0],
        0xffffff
      ),
      box(
        'danielsmith-white-table-leg-a',
        [0.08, 0.55, 0.08],
        [-0.42, 0.27, -0.42],
        0xf8fafc
      ),
      box(
        'danielsmith-white-table-leg-b',
        [0.08, 0.55, 0.08],
        [0.42, 0.27, -0.42],
        0xf8fafc
      ),
      box(
        'danielsmith-recursion-boundary-plaque',
        [0.72, 0.04, 0.18],
        [0, 0.64, 0],
        0xe5e7eb
      ),
    ],
  },
} satisfies Record<PoiId, MiniaturePoiProxyDefinition>;

export const MINIATURE_POI_PROXY_DEFINITIONS = Object.values(
  MINIATURE_POI_PROXY_REGISTRY
);

export function getMiniaturePoiProxyDefinition(poiId: PoiId) {
  return MINIATURE_POI_PROXY_REGISTRY[poiId];
}
