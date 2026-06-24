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
    maxTextureSize: number;
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
  };
  budgets: {
    triangleHint: number;
    drawCallHint: number;
    transparentShaderLayers: number;
    dynamicPointLights: number;
    decorativeDrawCalls: number;
    poiTriangleScale: number;
    structureTriangleScale: number;
  };
}

const POLICY_DATA: Record<
  SceneDetailLevel,
  Omit<SceneDetailPolicy, 'level' | 'detailIndex'>
> = {
  cinematic: {
    modelDetailScale: 1,
    geometry: {
      cylinderSegments: 48,
      sphereWidthSegments: 32,
      sphereHeightSegments: 32,
      ringSegments: 64,
      torusRadialSegments: 24,
      torusTubularSegments: 64,
      terrainSegments: 24,
    },
    textures: {
      canvasScale: 1,
      maxTextureSize: 2048,
      jobbotScreen: { width: 2048, height: 1024 },
      jobbotTelemetry: { width: 1024, height: 512 },
      mediaWallScreen: { width: 2048, height: 1024 },
      mediaWallBadge: { width: 512, height: 256 },
    },
    effects: {
      transparentShaders: true,
      mist: true,
      pondRippleShader: true,
      glassTransmission: true,
      decorativeHalos: true,
      telemetryPanels: true,
      decorativeShards: true,
      dynamicPointLights: true,
    },
    updates: {
      decorativeThrottleMs: 0,
      canvasRedrawThrottleMs: 0,
      skipUnfocusedDecorations: false,
    },
    budgets: {
      triangleHint: 120000,
      drawCallHint: 900,
      transparentShaderLayers: 8,
      dynamicPointLights: 12,
      decorativeDrawCalls: 160,
      poiTriangleScale: 1,
      structureTriangleScale: 1,
    },
  },
  balanced: {
    modelDetailScale: 0.5,
    geometry: {
      cylinderSegments: 48,
      sphereWidthSegments: 32,
      sphereHeightSegments: 32,
      ringSegments: 64,
      torusRadialSegments: 24,
      torusTubularSegments: 64,
      terrainSegments: 24,
    },
    textures: {
      canvasScale: 1,
      maxTextureSize: 2048,
      jobbotScreen: { width: 2048, height: 1024 },
      jobbotTelemetry: { width: 1024, height: 512 },
      mediaWallScreen: { width: 2048, height: 1024 },
      mediaWallBadge: { width: 512, height: 256 },
    },
    effects: {
      transparentShaders: true,
      mist: true,
      pondRippleShader: true,
      glassTransmission: true,
      decorativeHalos: true,
      telemetryPanels: true,
      decorativeShards: true,
      dynamicPointLights: true,
    },
    updates: {
      decorativeThrottleMs: 0,
      canvasRedrawThrottleMs: 0,
      skipUnfocusedDecorations: false,
    },
    budgets: {
      triangleHint: 60000,
      drawCallHint: 450,
      transparentShaderLayers: 6,
      dynamicPointLights: 8,
      decorativeDrawCalls: 96,
      poiTriangleScale: 0.5,
      structureTriangleScale: 0.5,
    },
  },
  performance: {
    modelDetailScale: 0.25,
    geometry: {
      cylinderSegments: 8,
      sphereWidthSegments: 8,
      sphereHeightSegments: 6,
      ringSegments: 10,
      torusRadialSegments: 6,
      torusTubularSegments: 12,
      terrainSegments: 4,
    },
    textures: {
      canvasScale: 0.25,
      maxTextureSize: 512,
      jobbotScreen: { width: 512, height: 256 },
      jobbotTelemetry: { width: 256, height: 128 },
      mediaWallScreen: { width: 512, height: 256 },
      mediaWallBadge: { width: 256, height: 128 },
    },
    effects: {
      transparentShaders: false,
      mist: false,
      pondRippleShader: false,
      glassTransmission: false,
      decorativeHalos: false,
      telemetryPanels: false,
      decorativeShards: false,
      dynamicPointLights: false,
    },
    updates: {
      decorativeThrottleMs: 250,
      canvasRedrawThrottleMs: 1000,
      skipUnfocusedDecorations: true,
    },
    budgets: {
      triangleHint: 30000,
      drawCallHint: 225,
      transparentShaderLayers: 0,
      dynamicPointLights: 1,
      decorativeDrawCalls: 24,
      poiTriangleScale: 0.25,
      structureTriangleScale: 0.25,
    },
  },
  low: {
    modelDetailScale: 0.125,
    geometry: {
      cylinderSegments: 6,
      sphereWidthSegments: 6,
      sphereHeightSegments: 4,
      ringSegments: 8,
      torusRadialSegments: 4,
      torusTubularSegments: 8,
      terrainSegments: 2,
    },
    textures: {
      canvasScale: 0.125,
      maxTextureSize: 256,
      jobbotScreen: { width: 256, height: 128 },
      jobbotTelemetry: { width: 128, height: 64 },
      mediaWallScreen: { width: 256, height: 128 },
      mediaWallBadge: { width: 128, height: 64 },
    },
    effects: {
      transparentShaders: false,
      mist: false,
      pondRippleShader: false,
      glassTransmission: false,
      decorativeHalos: false,
      telemetryPanels: false,
      decorativeShards: false,
      dynamicPointLights: false,
    },
    updates: {
      decorativeThrottleMs: 500,
      canvasRedrawThrottleMs: 1500,
      skipUnfocusedDecorations: true,
    },
    budgets: {
      triangleHint: 15000,
      drawCallHint: 112,
      transparentShaderLayers: 0,
      dynamicPointLights: 0,
      decorativeDrawCalls: 12,
      poiTriangleScale: 0.125,
      structureTriangleScale: 0.125,
    },
  },
  micro: {
    modelDetailScale: 0.0625,
    geometry: {
      cylinderSegments: 3,
      sphereWidthSegments: 4,
      sphereHeightSegments: 3,
      ringSegments: 3,
      torusRadialSegments: 3,
      torusTubularSegments: 6,
      terrainSegments: 1,
    },
    textures: {
      canvasScale: 0.0625,
      maxTextureSize: 128,
      jobbotScreen: { width: 128, height: 64 },
      jobbotTelemetry: { width: 64, height: 32 },
      mediaWallScreen: { width: 128, height: 64 },
      mediaWallBadge: { width: 64, height: 32 },
    },
    effects: {
      transparentShaders: false,
      mist: false,
      pondRippleShader: false,
      glassTransmission: false,
      decorativeHalos: false,
      telemetryPanels: false,
      decorativeShards: false,
      dynamicPointLights: false,
    },
    updates: {
      decorativeThrottleMs: 1000,
      canvasRedrawThrottleMs: 2500,
      skipUnfocusedDecorations: true,
    },
    budgets: {
      triangleHint: 7500,
      drawCallHint: 56,
      transparentShaderLayers: 0,
      dynamicPointLights: 0,
      decorativeDrawCalls: 6,
      poiTriangleScale: 0.0625,
      structureTriangleScale: 0.0625,
    },
  },
};

