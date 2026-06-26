import {
  dampPrReaperArmPose,
  getPrReaperAngularError,
  getPrReaperParkedPose,
  solvePrReaperArmAngles,
  type PrReaperArmPose,
} from './prReaperArmKinematics';
import {
  PR_REAPER_AIM_HOLD_SECONDS,
  PR_REAPER_AIM_TOLERANCE_RADIANS,
  PR_REAPER_ARM_DAMPING,
  PR_REAPER_LASER_DURATION_SECONDS,
  PR_REAPER_RECOVER_SECONDS,
  PR_REAPER_TARGET_PROGRESS_MAX,
  PR_REAPER_TARGET_PROGRESS_MIN,
} from './prReaperInstallationContract';
import type { PrReaperCircleState } from './prReaperStream';

export type PrReaperReapingState =
  | 'idle'
  | 'acquire'
  | 'track'
  | 'fire'
  | 'burst'
  | 'recover';

export interface PrReaperControllerFireEvent {
  candidateId: number;
  targetCenter: { x: number; y: number; z: number };
}

export interface PrReaperReapingControllerStep {
  fire: PrReaperControllerFireEvent | null;
}

export interface PrReaperReapingControllerDebugState {
  state: PrReaperReapingState;
  selectedCandidateId: number | null;
  lastReapedCandidateId: number | null;
  currentYaw: number;
  currentPitch: number;
  targetYaw: number;
  targetPitch: number;
  aimError: number;
  holdTime: number;
  laserRemainingTime: number;
  recoverRemainingTime: number;
  selectedTargetCenter: { x: number; y: number; z: number } | null;
  lastFireOrigin: { x: number; y: number; z: number } | null;
  lastFireTarget: { x: number; y: number; z: number } | null;
}

const copy = (v: { x: number; y: number; z: number }) => ({
  x: v.x,
  y: v.y,
  z: v.z,
});

export class PrReaperReapingController {
  private state: PrReaperReapingState = 'idle';
  private selectedCandidateId: number | null = null;
  private currentPose: PrReaperArmPose = getPrReaperParkedPose();
  private targetPose: PrReaperArmPose = getPrReaperParkedPose();
  private aimError = 0;
  private holdTime = 0;
  private laserRemainingTime = 0;
  private recoverRemainingTime = 0;
  private selectedTargetCenter: { x: number; y: number; z: number } | null =
    null;
  private lastReapedCandidateId: number | null = null;
  private fired = new Set<number>();
  private lastFireOrigin: { x: number; y: number; z: number } | null = null;
  private lastFireTarget: { x: number; y: number; z: number } | null = null;

