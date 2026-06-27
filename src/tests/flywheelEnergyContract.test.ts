import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_GEARBOX,
  FLYWHEEL_GEAR_RADII,
  FLYWHEEL_GEAR_TEETH,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_PLANETARY_RATIO,
  getFlywheelCarrierAngle,
  getFlywheelPlanetSpinAngle,
} from '../scene/structures/flywheelEnergyContract';

describe('flywheel energy contract', () => {
  it('exports finite physical dimensions and plausible gear constants', () => {
    expect(FLYWHEEL_INSTALLATION_BOUNDS.width).toBeGreaterThan(3);
    expect(FLYWHEEL_INSTALLATION_BOUNDS.height).toBeGreaterThan(2);
    expect(FLYWHEEL_GEAR_TEETH.ring).toBe(
      FLYWHEEL_GEAR_TEETH.sun + 2 * FLYWHEEL_GEAR_TEETH.planet
    );
    expect(FLYWHEEL_GEAR_RADII.ring).toBeCloseTo(
      FLYWHEEL_GEAR_RADII.sun + 2 * FLYWHEEL_GEAR_RADII.planet
    );
    expect(FLYWHEEL_GEARBOX.planetOrbitRadius).toBeCloseTo(
      FLYWHEEL_GEAR_RADII.sun + FLYWHEEL_GEAR_RADII.planet
    );
    expect(Number.isFinite(FLYWHEEL_PLANETARY_RATIO)).toBe(true);
    expect(FLYWHEEL_PLANETARY_RATIO).toBeCloseTo(
      1 + FLYWHEEL_GEAR_TEETH.ring / FLYWHEEL_GEAR_TEETH.sun
    );
  });

  it('keeps carrier and planet spin synchronized from one crank angle', () => {
    const crank = Math.PI * 3;
    expect(getFlywheelCarrierAngle(crank)).toBeCloseTo(
      crank / FLYWHEEL_PLANETARY_RATIO
    );
    expect(getFlywheelPlanetSpinAngle(crank)).toBeCloseTo(
      -crank * (FLYWHEEL_GEAR_TEETH.sun / FLYWHEEL_GEAR_TEETH.planet)
    );
  });
});
