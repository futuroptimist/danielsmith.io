import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_CRANK,
  FLYWHEEL_CRANK_CENTER_Z,
  FLYWHEEL_GEARBOX,
  FLYWHEEL_GEARBOX_LEFT_EDGE,
  FLYWHEEL_GEARBOX_OUTER_RADIUS,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_MIN_WHEEL_GEAR_CLEARANCE,
  FLYWHEEL_PLANET_TEETH,
  FLYWHEEL_RING_TEETH,
  FLYWHEEL_SUN_TEETH,
  FLYWHEEL_TORQUE_RATIO,
  FLYWHEEL_WHEEL,
  FLYWHEEL_WHEEL_GEAR_CLEARANCE,
  FLYWHEEL_WHEEL_RIGHT_EDGE,
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

  it('separates the gearbox envelope from the flywheel rim', () => {
    expect(FLYWHEEL_GEARBOX_LEFT_EDGE).toBeGreaterThan(
      FLYWHEEL_WHEEL_RIGHT_EDGE
    );
    expect(FLYWHEEL_WHEEL_GEAR_CLEARANCE).toBeGreaterThanOrEqual(
      FLYWHEEL_MIN_WHEEL_GEAR_CLEARANCE
    );
    expect(FLYWHEEL_GEARBOX.centerX - FLYWHEEL_GEARBOX_OUTER_RADIUS).toBe(
      FLYWHEEL_GEARBOX_LEFT_EDGE
    );
    expect(
      FLYWHEEL_WHEEL.centerX + FLYWHEEL_WHEEL.radius + FLYWHEEL_WHEEL.rimTube
    ).toBe(FLYWHEEL_WHEEL_RIGHT_EDGE);
  });

  it('places the front crank outside the wheel and gearbox faces', () => {
    const crankLeftEdge = FLYWHEEL_GEARBOX.centerX - FLYWHEEL_CRANK.radius;
    expect(crankLeftEdge).toBeGreaterThan(FLYWHEEL_WHEEL_RIGHT_EDGE);
    expect(FLYWHEEL_CRANK_CENTER_Z).toBeGreaterThan(
      FLYWHEEL_GEARBOX.centerZ + FLYWHEEL_GEARBOX.depth / 2
    );
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
