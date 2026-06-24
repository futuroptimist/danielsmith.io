import type { GraphicsQualityLevel } from './qualityManager';

export const SCENE_DETAIL_LEVELS = [
  'cinematic',
  'balanced',
  'performance',
  'low',
  'micro',
] as const;

export type SceneDetailLevel = (typeof SCENE_DETAIL_LEVELS)[number];
export type OverworldSceneDetailLevel = GraphicsQualityLevel;

export interface SceneDetailPolicy {
  level: SceneDetailLevel;
  detailIndex: number;
  modelDetailScale: number;
  geometry: {
    cylinderSegments: number;
    sphereWidthSegments: number;
    sphereHeightSegments: number;
    ringSegments: number;
    torusRadialSegments: number;
    torusTubularSegments: number;
    terrainSegments: number;
  };
  textures: {
    canvasScale: number;
    maxResolution: number;
    jobbotScreen: { width: number; height: number };
    jobbotTelemetry: { width: number; height: number };
    mediaWallScreen: { width: number; height: number };
    mediaWallBadge: { width: number; height: number };
  };
  effects: {
    transparentShaders: boolean;
    mist: boolean;
    pondRippleShader: boolean;
    glassTransmission: boolean;
    decorativeHalos: boolean;
    telemetryPanels: boolean;
    decorativeShards: boolean;
    dynamicPointLights: boolean;
  };
  updates: {
    decorativeThrottleMs: number;
    canvasRedrawThrottleMs: number;
    skipUnfocusedDecorations: boolean;
    animationCadence: 'realtime' | 'throttled' | 'static';
  };
  budgets: {
    transparentShaderLayers: number;
    dynamicPointLights: number;
    decorativeDrawCalls: number;
    poiTriangleScale: number;
    structureTriangleScale: number;
    triangleBudgetHint: number;
    drawCallBudgetHint: number;
  };
}

const entries = [
  [
    'cinematic',
    1,
    48,
    32,
    32,
    64,
    24,
    64,
    24,
    1,
    2048,
    true,
    0,
    8,
    12,
    160,
    120000,
    650,
  ],
  [
    'balanced',
    0.5,
    48,
    32,
    32,
    64,
    24,
    64,
    24,
    1,
    2048,
    true,
    0,
    8,
    12,
    160,
    90000,
    500,
  ],
  [
    'performance',
    0.25,
    8,
    8,
    6,
    10,
    6,
    12,
    4,
    0.25,
    512,
    false,
    250,
    0,
    1,
    24,
    22000,
    180,
  ],
  [
    'low',
    0.125,
    6,
    6,
    4,
    8,
    4,
    8,
    2,
    0.125,
    256,
    false,
    750,
    0,
    0,
    12,
    11000,
    90,
  ],
  [
    'micro',
    0.0625,
    3,
    4,
    3,
    6,
    3,
    6,
    1,
    0.0625,
    128,
    false,
    1500,
    0,
    0,
    6,
    5500,
    45,
  ],
] as const;

