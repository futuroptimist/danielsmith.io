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

export type PrReaperControllerState =
  | 'idle'
  | 'acquire'
  | 'track'
  | 'fire'
  | 'burst'
  | 'recover';

export interface PrReaperFireEvent {
  candidateId: number;
  targetCenter: { x: number; y: number; z: number };
}

export interface PrReaperReapingControllerDebugState {
  state: PrReaperControllerState;
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

export class PrReaperReapingController {
  private state: PrReaperControllerState = 'idle';
  private selectedCandidateId: number | null = null;
  private lastReapedCandidateId: number | null = null;
  private currentPose = getPrReaperParkedPose();
  private targetPose = getPrReaperParkedPose();
  private aimError = 0;
  private holdTime = 0;
  private laserRemainingTime = 0;
  private recoverRemainingTime = 0;
  private selectedTargetCenter: { x: number; y: number; z: number } | null =
    null;
  private lastFireOrigin: { x: number; y: number; z: number } | null = null;
  private lastFireTarget: { x: number; y: number; z: number } | null = null;
  private firedIds = new Set<number>();

  update(input: {
    delta: number;
    candidates: readonly PrReaperCircleState[];
    rootHeadingRadians?: number;
  }): PrReaperFireEvent | null {
    const delta = Math.min(
      0.25,
      Math.max(0, Number.isFinite(input.delta) ? input.delta : 0)
    );
    let fire: PrReaperFireEvent | null = null;
    if (this.state === 'fire') {
      this.laserRemainingTime = Math.max(0, this.laserRemainingTime - delta);
      this.state = this.laserRemainingTime > 0 ? 'burst' : 'recover';
    } else if (this.state === 'burst') {
      this.laserRemainingTime = Math.max(0, this.laserRemainingTime - delta);
      if (this.laserRemainingTime <= 0) this.state = 'recover';
    }

    if (this.state === 'recover') {
      this.recoverRemainingTime = Math.max(
        0,
        this.recoverRemainingTime - delta
      );
      this.targetPose = getPrReaperParkedPose();
      if (this.recoverRemainingTime <= 0) {
        this.selectedCandidateId = null;
        this.selectedTargetCenter = null;
        this.state = 'idle';
      }
    }

    if (this.state === 'idle' || this.state === 'acquire') {
      const candidate = this.selectCandidate(
        input.candidates,
        input.rootHeadingRadians ?? 0
      );
      if (candidate) {
        this.selectedCandidateId = candidate.id;
        this.state = 'track';
      } else {
        this.state = 'acquire';
        this.targetPose = getPrReaperParkedPose();
        this.selectedCandidateId = null;
        this.selectedTargetCenter = null;
      }
    }

    if (this.state === 'track') {
      const candidate =
        input.candidates.find((item) => item.id === this.selectedCandidateId) ??
        null;
      const solution = candidate
        ? solvePrReaperArmAngles(
            candidate.center,
            input.rootHeadingRadians ?? 0
          )
        : null;
      if (
        !candidate ||
        candidate.type !== 'red' ||
        !solution?.reachable ||
        candidate.progress > PR_REAPER_TARGET_PROGRESS_MAX
      ) {
        this.selectedCandidateId = null;
        this.selectedTargetCenter = null;
        this.holdTime = 0;
        this.state = 'idle';
      } else {
        this.targetPose = { yaw: solution.yaw, pitch: solution.pitch };
        this.selectedTargetCenter = { ...candidate.center };
        this.aimError = getPrReaperAngularError(
          this.currentPose,
          this.targetPose
        );
        this.holdTime =
          this.aimError <= PR_REAPER_AIM_TOLERANCE_RADIANS
            ? this.holdTime + delta
            : 0;
        if (
          this.holdTime >= PR_REAPER_AIM_HOLD_SECONDS &&
          !this.firedIds.has(candidate.id)
        ) {
          this.firedIds.add(candidate.id);
          this.lastReapedCandidateId = candidate.id;
          this.laserRemainingTime = PR_REAPER_LASER_DURATION_SECONDS;
          this.recoverRemainingTime = PR_REAPER_RECOVER_SECONDS;
          this.state = 'fire';
          fire = {
            candidateId: candidate.id,
            targetCenter: { ...candidate.center },
          };
        }
      }
    }

    this.currentPose = dampPrReaperArmPose(
      this.currentPose,
      this.targetPose,
      delta,
      PR_REAPER_ARM_DAMPING
    );
    this.aimError = getPrReaperAngularError(this.currentPose, this.targetPose);
    return fire;
  }

  setLastFireWorldPoints(
    origin: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number }
  ): void {
    this.lastFireOrigin = { ...origin };
    this.lastFireTarget = { ...target };
  }

  private selectCandidate(
    candidates: readonly PrReaperCircleState[],
    heading: number
  ): PrReaperCircleState | null {
    return (
      candidates
        .filter(
          (candidate) =>
            candidate.type === 'red' &&
            !this.firedIds.has(candidate.id) &&
            candidate.progress >= PR_REAPER_TARGET_PROGRESS_MIN &&
            candidate.progress <= PR_REAPER_TARGET_PROGRESS_MAX
        )
        .filter(
          (candidate) =>
            solvePrReaperArmAngles(candidate.center, heading).reachable
        )
        .sort((a, b) => b.progress - a.progress || a.id - b.id)[0] ?? null
    );
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
      laserRemainingTime: this.laserRemainingTime,
      recoverRemainingTime: this.recoverRemainingTime,
      selectedTargetCenter: this.selectedTargetCenter
        ? { ...this.selectedTargetCenter }
        : null,
      lastFireOrigin: this.lastFireOrigin ? { ...this.lastFireOrigin } : null,
      lastFireTarget: this.lastFireTarget ? { ...this.lastFireTarget } : null,
    };
  }
}
