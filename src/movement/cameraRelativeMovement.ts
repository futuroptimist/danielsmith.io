import type { Camera } from 'three';
import { Vector3 } from 'three';

import { copyCameraPlanarBasis } from './facing';

const CAMERA_FORWARD = new Vector3();
const CAMERA_RIGHT = new Vector3();

export function getCameraRelativeMovementVector(
  camera: Camera,
  inputRight: number,
  inputForward: number,
  target: Vector3
): Vector3 {
  copyCameraPlanarBasis(camera, CAMERA_FORWARD, CAMERA_RIGHT);

  target
    .copy(CAMERA_FORWARD)
    .multiplyScalar(inputForward)
    .addScaledVector(CAMERA_RIGHT, inputRight);
  target.y = 0;

  return target;
}
