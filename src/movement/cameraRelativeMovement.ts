import type { Camera } from 'three';
import { Vector3 } from 'three';

const cameraForward = new Vector3();
const cameraRight = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);
const DEFAULT_FORWARD = new Vector3(0, 0, -1);
const DEFAULT_RIGHT = new Vector3(1, 0, 0);
const EPSILON = 1e-6;

export function getCameraRelativeMovementVector(
  camera: Camera,
  inputRight: number,
  inputForward: number,
  target: Vector3
): Vector3 {
  camera.getWorldDirection(cameraForward);
  cameraForward.y = 0;

  if (cameraForward.lengthSq() <= EPSILON) {
    cameraForward.copy(DEFAULT_FORWARD);
  } else {
    cameraForward.normalize();
  }

  cameraRight.crossVectors(cameraForward, WORLD_UP);
  if (cameraRight.lengthSq() <= EPSILON) {
    cameraRight.copy(DEFAULT_RIGHT);
  } else {
    cameraRight.normalize();
  }

  target
    .copy(cameraForward)
    .multiplyScalar(inputForward)
    .addScaledVector(cameraRight, inputRight);
  target.y = 0;

  return target;
}
