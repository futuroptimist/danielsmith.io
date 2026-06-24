import type { GraphicsQualityLevel } from './qualityManager';

export const ORDERED_SCENE_DETAIL_LEVELS = [
  'cinematic',
  'balanced',
  'performance',
  'low',
  'micro',
] as const;

export type SceneDetailLevel = (typeof ORDERED_SCENE_DETAIL_LEVELS)[number];
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
    tubeTubularSegments: number;
    tubeRadialSegments: number;
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
  };
  budgets: {
    transparentShaderLayers: number;
    dynamicPointLights: number;
    decorativeDrawCalls: number;
    poiTriangleScale: number;
    structureTriangleScale: number;
    triangleHint: number;
    drawCallHint: number;
  };
}

const mk = (
  level: SceneDetailLevel,
  detailIndex: number,
  modelDetailScale: number,
  geometry: SceneDetailPolicy['geometry'],
  textures: SceneDetailPolicy['textures'],
  effects: SceneDetailPolicy['effects'],
  updates: SceneDetailPolicy['updates'],
  budgets: SceneDetailPolicy['budgets']
): SceneDetailPolicy => ({
  level,
  detailIndex,
  modelDetailScale,
  geometry,
  textures,
  effects,
  updates,
  budgets,
});

const highGeometry = {
  cylinderSegments: 48,
  sphereWidthSegments: 32,
  sphereHeightSegments: 32,
  ringSegments: 64,
  torusRadialSegments: 24,
  torusTubularSegments: 64,
  terrainSegments: 24,
  tubeTubularSegments: 32,
  tubeRadialSegments: 8,
} as const;

const highTextures = {
  canvasScale: 1,
  maxResolution: 2048,
  jobbotScreen: { width: 2048, height: 1024 },
  jobbotTelemetry: { width: 1024, height: 512 },
  mediaWallScreen: { width: 2048, height: 1024 },
  mediaWallBadge: { width: 512, height: 256 },
} as const;

const highEffects = {
  transparentShaders: true,
  mist: true,
  pondRippleShader: true,
  glassTransmission: true,
  decorativeHalos: true,
  telemetryPanels: true,
  decorativeShards: true,
  dynamicPointLights: true,
} as const;

export const SCENE_DETAIL_POLICIES: Record<
  SceneDetailLevel,
  SceneDetailPolicy
