export type AudioSubtitleSource = 'ambient' | 'poi';

export interface AudioSubtitleMessage {
  id?: string;
  text: string;
  source: AudioSubtitleSource;
  /** Higher values override lower priority captions. Defaults to 0. */
  priority?: number;
  /** Duration before auto-hiding in milliseconds. Defaults to 5000 ms. */
  durationMs?: number;
}

export interface AudioSubtitlesHandle {
  show(message: AudioSubtitleMessage): void;
  clear(messageId?: string): void;
  dispose(): void;
  /** Returns the currently visible caption if any. */
  getCurrent(): AudioSubtitleMessage | null;
}

export interface AudioSubtitlesOptions {
  container?: HTMLElement;
  ariaLive?: 'polite' | 'assertive';
  labels?: Partial<Record<AudioSubtitleSource, string>>;
  documentTarget?: Document;
}

const DEFAULT_DURATION_MS = 5000;

interface NormalizedAudioSubtitleMessage extends AudioSubtitleMessage {
  priority: number;
}

const DEFAULT_LABELS: Record<AudioSubtitleSource, string> = {
  ambient: 'Ambient audio',
  poi: 'Narration',
};

export function createAudioSubtitles({
  container = document.body,
  ariaLive = 'polite',
  labels: providedLabels,
  documentTarget = document,
}: AudioSubtitlesOptions = {}): AudioSubtitlesHandle {
  const root = documentTarget.createElement('div');
  root.className = 'audio-subtitles';
  root.setAttribute('role', 'log');
  root.setAttribute('aria-live', ariaLive);
  root.dataset.visible = 'false';

  const label = documentTarget.createElement('div');
  label.className = 'audio-subtitles__label';
  label.setAttribute('aria-hidden', 'true');
  root.appendChild(label);

  const caption = documentTarget.createElement('p');
  caption.className = 'audio-subtitles__caption';
  root.appendChild(caption);

  container.appendChild(root);

  const labels = { ...DEFAULT_LABELS, ...providedLabels };

  const queue: NormalizedAudioSubtitleMessage[] = [];
  let hideTimeout: number | null = null;
  let current: NormalizedAudioSubtitleMessage | null = null;
  let currentToken: symbol | null = null;

  const clearTimer = () => {
    if (hideTimeout !== null) {
      window.clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  };

  const normalizeMessage = (
    message: AudioSubtitleMessage
  ): NormalizedAudioSubtitleMessage => ({
    ...message,
    priority:
      typeof message.priority === 'number' && Number.isFinite(message.priority)
        ? message.priority
        : 0,
  });

  const removeQueuedById = (id: string) => {
    for (let index = queue.length - 1; index >= 0; index -= 1) {
      if (queue[index]?.id === id) {
        queue.splice(index, 1);
      }
    }
  };

  const enqueueMessage = (message: NormalizedAudioSubtitleMessage) => {
    const entry: NormalizedAudioSubtitleMessage = { ...message };
    if (entry.id) {
      removeQueuedById(entry.id);
    }
    const insertIndex = queue.findIndex(
      (queued) => entry.priority > queued.priority
    );
    if (insertIndex === -1) {
      queue.push(entry);
    } else {
      queue.splice(insertIndex, 0, entry);
    }
  };

  const scheduleHide = (
    message: NormalizedAudioSubtitleMessage,
    token: symbol
  ) => {
    clearTimer();
    const duration =
      message.durationMs === undefined
        ? DEFAULT_DURATION_MS
        : message.durationMs;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    hideTimeout = window.setTimeout(() => {
      if (!current || currentToken !== token) {
        return;
      }
      if (message.id && current.id && message.id !== current.id) {
        return;
      }
      if (!message.id && current !== message) {
        return;
      }
      hideCurrent(true);
    }, duration);
  };

  const showNextQueued = (): boolean => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        continue;
      }
      display(next);
      return true;
    }
    return false;
  };

  const hideCurrent = (advance: boolean) => {
    clearTimer();
    current = null;
    currentToken = null;
    root.dataset.visible = 'false';
    caption.textContent = '';
    if (advance) {
      void showNextQueued();
    }
  };

  const display = (message: NormalizedAudioSubtitleMessage) => {
    current = message;
    currentToken = Symbol('audio-subtitle');
    root.dataset.visible = 'true';
    label.textContent =
      labels[message.source] ?? DEFAULT_LABELS[message.source];
    caption.textContent = message.text;
    scheduleHide(message, currentToken);
  };

  const show = (message: AudioSubtitleMessage) => {
    const normalized = normalizeMessage(message);

    if (!current) {
      display(normalized);
      return;
    }

    const currentId = current.id;
    const incomingId = normalized.id;
    const sameId =
      currentId !== undefined && incomingId !== undefined
        ? currentId === incomingId
        : false;

    if (sameId) {
      display(normalized);
      return;
    }

    if (normalized.priority >= current.priority) {
      enqueueMessage(current);
      display(normalized);
      return;
    }

    enqueueMessage(normalized);
  };

  return {
    show(message) {
      show(message);
    },
    clear(messageId) {
      if (messageId === undefined) {
        queue.length = 0;
        if (!current) {
          return;
        }
        hideCurrent(false);
        return;
      }
      removeQueuedById(messageId);
      if (current?.id === messageId) {
        hideCurrent(true);
      }
    },
    dispose() {
      queue.length = 0;
      if (current) {
        hideCurrent(false);
      } else {
        clearTimer();
      }
      root.remove();
    },
    getCurrent() {
      return current;
    },
  };
}
