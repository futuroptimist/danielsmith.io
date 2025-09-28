import { OrthographicCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { getCameraRelativeMovementVector } from './cameraRelativeMovement';

function createCamera() {
  const camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);
  return camera;
}

const EPSILON = 1e-6;

function expectVectorApproximatelyEqual(actual: Vector3, expected: Vector3) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(1e-3);
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(1e-3);
  expect(Math.abs(actual.z - expected.z)).toBeLessThan(1e-3);
}

describe('getCameraRelativeMovementVector', () => {
  it('maps forward input away from the camera', () => {
    const camera = createCamera();
    const result = getCameraRelativeMovementVector(camera, 0, 1, new Vector3());
    const expected = new Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2);
    expectVectorApproximatelyEqual(result, expected);
  });

  it('maps backward input toward the camera', () => {
    const camera = createCamera();
    const result = getCameraRelativeMovementVector(camera, 0, -1, new Vector3());
    const expected = new Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);
    expectVectorApproximatelyEqual(result, expected);
  });

  it('combines forward and right input without losing either component', () => {
    const camera = createCamera();
    const forwardOnly = getCameraRelativeMovementVector(camera, 0, 1, new Vector3());
    const rightOnly = getCameraRelativeMovementVector(camera, 1, 0, new Vector3());
    const combined = getCameraRelativeMovementVector(camera, 1, 1, new Vector3());

    expect(combined.length()).toBeGreaterThan(1 - EPSILON);
    expect(combined.distanceTo(forwardOnly)).toBeGreaterThan(1e-3);
    expect(combined.distanceTo(rightOnly)).toBeGreaterThan(1e-3);
  });

  it('falls back to world forward when camera forward degenerates', () => {
    const camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, 0);

    const result = getCameraRelativeMovementVector(camera, 0, 1, new Vector3());
    expectVectorApproximatelyEqual(result, new Vector3(0, 0, -1));
  });

  it('returns a zero vector when there is no input', () => {
    const camera = createCamera();
    const target = new Vector3(5, 5, 5);
    const result = getCameraRelativeMovementVector(camera, 0, 0, target);
    expect(result.length()).toBe(0);
    expect(result.y).toBe(0);
  });
});
