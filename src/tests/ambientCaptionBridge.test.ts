import { describe, expect, it, vi } from 'vitest';

import type {
  AmbientAudioBedDefinition,
  AmbientAudioBedSnapshot,
  AmbientAudioController,
  AmbientAudioSource,
} from '../systems/audio/ambientAudio';
import { AmbientCaptionBridge } from '../systems/audio/ambientCaptionBridge';
import type { AudioSubtitleMessage } from '../ui/hud/audioSubtitles';

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

    let current: AudioSubtitleMessage | null = null;
    const show = vi.fn((message: AudioSubtitleMessage) => {
      current = { ...message };
    });
    const subtitles = {
      show,
      clear: vi.fn(() => {
        current = null;
      }),
      dispose: vi.fn(),
      getCurrent: vi.fn(() => current),
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

describe('AmbientCaptionBridge priority handling', () => {
  it('retries ambient captions when suppressed by a higher-priority message', () => {
    const controller = new FakeController({
      id: 'hum',
      center: { x: 0, z: 0 },
      innerRadius: 1,
      outerRadius: 4,
      baseVolume: 0.4,
      source: fakeSource,
      caption: 'Soft hum fills the room.',
    });

    let current: AudioSubtitleMessage | null = {
      id: 'poi-1',
      source: 'poi',
      text: 'POI narration',
      priority: 2,
    };

    const show = vi.fn((message: AudioSubtitleMessage) => {
      const nextPriority = message.priority ?? 0;
      const currentPriority = current?.priority ?? 0;
      if (
        current &&
        current.id !== message.id &&
        nextPriority < currentPriority
      ) {
        return;
      }
      current = { ...message, priority: nextPriority };
    });

    const subtitles = {
      show,
      clear: vi.fn(() => {
        current = null;
      }),
      dispose: vi.fn(),
      getCurrent: vi.fn(() => current),
    };

    const bridge = new AmbientCaptionBridge({
      controller,
      subtitles,
      cooldownMs: 0,
      now: () => 0,
    });

    controller.setVolume(0.3);
    bridge.update();
    expect(show).toHaveBeenCalledTimes(1);
    expect(current?.id).toBe('poi-1');

    current = null;
    bridge.update();
    expect(show).toHaveBeenCalledTimes(2);
    expect(current?.id).toBe('ambient-hum');
  });

  it('restores ambient captions when a higher-priority message preempts them', () => {
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

    let current: AudioSubtitleMessage | null = null;
    const show = vi.fn((message: AudioSubtitleMessage) => {
      const nextPriority = message.priority ?? 0;
      const currentPriority = current?.priority ?? 0;
      if (
        current &&
        current.id !== message.id &&
        nextPriority < currentPriority
      ) {
        return;
      }
      current = { ...message, priority: nextPriority };
    });

    const subtitles = {
      show,
      clear: vi.fn(() => {
        current = null;
      }),
      dispose: vi.fn(),
      getCurrent: vi.fn(() => current),
    };

    const bridge = new AmbientCaptionBridge({
      controller,
      subtitles,
      cooldownMs: 0,
      now: () => currentTime,
    });

    controller.setVolume(0.3);
    bridge.update();
    expect(show).toHaveBeenCalledTimes(1);
    expect(current?.id).toBe('ambient-hum');

    currentTime += 100;
    current = {
      id: 'poi-1',
      source: 'poi',
      text: 'POI narration',
      priority: 2,
    };

    bridge.update();
    expect(show).toHaveBeenCalledTimes(2);
    expect(current?.id).toBe('poi-1');

    current = null;
    bridge.update();
    expect(show).toHaveBeenCalledTimes(3);
    expect(current?.id).toBe('ambient-hum');
  });
});
