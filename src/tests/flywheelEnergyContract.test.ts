import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_CRANK,
  FLYWHEEL_GEARBOX,
  FLYWHEEL_GEARBOX_HOUSING_PAD,
  FLYWHEEL_GEAR_TOOTH_LENGTH,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_PLANET_TEETH,
  FLYWHEEL_RING_TEETH,
  FLYWHEEL_SUN_TEETH,
  FLYWHEEL_RING_RADIUS,
  FLYWHEEL_TORQUE_RATIO,
  FLYWHEEL_WHEEL,
  getFlywheelCarrierAngle,
  getFlywheelPlanetLocalSpin,
} from '../scene/structures/flywheelEnergyContract';

describe('flywheel energy contract', () => {
  it('exports finite physical bounds', () => {
    expect(FLYWHEEL_INSTALLATION_BOUNDS.width).toBeGreaterThan(
      FLYWHEEL_BASE_DIMENSIONS.width
    );
    expect(FLYWHEEL_INSTALLATION_BOUNDS.height).toBeGreaterThan(2);
    expect(Number.isFinite(FLYWHEEL_INSTALLATION_BOUNDS.depth)).toBe(true);
  });

  it('uses plausible planetary gear teeth and torque ratio math', () => {
    expect(FLYWHEEL_RING_TEETH).toBe(
      FLYWHEEL_SUN_TEETH + FLYWHEEL_PLANET_TEETH * 2
    );
    expect(FLYWHEEL_TORQUE_RATIO).toBeCloseTo(
      1 + FLYWHEEL_RING_TEETH / FLYWHEEL_SUN_TEETH
    );
    expect(FLYWHEEL_TORQUE_RATIO).toBeGreaterThan(4);
  });

  it('keeps the gearbox and crank outside the flywheel envelope', () => {
    const wheelOuterRadius = FLYWHEEL_WHEEL.radius + FLYWHEEL_WHEEL.rimTube;
    const gearboxOuterRadius =
      FLYWHEEL_RING_RADIUS +
      FLYWHEEL_GEAR_TOOTH_LENGTH +
      FLYWHEEL_GEARBOX_HOUSING_PAD;
    const wheelRightEdge = FLYWHEEL_WHEEL.centerX + wheelOuterRadius;
    const gearboxLeftEdge = FLYWHEEL_GEARBOX.centerX - gearboxOuterRadius;
    const wheelGearClearance = gearboxLeftEdge - wheelRightEdge;
    const crankLeftEdge = FLYWHEEL_GEARBOX.centerX - FLYWHEEL_CRANK.radius;

    expect(wheelGearClearance).toBeGreaterThanOrEqual(0.18);
    expect(crankLeftEdge - wheelRightEdge).toBeGreaterThanOrEqual(0.18);
    expect(FLYWHEEL_GEARBOX.centerZ).toBeGreaterThan(0);
  });

  it('keeps carrier and planet spin synchronized from one sun angle', () => {
    const sunAngle = 3.6;
    const carrierAngle = getFlywheelCarrierAngle(sunAngle);
    const planetSpin = getFlywheelPlanetLocalSpin(sunAngle, carrierAngle);
    expect(carrierAngle).toBeCloseTo(sunAngle / FLYWHEEL_TORQUE_RATIO);
    expect(planetSpin).toBeLessThan(0);
    expect(planetSpin).toBeCloseTo(
      -(FLYWHEEL_RING_TEETH / FLYWHEEL_PLANET_TEETH) * carrierAngle
    );
  });
});
