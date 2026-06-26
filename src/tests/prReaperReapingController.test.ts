import { describe, expect, it } from 'vitest';

import {
  PR_REAPER_AIM_HOLD_SECONDS,
  PR_REAPER_STREAM_Z,
} from '../scene/structures/prReaperInstallationContract';
import { PrReaperReapingController } from '../scene/structures/prReaperReapingController';
import type { PrReaperCircleState } from '../scene/structures/prReaperStream';

const candidate = (
  id: number,
  type: 'red' | 'green',
  progress: number,
  x = 0
): PrReaperCircleState => ({
  id,
  type,
  lifecycle: 'active',
  normalizedX: 0.5,
  progress,
  center: { x, y: 1.4, z: PR_REAPER_STREAM_Z },
});

describe('PR Reaper reaping controller', () => {
  it('acquires red candidates only and honors deterministic priority', () => {
    const controller = new PrReaperReapingController();
    controller.update({
      delta: 0.016,
      candidates: [
        candidate(1, 'green', 0.8),
        candidate(3, 'red', 0.4),
        candidate(2, 'red', 0.8),
      ],
    });
    expect(controller.getDebugState().selectedCandidateId).toBe(2);
  });

  it('enforces the shooting band and aim hold before fire/recover', () => {
    const controller = new PrReaperReapingController();
    expect(
      controller.update({ delta: 0.1, candidates: [candidate(1, 'red', 0.05)] })
        .fire
    ).toBeNull();
    let fire = null;
    for (let i = 0; i < 20 && !fire; i += 1) {
      fire = controller.update({
        delta: PR_REAPER_AIM_HOLD_SECONDS,
        candidates: [candidate(1, 'red', 0.5)],
      }).fire;
    }
    expect(fire?.candidateId).toBe(1);
    expect(controller.getDebugState().state).toBe('fire');
    controller.update({ delta: 1, candidates: [] });
    expect(['recover', 'idle', 'acquire']).toContain(
      controller.getDebugState().state
    );
  });

  it('does not duplicate fire and releases expired or unreachable targets', () => {
    const controller = new PrReaperReapingController();
    for (let i = 0; i < 20; i += 1)
      controller.update({
        delta: 0.05,
        candidates: [candidate(5, 'red', 0.5)],
      });
    controller.update({ delta: 1, candidates: [] });
    expect(
      controller.update({ delta: 0.1, candidates: [candidate(5, 'red', 0.5)] })
        .fire
    ).toBeNull();
    const unreachable = candidate(9, 'red', 0.5, 999);
    controller.update({ delta: 0.1, candidates: [unreachable] });
    expect(controller.getDebugState().selectedCandidateId).not.toBe(9);
  });
});
