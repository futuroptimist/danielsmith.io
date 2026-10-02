export interface MovementSubstepPlan {
  count: number;
  stepX: number;
  stepZ: number;
  truncated: boolean;
}

/** Keep long frames from skipping thin colliders or intentional stair handoffs. */
export function planMovementSubsteps(
  dx: number,
  dz: number,
  maxStepDistance: number,
  maxSubsteps = 64
): MovementSubstepPlan {
  if (
    !Number.isFinite(dx) ||
    !Number.isFinite(dz) ||
    !Number.isFinite(maxStepDistance) ||
    maxStepDistance <= 0 ||
    !Number.isSafeInteger(maxSubsteps) ||
    maxSubsteps < 1
  ) {
    throw new Error('Invalid movement subdivision inputs.');
  }

  const distance = Math.hypot(dx, dz);
  if (!Number.isFinite(distance)) {
    throw new Error('Non-finite movement distance.');
  }
  const required = Math.max(1, Math.ceil(distance / maxStepDistance));
  const count = Math.min(required, maxSubsteps);
  const truncated = required > maxSubsteps;
  // Discard excess travel after extreme stalls instead of enlarging a substep
  // or creating an unbounded catch-up loop. Preserve the input direction.
  const scale = truncated ? maxStepDistance / distance : 1 / count;
  return { count, stepX: dx * scale, stepZ: dz * scale, truncated };
}
