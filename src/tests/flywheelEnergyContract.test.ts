import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_GEAR_RADII,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_PLANET_TEETH,
  FLYWHEEL_RING_TEETH,
  FLYWHEEL_SUN_TEETH,
  FLYWHEEL_TORQUE_RATIO,
  getFlywheelCarrierAngle,
  getFlywheelPlanetLocalSpin,
} from '../scene/structures/flywheelEnergyContract';

describe('flywheel energy contract', () => {
  it('exports finite physical bounds and gear dimensions', () => {
    expect(
      Object.values(FLYWHEEL_INSTALLATION_BOUNDS).every(Number.isFinite)
    ).toBe(true);
    expect(
      Object.values(FLYWHEEL_GEAR_RADII).every(
        (value) => Number.isFinite(value) && value > 0
      )
    ).toBe(true);
  });

  it('keeps planetary tooth counts and torque ratio mechanically plausible', () => {
    expect(FLYWHEEL_RING_TEETH).toBe(
      FLYWHEEL_SUN_TEETH + FLYWHEEL_PLANET_TEETH * 2
    );
    expect(FLYWHEEL_TORQUE_RATIO).toBe(
      1 + FLYWHEEL_RING_TEETH / FLYWHEEL_SUN_TEETH
    );
    expect(FLYWHEEL_TORQUE_RATIO).toBeGreaterThan(1);
  });

  it('derives carrier and planet spin from one sun angle', () => {
    const sunAngle = 4.2;
    const carrierAngle = getFlywheelCarrierAngle(sunAngle);
    const planetLocalSpin = getFlywheelPlanetLocalSpin(sunAngle, carrierAngle);
    const fromRing =
      -(FLYWHEEL_RING_TEETH / FLYWHEEL_PLANET_TEETH) * carrierAngle;

    expect(carrierAngle).toBeCloseTo(sunAngle / FLYWHEEL_TORQUE_RATIO, 6);
    expect(planetLocalSpin).toBeCloseTo(fromRing, 6);
    expect(planetLocalSpin).toBeLessThan(0);
  });
});
