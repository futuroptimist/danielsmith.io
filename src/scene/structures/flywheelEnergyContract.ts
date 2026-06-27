export const FLYWHEEL_POI_ID = 'flywheel-studio-flywheel' as const;

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
  centerY: 1.35,
  centerX: -0.58,
  centerZ: 0,
  spokes: 8,
} as const;

export const FLYWHEEL_AXLE = {
  radius: 0.08,
  length: 2.1,
} as const;

export const FLYWHEEL_BEARING_STAND = {
  width: 0.16,
  depth: 0.68,
  height: 1.3,
  centerOffsetX: 0.48,
} as const;

export const FLYWHEEL_CRANK = {
  radius: 0.34,
  discRadius: 0.2,
  armLength: 0.34,
  handleRadius: 0.045,
  handleLength: 0.28,
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
export const FLYWHEEL_EMPHASIS_SPEED_BOOST = 0.18;

export const FLYWHEEL_GEAR_RADII = {
  sun: 0.15,
  planet: 0.2,
  ring: 0.55,
  planetOrbit: 0.35,
} as const;

export const FLYWHEEL_MARKER_MIN_HEIGHT = 2.95;
export const FLYWHEEL_AVATAR_PATH_RADIUS = 1.2;

export function getFlywheelCarrierAngle(crankAngle: number): number {
  return crankAngle / FLYWHEEL_TORQUE_RATIO;
}

export function getFlywheelPlanetLocalSpin(
  sunAngle: number,
  carrierAngle: number
): number {
  return (
    -(FLYWHEEL_SUN_TEETH / FLYWHEEL_PLANET_TEETH) * (sunAngle - carrierAngle)
  );
}
