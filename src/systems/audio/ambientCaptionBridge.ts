import type { AudioSubtitlesHandle } from '../../ui/hud/audioSubtitles';

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
  /**
   * Tracks whether the caption should bypass the cooldown because it was
   * previously audible but got pre-empted by a higher-priority message.
   */
  pendingImmediateReshow: boolean;
}

const DEFAULT_COOLDOWN_MS = 8000;

const DEFAULT_THRESHOLD = 0.18;

const DEFAULT_CAPTION_PRIORITY = 1;

const resolveCaptionPriority = (value: number | undefined): number => {
  if (typeof value !== 'number') {
    return DEFAULT_CAPTION_PRIORITY;
  }
  if (!Number.isFinite(value)) {
    return DEFAULT_CAPTION_PRIORITY;
  }
  return value;
};

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
    const state =
      this.states.get(snapshot.id) ??
      ({
        audible: false,
        lastShownAt: null,
        pendingImmediateReshow: false,
      } satisfies AmbientCaptionState);
    const messageId = `ambient-${snapshot.id}`;
    const currentMessage = this.subtitles.getCurrent();
    const hasFocus = currentMessage?.id === messageId;
    const otherMessageActive =
      !!currentMessage && currentMessage.id !== messageId;

    const wasAudible = state.audible;

    if (!hasFocus) {
      state.audible = false;
    }

    if (!isAudible) {
      state.audible = false;
      state.pendingImmediateReshow = false;
      this.states.set(snapshot.id, state);
      return;
    }

    if (wasAudible && otherMessageActive) {
      state.pendingImmediateReshow = true;
    }

    if (isAudible && !state.audible) {
      const lastShownAt = state.lastShownAt ?? -Infinity;
      const elapsed = currentTime - lastShownAt;
      const bypassCooldown = state.pendingImmediateReshow;
      if (bypassCooldown || elapsed >= this.cooldownMs) {
        this.subtitles.show({
          id: messageId,
          text: caption,
          source: 'ambient',
          priority: resolveCaptionPriority(definition.captionPriority),
        });

        const updatedMessage = this.subtitles.getCurrent();
        const gainedFocus = updatedMessage?.id === messageId;

        if (gainedFocus) {
          state.lastShownAt = currentTime;
          state.audible = true;
          state.pendingImmediateReshow = false;
          this.states.set(snapshot.id, state);
          return;
        }

        if (updatedMessage && updatedMessage.id !== messageId) {
          state.pendingImmediateReshow = true;
        }

        state.audible = false;
        this.states.set(snapshot.id, state);
        return;
      }
    }

    const refreshedMessage = this.subtitles.getCurrent();
    const hasUpdatedFocus = refreshedMessage?.id === messageId;
    state.audible = isAudible && hasUpdatedFocus;
    if (state.audible) {
      state.pendingImmediateReshow = false;
    } else if (otherMessageActive) {
      state.pendingImmediateReshow = true;
    }
    this.states.set(snapshot.id, state);
  }
}
