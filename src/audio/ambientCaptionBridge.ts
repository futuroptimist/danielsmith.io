import type { AudioSubtitlesHandle } from '../hud/audioSubtitles';

import type {
  AmbientAudioBedSnapshot,
  AmbientAudioController,
} from './ambientAudio';

export interface AmbientCaptionBridgeOptions {
  controller: AmbientAudioController;
  subtitles: AudioSubtitlesHandle;
  cooldownMs?: number;
  now?: () => number;
}

interface AmbientCaptionState {
  audible: boolean;
  lastShownAt: number | null;
}

const DEFAULT_COOLDOWN_MS = 8000;

const DEFAULT_THRESHOLD = 0.18;

export class AmbientCaptionBridge {
  private readonly controller: AmbientAudioController;

  private readonly subtitles: AudioSubtitlesHandle;

  private readonly cooldownMs: number;

  private readonly now: () => number;

  private readonly states = new Map<string, AmbientCaptionState>();

  constructor({
    controller,
    subtitles,
    cooldownMs = DEFAULT_COOLDOWN_MS,
    now = () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now(),
  }: AmbientCaptionBridgeOptions) {
    this.controller = controller;
    this.subtitles = subtitles;
    this.cooldownMs = Math.max(0, cooldownMs);
    this.now = now;
  }

  update(): void {
    const snapshots = this.controller.getBedSnapshots();
    const snapshotIds = new Set<string>();
    const currentTime = this.now();

    for (const snapshot of snapshots) {
      snapshotIds.add(snapshot.id);
      this.processSnapshot(snapshot, currentTime);
    }

    for (const id of Array.from(this.states.keys())) {
      if (!snapshotIds.has(id)) {
        this.states.delete(id);
      }
    }
  }

  private processSnapshot(
    snapshot: AmbientAudioBedSnapshot,
    currentTime: number
  ): void {
    const { definition, currentVolume } = snapshot;
    const caption = definition.caption;
    if (!caption) {
      this.states.delete(snapshot.id);
      return;
    }

    const threshold = definition.captionThreshold ?? DEFAULT_THRESHOLD;
    const isAudible = currentVolume >= threshold;
    const state = this.states.get(snapshot.id) ?? {
      audible: false,
      lastShownAt: null,
    };
    const messageId = `ambient-${snapshot.id}`;
    const currentMessage = this.subtitles.getCurrent();
    const hasFocus = currentMessage?.id === messageId;

    if (!hasFocus) {
      state.audible = false;
    }

    if (isAudible && !state.audible) {
      const lastShownAt = state.lastShownAt ?? -Infinity;
      if (currentTime - lastShownAt >= this.cooldownMs) {
        this.subtitles.show({
          id: messageId,
          text: caption,
          source: 'ambient',
          priority: 1,
        });

        if (this.subtitles.getCurrent()?.id === messageId) {
          state.lastShownAt = currentTime;
          state.audible = true;
          this.states.set(snapshot.id, state);
          return;
        }
      }
    }

    state.audible = isAudible && this.subtitles.getCurrent()?.id === messageId;
    this.states.set(snapshot.id, state);
  }
}
