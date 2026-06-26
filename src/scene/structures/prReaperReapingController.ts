import { Vector3 } from 'three';

import {
  computeAngularError,
  dampPrReaperArmPose,
  getPrReaperParkedPose,
  solvePrReaperArm,
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

export interface PrReaperFireEvent {
  candidateId: number;
  targetCenter: { x: number; y: number; z: number };
}

export interface PrReaperControllerDebugState {
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

export class PrReaperReapingController {
  private state: PrReaperReapingState = 'idle';
  private selectedId: number | null = null;
  private firedIds = new Set<number>();
  private current: PrReaperArmPose = getPrReaperParkedPose();
  private target: PrReaperArmPose = getPrReaperParkedPose();
  private aimError = 0;
  private holdTime = 0;
  private laserRemainingTime = 0;
  private recoverRemainingTime = 0;
  private selectedTargetCenter: Vector3 | null = null;
  private lastReapedCandidateId: number | null = null;
  private lastFireOrigin: Vector3 | null = null;
  private lastFireTarget: Vector3 | null = null;

  update(
    delta: number,
    candidates: PrReaperCircleState[]
  ): PrReaperFireEvent | null {
    const safeDelta = Number.isFinite(delta)
      ? Math.max(0, Math.min(delta, 0.5))
      : 0;
    let fireEvent: PrReaperFireEvent | null = null;
    if (this.state === 'fire') {
      this.laserRemainingTime = Math.max(
        0,
        this.laserRemainingTime - safeDelta
      );
      if (this.laserRemainingTime <= 0) {
        this.state = 'burst';
      }
      return null;
    }
    if (this.state === 'burst') {
      this.recoverRemainingTime = PR_REAPER_RECOVER_SECONDS;
      this.state = 'recover';
    }
    if (this.state === 'recover') {
      this.recoverRemainingTime = Math.max(
        0,
        this.recoverRemainingTime - safeDelta
      );
      this.current = dampPrReaperArmPose(
        this.current,
        getPrReaperParkedPose(),
        safeDelta,
        PR_REAPER_ARM_DAMPING
      );
      this.target = getPrReaperParkedPose();
      this.aimError = computeAngularError(this.current, this.target);
      if (this.recoverRemainingTime > 0) return null;
      this.state = 'idle';
      this.selectedId = null;
    }

    const selected = this.resolveSelected(candidates);
    if (!selected) {
      this.acquire(candidates);
    }
    const targetCandidate = this.resolveSelected(candidates);
    if (!targetCandidate) {
      this.current = dampPrReaperArmPose(
        this.current,
        getPrReaperParkedPose(),
        safeDelta,
        PR_REAPER_ARM_DAMPING
      );
      this.target = getPrReaperParkedPose();
      this.selectedTargetCenter = null;
      this.aimError = computeAngularError(this.current, this.target);
      return null;
    }

    const solution = solvePrReaperArm(
      new Vector3(
        targetCandidate.center.x,
        targetCandidate.center.y,
        targetCandidate.center.z
      )
    );
    if (!solution.reachable) {
      this.release();
      return null;
    }
    this.state = this.state === 'idle' ? 'acquire' : 'track';
    this.target = { yaw: solution.yaw, pitch: solution.pitch };
    this.current = dampPrReaperArmPose(
      this.current,
      this.target,
      safeDelta,
      PR_REAPER_ARM_DAMPING
    );
    this.aimError = computeAngularError(this.current, this.target);
    this.selectedTargetCenter = new Vector3(
      targetCandidate.center.x,
      targetCandidate.center.y,
      targetCandidate.center.z
    );
    if (this.aimError <= PR_REAPER_AIM_TOLERANCE_RADIANS)
      this.holdTime += safeDelta;
    else this.holdTime = 0;
    if (
      this.holdTime >= PR_REAPER_AIM_HOLD_SECONDS &&
      !this.firedIds.has(targetCandidate.id)
    ) {
      this.state = 'fire';
      this.laserRemainingTime = PR_REAPER_LASER_DURATION_SECONDS;
      this.firedIds.add(targetCandidate.id);
      this.lastReapedCandidateId = targetCandidate.id;
      fireEvent = {
        candidateId: targetCandidate.id,
        targetCenter: { ...targetCandidate.center },
      };
    }
    return fireEvent;
  }

  setLastFireEndpoints(origin: Vector3, target: Vector3): void {
    this.lastFireOrigin = origin.clone();
    this.lastFireTarget = target.clone();
  }

  getPose(): PrReaperArmPose {
    return { ...this.current };
  }

  getDebugState(): PrReaperControllerDebugState {
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

  private acquire(candidates: PrReaperCircleState[]): void {
    const candidate = candidates
      .filter((entry) => entry.type === 'red' && entry.lifecycle === 'active')
      .filter(
        (entry) =>
          entry.progress >= PR_REAPER_TARGET_PROGRESS_MIN &&
          entry.progress <= PR_REAPER_TARGET_PROGRESS_MAX
      )
      .filter((entry) => !this.firedIds.has(entry.id))
      .sort((a, b) => b.progress - a.progress || a.id - b.id)[0];
    if (!candidate) {
      this.release();
      return;
    }
    this.selectedId = candidate.id;
    this.state = 'acquire';
  }

  private resolveSelected(
    candidates: PrReaperCircleState[]
  ): PrReaperCircleState | null {
    if (this.selectedId === null) return null;
    const candidate =
      candidates.find((entry) => entry.id === this.selectedId) ?? null;
    if (
      !candidate ||
      candidate.type !== 'red' ||
      candidate.lifecycle !== 'active' ||
      candidate.progress > PR_REAPER_TARGET_PROGRESS_MAX
    ) {
      this.release();
      return null;
    }
    return candidate;
  }

  private release(): void {
    this.selectedId = null;
    this.selectedTargetCenter = null;
    this.holdTime = 0;
    if (this.state !== 'recover') this.state = 'idle';
  }
}

export function createPrReaperReapingController(): PrReaperReapingController {
  return new PrReaperReapingController();
}
