import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_ENERGY_DIMENSIONS,
  FLYWHEEL_GEAR_RADII,
  FLYWHEEL_GEAR_TEETH,
  FLYWHEEL_PLANETARY_RATIO,
  getFlywheelCarrierAngle,
  getFlywheelLocalColliders,
  getFlywheelPlanetSpinAngle,
} from '../scene/structures/flywheelEnergyContract';

describe('flywheel energy contract', () => {
  it('exports finite plausible physical and gear constants', () => {
    expect(FLYWHEEL_ENERGY_DIMENSIONS.installationBounds.width).toBeGreaterThan(
      3
    );
    expect(FLYWHEEL_ENERGY_DIMENSIONS.wheel.radius).toBeGreaterThan(0.5);
    Object.values(FLYWHEEL_GEAR_RADII).forEach((value) =>
      expect(Number.isFinite(value)).toBe(true)
    );
    expect(FLYWHEEL_GEAR_TEETH.ring).toBe(
      FLYWHEEL_GEAR_TEETH.sun + 2 * FLYWHEEL_GEAR_TEETH.planet
    );
    expect(FLYWHEEL_PLANETARY_RATIO).toBe(
      1 + FLYWHEEL_GEAR_TEETH.ring / FLYWHEEL_GEAR_TEETH.sun
    );
    expect(FLYWHEEL_PLANETARY_RATIO).toBeGreaterThan(1);
  });

  it('keeps carrier and planet spin synchronized from a single crank angle', () => {
    const crankAngle = Math.PI * 2;
    expect(getFlywheelCarrierAngle(crankAngle)).toBeCloseTo(crankAngle / 4);
    expect(getFlywheelPlanetSpinAngle(crankAngle)).toBeLessThan(0);
  });

  it('keeps local colliders inside intended bounds', () => {
    const halfWidth = FLYWHEEL_ENERGY_DIMENSIONS.installationBounds.width / 2;
    const halfDepth = FLYWHEEL_ENERGY_DIMENSIONS.installationBounds.depth / 2;
    getFlywheelLocalColliders().forEach((collider) => {
      expect(collider.minX).toBeGreaterThanOrEqual(-halfWidth);
      expect(collider.maxX).toBeLessThanOrEqual(halfWidth);
      expect(collider.minZ).toBeGreaterThanOrEqual(-halfDepth);
      expect(collider.maxZ).toBeLessThanOrEqual(halfDepth);
    });
  });
});
