import type { GraphicsQualityLevel } from './qualityManager';

export type SceneDetailLevel = GraphicsQualityLevel;

export interface SceneDetailPolicy {
  level: SceneDetailLevel;
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
  };
}

const HIGH_DETAIL_GEOMETRY = {
  cylinderSegments: 48,
  sphereWidthSegments: 32,
  sphereHeightSegments: 32,
  ringSegments: 64,
  torusRadialSegments: 24,
  torusTubularSegments: 64,
  terrainSegments: 24,
} as const;

const HIGH_DETAIL_TEXTURES = {
  canvasScale: 1,
  jobbotScreen: { width: 2048, height: 1024 },
  jobbotTelemetry: { width: 1024, height: 512 },
  mediaWallScreen: { width: 2048, height: 1024 },
  mediaWallBadge: { width: 512, height: 256 },
} as const;

const HIGH_DETAIL_EFFECTS = {
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
  cinematic: {
    level: 'cinematic',
    geometry: HIGH_DETAIL_GEOMETRY,
    textures: HIGH_DETAIL_TEXTURES,
    effects: HIGH_DETAIL_EFFECTS,
    updates: {
      decorativeThrottleMs: 0,
      canvasRedrawThrottleMs: 0,
      skipUnfocusedDecorations: false,
    },
    budgets: {
      transparentShaderLayers: 8,
      dynamicPointLights: 12,
      decorativeDrawCalls: 160,
      poiTriangleScale: 1,
      structureTriangleScale: 1,
    },
  },
  balanced: {
    level: 'balanced',
    geometry: HIGH_DETAIL_GEOMETRY,
    textures: HIGH_DETAIL_TEXTURES,
    effects: HIGH_DETAIL_EFFECTS,
    updates: {
      decorativeThrottleMs: 0,
      canvasRedrawThrottleMs: 0,
      skipUnfocusedDecorations: false,
    },
    budgets: {
      transparentShaderLayers: 8,
      dynamicPointLights: 12,
      decorativeDrawCalls: 160,
      poiTriangleScale: 1,
      structureTriangleScale: 1,
    },
  },
  performance: {
    level: 'performance',
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
      transparentShaderLayers: 0,
      dynamicPointLights: 1,
      decorativeDrawCalls: 24,
      poiTriangleScale: 0.12,
      structureTriangleScale: 0.18,
    },
  },
};

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
    getLevel() {
      return level;
    },
    getPolicy() {
      return policy;
    },
    setLevel(nextLevel) {
      level = nextLevel;
      policy = getSceneDetailPolicy(nextLevel);
    },
    shouldRunDecorativeUpdate(
      elapsedSeconds,
      emphasis = 0,
      channel = 'default'
    ) {
      if (policy.updates.decorativeThrottleMs <= 0) {
        return true;
      }
      if (
        policy.updates.skipUnfocusedDecorations &&
        Math.max(0, emphasis) < 0.02
      ) {
        return false;
      }
      const elapsedMs = elapsedSeconds * 1000;
      const lastDecorativeUpdateMs =
        lastDecorativeUpdateMsByChannel.get(channel) ??
        Number.NEGATIVE_INFINITY;
      if (
        elapsedMs - lastDecorativeUpdateMs <
        policy.updates.decorativeThrottleMs
      ) {
        return false;
      }
      lastDecorativeUpdateMsByChannel.set(channel, elapsedMs);
      return true;
    },
    getSnapshot() {
      return {
        level,
        policy,
        theoreticalBudget: policy.budgets,
      };
    },
  };
}
