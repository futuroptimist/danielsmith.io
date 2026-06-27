import type { SceneDetailLevel } from '../graphics/sceneDetailPolicy';

export const FLYWHEEL_INSTALLATION_BOUNDS = {
  width: 3.4,
  depth: 2.4,
  height: 2.75,
} as const;

export const FLYWHEEL_BASE_DIMENSIONS = {
  width: 3.25,
  depth: 1.55,
  height: 0.22,
} as const;

export const FLYWHEEL_WHEEL = {
  radius: 0.92,
  rimTube: 0.12,
  thickness: 0.24,
  centerX: -0.58,
  centerY: 1.35,
  centerZ: 0,
  spokeCount: 8,
  counterweightCount: 2,
} as const;

export const FLYWHEEL_AXLE = {
  radius: 0.09,
  length: 2.25,
} as const;

export const FLYWHEEL_BEARING_STAND = {
  width: 0.22,
  depth: 0.5,
  height: 1.25,
  xOffset: 1.18,
} as const;

export const FLYWHEEL_CRANK = {
  radius: 0.36,
  discRadius: 0.18,
  armLength: 0.36,
  armWidth: 0.055,
  handleRadius: 0.055,
  handleLength: 0.32,
  centerX: 1.18,
  centerY: 1.24,
  centerZ: 0.42,
} as const;

export const FLYWHEEL_GEAR_TEETH = {
  sun: 18,
  planet: 15,
  ring: 48,
  planets: 3,
} as const;

export const FLYWHEEL_GEAR_RADII = {
  sun: 0.18,
  planet: 0.15,
  ring: 0.48,
  toothDepth: 0.035,
  depth: 0.1,
} as const;

export const FLYWHEEL_GEARBOX = {
  centerX: 0.78,
  centerY: 1.24,
  centerZ: 0,
  radius: 0.52,
  depth: 0.26,
  planetOrbitRadius: FLYWHEEL_GEAR_RADII.sun + FLYWHEEL_GEAR_RADII.planet,
} as const;

export const FLYWHEEL_ENERGY_PORT = {
  x: 1.32,
  y: 1.62,
  z: 0.62,
  radius: 0.13,
} as const;

export const FLYWHEEL_MARKER_MIN_HEIGHT = 2.95;
export const FLYWHEEL_AVATAR_PATH_RADIUS = 1.2;

export const FLYWHEEL_PLANETARY_RATIO =
  1 + FLYWHEEL_GEAR_TEETH.ring / FLYWHEEL_GEAR_TEETH.sun;

export const FLYWHEEL_ANIMATION = {
  crankRadiansPerSecond: Math.PI * 1.35,
  emphasisSpeedBoost: 0.12,
  glowBaseIntensity: 0.45,
  glowEmphasisIntensity: 1.35,
} as const;

export const FLYWHEEL_DETAIL_TOOTH_STRIDE: Record<SceneDetailLevel, number> = {
  cinematic: 1,
  balanced: 2,
  performance: 3,
  low: 6,
  micro: 12,
};

export function getFlywheelCarrierAngle(crankAngle: number): number {
  return crankAngle / FLYWHEEL_PLANETARY_RATIO;
}

export function getFlywheelPlanetSpinAngle(crankAngle: number): number {
  return -crankAngle * (FLYWHEEL_GEAR_TEETH.sun / FLYWHEEL_GEAR_TEETH.planet);
}
