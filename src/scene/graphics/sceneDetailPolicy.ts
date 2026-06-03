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
    poiLabelScale: number;
    maxStaticUploadFps: number;
  };
  effects: {
    transparentShaders: boolean;
    decorativeHalos: boolean;
    decorativeOrbiters: boolean;
    dynamicPointLights: boolean;
    physicalGlass: boolean;
  };
  updates: {
    decorativeThrottleMs: number;
    canvasRedrawThrottleMs: number;
  };
  budget: {
    shaderEffectWeight: number;
    texturePixels: number;
    transparentLayerWeight: number;
    dynamicLightWeight: number;
    decorativeUpdateWeight: number;
    geometrySegmentWeight: number;
  };
}

const DETAIL_POLICIES: Record<SceneDetailLevel, SceneDetailPolicy> = {
  cinematic: {
    level: 'cinematic',
    geometry: {
      cylinderSegments: 48,
      sphereWidthSegments: 32,
      sphereHeightSegments: 32,
      ringSegments: 64,
      torusRadialSegments: 20,
      torusTubularSegments: 64,
      terrainSegments: 32,
    },
    textures: { canvasScale: 1, poiLabelScale: 1, maxStaticUploadFps: 60 },
    effects: {
      transparentShaders: true,
      decorativeHalos: true,
      decorativeOrbiters: true,
      dynamicPointLights: true,
      physicalGlass: true,
    },
    updates: { decorativeThrottleMs: 0, canvasRedrawThrottleMs: 0 },
    budget: {
      shaderEffectWeight: 1,
      texturePixels: 2048 * 1024,
      transparentLayerWeight: 1,
      dynamicLightWeight: 1,
      decorativeUpdateWeight: 1,
      geometrySegmentWeight: 1,
    },
  },
  balanced: {
    level: 'balanced',
    geometry: {
      cylinderSegments: 48,
      sphereWidthSegments: 32,
      sphereHeightSegments: 32,
      ringSegments: 64,
      torusRadialSegments: 20,
      torusTubularSegments: 64,
      terrainSegments: 32,
    },
    textures: { canvasScale: 1, poiLabelScale: 1, maxStaticUploadFps: 60 },
    effects: {
      transparentShaders: true,
      decorativeHalos: true,
      decorativeOrbiters: true,
      dynamicPointLights: true,
      physicalGlass: true,
    },
    updates: { decorativeThrottleMs: 0, canvasRedrawThrottleMs: 0 },
    budget: {
      shaderEffectWeight: 1,
      texturePixels: 2048 * 1024,
      transparentLayerWeight: 1,
      dynamicLightWeight: 1,
      decorativeUpdateWeight: 1,
      geometrySegmentWeight: 1,
    },
  },
  performance: {
    level: 'performance',
    geometry: {
      cylinderSegments: 8,
      sphereWidthSegments: 8,
      sphereHeightSegments: 6,
      ringSegments: 12,
      torusRadialSegments: 6,
      torusTubularSegments: 12,
      terrainSegments: 4,
    },
    textures: { canvasScale: 0.25, poiLabelScale: 0.5, maxStaticUploadFps: 2 },
    effects: {
      transparentShaders: false,
      decorativeHalos: false,
      decorativeOrbiters: false,
      dynamicPointLights: false,
      physicalGlass: false,
    },
    updates: { decorativeThrottleMs: 250, canvasRedrawThrottleMs: 500 },
    budget: {
      // This is a theoretical workload budget for policy tests/diagnostics;
      // actual FPS gains still depend on browser, GPU, thermals, and drivers.
      shaderEffectWeight: 0.05,
      texturePixels: 512 * 256,
      transparentLayerWeight: 0.08,
      dynamicLightWeight: 0.05,
      decorativeUpdateWeight: 0.1,
      geometrySegmentWeight: 0.12,
    },
  },
};

export function getSceneDetailPolicy(
  level: GraphicsQualityLevel
): SceneDetailPolicy {
  return DETAIL_POLICIES[level] ?? DETAIL_POLICIES.balanced;
}

export interface SceneDetailRuntimeTarget {
  setSceneDetailLevel?(
    level: SceneDetailLevel,
    policy: SceneDetailPolicy
  ): void;
}

export interface SceneDetailController {
  getLevel(): SceneDetailLevel;
  getPolicy(): SceneDetailPolicy;
  setLevel(level: SceneDetailLevel): void;
  shouldRunDecorativeUpdate(elapsedSeconds: number): boolean;
}

export function createSceneDetailController(
  initialLevel: SceneDetailLevel
): SceneDetailController {
  let level = initialLevel;
  let policy = getSceneDetailPolicy(level);
  let lastDecorativeUpdateMs = Number.NEGATIVE_INFINITY;
  return {
    getLevel: () => level,
    getPolicy: () => policy,
    setLevel(nextLevel) {
      if (nextLevel === level) {
        return;
      }
      level = nextLevel;
      policy = getSceneDetailPolicy(level);
    },
    shouldRunDecorativeUpdate(elapsedSeconds) {
      const throttleMs = policy.updates.decorativeThrottleMs;
      if (throttleMs <= 0) {
        return true;
      }
      const nowMs = elapsedSeconds * 1000;
      if (nowMs - lastDecorativeUpdateMs < throttleMs) {
        return false;
      }
      lastDecorativeUpdateMs = nowMs;
      return true;
    },
  };
}
