import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_GEARBOX,
  FLYWHEEL_GEARBOX_LEFT_EDGE,
  FLYWHEEL_GEARBOX_OUTER_RADIUS,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_MIN_WHEEL_GEAR_CLEARANCE,
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
    expect(FLYWHEEL_WHEEL_GEAR_CLEARANCE).toBeGreaterThanOrEqual(
      FLYWHEEL_MIN_WHEEL_GEAR_CLEARANCE
    );
    expect(FLYWHEEL_GEARBOX_OUTER_RADIUS).toBeGreaterThan(0.62);
    expect(FLYWHEEL_GEARBOX.centerZ - FLYWHEEL_WHEEL.centerZ).toBeGreaterThan(
      0.8
    );
  });

  it('defines an output shaft from the gearbox side toward the wheel hub', () => {
    expect(FLYWHEEL_OUTPUT_SHAFT.startX).toBeGreaterThan(
      FLYWHEEL_WHEEL.centerX
    );
    expect(FLYWHEEL_OUTPUT_SHAFT.startX).toBeLessThan(
      FLYWHEEL_WHEEL_RIGHT_EDGE
    );
    expect(FLYWHEEL_OUTPUT_SHAFT.endX).toBeGreaterThan(
      FLYWHEEL_GEARBOX_LEFT_EDGE
    );
    expect(FLYWHEEL_OUTPUT_SHAFT.endX).toBeLessThan(FLYWHEEL_GEARBOX.centerX);
    expect(FLYWHEEL_OUTPUT_SHAFT.endX).toBeGreaterThan(
      FLYWHEEL_OUTPUT_SHAFT.startX
    );
    expect(
      Math.abs(FLYWHEEL_OUTPUT_SHAFT.z - FLYWHEEL_WHEEL.centerZ)
    ).toBeGreaterThan(FLYWHEEL_WHEEL.thickness / 2);
    expect(FLYWHEEL_OUTPUT_SHAFT.y).toBeCloseTo(FLYWHEEL_GEARBOX.centerY);
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
