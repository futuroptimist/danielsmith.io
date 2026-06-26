import { describe, expect, it } from 'vitest';

import {
  PR_REAPER_TARGET_PROGRESS_MAX,
  PR_REAPER_TARGET_PROGRESS_MIN,
} from '../scene/structures/prReaperInstallationContract';
import { createPrReaperReapingController } from '../scene/structures/prReaperReapingController';
import type { PrReaperCircleState } from '../scene/structures/prReaperStream';

const candidate = (
  id: number,
  type: 'red' | 'green',
  progress: number
): PrReaperCircleState => ({
  id,
  type,
  lifecycle: 'active',
  normalizedX: 0.5,
  progress,
  center: { x: 0, y: 2.5 - progress, z: 0.018 },
});

describe('PR Reaper reaping controller', () => {
  it('acquires only red targets inside the shooting band', () => {
    const controller = createPrReaperReapingController();
    controller.update({
      delta: 0.016,
      candidates: [candidate(1, 'green', 0.5)],
    });
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
    controller.update({
      delta: 0.016,
      candidates: [candidate(2, 'red', PR_REAPER_TARGET_PROGRESS_MIN - 0.01)],
    });
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
    controller.update({ delta: 0.016, candidates: [candidate(3, 'red', 0.5)] });
    expect(controller.getDebugState().selectedCandidateId).toBe(3);
  });

  it('uses greatest progress then smallest id as deterministic priority', () => {
    const controller = createPrReaperReapingController();
    controller.update({
      delta: 0.016,
      candidates: [
        candidate(4, 'red', 0.4),
        candidate(2, 'red', 0.7),
        candidate(1, 'red', 0.7),
      ],
    });
    expect(controller.getDebugState().selectedCandidateId).toBe(1);
  });

  it('fires after aim hold, enters recover, and prevents duplicate fire', () => {
    const controller = createPrReaperReapingController();
    let fired = false;
    for (let i = 0; i < 40; i += 1) {
      const result = controller.update({
        delta: 0.02,
        candidates: [candidate(8, 'red', 0.5)],
      });
      fired ||= result.fire?.candidateId === 8;
    }
    expect(fired).toBe(true);
    expect(controller.getDebugState().lastReapedCandidateId).toBe(8);
    for (let i = 0; i < 20; i += 1)
      controller.update({
        delta: 0.05,
        candidates: [candidate(8, 'red', 0.5)],
      });
    expect(controller.getDebugState().selectedCandidateId).not.toBe(8);
  });

  it('releases expired, out-of-band, or unreachable targets under large deltas', () => {
    const controller = createPrReaperReapingController();
    controller.update({ delta: 0.016, candidates: [candidate(9, 'red', 0.5)] });
    controller.update({
      delta: 0.016,
      candidates: [candidate(9, 'red', PR_REAPER_TARGET_PROGRESS_MAX + 0.01)],
    });
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
    controller.update({
      delta: 0.016,
      candidates: [candidate(12, 'red', 0.5)],
    });
    controller.update({ delta: 0.016, candidates: [] });
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
    controller.update({
      delta: 1,
      candidates: [candidate(10, 'red', PR_REAPER_TARGET_PROGRESS_MAX + 0.01)],
    });
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
    controller.update({
      delta: 1,
      candidates: [
        { ...candidate(11, 'red', 0.5), center: { x: 99, y: 99, z: 99 } },
      ],
    });
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
  });
});
