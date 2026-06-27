import { describe, expect, it } from 'vitest';

import {
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_SPIN_RAD_PER_SECOND,
  FLYWHEEL_WHEEL,
  FLYWHEEL_WHEEL_OUTER_RADIUS,
} from '../scene/structures/flywheelEnergyContract';

describe('flywheel energy contract', () => {
  it('exports finite simplified physical bounds', () => {
    expect(FLYWHEEL_INSTALLATION_BOUNDS.width).toBeGreaterThan(
      FLYWHEEL_BASE_DIMENSIONS.width
    );
    expect(FLYWHEEL_INSTALLATION_BOUNDS.depth).toBeGreaterThan(
      FLYWHEEL_BASE_DIMENSIONS.depth
    );
    expect(FLYWHEEL_INSTALLATION_BOUNDS.height).toBeGreaterThan(2);
  });

  it('defines a readable physical wheel baseline without gear constants', () => {
    expect(FLYWHEEL_WHEEL_OUTER_RADIUS).toBeCloseTo(
      FLYWHEEL_WHEEL.radius + FLYWHEEL_WHEEL.rimTube
    );
    expect(FLYWHEEL_WHEEL.radius).toBeGreaterThan(0.75);
    expect(FLYWHEEL_WHEEL.rimTube).toBeGreaterThan(0.08);
    expect(FLYWHEEL_SPIN_RAD_PER_SECOND).toBeGreaterThan(0);
  });
});