  update(options: {
    delta: number;
    candidates: readonly PrReaperCircleState[];
    rootHeading?: number;
    fireOrigin?: { x: number; y: number; z: number } | null;
  }): PrReaperReapingControllerStep {
    const delta = Math.min(
      0.25,
      Math.max(0, Number.isFinite(options.delta) ? options.delta : 0)
    );
    if (this.state === 'fire') {
      this.laserRemainingTime -= delta;
      if (this.laserRemainingTime <= 0) {
        this.state = 'burst';
      }
    } else if (this.state === 'burst') {
      this.recoverRemainingTime = PR_REAPER_RECOVER_SECONDS;
      this.state = 'recover';
    } else if (this.state === 'recover') {
      this.recoverRemainingTime -= delta;
      this.targetPose = getPrReaperParkedPose();
      if (this.recoverRemainingTime <= 0) this.state = 'idle';
    }

    let fire: PrReaperControllerFireEvent | null = null;
    if (this.state === 'idle' || this.state === 'acquire') {
      const selected = this.selectCandidate(options.candidates);
      if (selected) {
        this.selectedCandidateId = selected.id;
        this.selectedTargetCenter = copy(selected.center);
        this.state = 'track';
      } else {
        this.selectedCandidateId = null;
        this.selectedTargetCenter = null;
        this.state = 'idle';
      }
    }

    if (this.state === 'track') {
      const selected =
        options.candidates.find((c) => c.id === this.selectedCandidateId) ??
        null;
      if (!selected || !this.isTrackableCandidate(selected)) {
        this.releaseTarget();
      } else {
        const solution = solvePrReaperArmAngles(
          selected.center,
          options.rootHeading ?? 0
        );
        if (!solution.reachable) {
          this.releaseTarget();
        } else {
          this.targetPose = { yaw: solution.yaw, pitch: solution.pitch };
          this.selectedTargetCenter = copy(selected.center);
          this.currentPose = dampPrReaperArmPose(
            this.currentPose,
            this.targetPose,
            PR_REAPER_ARM_DAMPING,
            delta
          );
          this.aimError = getPrReaperAngularError(
            this.currentPose,
            this.targetPose
          );
          if (!this.isTrackableCandidate(selected)) {
            this.releaseTarget();
            return { fire };
          }
          this.holdTime =
            this.aimError <= PR_REAPER_AIM_TOLERANCE_RADIANS
              ? this.holdTime + delta
              : 0;
          if (
            this.holdTime >= PR_REAPER_AIM_HOLD_SECONDS &&
            this.isTrackableCandidate(selected)
          ) {
            this.state = 'fire';
            this.laserRemainingTime = PR_REAPER_LASER_DURATION_SECONDS;
            this.lastReapedCandidateId = selected.id;
            this.fired.add(selected.id);
            this.lastFireOrigin = options.fireOrigin
              ? copy(options.fireOrigin)
              : null;
            this.lastFireTarget = copy(selected.center);
            fire = {
              candidateId: selected.id,
              targetCenter: copy(selected.center),
            };
          }
        }
      }
    }

    if (this.state !== 'track') {
      this.currentPose = dampPrReaperArmPose(
        this.currentPose,
        this.targetPose,
        PR_REAPER_ARM_DAMPING,
        delta
      );
      this.aimError = getPrReaperAngularError(
        this.currentPose,
        this.targetPose
      );
      this.holdTime = 0;
    }
    return { fire };
  }

  setLastFireEndpoints(
    origin: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number }
  ): void {
    this.lastFireOrigin = copy(origin);
    this.lastFireTarget = copy(target);
  }

  getPose(): PrReaperArmPose {
    return { ...this.currentPose };
  }

  getDebugState(): PrReaperReapingControllerDebugState {
    return {
      state: this.state,
      selectedCandidateId: this.selectedCandidateId,
      lastReapedCandidateId: this.lastReapedCandidateId,
      currentYaw: this.currentPose.yaw,
      currentPitch: this.currentPose.pitch,
      targetYaw: this.targetPose.yaw,
      targetPitch: this.targetPose.pitch,
      aimError: this.aimError,
      holdTime: this.holdTime,
      laserRemainingTime: Math.max(0, this.laserRemainingTime),
      recoverRemainingTime: Math.max(0, this.recoverRemainingTime),
      selectedTargetCenter: this.selectedTargetCenter
        ? copy(this.selectedTargetCenter)
        : null,
      lastFireOrigin: this.lastFireOrigin ? copy(this.lastFireOrigin) : null,
      lastFireTarget: this.lastFireTarget ? copy(this.lastFireTarget) : null,
    };
  }

  private isTrackableCandidate(candidate: PrReaperCircleState): boolean {
    return (
      candidate.type === 'red' &&
      candidate.lifecycle === 'active' &&
      !this.fired.has(candidate.id) &&
      candidate.progress >= PR_REAPER_TARGET_PROGRESS_MIN &&
      candidate.progress <= PR_REAPER_TARGET_PROGRESS_MAX
    );
  }

  private selectCandidate(
    candidates: readonly PrReaperCircleState[]
  ): PrReaperCircleState | null {
    let selected: PrReaperCircleState | null = null;
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (!this.isTrackableCandidate(candidate)) continue;
      if (
        !selected ||
        candidate.progress > selected.progress ||
        (candidate.progress === selected.progress && candidate.id < selected.id)
      ) {
        selected = candidate;
      }
    }
    return selected;
  }

  private releaseTarget(): void {
    this.selectedCandidateId = null;
    this.selectedTargetCenter = null;
    this.targetPose = getPrReaperParkedPose();
    this.holdTime = 0;
    this.state = 'idle';
  }
}

export function createPrReaperReapingController(): PrReaperReapingController {
  return new PrReaperReapingController();
}
