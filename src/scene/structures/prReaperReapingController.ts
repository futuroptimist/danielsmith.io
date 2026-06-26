import {
  dampPrReaperArmPose,
  getPrReaperAngularError,
  getPrReaperParkedPose,
  solvePrReaperArmPose,
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

export interface PrReaperControllerFireEvent {
  candidateId: number;
  targetCenter: { x: number; y: number; z: number };
}

export interface PrReaperControllerUpdateResult {
  fire: PrReaperControllerFireEvent | null;
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
  private selectedId: number | null = null;
  private current = getPrReaperParkedPose();
  private target = getPrReaperParkedPose();
  private aimError = 0;
  private holdTime = 0;
  private laserRemainingTime = 0;
  private recoverRemainingTime = 0;
  private selectedTargetCenter: { x: number; y: number; z: number } | null =
    null;
  private lastReapedCandidateId: number | null = null;
  private firedIds = new Set<number>();
  private lastFireOrigin: { x: number; y: number; z: number } | null = null;
  private lastFireTarget: { x: number; y: number; z: number } | null = null;

  update(args: {
    delta: number;
    candidates: readonly PrReaperCircleState[];
    rootHeadingRadians?: number;
    fireOrigin?: { x: number; y: number; z: number } | null;
  }): PrReaperControllerUpdateResult {
    const delta = Math.max(0, Math.min(1, args.delta));
    const fire: PrReaperControllerFireEvent | null = null;
    if (this.state === 'fire' || this.state === 'burst') {
      this.laserRemainingTime = Math.max(0, this.laserRemainingTime - delta);
      if (this.laserRemainingTime <= 0) {
        this.state = 'recover';
        this.recoverRemainingTime = PR_REAPER_RECOVER_SECONDS;
      }
    }
    if (this.state === 'recover') {
      this.recoverRemainingTime = Math.max(
        0,
        this.recoverRemainingTime - delta
      );
      this.target = getPrReaperParkedPose();
      if (this.recoverRemainingTime <= 0) this.state = 'idle';
    }
    if (this.state === 'idle') this.state = 'acquire';
    if (this.state === 'acquire') this.acquire(args.candidates);

    const selected =
      this.selectedId == null
        ? null
        : args.candidates.find((c) => c.id === this.selectedId);
    if ((this.state === 'track' || this.state === 'acquire') && selected) {
      const solution = solvePrReaperArmPose(
        selected.center,
        args.rootHeadingRadians ?? 0
      );
      if (
        !solution.reachable ||
        selected.type !== 'red' ||
        this.firedIds.has(selected.id)
      ) {
        this.release();
      } else {
        this.target = { yaw: solution.yaw, pitch: solution.pitch };
        this.selectedTargetCenter = { ...selected.center };
      }
    } else if (this.state === 'track') {
      this.release();
    }

    this.current = dampPrReaperArmPose(
      this.current,
      this.target,
      delta,
      PR_REAPER_ARM_DAMPING
    );
    this.aimError = getPrReaperAngularError(this.current, this.target);
    if (this.state === 'track' && selected) {
      if (this.aimError <= PR_REAPER_AIM_TOLERANCE_RADIANS)
        this.holdTime += delta;
      else this.holdTime = 0;
      if (this.holdTime >= PR_REAPER_AIM_HOLD_SECONDS) {
        this.state = 'fire';
        this.laserRemainingTime = PR_REAPER_LASER_DURATION_SECONDS;
        this.lastReapedCandidateId = selected.id;
        this.firedIds.add(selected.id);
        this.lastFireOrigin = args.fireOrigin ? { ...args.fireOrigin } : null;
        this.lastFireTarget = { ...selected.center };
        const event = {
          candidateId: selected.id,
          targetCenter: { ...selected.center },
        };
        this.selectedId = null;
        this.holdTime = 0;
        return { fire: event };
      }
    }
    return { fire };
  }

  isLaserActive(): boolean {
    return this.laserRemainingTime > 0;
  }

  setLastFireWorldPoints(
    origin: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number }
  ): void {
    this.lastFireOrigin = { ...origin };
    this.lastFireTarget = { ...target };
  }

  private acquire(candidates: readonly PrReaperCircleState[]): void {
    const candidate = candidates
      .filter(
        (entry) =>
          entry.type === 'red' &&
          !this.firedIds.has(entry.id) &&
          entry.progress >= PR_REAPER_TARGET_PROGRESS_MIN &&
          entry.progress <= PR_REAPER_TARGET_PROGRESS_MAX
      )
      .sort((a, b) => b.progress - a.progress || a.id - b.id)[0];
    if (!candidate) return;
    this.selectedId = candidate.id;
    this.state = 'track';
  }

  private release(): void {
    this.selectedId = null;
    this.selectedTargetCenter = null;
    this.holdTime = 0;
    this.state = 'idle';
    this.target = getPrReaperParkedPose();
  }

  getPose(): PrReaperArmPose {
    return { ...this.current };
  }

  getDebugState(): PrReaperReapingControllerDebugState {
    return {
      state: this.state,
      selectedCandidateId: this.selectedId,
      lastReapedCandidateId: this.lastReapedCandidateId,
      currentYaw: this.current.yaw,
      currentPitch: this.current.pitch,
      targetYaw: this.target.yaw,
      targetPitch: this.target.pitch,
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
