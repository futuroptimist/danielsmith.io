export const FLYWHEEL_INSTALLATION_BOUNDS = {
  width: 2.6,
  depth: 2.2,
  height: 2.55,
} as const;
export const FLYWHEEL_BASE_DIMENSIONS = {
  width: 2.25,
  depth: 1.35,
  height: 0.22,
} as const;
export const FLYWHEEL_WHEEL = {
  radius: 0.82,
  rimTube: 0.1,
  thickness: 0.24,
  centerX: 0,
  centerY: 1.2,
  centerZ: 0,
} as const;
export const FLYWHEEL_AXLE = { radius: 0.075, length: 0.82 } as const;
export const FLYWHEEL_BEARING_STAND = {
  width: 0.18,
  depth: 0.16,
  height: 1.12,
} as const;
export const FLYWHEEL_ENERGY_PORT = {
  x: 0.48,
  y: 1.58,
  z: 0.34,
  radius: 0.13,
} as const;
export const FLYWHEEL_WHEEL_OUTER_RADIUS =
  FLYWHEEL_WHEEL.radius + FLYWHEEL_WHEEL.rimTube;
export const FLYWHEEL_MARKER_MIN_HEIGHT = 2.75;
export const FLYWHEEL_SPIN_RAD_PER_SECOND = 0.92;
export const FLYWHEEL_GEAR_RATIO = {
  crankToSun: 1,
  sunToPlanetSpin: -2,
  sunToCarrier: 0.25,
  carrierToFlywheel: 1,
} as const;
export const FLYWHEEL_EMPHASIS_SPEED_BOOST = 0.18;
export const FLYWHEEL_AVATAR_PATH_RADIUS = 1.15;
export const FLYWHEEL_BASE_COLLIDER = { width: 2.25, depth: 1.35 } as const;
