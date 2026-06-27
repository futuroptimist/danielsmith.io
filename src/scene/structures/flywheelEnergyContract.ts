export const FLYWHEEL_INSTALLATION_BOUNDS = {
  width: 3.6,
  depth: 2.4,
  height: 2.75,
} as const;
export const FLYWHEEL_BASE_DIMENSIONS = {
  width: 3.45,
  depth: 1.62,
  height: 0.22,
} as const;
export const FLYWHEEL_WHEEL = {
  radius: 0.82,
  rimTube: 0.11,
  thickness: 0.24,
  centerX: -0.78,
  centerY: 1.28,
  centerZ: 0,
} as const;
export const FLYWHEEL_AXLE = { radius: 0.075, length: 1.18 } as const;
export const FLYWHEEL_BEARING_STAND = {
  width: 0.18,
  depth: 0.16,
  height: 1.12,
} as const;
export const FLYWHEEL_CRANK = {
  radius: 0.38,
  handleLength: 0.24,
  handleRadius: 0.045,
} as const;
export const FLYWHEEL_GEARBOX = {
  centerX: 1.08,
  centerY: 1.26,
  centerZ: 0.38,
  radius: 0.46,
  depth: 0.26,
} as const;
export const FLYWHEEL_ENERGY_PORT = {
  x: 1.42,
  y: 1.66,
  z: 0.7,
  radius: 0.13,
} as const;
export const FLYWHEEL_SUN_TEETH = 18;
export const FLYWHEEL_PLANET_TEETH = 24;
export const FLYWHEEL_RING_TEETH =
  FLYWHEEL_SUN_TEETH + FLYWHEEL_PLANET_TEETH * 2;
export const FLYWHEEL_TORQUE_RATIO =
  1 + FLYWHEEL_RING_TEETH / FLYWHEEL_SUN_TEETH;
export const FLYWHEEL_CRANK_RAD_PER_SECOND = 1.45;
export const FLYWHEEL_EMPHASIS_SPEED_BOOST = 0.14;
export const FLYWHEEL_SUN_RADIUS = 0.14;
export const FLYWHEEL_PLANET_RADIUS =
  (FLYWHEEL_SUN_RADIUS * FLYWHEEL_PLANET_TEETH) / FLYWHEEL_SUN_TEETH;
export const FLYWHEEL_RING_RADIUS =
  FLYWHEEL_SUN_RADIUS + FLYWHEEL_PLANET_RADIUS * 2;
export const FLYWHEEL_PLANET_ORBIT_RADIUS =
  FLYWHEEL_SUN_RADIUS + FLYWHEEL_PLANET_RADIUS;
export const FLYWHEEL_MARKER_MIN_HEIGHT = 2.95;
export const FLYWHEEL_GEAR_TOOTH_LENGTH = 0.06;
export const FLYWHEEL_GEARBOX_HOUSING_PAD = 0.08;
export const FLYWHEEL_WHEEL_OUTER_RADIUS =
  FLYWHEEL_WHEEL.radius + FLYWHEEL_WHEEL.rimTube;
export const FLYWHEEL_GEARBOX_OUTER_RADIUS =
  FLYWHEEL_RING_RADIUS +
  FLYWHEEL_GEAR_TOOTH_LENGTH +
  FLYWHEEL_GEARBOX_HOUSING_PAD;
export const FLYWHEEL_WHEEL_RIGHT_EDGE =
  FLYWHEEL_WHEEL.centerX + FLYWHEEL_WHEEL_OUTER_RADIUS;
export const FLYWHEEL_GEARBOX_LEFT_EDGE =
  FLYWHEEL_GEARBOX.centerX - FLYWHEEL_GEARBOX_OUTER_RADIUS;
export const FLYWHEEL_WHEEL_GEAR_CLEARANCE =
  FLYWHEEL_GEARBOX_LEFT_EDGE - FLYWHEEL_WHEEL_RIGHT_EDGE;
export const FLYWHEEL_OUTPUT_SHAFT = {
  startX: FLYWHEEL_WHEEL.centerX + 0.22,
  endX: FLYWHEEL_GEARBOX.centerX - FLYWHEEL_RING_RADIUS - 0.02,
  y: FLYWHEEL_GEARBOX.centerY,
  z: FLYWHEEL_GEARBOX.centerZ - 0.12,
  radius: 0.055,
} as const;
export const FLYWHEEL_CRANK_CENTER_Z =
  FLYWHEEL_GEARBOX.centerZ + FLYWHEEL_GEARBOX.depth / 2 + 0.18;
export const FLYWHEEL_AVATAR_PATH_RADIUS = 1.2;
export const FLYWHEEL_BASE_COLLIDER = { width: 3.45, depth: 1.62 } as const;
export const FLYWHEEL_GEARBOX_COLLIDER = {
  centerX: 1.08,
  centerZ: 0.46,
  width: 1.08,
  depth: 0.9,
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
