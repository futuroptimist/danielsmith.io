import { describe, expect, it } from 'vitest';

import {
  createFootstepAudioController,
  type FootstepAudioControllerHandle,
  type FootstepPlaybackOptions,
} from '../systems/audio/footstepController';

class StubFootstepPlayer {
  public readonly calls: FootstepPlaybackOptions[] = [];

  play(options: FootstepPlaybackOptions): void {
    this.calls.push(options);
  }
}

describe('footstep audio controller', () => {
  const makeSequenceRandom = (sequence: number[]): (() => number) => {
    let index = 0;
    return () => {
      const value = sequence[index % sequence.length];
      index += 1;
      return value;
    };
  };

  const createController = (
    player: StubFootstepPlayer,
    overrides: Partial<Parameters<typeof createFootstepAudioController>[0]> = {}
  ): FootstepAudioControllerHandle =>
    createFootstepAudioController({
      player,
      maxLinearSpeed: 6,
      minActivationSpeed: 0.5,
      intervalRange: { min: 0.25, max: 0.6 },
      volumeRange: { min: 0.35, max: 0.75 },
      pitchRange: { min: 0.85, max: 1.25 },
      stereoSeparation: 0.28,
      random: makeSequenceRandom([0.1, 0.9, 0.3, 0.7, 0.2, 0.8]),
      ...overrides,
    });

  it('plays alternating stereo hits as the avatar moves', () => {
    const player = new StubFootstepPlayer();
    const controller = createController(player);

    controller.update({ delta: Number.NaN, linearSpeed: 3 });
    controller.update({ delta: 0.4, linearSpeed: 3 });
    controller.update({ delta: 0.4, linearSpeed: 3 });
    controller.update({ delta: 1, linearSpeed: 3 });

    expect(player.calls.length).toBeGreaterThanOrEqual(3);
    for (const call of player.calls) {
      expect(call.volume).toBeGreaterThan(0);
      expect(call.volume).toBeLessThanOrEqual(1);
      expect(call.playbackRate).toBeGreaterThan(0);
      expect(call.playbackRate).toBeLessThanOrEqual(4);
    }
    const pans = player.calls.map((call) => call.pan ?? 0);
    expect(pans[0]).toBeLessThan(0);
    expect(pans[1]).toBeGreaterThan(0);
  });

  it('stops emitting when disabled or airborne', () => {
    const player = new StubFootstepPlayer();
    const controller = createController(player, {
      random: () => 0.5,
    });

    controller.update({ delta: 0.4, linearSpeed: 4 });
    const callsAfterFirst = player.calls.length;
    controller.update({ delta: 0.2, linearSpeed: 4 });

    controller.setEnabled(false);
    controller.update({ delta: 0.6, linearSpeed: 4 });
    expect(player.calls.length).toBe(callsAfterFirst);

    controller.setEnabled(true);
    controller.update({ delta: 0.2, linearSpeed: 4, isGrounded: false });
    controller.update({ delta: 0.4, linearSpeed: 4, isGrounded: true });
    expect(player.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('scales cadence, volume, and pitch with speed and master volume', () => {
    const player = new StubFootstepPlayer();
    const controller = createFootstepAudioController({
      player,
      maxLinearSpeed: 6,
      minActivationSpeed: 0.6,
      intervalRange: { min: 0.25, max: 0.7 },
      volumeRange: { min: 0.3, max: 0.7 },
      pitchRange: { min: 0.8, max: 1.3 },
      stereoSeparation: 0.2,
      random: () => 0.5,
    });

    controller.update({
      delta: 0.35,
      linearSpeed: 1,
      masterVolume: 0.5,
      surfaceMultiplier: 0.5,
    });
    controller.update({
      delta: 0.35,
      linearSpeed: 1,
      masterVolume: 0.5,
      surfaceMultiplier: 0.5,
    });
    controller.update({
      delta: 0.35,
      linearSpeed: 5,
      masterVolume: 1,
      surfaceMultiplier: 1,
    });
    controller.update({
      delta: 0.35,
      linearSpeed: 5,
      masterVolume: 1,
      surfaceMultiplier: 1,
    });

    expect(player.calls.length).toBe(2);
    const [slowStep, fastStep] = player.calls;
    expect(slowStep.volume).toBeCloseTo(0.0824, 3);
    expect(fastStep.volume).toBeCloseTo(0.6259, 3);
    expect(slowStep.playbackRate).toBeCloseTo(0.837, 3);
    expect(fastStep.playbackRate).toBeCloseTo(1.207, 3);
    controller.dispose();
    expect(controller.isEnabled()).toBe(false);
  });
});
