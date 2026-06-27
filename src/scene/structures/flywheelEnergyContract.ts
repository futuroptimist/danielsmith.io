import type { RectCollider } from '../collision';

export const FLYWHEEL_ENERGY_INSTALLATION_NAME = 'FlywheelEnergyInstallation';

export const FLYWHEEL_ENERGY_DIMENSIONS = {
  installationBounds: { width: 4.0, depth: 2.45, height: 2.25 },
  realWorldDimensionsMeters: { width: 2.6, depth: 1.8, height: 1.7 },
  base: { width: 3.15, depth: 1.75, height: 0.18 },
  wheel: { radius: 0.78, thickness: 0.18, centerY: 1.18, centerZ: 0.18 },
  axle: { radius: 0.09, length: 2.2 },
  bearingStand: { width: 0.22, depth: 0.34, height: 1.1, offsetX: 0.72 },
  crank: {
    radius: 0.38,
    armLength: 0.38,
    handleRadius: 0.055,
    handleLength: 0.32,
  },
  gearbox: {
    radius: 0.47,
    depth: 0.22,
    centerX: -1.05,
    centerY: 1.18,
    centerZ: 0.18,
  },
  energyPort: { radius: 0.16, x: -1.05, y: 1.72, z: 0.18 },
  markerClearance: 2.35,
  avatarPathRadius: 1.12,
} as const;

export const FLYWHEEL_GEAR_TEETH = {
  sun: 18,
  planet: 18,
  ring: 54,
  planets: 3,
} as const;

export const FLYWHEEL_GEAR_RADII = {
  sun: 0.16,
  planet: 0.16,
  ringPitch: 0.48,
  ringOuter: 0.57,
  carrier: 0.32,
} as const;

export const FLYWHEEL_PLANETARY_RATIO =
  1 + FLYWHEEL_GEAR_TEETH.ring / FLYWHEEL_GEAR_TEETH.sun;

export const FLYWHEEL_ANIMATION = {
  crankRadiansPerSecond: Math.PI * 1.15,
  emphasisSpeedBoost: 0.12,
  glowPulseRadiansPerSecond: Math.PI * 1.7,
} as const;

export function getFlywheelCarrierAngle(crankAngle: number): number {
  return crankAngle / FLYWHEEL_PLANETARY_RATIO;
}

export function getFlywheelPlanetSpinAngle(crankAngle: number): number {
  return -crankAngle * (FLYWHEEL_GEAR_TEETH.sun / FLYWHEEL_GEAR_TEETH.planet);
}

export function getFlywheelLocalColliders(): RectCollider[] {
  const { base, crank, gearbox } = FLYWHEEL_ENERGY_DIMENSIONS;
  return [
    {
      minX: -base.width / 2,
      maxX: base.width / 2,
      minZ: -base.depth / 2,
      maxZ: base.depth / 2,
    },
    {
      minX: gearbox.centerX - gearbox.radius - crank.radius,
      maxX: gearbox.centerX + gearbox.radius + 0.18,
      minZ: gearbox.centerZ - gearbox.radius - 0.12,
      maxZ: gearbox.centerZ + gearbox.radius + 0.12,
    },
  ];
}
