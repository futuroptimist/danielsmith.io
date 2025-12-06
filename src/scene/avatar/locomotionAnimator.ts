import type { AnimationAction, AnimationClip, AnimationMixer } from 'three';
import { MathUtils } from 'three';

export type AvatarLocomotionClipSet = {
  idle: AnimationClip;
  walk: AnimationClip;
  run: AnimationClip;
  turnLeft?: AnimationClip;
  turnRight?: AnimationClip;
};

export type AvatarLocomotionAnimatorUpdate = {
  delta: number;
  linearSpeed: number;
  angularSpeed: number;
};

export type AvatarLocomotionBlendSnapshot = {
  linearState: 'idle' | 'walk' | 'run';
  turning: 'none' | 'left' | 'right';
  linearSpeed: number;
  angularSpeed: number;
  weights: {
    idle: number;
    walk: number;
    run: number;
    turnLeft: number;
    turnRight: number;
  };
  timeScales: {
    idle: number;
    walk: number;
    run: number;
    turnLeft: number;
    turnRight: number;
  };
};

export type AvatarLocomotionAnimatorOptions = {
  mixer: AnimationMixer;
  clips: AvatarLocomotionClipSet;
  maxLinearSpeed: number;
  thresholds?: {
    /** Speed where we should be fully in the walk clip. */
    idleToWalk?: number;
    /** Speed where we should start blending from walk to run. */
    walkToRun?: number;
  };
  deadZones?: {
    /** Speeds below this threshold are treated as idle to suppress jitter. */
    linear?: number;
    /** Angular speeds below this threshold do not trigger turn overlays. */
    angular?: number;
  };
  smoothing?: {
    /** Smoothing factor passed to MathUtils.damp for idle/walk/run weights. */
    linear?: number;
    /** Smoothing factor passed to MathUtils.damp for turn weights. */
    turn?: number;
  };
  timeScale?: {
    /** Linear speed where the walk clip feels natural. */
    walkReferenceSpeed?: number;
    /** Linear speed where the run clip feels natural. */
    runReferenceSpeed?: number;
    /** Minimum timeScale applied to clips. */
    min?: number;
    /** Maximum timeScale applied to clips. */
    max?: number;
    /** Angular speed that maps to a timeScale of 1 for turn clips. */
    turnReferenceSpeed?: number;
  };
  turn?: {
    /** Angular speed before turn clips begin to fade in. */
    threshold?: number;
    /** Angular speed where turn clips are fully weighted. */
    max?: number;
    /** Linear speed above which we suppress turn overlays. */
    linearSpeedLimit?: number;
  };
};

export interface AvatarLocomotionAnimatorHandle {
  update(step: AvatarLocomotionAnimatorUpdate): void;
  getSnapshot(): AvatarLocomotionBlendSnapshot;
  dispose(): void;
}

type BlendWeights = AvatarLocomotionBlendSnapshot['weights'];
type TimeScales = AvatarLocomotionBlendSnapshot['timeScales'];

type InternalState = {
  weights: BlendWeights;
  timeScales: TimeScales;
  snapshot: AvatarLocomotionBlendSnapshot;
};

function normalizedProgress(value: number, start: number, end: number): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return 0;
  }
  if (end <= start + 1e-6) {
    return value >= end ? 1 : 0;
  }
  const t = (value - start) / (end - start);
  return MathUtils.clamp(t, 0, 1);
}

function applyActionState(
  action: AnimationAction,
  weight: number,
  timeScale: number
) {
  const clampedWeight = MathUtils.clamp(weight, 0, 1);
  action.enabled = clampedWeight > 1e-3;
  action.weight = clampedWeight;
  if (Number.isFinite(timeScale)) {
    action.timeScale = timeScale;
  }
  if (!action.isRunning()) {
    action.play();
  }
}

