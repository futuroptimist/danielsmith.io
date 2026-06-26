import { describe, expect, it } from 'vitest';

import { createPrReaperReapingController } from '../scene/structures/prReaperReapingController';
import type { PrReaperCircleState } from '../scene/structures/prReaperStream';

function candidate(
  id: number,
  type: 'red' | 'green',
  progress: number
): PrReaperCircleState {
  return {
    id,
    type,
    lifecycle: 'active',
    normalizedX: 0.5,
    progress,
    center: { x: 0, y: 2, z: 0.018 },
  };
}

function tickUntilFire(candidates: PrReaperCircleState[], limit = 80) {
  const controller = createPrReaperReapingController();
  let event = null;
  for (let i = 0; i < limit && !event; i += 1)
    event = controller.update(0.05, candidates);
  return { controller, event };
}

describe('PR Reaper reaping controller', () => {
  it('acquires red candidates only and ignores greens', () => {
    const controller = createPrReaperReapingController();
    controller.update(0.05, [candidate(1, 'green', 0.5)]);
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
    controller.update(0.05, [
      candidate(2, 'red', 0.5),
      candidate(1, 'green', 0.8),
    ]);
    expect(controller.getDebugState().selectedCandidateId).toBe(2);
  });

  it('uses deterministic priority and shooting band enforcement', () => {
    const controller = createPrReaperReapingController();
    controller.update(0.05, [
      candidate(1, 'red', 0.05),
      candidate(3, 'red', 0.4),
      candidate(2, 'red', 0.4),
    ]);
    expect(controller.getDebugState().selectedCandidateId).toBe(2);
  });

  it('holds aim before fire and then enters recover without duplicate firing', () => {
    const red = candidate(7, 'red', 0.5);
    const { controller, event } = tickUntilFire([red]);
    expect(event?.candidateId).toBe(7);
    expect(controller.update(0.05, [red])).toBeNull();
    for (let i = 0; i < 10; i += 1) controller.update(0.05, []);
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
  });

  it('releases expired or unreachable targets and remains stable under large deltas', () => {
    const controller = createPrReaperReapingController();
    controller.update(0.05, [candidate(1, 'red', 0.5)]);
    controller.update(10, []);
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
    controller.update(10, [
      { ...candidate(2, 'red', 0.5), center: { x: 99, y: 99, z: 0 } },
    ]);
    expect(controller.getDebugState().selectedCandidateId).toBeNull();
  });
});
