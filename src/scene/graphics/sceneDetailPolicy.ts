import type { GraphicsQualityLevel } from './qualityManager';

export type SceneDetailLevel = GraphicsQualityLevel;

export interface SceneDetailPolicy {
  level: SceneDetailLevel;
  geometry: {
    poiCylinderSegments: number;
    poiRingSegments: number;
    poiOrbWidthSegments: number;
    poiOrbHeightSegments: number;
    poiHitSegments: number;
    mannequinCylinderSegments: number;
    mannequinSphereWidthSegments: number;
    mannequinSphereHeightSegments: number;
    mannequinTorusRadialSegments: number;
    mannequinTorusTubularSegments: number;
    structureCylinderSegments: number;
    structureRingSegments: number;
    terrainSegments: number;
  };
  textures: {
    canvasScale: number;
    jobbotScreenWidth: number;
    jobbotScreenHeight: number;
    jobbotTelemetryWidth: number;
    jobbotTelemetryHeight: number;
    mediaWallWidth: number;
    mediaWallHeight: number;
    redrawThrottleMs: number;
  };
  effects: {
    shaderMist: boolean;
    shaderPond: boolean;
    transparentGlow: boolean;
    hologramAura: boolean;
    decorativeParticles: boolean;
    dynamicPointLights: boolean;
    physicalGlass: boolean;
  };
  updates: {
    decorativeThrottleMs: number;
    canvasRedrawThrottleMs: number;
    skipUnemphasizedDecorations: boolean;
  };
  budgets: {
    theoreticalWorkScale: number;
    maxTransparentLayers: number;
    maxDynamicPointLights: number;
  };
}

const CINEMATIC_AND_BALANCED_SHARED = {
  geometry: {
    poiCylinderSegments: 48,
    poiRingSegments: 64,
    poiOrbWidthSegments: 32,
    poiOrbHeightSegments: 32,
    poiHitSegments: 32,
    mannequinCylinderSegments: 48,
    mannequinSphereWidthSegments: 32,
    mannequinSphereHeightSegments: 32,
    mannequinTorusRadialSegments: 20,
    mannequinTorusTubularSegments: 48,
    structureCylinderSegments: 48,
    structureRingSegments: 64,
    terrainSegments: 32,
  },
  textures: {
    canvasScale: 1,
    jobbotScreenWidth: 2048,
    jobbotScreenHeight: 1024,
    jobbotTelemetryWidth: 1024,
    jobbotTelemetryHeight: 512,
    mediaWallWidth: 2048,
    mediaWallHeight: 1024,
    redrawThrottleMs: 0,
  },
  effects: {
    shaderMist: true,
    shaderPond: true,
    transparentGlow: true,
    hologramAura: true,
    decorativeParticles: true,
    dynamicPointLights: true,
    physicalGlass: true,
  },
  updates: {
    decorativeThrottleMs: 0,
    canvasRedrawThrottleMs: 0,
    skipUnemphasizedDecorations: false,
  },
  budgets: {
    theoreticalWorkScale: 1,
    maxTransparentLayers: Number.POSITIVE_INFINITY,
    maxDynamicPointLights: Number.POSITIVE_INFINITY,
  },
} as const;

const PERFORMANCE_POLICY: SceneDetailPolicy = {
  level: 'performance',
  geometry: {
    poiCylinderSegments: 8,
    poiRingSegments: 8,
    poiOrbWidthSegments: 8,
    poiOrbHeightSegments: 6,
    poiHitSegments: 8,
    mannequinCylinderSegments: 10,
    mannequinSphereWidthSegments: 10,
    mannequinSphereHeightSegments: 8,
    mannequinTorusRadialSegments: 6,
    mannequinTorusTubularSegments: 12,
    structureCylinderSegments: 10,
    structureRingSegments: 12,
    terrainSegments: 4,
  },
  textures: {
    canvasScale: 0.25,
    jobbotScreenWidth: 512,
    jobbotScreenHeight: 256,
    jobbotTelemetryWidth: 256,
    jobbotTelemetryHeight: 128,
    mediaWallWidth: 512,
    mediaWallHeight: 256,
    redrawThrottleMs: 750,
  },
  effects: {
    shaderMist: false,
    shaderPond: false,
    transparentGlow: false,
    hologramAura: false,
    decorativeParticles: false,
    dynamicPointLights: false,
    physicalGlass: false,
  },
  updates: {
    decorativeThrottleMs: 250,
    canvasRedrawThrottleMs: 750,
    skipUnemphasizedDecorations: true,
  },
  budgets: {
    theoreticalWorkScale: 0.1,
    maxTransparentLayers: 1,
    maxDynamicPointLights: 0,
  },
};

const BALANCED_POLICY: SceneDetailPolicy = {
  level: 'balanced',
  ...CINEMATIC_AND_BALANCED_SHARED,
};

const CINEMATIC_POLICY: SceneDetailPolicy = {
  level: 'cinematic',
  ...CINEMATIC_AND_BALANCED_SHARED,
};

export function getSceneDetailPolicy(
  level: GraphicsQualityLevel
): SceneDetailPolicy {
  if (level === 'performance') {
    return PERFORMANCE_POLICY;
  }
  return level === 'cinematic' ? CINEMATIC_POLICY : BALANCED_POLICY;
}

export interface SceneDetailMetrics {
  theoreticalWorkScale: number;
  texturePixelBudget: number;
  poiTriangleBudget: number;
  dynamicPointLightBudget: number;
  transparentLayerBudget: number;
  shaderEffectsEnabled: number;
}

export function getSceneDetailMetrics(
  level: GraphicsQualityLevel
): SceneDetailMetrics {
  const policy = getSceneDetailPolicy(level);
  const shaderEffectsEnabled = [
    policy.effects.shaderMist,
    policy.effects.shaderPond,
    policy.effects.transparentGlow,
    policy.effects.hologramAura,
    policy.effects.decorativeParticles,
    policy.effects.physicalGlass,
  ].filter(Boolean).length;
  return {
    theoreticalWorkScale: policy.budgets.theoreticalWorkScale,
    texturePixelBudget:
      policy.textures.jobbotScreenWidth * policy.textures.jobbotScreenHeight +
      policy.textures.jobbotTelemetryWidth *
        policy.textures.jobbotTelemetryHeight +
      policy.textures.mediaWallWidth * policy.textures.mediaWallHeight,
    poiTriangleBudget:
      policy.geometry.poiCylinderSegments * 4 +
      policy.geometry.poiRingSegments * 4 +
      policy.geometry.poiOrbWidthSegments *
        policy.geometry.poiOrbHeightSegments *
        2,
    dynamicPointLightBudget: policy.budgets.maxDynamicPointLights,
    transparentLayerBudget: policy.budgets.maxTransparentLayers,
    shaderEffectsEnabled,
  };
}
