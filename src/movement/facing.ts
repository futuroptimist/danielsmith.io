import { MathUtils, Vector3 } from 'three';

const WORK = new Vector3();

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
