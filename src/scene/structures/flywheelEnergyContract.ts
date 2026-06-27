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
} as const;
export const FLYWHEEL_AXLE = { radius: 0.075, length: 2.35 } as const;
export const FLYWHEEL_BEARING_STAND = {
  width: 0.18,
  depth: 0.42,
  height: 1.34,
} as const;
export const FLYWHEEL_CRANK = {
  radius: 0.38,
  handleLength: 0.24,
  handleRadius: 0.045,
} as const;
export const FLYWHEEL_GEARBOX = {
  centerX: 0.78,
  centerY: 1.24,
  centerZ: 0,
  radius: 0.52,
  depth: 0.26,
} as const;
export const FLYWHEEL_ENERGY_PORT = {
  x: 1.32,
  y: 1.62,
  z: 0.62,
  radius: 0.13,
} as const;
export const FLYWHEEL_SUN_TEETH = 18;
export const FLYWHEEL_PLANET_TEETH = 24;
export const FLYWHEEL_RING_TEETH =
  FLYWHEEL_SUN_TEETH + FLYWHEEL_PLANET_TEETH * 2;
export const FLYWHEEL_TORQUE_RATIO =
  1 + FLYWHEEL_RING_TEETH / FLYWHEEL_SUN_TEETH;
export const FLYWHEEL_CRANK_RAD_PER_SECOND = 1.2;
export const FLYWHEEL_EMPHASIS_SPEED_BOOST = 0.14;
export const FLYWHEEL_SUN_RADIUS = 0.14;
export const FLYWHEEL_PLANET_RADIUS =
  (FLYWHEEL_SUN_RADIUS * FLYWHEEL_PLANET_TEETH) / FLYWHEEL_SUN_TEETH;
export const FLYWHEEL_RING_RADIUS =
  FLYWHEEL_SUN_RADIUS + FLYWHEEL_PLANET_RADIUS * 2;
export const FLYWHEEL_PLANET_ORBIT_RADIUS =
  FLYWHEEL_SUN_RADIUS + FLYWHEEL_PLANET_RADIUS;
export const FLYWHEEL_MARKER_MIN_HEIGHT = 2.95;
export const FLYWHEEL_AVATAR_PATH_RADIUS = 1.2;
export const FLYWHEEL_BASE_COLLIDER = { width: 3.25, depth: 1.55 } as const;
export const FLYWHEEL_GEARBOX_COLLIDER = {
  centerX: 0.92,
  centerZ: 0.42,
  width: 0.95,
  depth: 0.74,
} as const;

export function getFlywheelCarrierAngle(sunAngle: number): number {
  return sunAngle / FLYWHEEL_TORQUE_RATIO;
}

export function getFlywheelPlanetLocalSpin(
  sunAngle: number,
  carrierAngle: number
): number {
  return (
    -(FLYWHEEL_SUN_TEETH / FLYWHEEL_PLANET_TEETH) * (sunAngle - carrierAngle)
  );
}
