import { AnimationClip, AnimationMixer, Group } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createAvatarLocomotionAnimator,
  type AvatarLocomotionAnimatorHandle,
} from '../avatar/locomotionAnimator';

function createClip(name: string): AnimationClip {
  return new AnimationClip(name, -1, []);
}

describe('createAvatarLocomotionAnimator', () => {
  const createHandle = (
    overrides: Partial<{
      clips: Parameters<typeof createAvatarLocomotionAnimator>[0]['clips'];
      maxLinearSpeed: number;
    }> = {}
  ): AvatarLocomotionAnimatorHandle => {
    const group = new Group();
    const mixer = new AnimationMixer(group);
    return createAvatarLocomotionAnimator({
      mixer,
      clips:
        overrides.clips ??
        ({
          idle: createClip('Idle'),
          walk: createClip('Walk'),
          run: createClip('Run'),
          turnLeft: createClip('TurnLeft'),
          turnRight: createClip('TurnRight'),
        } satisfies Parameters<
          typeof createAvatarLocomotionAnimator
        >[0]['clips']),
      maxLinearSpeed: overrides.maxLinearSpeed ?? 6,
      thresholds: {
        idleToWalk: 0.6,
        walkToRun: 3,
      },
      smoothing: {
        linear: Number.POSITIVE_INFINITY,
        turn: Number.POSITIVE_INFINITY,
      },
      timeScale: {
        min: 0.35,
        max: 2.4,
        walkReferenceSpeed: 1,
        runReferenceSpeed: 4,
        turnReferenceSpeed: Math.PI,
      },
      turn: {
        threshold: 0.8,
        max: 3,
        linearSpeedLimit: 0.4,
      },
    });
  };

  it('blends between idle, walk, and run based on linear speed', () => {
    const animator = createHandle();

    animator.update({ delta: 1 / 60, linearSpeed: 0, angularSpeed: 0 });
    const idleSnapshot = animator.getSnapshot();
    expect(idleSnapshot.linearState).toBe('idle');
    expect(idleSnapshot.weights.idle).toBeCloseTo(1, 6);
    expect(idleSnapshot.weights.walk).toBeCloseTo(0, 6);
    expect(idleSnapshot.weights.run).toBeCloseTo(0, 6);

    animator.update({ delta: 1 / 60, linearSpeed: 0.8, angularSpeed: 0 });
    const walkSnapshot = animator.getSnapshot();
    expect(walkSnapshot.linearState).toBe('walk');
    expect(walkSnapshot.weights.walk).toBeGreaterThan(0.8);
    expect(walkSnapshot.weights.idle).toBeLessThan(0.2);
    expect(walkSnapshot.weights.run).toBeCloseTo(0, 6);

    animator.update({ delta: 1 / 60, linearSpeed: 6, angularSpeed: 0 });
    const runSnapshot = animator.getSnapshot();
    expect(runSnapshot.linearState).toBe('run');
    expect(runSnapshot.weights.run).toBeGreaterThan(0.95);
    expect(runSnapshot.weights.walk).toBeLessThan(0.1);
    expect(runSnapshot.weights.idle).toBeCloseTo(0, 6);

    animator.dispose();
  });

  it('applies turning overlays when angular velocity dominates', () => {
    const animator = createHandle();

    animator.update({ delta: 1 / 60, linearSpeed: 0.1, angularSpeed: 1.6 });
    const turningLeft = animator.getSnapshot();
    expect(turningLeft.turning).toBe('left');
    expect(turningLeft.weights.turnLeft).toBeGreaterThan(0.3);
    expect(turningLeft.weights.idle).toBeLessThan(0.8);

    animator.update({ delta: 1 / 60, linearSpeed: 0.1, angularSpeed: -1.4 });
    const turningRight = animator.getSnapshot();
    expect(turningRight.turning).toBe('right');
    expect(turningRight.weights.turnRight).toBeGreaterThan(0.25);

    animator.update({ delta: 1 / 60, linearSpeed: 1.2, angularSpeed: 2 });
    const suppressedTurn = animator.getSnapshot();
    expect(suppressedTurn.turning).toBe('none');
    expect(suppressedTurn.weights.turnLeft).toBeLessThan(0.1);
    expect(suppressedTurn.weights.turnRight).toBeLessThan(0.1);

    animator.dispose();
  });

  it('updates timeScale in proportion to linear and angular speed', () => {
    const animator = createHandle();

    animator.update({ delta: 1 / 60, linearSpeed: 2, angularSpeed: 0 });
    const walkSnapshot = animator.getSnapshot();
    expect(walkSnapshot.timeScales.walk).toBeCloseTo(2, 6);

    animator.update({ delta: 1 / 60, linearSpeed: 5, angularSpeed: 0 });
    const runSnapshot = animator.getSnapshot();
    expect(runSnapshot.timeScales.run).toBeCloseTo(1.25, 6);

    animator.update({ delta: 1 / 60, linearSpeed: 0.1, angularSpeed: Math.PI });
    const turnSnapshot = animator.getSnapshot();
    expect(turnSnapshot.timeScales.turnLeft).toBeCloseTo(1, 6);

    animator.dispose();
  });
});