> = {
  cinematic: mk(
    'cinematic',
    0,
    1,
    highGeometry,
    highTextures,
    highEffects,
    {
      decorativeThrottleMs: 0,
      canvasRedrawThrottleMs: 0,
      skipUnfocusedDecorations: false,
    },
    {
      transparentShaderLayers: 8,
      dynamicPointLights: 12,
      decorativeDrawCalls: 160,
      poiTriangleScale: 1,
      structureTriangleScale: 1,
      triangleHint: 120000,
      drawCallHint: 700,
    }
  ),
  balanced: mk(
    'balanced',
    1,
    0.5,
    highGeometry,
    highTextures,
    highEffects,
    {
      decorativeThrottleMs: 0,
      canvasRedrawThrottleMs: 0,
      skipUnfocusedDecorations: false,
    },
    {
      transparentShaderLayers: 8,
      dynamicPointLights: 12,
      decorativeDrawCalls: 160,
      poiTriangleScale: 1,
      structureTriangleScale: 1,
      triangleHint: 90000,
      drawCallHint: 600,
    }
  ),
  performance: mk(
    'performance',
    2,
    0.25,
    {
      cylinderSegments: 8,
      sphereWidthSegments: 8,
      sphereHeightSegments: 6,
      ringSegments: 10,
      torusRadialSegments: 6,
      torusTubularSegments: 12,
      terrainSegments: 4,
      tubeTubularSegments: 8,
      tubeRadialSegments: 3,
    },
    {
      canvasScale: 0.25,
      maxResolution: 512,
      jobbotScreen: { width: 512, height: 256 },
      jobbotTelemetry: { width: 256, height: 128 },
      mediaWallScreen: { width: 512, height: 256 },
      mediaWallBadge: { width: 256, height: 128 },
    },
    {
      transparentShaders: false,
      mist: false,
      pondRippleShader: false,
      glassTransmission: false,
      decorativeHalos: false,
      telemetryPanels: false,
      decorativeShards: false,
      dynamicPointLights: false,
    },
    {
      decorativeThrottleMs: 250,
      canvasRedrawThrottleMs: 1000,
      skipUnfocusedDecorations: true,
    },
    {
      transparentShaderLayers: 0,
      dynamicPointLights: 1,
      decorativeDrawCalls: 24,
      poiTriangleScale: 0.12,
      structureTriangleScale: 0.18,
      triangleHint: 30000,
      drawCallHint: 180,
    }
  ),
  low: mk(
    'low',
    3,
    0.125,
    {
      cylinderSegments: 6,
      sphereWidthSegments: 6,
      sphereHeightSegments: 4,
      ringSegments: 8,
      torusRadialSegments: 4,
      torusTubularSegments: 8,
      terrainSegments: 2,
      tubeTubularSegments: 4,
      tubeRadialSegments: 3,
    },
    {
      canvasScale: 0.125,
      maxResolution: 256,
      jobbotScreen: { width: 256, height: 128 },
      jobbotTelemetry: { width: 128, height: 64 },
      mediaWallScreen: { width: 256, height: 128 },
      mediaWallBadge: { width: 128, height: 64 },
    },
    {
      transparentShaders: false,
      mist: false,
      pondRippleShader: false,
      glassTransmission: false,
      decorativeHalos: false,
      telemetryPanels: false,
      decorativeShards: false,
      dynamicPointLights: false,
    },
    {
      decorativeThrottleMs: 500,
      canvasRedrawThrottleMs: 2000,
      skipUnfocusedDecorations: true,
    },
    {
      transparentShaderLayers: 0,
      dynamicPointLights: 0,
      decorativeDrawCalls: 12,
      poiTriangleScale: 0.06,
      structureTriangleScale: 0.09,
      triangleHint: 15000,
      drawCallHint: 100,
    }
  ),
  micro: mk(
    'micro',
    4,
    0.0625,
    {
      cylinderSegments: 3,
      sphereWidthSegments: 4,
      sphereHeightSegments: 3,
      ringSegments: 3,
      torusRadialSegments: 3,
      torusTubularSegments: 4,
      terrainSegments: 1,
      tubeTubularSegments: 2,
      tubeRadialSegments: 3,
    },
    {
      canvasScale: 0.0625,
      maxResolution: 128,
      jobbotScreen: { width: 128, height: 64 },
      jobbotTelemetry: { width: 64, height: 32 },
      mediaWallScreen: { width: 128, height: 64 },
      mediaWallBadge: { width: 64, height: 32 },
    },
    {
      transparentShaders: false,
      mist: false,
      pondRippleShader: false,
      glassTransmission: false,
      decorativeHalos: false,
      telemetryPanels: false,
      decorativeShards: false,
      dynamicPointLights: false,
    },
    {
      decorativeThrottleMs: 1000,
      canvasRedrawThrottleMs: 4000,
      skipUnfocusedDecorations: true,
    },
    {
      transparentShaderLayers: 0,
      dynamicPointLights: 0,
      decorativeDrawCalls: 6,
      poiTriangleScale: 0.03,
      structureTriangleScale: 0.045,
      triangleHint: 7500,
      drawCallHint: 60,
    }
  ),
};

export function getOverworldDetailLevel(
  level: GraphicsQualityLevel
): OverworldSceneDetailLevel {
  return level;
}

export function stepSceneDetailLevel(
  level: SceneDetailLevel,
  steps: number
): SceneDetailLevel {
  const index = ORDERED_SCENE_DETAIL_LEVELS.indexOf(level);
  const next = Math.min(
    ORDERED_SCENE_DETAIL_LEVELS.length - 1,
    Math.max(0, index + steps)
  );
  return ORDERED_SCENE_DETAIL_LEVELS[next];
}

export function getMiniatureDetailLevel(
  level: GraphicsQualityLevel
): SceneDetailLevel {
  return stepSceneDetailLevel(getOverworldDetailLevel(level), 2);
}

export function getSceneDetailPolicy(
  level: SceneDetailLevel
): SceneDetailPolicy {
  return SCENE_DETAIL_POLICIES[level] ?? SCENE_DETAIL_POLICIES.balanced;
}

export function getMiniatureSceneDetailPolicy(
  level: GraphicsQualityLevel
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
