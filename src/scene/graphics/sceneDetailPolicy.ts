import type { GraphicsQualityLevel } from './qualityManager';

export type SceneDetailLevel = GraphicsQualityLevel;

export interface SceneDetailPolicy {
  level: SceneDetailLevel;
  isPerformance: boolean;
  /**
   * Target is theoretical workload reduction, not a guaranteed FPS multiplier
   * on every browser/GPU. These budgets guide builders and diagnostics.
   */
  theoreticalWorkloadScale: number;
  segments: {
    cylinder: number;
    ring: number;
    sphereWidth: number;
    sphereHeight: number;
    torusRadial: number;
    torusTubular: number;
    terrainSubdivisions: number;
  };
  textures: {
    jobbotScreen: { width: number; height: number };
    jobbotTelemetry: { width: number; height: number };
    mediaWallScreen: { width: number; height: number };
    mediaWallBadge: { width: number; height: number };
    poiLabelScale: number;
  };
  effects: {
    transparentAuras: boolean;
    shaderMist: boolean;
    shaderPond: boolean;
    glassTransmission: boolean;
    decorativeOrbiters: boolean;
    decorativePanels: boolean;
    dynamicPointLights: boolean;
  };
  update: {
    decorativeThrottleMs: number;
    canvasRedrawThrottleMs: number;
  };
}

const HIGH_DETAIL_SEGMENTS = {
  cylinder: 48,
  ring: 64,
  sphereWidth: 32,
  sphereHeight: 32,
  torusRadial: 24,
  torusTubular: 64,
  terrainSubdivisions: 24,
} as const;

export function getSceneDetailPolicy(
  level: GraphicsQualityLevel
): SceneDetailPolicy {
  if (level === 'performance') {
    return {
      level,
      isPerformance: true,
      theoreticalWorkloadScale: 0.1,
      segments: {
        cylinder: 8,
        ring: 8,
        sphereWidth: 8,
        sphereHeight: 6,
        torusRadial: 6,
        torusTubular: 12,
        terrainSubdivisions: 2,
      },
      textures: {
        jobbotScreen: { width: 512, height: 256 },
        jobbotTelemetry: { width: 256, height: 128 },
        mediaWallScreen: { width: 512, height: 256 },
        mediaWallBadge: { width: 256, height: 128 },
        poiLabelScale: 0.5,
      },
      effects: {
        transparentAuras: false,
        shaderMist: false,
        shaderPond: false,
        glassTransmission: false,
        decorativeOrbiters: false,
        decorativePanels: false,
        dynamicPointLights: false,
      },
      update: {
        decorativeThrottleMs: 250,
        canvasRedrawThrottleMs: 1000,
      },
    };
  }

  return {
    level,
    isPerformance: false,
    theoreticalWorkloadScale: level === 'balanced' ? 0.85 : 1,
    segments: HIGH_DETAIL_SEGMENTS,
    textures: {
      jobbotScreen: { width: 2048, height: 1024 },
      jobbotTelemetry: { width: 1024, height: 512 },
      mediaWallScreen: { width: 2048, height: 1024 },
      mediaWallBadge: { width: 512, height: 256 },
      poiLabelScale: 1,
    },
    effects: {
      transparentAuras: true,
      shaderMist: true,
      shaderPond: true,
      glassTransmission: true,
      decorativeOrbiters: true,
      decorativePanels: true,
      dynamicPointLights: true,
    },
    update: {
      decorativeThrottleMs: 0,
      canvasRedrawThrottleMs: 0,
    },
  };
}
