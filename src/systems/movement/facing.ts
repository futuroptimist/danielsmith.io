import type { Camera } from 'three';
import { MathUtils, Vector3 } from 'three';

const WORK = new Vector3();
const CAMERA_FORWARD = new Vector3();
const CAMERA_RIGHT = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);
const DEFAULT_FORWARD = new Vector3(0, 0, -1);
const DEFAULT_RIGHT = new Vector3(1, 0, 0);
const EPSILON = 1e-6;

function updateCameraPlanarBasis(camera: Camera) {
  camera.getWorldDirection(CAMERA_FORWARD);
  CAMERA_FORWARD.y = 0;

  if (CAMERA_FORWARD.lengthSq() <= EPSILON) {
    CAMERA_FORWARD.copy(DEFAULT_FORWARD);
  } else {
    CAMERA_FORWARD.normalize();
  }

  CAMERA_RIGHT.crossVectors(CAMERA_FORWARD, WORLD_UP);
  if (CAMERA_RIGHT.lengthSq() <= EPSILON) {
    CAMERA_RIGHT.copy(DEFAULT_RIGHT);
  } else {
    CAMERA_RIGHT.normalize();
  }
}

export function copyCameraPlanarBasis(
  camera: Camera,
  outForward: Vector3,
  outRight: Vector3
): void {
  updateCameraPlanarBasis(camera);
  outForward.copy(CAMERA_FORWARD);
  outRight.copy(CAMERA_RIGHT);
}

export function computeYawFromVector(vector: Vector3): number {
  // Expect vector on XZ plane; yaw is rotation around Y.
  // Convention: forward (0,0,-1) => yaw 0; right (1,0,0) => +PI/2.
  const x = vector.x;
  const z = vector.z;
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return 0;
  }
  if (x === 0 && z === 0) {
    return 0;
  }
  return Math.atan2(x, -z);
}

export function normalizeRadians(angle: number): number {
  // Map to (-PI, PI]
  const twoPi = Math.PI * 2;
  return MathUtils.euclideanModulo(angle + Math.PI, twoPi) - Math.PI;
}

export function angularDifference(from: number, to: number): number {
  return normalizeRadians(to - from);
}

export function dampYawTowards(
  current: number,
  target: number,
  smoothing: number,
  deltaSeconds: number
): number {
  const diff = angularDifference(current, target);
  // Damp from 0 towards diff, then add to current to avoid wrap artifacts.
  const step = MathUtils.damp(0, diff, smoothing, deltaSeconds);
  const next = current + step;
  if (!Number.isFinite(next)) {
    return current;
  }
  return normalizeRadians(next);
}

export function directionFromPoints(
  from: { x: number; z: number },
  to: { x: number; z: number },
  out: Vector3 = WORK
): Vector3 {
  out.set(to.x - from.x, 0, to.z - from.z);
  return out;
}

export function computeCameraRelativeYaw(
  camera: Camera,
  vector: Vector3
): number {
  updateCameraPlanarBasis(camera);

  const forwardComponent = vector.dot(CAMERA_FORWARD);
  const rightComponent = vector.dot(CAMERA_RIGHT);

  if (
    !Number.isFinite(forwardComponent) ||
    !Number.isFinite(rightComponent) ||
    (Math.abs(forwardComponent) <= EPSILON &&
      Math.abs(rightComponent) <= EPSILON)
  ) {
    return 0;
  }

  return Math.atan2(rightComponent, forwardComponent);
}

export function getCameraRelativeDirection(
  camera: Camera,
  yaw: number,
  target: Vector3 = WORK
): Vector3 {
  updateCameraPlanarBasis(camera);

  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);

  return target
    .copy(CAMERA_FORWARD)
    .multiplyScalar(cosYaw)
    .addScaledVector(CAMERA_RIGHT, sinYaw)
    .normalize();
}

export function computeModelYawFromVector(vector: Vector3): number {
  // Rotation required so the model's +Z faces the provided vector.
  // This is the typical THREE.js yaw formula for aligning +Z to (x, z).
  const x = vector.x;
  const z = vector.z;
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return 0;
  }
  if (x === 0 && z === 0) {
    return 0;
  }
  return Math.atan2(x, z);
}

export function rotateYaw(base: number, delta: number): number {
  return normalizeRadians(base + delta);
}
