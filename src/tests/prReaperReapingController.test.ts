import { describe, expect, it } from 'vitest';

import {
  PR_REAPER_AIM_HOLD_SECONDS,
  PR_REAPER_TARGET_PROGRESS_MIN,
} from '../scene/structures/prReaperInstallationContract';
import { PrReaperReapingController } from '../scene/structures/prReaperReapingController';
import type { PrReaperCircleState } from '../scene/structures/prReaperStream';

function candidate(
  id: number,
  type: 'red' | 'green',
  progress: number,
  x = 0
): PrReaperCircleState {
  return {
    id,
    type,
    lifecycle: 'active',
    normalizedX: 0.5,
    progress,
    center: { x, y: 3, z: 0.018 },
  };
}

describe('PR Reaper reaping controller', () => {
  it('acquires red candidates only and enforces the shooting band', () => {
    const controller = new PrReaperReapingController();
    controller.update({
      delta: 0.1,
      candidates: [
        candidate(1, 'green', 0.5),
        candidate(2, 'red', PR_REAPER_TARGET_PROGRESS_MIN - 0.01),
      ],
    });
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
    controller.update({
      delta: 0.1,
      candidates: [candidate(3, 'green', 0.6), candidate(4, 'red', 0.5)],
    });
    expect(controller.getDebugState().selectedCandidateId).toBe(4);
  });

  it('uses deterministic priority by greatest progress then id', () => {
    const controller = new PrReaperReapingController();
    controller.update({
      delta: 0.1,
      candidates: [
        candidate(5, 'red', 0.4),
        candidate(2, 'red', 0.7),
        candidate(1, 'red', 0.7),
      ],
    });
    expect(controller.getDebugState().selectedCandidateId).toBe(1);
  });

  it('holds aim before fire and prevents duplicate fire', () => {
    const controller = new PrReaperReapingController();
    const candidates = [candidate(9, 'red', 0.5)];
    let fire = null;
    for (let i = 0; i < 20 && !fire; i += 1)
      fire = controller.update({
        delta: PR_REAPER_AIM_HOLD_SECONDS,
        candidates,
      });
    expect(fire?.candidateId).toBe(9);
    expect(controller.update({ delta: 1, candidates })).toBeNull();
  });

  it('releases expired or unreachable targets and remains stable for large deltas', () => {
    const controller = new PrReaperReapingController();
    controller.update({ delta: 0.1, candidates: [candidate(7, 'red', 0.5)] });
    controller.update({ delta: 99, candidates: [] });
    expect(['idle', 'acquire']).toContain(controller.getDebugState().state);
    controller.update({
      delta: 99,
      candidates: [candidate(8, 'red', 0.5, 100)],
    });
    expect(controller.getDebugState().selectedCandidateId).not.toBe(8);
  });
});
