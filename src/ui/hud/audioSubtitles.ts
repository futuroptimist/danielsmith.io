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

  let hideTimeout: number | null = null;
  let current: AudioSubtitleMessage | null = null;

  const clearTimer = () => {
    if (hideTimeout !== null) {
      window.clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  };

  const hide = () => {
    clearTimer();
    current = null;
    root.dataset.visible = 'false';
    caption.textContent = '';
  };

  const scheduleHide = (message: AudioSubtitleMessage) => {
    clearTimer();
    const duration =
      message.durationMs === undefined
        ? DEFAULT_DURATION_MS
        : message.durationMs;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    hideTimeout = window.setTimeout(() => {
      if (!current) {
        return;
      }
      if (message.id && current.id && message.id !== current.id) {
        return;
      }
      if (!message.id && current !== message) {
        return;
      }
      hide();
    }, duration);
  };

  const show = (message: AudioSubtitleMessage) => {
    const nextPriority = message.priority ?? 0;
    const currentPriority = current?.priority ?? 0;
    const sameId =
      current?.id !== undefined && message.id !== undefined
        ? current.id === message.id
        : false;

    if (current && !sameId && nextPriority < currentPriority) {
      return;
    }

    current = { ...message, priority: nextPriority };
    root.dataset.visible = 'true';
    label.textContent =
      labels[message.source] ?? DEFAULT_LABELS[message.source];
    caption.textContent = message.text;
    scheduleHide(current);
  };

  return {
    show(message) {
      show(message);
    },
    clear(messageId) {
      if (!current) {
        return;
      }
      if (messageId && current.id && messageId !== current.id) {
        return;
      }
      hide();
    },
    dispose() {
      hide();
      root.remove();
    },
    getCurrent() {
      return current;
    },
  };
}
