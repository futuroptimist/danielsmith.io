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

export interface AudioSubtitlesState {
  current: AudioSubtitleMessage | null;
  currentText: string | null;
  queueLength: number;
  visible: boolean;
  dismissCount: number;
  lastDismissedAt: number | null;
}

export interface AudioSubtitlesHandle {
  show(message: AudioSubtitleMessage): void;
  clear(messageId?: string): void;
  dismissAll(): void;
  dispose(): void;
  /** Returns the currently visible caption if any. */
  getCurrent(): AudioSubtitleMessage | null;
  getState(): AudioSubtitlesState;
}

export interface AudioSubtitlesOptions {
  container?: HTMLElement;
  ariaLive?: 'polite' | 'assertive';
  labels?: Partial<Record<AudioSubtitleSource, string>>;
  dismissLabels?: Partial<Record<AudioSubtitleSource, string>>;
  documentTarget?: Document;
  /**
   * Messages at or above this priority temporarily upgrade the live region to
   * assertive so screen readers announce critical narration immediately.
   * Defaults to 5 to match POI narration priority levels.
   */
  assertivePriorityThreshold?: number;
}

const DEFAULT_DURATION_MS = 5000;

const DEFAULT_ASSERTIVE_PRIORITY_THRESHOLD = 5;

const ZERO_WIDTH_SPACE = '\u200b';
const ZERO_WIDTH_NON_JOINER = '\u200c';

interface NormalizedAudioSubtitleMessage extends AudioSubtitleMessage {
  priority: number;
}

const DEFAULT_LABELS: Record<AudioSubtitleSource, string> = {
  ambient: 'Ambient audio',
  poi: 'Narration',
};

const DEFAULT_DISMISS_LABELS: Record<AudioSubtitleSource, string> = {
  ambient: 'Dismiss caption',
  poi: 'Dismiss narration',
};

export function createAudioSubtitles({
  container = document.body,
  ariaLive = 'polite',
  labels: providedLabels,
  dismissLabels: providedDismissLabels,
  documentTarget = document,
  assertivePriorityThreshold,
}: AudioSubtitlesOptions = {}): AudioSubtitlesHandle {
  const root = documentTarget.createElement('div');
  root.className = 'audio-subtitles';
  root.setAttribute('role', 'log');
  root.dataset.visible = 'false';

  const label = documentTarget.createElement('div');
  label.className = 'audio-subtitles__label';
  label.setAttribute('aria-hidden', 'true');
  root.appendChild(label);

  const header = documentTarget.createElement('div');
  header.className = 'audio-subtitles__header';

  const caption = documentTarget.createElement('p');
  caption.className = 'audio-subtitles__caption';

  const captionText = documentTarget.createElement('span');
  captionText.className = 'audio-subtitles__text';
  caption.appendChild(captionText);

  const captionSequence = documentTarget.createElement('span');
  captionSequence.className = 'audio-subtitles__sequence';
  captionSequence.setAttribute('aria-hidden', 'true');
  caption.appendChild(captionSequence);

  const dismissButton = documentTarget.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'audio-subtitles__dismiss';
  dismissButton.textContent = '×';

  header.append(label, dismissButton);
  root.append(header, caption);

  container.appendChild(root);

  const labels = { ...DEFAULT_LABELS, ...providedLabels };
  const dismissLabels = {
    ...DEFAULT_DISMISS_LABELS,
    ...providedDismissLabels,
  };

  const queue: NormalizedAudioSubtitleMessage[] = [];
  let hideTimeout: number | null = null;
  let current: NormalizedAudioSubtitleMessage | null = null;
  let currentToken: symbol | null = null;
  let announcementSequence = 0;
  let dismissCount = 0;
  let lastDismissedAt: number | null = null;

  const baseAriaLive = ariaLive;
  const resolvedAssertiveThreshold = resolveAssertivePriorityThreshold(
    assertivePriorityThreshold
  );

  const applyAriaLive = (value: 'polite' | 'assertive') => {
    if (root.getAttribute('aria-live') === value) {
      return;
    }
    root.setAttribute('aria-live', value);
  };

  applyAriaLive(baseAriaLive);

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
    applyAriaLive(baseAriaLive);
    captionText.textContent = '';
    captionSequence.textContent = '';
    dismissButton.setAttribute('aria-label', DEFAULT_DISMISS_LABELS.poi);
    dismissButton.title = DEFAULT_DISMISS_LABELS.poi;
    if (advance) {
      void showNextQueued();
    }
  };

  const display = (message: NormalizedAudioSubtitleMessage) => {
    current = message;
    currentToken = Symbol('audio-subtitle');
    root.dataset.visible = 'true';
    if (message.priority >= resolvedAssertiveThreshold) {
      applyAriaLive('assertive');
    } else {
      applyAriaLive(baseAriaLive);
    }
    label.textContent =
      labels[message.source] ?? DEFAULT_LABELS[message.source];
    const dismissLabel =
      dismissLabels[message.source] ?? DEFAULT_DISMISS_LABELS[message.source];
    dismissButton.setAttribute('aria-label', dismissLabel);
    dismissButton.title = dismissLabel;
    captionText.textContent = '';
    captionText.textContent = message.text;
    announcementSequence += 1;
    root.dataset.announcementSeq = `${announcementSequence}`;
    captionSequence.textContent =
      announcementSequence % 2 === 0 ? ZERO_WIDTH_SPACE : ZERO_WIDTH_NON_JOINER;
    scheduleHide(message, currentToken);
  };

  const dismissAll = () => {
    dismissCount += 1;
    lastDismissedAt = Date.now();
    queue.length = 0;
    if (current) {
      hideCurrent(false);
      return;
    }
    clearTimer();
    root.dataset.visible = 'false';
  };

  dismissButton.addEventListener('click', dismissAll);

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
    dismissAll() {
      dismissAll();
    },
    dispose() {
      queue.length = 0;
      if (current) {
        hideCurrent(false);
      } else {
        clearTimer();
      }
      dismissButton.removeEventListener('click', dismissAll);
      root.remove();
    },
    getCurrent() {
      return current;
    },
    getState() {
      return {
        current,
        currentText: current?.text ?? null,
        queueLength: queue.length,
        visible: root.dataset.visible === 'true',
        dismissCount,
        lastDismissedAt,
      };
    },
  };
}

function resolveAssertivePriorityThreshold(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_ASSERTIVE_PRIORITY_THRESHOLD;
  }
  return value;
}