export const SCENE_DETAIL_POLICIES = Object.fromEntries(
  entries.map(
    (
      [
        level,
        scale,
        cyl,
        sw,
        sh,
        ring,
        torusR,
        torusT,
        terrain,
        canvas,
        max,
        fx,
        throttle,
        layers,
        lights,
        draws,
        tris,
        drawCalls,
      ],
      detailIndex
    ) => [
      level,
      {
        level,
        detailIndex,
        modelDetailScale: scale,
        geometry: {
          cylinderSegments: cyl,
          sphereWidthSegments: sw,
          sphereHeightSegments: sh,
          ringSegments: ring,
          torusRadialSegments: torusR,
          torusTubularSegments: torusT,
          terrainSegments: terrain,
        },
        textures: {
          canvasScale: canvas,
          maxResolution: max,
          jobbotScreen: { width: max, height: max / 2 },
          jobbotTelemetry: {
            width: Math.max(64, max / 2),
            height: Math.max(32, max / 4),
          },
          mediaWallScreen: { width: max, height: max / 2 },
          mediaWallBadge: {
            width: Math.max(64, max / 4),
            height: Math.max(32, max / 8),
          },
        },
        effects: {
          transparentShaders: fx,
          mist: fx,
          pondRippleShader: fx,
          glassTransmission: fx,
          decorativeHalos: fx,
          telemetryPanels: fx,
          decorativeShards: fx,
          dynamicPointLights: fx,
        },
        updates: {
          decorativeThrottleMs: throttle,
          canvasRedrawThrottleMs: throttle === 0 ? 0 : Math.max(1000, throttle),
          skipUnfocusedDecorations: !fx,
          animationCadence: fx
            ? 'realtime'
            : level === 'performance'
              ? 'throttled'
              : 'static',
        },
        budgets: {
          transparentShaderLayers: layers,
          dynamicPointLights: lights,
          decorativeDrawCalls: draws,
          poiTriangleScale: scale,
          structureTriangleScale: scale,
          triangleBudgetHint: tris,
          drawCallBudgetHint: drawCalls,
        },
      } satisfies SceneDetailPolicy,
    ]
  )
) as Record<SceneDetailLevel, SceneDetailPolicy>;

export function mapGraphicsQualityToOverworldDetailLevel(
  level: GraphicsQualityLevel
): OverworldSceneDetailLevel {
  return level;
}

export function stepSceneDetailLevelDown(
  level: SceneDetailLevel,
  steps: number
): SceneDetailLevel {
  const index = SCENE_DETAIL_LEVELS.indexOf(level);
  const nextIndex = Math.min(
    SCENE_DETAIL_LEVELS.length - 1,
    Math.max(0, index + Math.max(0, Math.floor(steps)))
  );
  return SCENE_DETAIL_LEVELS[nextIndex];
}

export function getMiniatureDetailLevel(
  level: SceneDetailLevel
): SceneDetailLevel {
  return stepSceneDetailLevelDown(level, 2);
}

export function getSceneDetailPolicy(
  level: SceneDetailLevel
): SceneDetailPolicy {
  return SCENE_DETAIL_POLICIES[level];
}

export function getMiniatureSceneDetailPolicy(
  level: SceneDetailLevel
): SceneDetailPolicy {
  return getSceneDetailPolicy(getMiniatureDetailLevel(level));
}

export interface SceneDetailController {
  getLevel(): SceneDetailLevel;
  getPolicy(): SceneDetailPolicy;
  setLevel(level: SceneDetailLevel): void;
  shouldRunDecorativeUpdate(
    elapsedSeconds: number,
    emphasis?: number,
    channel?: string
  ): boolean;
  getSnapshot(): {
    level: SceneDetailLevel;
    policy: SceneDetailPolicy;
    theoreticalBudget: SceneDetailPolicy['budgets'];
  };
}

export function createSceneDetailController(
  initialLevel: SceneDetailLevel = 'balanced'
): SceneDetailController {
  let level = initialLevel;
  let policy = getSceneDetailPolicy(level);
  const lastDecorativeUpdateMsByChannel = new Map<string, number>();
  return {
    getLevel: () => level,
    getPolicy: () => policy,
    setLevel(nextLevel) {
      level = nextLevel;
      policy = getSceneDetailPolicy(nextLevel);
    },
    shouldRunDecorativeUpdate(
      elapsedSeconds,
      emphasis = 0,
      channel = 'default'
    ) {
      if (policy.updates.decorativeThrottleMs <= 0) return true;
      if (
        policy.updates.skipUnfocusedDecorations &&
        Math.max(0, emphasis) < 0.02
      )
        return false;
      const elapsedMs = elapsedSeconds * 1000;
      const last =
        lastDecorativeUpdateMsByChannel.get(channel) ??
        Number.NEGATIVE_INFINITY;
      if (elapsedMs - last < policy.updates.decorativeThrottleMs) return false;
      lastDecorativeUpdateMsByChannel.set(channel, elapsedMs);
      return true;
    },
    getSnapshot: () => ({ level, policy, theoreticalBudget: policy.budgets }),
  };
}