export const SCENE_DETAIL_POLICIES = Object.fromEntries(
  SCENE_DETAIL_LEVELS.map((level, detailIndex) => [
    level,
    { level, detailIndex, ...POLICY_DATA[level] },
  ])
) as Record<SceneDetailLevel, SceneDetailPolicy>;

export function mapGraphicsQualityToOverworldDetailLevel(
  level: GraphicsQualityLevel
): OverworldSceneDetailLevel {
  return level;
}

export function stepSceneDetailLevel(
  level: SceneDetailLevel,
  steps: number
): SceneDetailLevel {
  const index = SCENE_DETAIL_LEVELS.indexOf(level);
  const next = Math.min(
    SCENE_DETAIL_LEVELS.length - 1,
    Math.max(0, index + steps)
  );
  return SCENE_DETAIL_LEVELS[next];
}

export function getMiniatureDetailLevel(
  level: SceneDetailLevel
): SceneDetailLevel {
  return stepSceneDetailLevel(level, 2);
}

export function getMiniatureSceneDetailPolicy(
  level: SceneDetailLevel
): SceneDetailPolicy {
  return getSceneDetailPolicy(getMiniatureDetailLevel(level));
}

export function getSceneDetailPolicy(
  level: SceneDetailLevel
): SceneDetailPolicy {
  return SCENE_DETAIL_POLICIES[level] ?? SCENE_DETAIL_POLICIES.balanced;
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
