import { describe, expect, it, vi } from 'vitest';

import type {
  AmbientAudioBedDefinition,
  AmbientAudioBedSnapshot,
  AmbientAudioController,
  AmbientAudioSource,
} from '../audio/ambientAudio';
import { AmbientCaptionBridge } from '../audio/ambientCaptionBridge';

class FakeController implements AmbientAudioController {
  private snapshot: AmbientAudioBedSnapshot;

  constructor(definition: AmbientAudioBedDefinition) {
    this.snapshot = {
      id: definition.id,
      currentVolume: 0,
      targetVolume: 0,
      definition,
    };
  }

  setVolume(volume: number) {
    this.snapshot = {
      ...this.snapshot,
      currentVolume: volume,
      targetVolume: volume,
    };
  }

  enable = vi.fn(async () => {});
  disable = vi.fn(() => {});
  dispose = vi.fn(() => {});
  isEnabled = vi.fn(() => true);
  update = vi.fn(() => {});
  setMasterVolume = vi.fn(() => {});
  getMasterVolume = vi.fn(() => 1);

  getBedSnapshots(): AmbientAudioBedSnapshot[] {
    return [this.snapshot];
  }
}

const fakeSource: AmbientAudioSource = {
  id: 'test',
  isPlaying: false,
  play: () => {},
  stop: () => {},
  setVolume: () => {},
};

describe('AmbientCaptionBridge', () => {
  it('emits captions when beds cross the audible threshold and respects cooldowns', () => {
    let currentTime = 0;
    const controller = new FakeController({
      id: 'hum',
      center: { x: 0, z: 0 },
      innerRadius: 1,
      outerRadius: 4,
      baseVolume: 0.4,
      source: fakeSource,
      caption: 'Soft hum fills the room.',
    });

    const show = vi.fn();
    const subtitles = {
      show,
      clear: vi.fn(),
      dispose: vi.fn(),
      getCurrent: vi.fn(() => null),
    };

    const bridge = new AmbientCaptionBridge({
      controller,
      subtitles,
      cooldownMs: 1000,
      now: () => currentTime,
    });

    bridge.update();
    expect(show).not.toHaveBeenCalled();

    controller.setVolume(0.3);
    bridge.update();
    expect(show).toHaveBeenCalledTimes(1);

    bridge.update();
    expect(show).toHaveBeenCalledTimes(1);

    controller.setVolume(0);
    currentTime += 500;
    bridge.update();

    controller.setVolume(0.3);
    bridge.update();
    expect(show).toHaveBeenCalledTimes(1);

    currentTime += 600;
    controller.setVolume(0);
    bridge.update();

    controller.setVolume(0.3);
    bridge.update();
    expect(show).toHaveBeenCalledTimes(2);
  });
});
