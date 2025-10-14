import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  computeCameraRelativeYaw,
  computeYawFromVector,
  angularDifference,
  dampYawTowards,
  getCameraRelativeDirection,
  normalizeRadians,
} from '../../systems/movement/facing';

describe('facing helpers', () => {
  it('computes yaw from planar vectors', () => {
    expect(computeYawFromVector(new Vector3(0, 0, -1))).toBeCloseTo(0, 6);
    expect(computeYawFromVector(new Vector3(1, 0, 0))).toBeCloseTo(
      Math.PI / 2,
      6
    );
    expect(computeYawFromVector(new Vector3(-1, 0, 0))).toBeCloseTo(
      -Math.PI / 2,
      6
    );
    expect(Math.abs(computeYawFromVector(new Vector3(0, 0, 1)))).toBeCloseTo(
      Math.PI,
      6
    );
  });

  it('computes diagonals correctly (two-key combos)', () => {
    expect(computeYawFromVector(new Vector3(1, 0, -1).normalize())).toBeCloseTo(
      Math.PI / 4,
      6
    ); // forward + right
    expect(
      computeYawFromVector(new Vector3(-1, 0, -1).normalize())
    ).toBeCloseTo(-Math.PI / 4, 6); // forward + left
    expect(computeYawFromVector(new Vector3(1, 0, 1).normalize())).toBeCloseTo(
      (3 * Math.PI) / 4,
      6
    ); // back + right
    expect(computeYawFromVector(new Vector3(-1, 0, 1).normalize())).toBeCloseTo(
      (-3 * Math.PI) / 4,
      6
    ); // back + left
  });

  it('normalizes and differences around wrap boundaries', () => {
    const a = Math.PI - 0.1;
    const b = -Math.PI + 0.1;
    const diff = angularDifference(a, b);
    expect(Math.abs(diff - 0.2)).toBeLessThan(1e-6);

    expect(Math.abs(normalizeRadians(3 * Math.PI))).toBeCloseTo(Math.PI, 6);
    expect(Math.abs(normalizeRadians(-3 * Math.PI))).toBeCloseTo(Math.PI, 6);
  });

  it('damps smoothly toward target without overshoot on wrap', () => {
    const dt = 1 / 60;
    const smoothing = 8;
    let current = Math.PI - 0.05;
    const target = -Math.PI + 0.05; // shortest path crosses -PI/PI boundary

    // Step a few frames and ensure movement in correct direction and bounded.
    for (let i = 0; i < 30; i += 1) {
      const next = dampYawTowards(current, target, smoothing, dt);
      const before = angularDifference(current, target);
      const after = angularDifference(next, target);
      expect(Math.abs(after)).toBeLessThan(Math.abs(before) + 1e-9);
      expect(Math.abs(angularDifference(next, 0))).toBeLessThan(Math.PI + 1e-6);
      current = next;
    }
  });

  it('derives yaw relative to camera basis from world velocity', () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(10, 12, 10);
    camera.lookAt(0, 0, 0);

    const forward = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0));
    right.normalize();

    expect(computeCameraRelativeYaw(camera, forward)).toBeCloseTo(0, 6);
    expect(computeCameraRelativeYaw(camera, right)).toBeCloseTo(Math.PI / 2, 6);
    expect(
      computeCameraRelativeYaw(camera, forward.clone().add(right).normalize())
    ).toBeCloseTo(Math.PI / 4, 6);
    expect(
      computeCameraRelativeYaw(camera, forward.clone().negate())
    ).toBeCloseTo(Math.PI, 6);

    const relativeForward = getCameraRelativeDirection(camera, 0);
    expect(relativeForward.angleTo(forward)).toBeLessThan(1e-6);

    const relativeRight = getCameraRelativeDirection(camera, Math.PI / 2);
    expect(relativeRight.angleTo(right)).toBeLessThan(1e-6);

    const relativeDiagonal = getCameraRelativeDirection(camera, Math.PI / 4);
    expect(
      relativeDiagonal.angleTo(forward.clone().add(right).normalize())
    ).toBeLessThan(1e-6);
  });
});
