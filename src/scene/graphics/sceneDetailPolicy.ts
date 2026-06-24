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
    animationCadenceDivisor: number;
    skipUnfocusedDecorations: boolean;
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

const policyData = [
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
    2048,
    true,
    0,
    8,
    12,
    160,
    120000,
    900,
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
    2048,
    true,
    0,
    8,
    12,
    160,
    60000,
    520,
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
    512,
    false,
    250,
    0,
    1,
    24,
    30000,
    260,
  ],
  ['low', 0.125, 6, 6, 4, 8, 4, 8, 2, 256, false, 500, 0, 0, 12, 15000, 140],
  ['micro', 0.0625, 3, 4, 3, 6, 3, 6, 1, 128, false, 1000, 0, 0, 6, 7500, 80],
] as const;

function texture(width: number, height = width / 2) {
  return { width, height };
}

export const SCENE_DETAIL_POLICIES = Object.fromEntries(
  policyData.map(
    (
      [
        level,
        scale,
        cyl,
        sphereW,
        sphereH,
        ring,
        torusR,
        torusT,
        terrain,
        res,
        rich,
        throttle,
        layers,
        lights,
        draws,
        tris,
        drawBudget,
      ],
      index
    ) => [
      level,
      {
        level,
        detailIndex: index,
        modelDetailScale: scale,
        geometry: {
          cylinderSegments: cyl,
          sphereWidthSegments: sphereW,
          sphereHeightSegments: sphereH,
          ringSegments: ring,
          torusRadialSegments: torusR,
          torusTubularSegments: torusT,
          terrainSegments: terrain,
        },
        textures: {
          canvasScale: scale,
          maxResolution: res,
          jobbotScreen: texture(res),
          jobbotTelemetry: texture(Math.max(128, res / 2)),
          mediaWallScreen: texture(res),
          mediaWallBadge: texture(Math.max(128, res / 4)),
        },
        effects: {
          transparentShaders: rich,
          mist: rich,
          pondRippleShader: rich,
          glassTransmission: rich,
          decorativeHalos: rich,
          telemetryPanels: rich,
          decorativeShards: rich,
          dynamicPointLights: rich,
        },
        updates: {
          decorativeThrottleMs: throttle,
          canvasRedrawThrottleMs: throttle === 0 ? 0 : throttle * 4,
          animationCadenceDivisor: Math.max(
            1,
            index + (level === 'cinematic' ? 0 : 1)
          ),
          skipUnfocusedDecorations: index >= 2,
        },
        budgets: {
          transparentShaderLayers: layers,
          dynamicPointLights: lights,
          decorativeDrawCalls: draws,
          poiTriangleScale: scale,
          structureTriangleScale: scale,
          triangleBudgetHint: tris,
          drawCallBudgetHint: drawBudget,
        },
      } satisfies SceneDetailPolicy,
    ]
  )
) as Record<SceneDetailLevel, SceneDetailPolicy>;

export function getOverworldDetailLevel(
  level: GraphicsQualityLevel
): OverworldSceneDetailLevel {
  return level;
}

export function stepSceneDetailLevel(
  level: SceneDetailLevel,
  steps: number
): SceneDetailLevel {
  const index = SCENE_DETAIL_LEVELS.indexOf(level);
  const nextIndex = Math.min(
    SCENE_DETAIL_LEVELS.length - 1,
    Math.max(0, index + steps)
  );
  return SCENE_DETAIL_LEVELS[nextIndex];
}

export function getMiniatureDetailLevel(
  level: SceneDetailLevel
): SceneDetailLevel {
  return stepSceneDetailLevel(level, 2);
}

export function getSceneDetailPolicy(
  level: SceneDetailLevel
): SceneDetailPolicy {
  return SCENE_DETAIL_POLICIES[level];
}

export function getMiniatureSceneDetailPolicy(
  level: GraphicsQualityLevel
): SceneDetailPolicy {
  return getSceneDetailPolicy(
    getMiniatureDetailLevel(getOverworldDetailLevel(level))
  );
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