export function createAvatarLocomotionAnimator(
  options: AvatarLocomotionAnimatorOptions
): AvatarLocomotionAnimatorHandle {
  const idleClip = options.clips.idle;
  const walkClip = options.clips.walk;
  const runClip = options.clips.run;
  const turnLeftClip = options.clips.turnLeft;
  const turnRightClip = options.clips.turnRight;
  const mixer = options.mixer;
  const maxLinearSpeed = Math.max(options.maxLinearSpeed, 0.1);

  const idleToWalk = Math.max(
    options.thresholds?.idleToWalk ?? maxLinearSpeed * 0.18,
    0.05
  );
  const walkToRun = Math.max(
    options.thresholds?.walkToRun ?? maxLinearSpeed * 0.55,
    idleToWalk + 0.1
  );

  const linearSmoothing = options.smoothing?.linear ?? 6;
  const turnSmoothing = options.smoothing?.turn ?? 8;

  const minTimeScale = Math.max(options.timeScale?.min ?? 0.4, 0.01);
  const maxTimeScale = Math.max(options.timeScale?.max ?? 2.5, minTimeScale);
  const walkReferenceSpeed = Math.max(
    options.timeScale?.walkReferenceSpeed ?? (idleToWalk + walkToRun) / 2,
    0.05
  );
  const runReferenceSpeed = Math.max(
    options.timeScale?.runReferenceSpeed ?? maxLinearSpeed,
    0.05
  );
  const turnReferenceSpeed = Math.max(
    options.timeScale?.turnReferenceSpeed ?? Math.PI,
    0.05
  );

  const turnThreshold = Math.max(options.turn?.threshold ?? 0.8, 0);
  const turnMax = Math.max(options.turn?.max ?? 2.6, turnThreshold + 0.1);
  const turnLinearLimit = Math.max(
    options.turn?.linearSpeedLimit ?? idleToWalk * 0.6,
    0
  );

  const linearDeadZone = Math.max(
    options.deadZones?.linear ?? idleToWalk * 0.2,
    0
  );
  const angularDeadZone = Math.max(
    options.deadZones?.angular ?? turnThreshold * 0.5,
    0
  );

  const idleAction = mixer.clipAction(idleClip);
  const walkAction = mixer.clipAction(walkClip);
  const runAction = mixer.clipAction(runClip);
  const turnLeftAction = turnLeftClip ? mixer.clipAction(turnLeftClip) : null;
  const turnRightAction = turnRightClip
    ? mixer.clipAction(turnRightClip)
    : null;

  idleAction.reset();
  walkAction.reset();
  runAction.reset();
  turnLeftAction?.reset();
  turnRightAction?.reset();

  const state: InternalState = {
    weights: {
      idle: 1,
      walk: 0,
      run: 0,
      turnLeft: 0,
      turnRight: 0,
    },
    timeScales: {
      idle: 1,
      walk: 1,
      run: 1,
      turnLeft: 1,
      turnRight: 1,
    },
    snapshot: {
      linearState: 'idle',
      turning: 'none',
      linearSpeed: 0,
      angularSpeed: 0,
      weights: {
        idle: 1,
        walk: 0,
        run: 0,
        turnLeft: 0,
        turnRight: 0,
      },
      timeScales: {
        idle: 1,
        walk: 1,
        run: 1,
        turnLeft: 1,
        turnRight: 1,
      },
    },
  };

  applyActionState(idleAction, 1, 1);
  applyActionState(walkAction, 0, 1);
  applyActionState(runAction, 0, 1);
  if (turnLeftAction) {
    applyActionState(turnLeftAction, 0, 1);
  }
  if (turnRightAction) {
    applyActionState(turnRightAction, 0, 1);
  }

  const updateSnapshot = () => {
    const { weights, timeScales, snapshot } = state;
    const { idle, walk, run } = weights;
    let linearState: 'idle' | 'walk' | 'run' = 'idle';
    if (run >= walk && run >= idle) {
      linearState = 'run';
    } else if (walk >= idle) {
      linearState = 'walk';
    }
    let turning: 'none' | 'left' | 'right' = 'none';
    if (weights.turnLeft > Math.max(weights.turnRight, 0.05)) {
      turning = 'left';
    } else if (weights.turnRight > 0.05) {
      turning = 'right';
    }

    snapshot.linearState = linearState;
    snapshot.turning = turning;
    snapshot.linearSpeed = state.snapshot.linearSpeed;
    snapshot.angularSpeed = state.snapshot.angularSpeed;
    snapshot.weights = { ...weights };
    snapshot.timeScales = { ...timeScales };
  };

  const update = ({
    delta,
    linearSpeed,
    angularSpeed,
  }: AvatarLocomotionAnimatorUpdate) => {
    const clampedDelta = Math.max(0, delta);
    const rawPlanarSpeed = Math.max(0, Math.min(linearSpeed, maxLinearSpeed));
    const planarSpeed = rawPlanarSpeed < linearDeadZone ? 0 : rawPlanarSpeed;
    const rawAngularSpeed =
      Math.abs(angularSpeed) < angularDeadZone ? 0 : angularSpeed;
    const absAngularSpeed = Math.abs(rawAngularSpeed);

    state.snapshot.linearSpeed = planarSpeed;
    state.snapshot.angularSpeed = rawAngularSpeed;

    const idleRampStart = idleToWalk * 0.4;
    let idleContribution =
      1 - normalizedProgress(planarSpeed, idleRampStart, idleToWalk);
    let runContribution = normalizedProgress(
      planarSpeed,
      walkToRun,
      maxLinearSpeed
    );
    let walkContribution = 1 - idleContribution - runContribution;
    walkContribution = MathUtils.clamp(walkContribution, 0, 1);

    let turnLeftWeightTarget = 0;
    let turnRightWeightTarget = 0;
    const allowTurning = planarSpeed <= turnLinearLimit + 1e-3;
    if (allowTurning && (turnLeftAction || turnRightAction)) {
      const turnMix = normalizedProgress(
        absAngularSpeed,
        turnThreshold,
        turnMax
      );
      if (turnMix > 0) {
        if (rawAngularSpeed > 0 && turnLeftAction) {
          turnLeftWeightTarget = turnMix;
        } else if (rawAngularSpeed < 0 && turnRightAction) {
          turnRightWeightTarget = turnMix;
        }
        const overlay = Math.max(turnLeftWeightTarget, turnRightWeightTarget);
        const linearScale = 1 - overlay * 0.85;
        const scale = MathUtils.clamp(linearScale, 0, 1);
        idleContribution *= scale;
        walkContribution *= scale;
        runContribution *= scale;
      }
    }

    const idleWeightTarget = MathUtils.clamp(idleContribution, 0, 1);
    const walkWeightTarget = MathUtils.clamp(walkContribution, 0, 1);
    const runWeightTarget = MathUtils.clamp(runContribution, 0, 1);

    state.weights.idle = MathUtils.damp(
      state.weights.idle,
      idleWeightTarget,
      linearSmoothing,
      clampedDelta
    );
    state.weights.walk = MathUtils.damp(
      state.weights.walk,
      walkWeightTarget,
      linearSmoothing,
      clampedDelta
    );
    state.weights.run = MathUtils.damp(
      state.weights.run,
      runWeightTarget,
      linearSmoothing,
      clampedDelta
    );
    state.weights.turnLeft = MathUtils.damp(
      state.weights.turnLeft,
      turnLeftWeightTarget,
      turnSmoothing,
      clampedDelta
    );
    state.weights.turnRight = MathUtils.damp(
      state.weights.turnRight,
      turnRightWeightTarget,
      turnSmoothing,
      clampedDelta
    );

    const walkTimeScale = MathUtils.clamp(
      planarSpeed / walkReferenceSpeed,
      minTimeScale,
      maxTimeScale
    );
    const runTimeScale = MathUtils.clamp(
      planarSpeed / runReferenceSpeed,
      minTimeScale,
      maxTimeScale
    );
    const turnTimeScale = MathUtils.clamp(
      absAngularSpeed / turnReferenceSpeed,
      minTimeScale,
      maxTimeScale
    );

    state.timeScales.idle = 1;
    state.timeScales.walk = walkTimeScale;
    state.timeScales.run = runTimeScale;
    state.timeScales.turnLeft = turnTimeScale;
    state.timeScales.turnRight = turnTimeScale;

    applyActionState(idleAction, state.weights.idle, state.timeScales.idle);
    applyActionState(walkAction, state.weights.walk, state.timeScales.walk);
    applyActionState(runAction, state.weights.run, state.timeScales.run);
    if (turnLeftAction) {
      applyActionState(
        turnLeftAction,
        state.weights.turnLeft,
        state.timeScales.turnLeft
      );
    }
    if (turnRightAction) {
      applyActionState(
        turnRightAction,
        state.weights.turnRight,
        state.timeScales.turnRight
      );
    }

    if (clampedDelta > 0) {
      mixer.update(clampedDelta);
    }

    updateSnapshot();
  };

  const dispose = () => {
    idleAction.stop();
    walkAction.stop();
    runAction.stop();
    turnLeftAction?.stop();
    turnRightAction?.stop();
  };

  const getSnapshot = () => state.snapshot;

  return {
    update,
    dispose,
    getSnapshot,
  };
}
