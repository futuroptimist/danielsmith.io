import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_GEARBOX,
  FLYWHEEL_GEARBOX_LEFT_EDGE,
  FLYWHEEL_GEARBOX_OUTER_RADIUS,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_OUTPUT_SHAFT,
  FLYWHEEL_PLANET_TEETH,
  FLYWHEEL_RING_TEETH,
  FLYWHEEL_SUN_TEETH,
  FLYWHEEL_TORQUE_RATIO,
  FLYWHEEL_WHEEL,
  FLYWHEEL_WHEEL_GEAR_CLEARANCE,
  FLYWHEEL_WHEEL_OUTER_RADIUS,
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

  it('keeps the gearbox envelope outside the flywheel rim envelope', () => {
    expect(FLYWHEEL_WHEEL_OUTER_RADIUS).toBeCloseTo(
      FLYWHEEL_WHEEL.radius + FLYWHEEL_WHEEL.rimTube
    );
    expect(FLYWHEEL_WHEEL_RIGHT_EDGE).toBeCloseTo(
      FLYWHEEL_WHEEL.centerX + FLYWHEEL_WHEEL_OUTER_RADIUS
    );
    expect(FLYWHEEL_WHEEL_GEAR_CLEARANCE).toBeCloseTo(
      FLYWHEEL_GEARBOX_LEFT_EDGE - FLYWHEEL_WHEEL_RIGHT_EDGE
    );
    expect(FLYWHEEL_WHEEL_GEAR_CLEARANCE).toBeGreaterThanOrEqual(0.18);
    expect(FLYWHEEL_GEARBOX_OUTER_RADIUS).toBeGreaterThan(0.5);
  });

  it('defines an output shaft that bridges the separated wheel and gearbox', () => {
    expect(FLYWHEEL_OUTPUT_SHAFT.startX).toBeGreaterThan(
      FLYWHEEL_WHEEL.centerX
    );
    expect(FLYWHEEL_OUTPUT_SHAFT.endX).toBeGreaterThan(
      FLYWHEEL_WHEEL_RIGHT_EDGE
    );
    expect(FLYWHEEL_OUTPUT_SHAFT.endX).toBeLessThan(FLYWHEEL_GEARBOX.centerX);
    expect(
      FLYWHEEL_OUTPUT_SHAFT.endX - FLYWHEEL_OUTPUT_SHAFT.startX
    ).toBeGreaterThan(0.7);
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
