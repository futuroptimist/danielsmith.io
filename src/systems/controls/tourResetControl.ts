import type { PoiVisitedListener } from '../../scene/poi/visitedState';

export interface TourResetControlOptions {
  container: HTMLElement;
  /**
   * Subscribes to visited POI updates. The listener should receive an initial
   * snapshot immediately. Returns an unsubscribe function.
   */
  subscribeVisited: (listener: PoiVisitedListener) => () => void;
  /**
   * Invoked when the control activates. May return a promise when reset work
   * performs asynchronous tasks.
   */
  onReset: () => void | Promise<void>;
  windowTarget?: Window;
  /** Single-character shortcut hint. */
  resetKey?: string;
  label?: string;
  description?: string;
  emptyLabel?: string;
  emptyDescription?: string;
  pendingLabel?: string;
}

export interface TourResetControlHandle {
  readonly element: HTMLButtonElement;
  dispose(): void;
}

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

const appendClause = (base: string, clause: string): string => {
  const trimmedBase = base.trim();
  const trimmedClause = clause.trim();
  if (!trimmedClause) {
    return trimmedBase;
  }
  if (!trimmedBase) {
    return trimmedClause;
  }
  const separator = /[.!?]\s*$/.test(trimmedBase) ? ' ' : '. ';
  return `${trimmedBase}${separator}${trimmedClause}`;
};

export function createTourResetControl({
  container,
  subscribeVisited,
  onReset,
  windowTarget = window,
  resetKey = 'g',
  label = 'Restart guided tour',
  description = 'Clear visited POIs and replay the curated path.',
  emptyLabel = 'Guided tour ready',
  emptyDescription = 'Explore exhibits to unlock the guided tour reset.',
  pendingLabel = 'Resetting tour…',
}: TourResetControlOptions): TourResetControlHandle {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tour-reset';
  button.dataset.state = 'empty';
  button.setAttribute('aria-label', description);
  container.appendChild(button);

  const normalizeKey = (value: string | undefined) => {
    if (!value) {
      return '';
    }
    return value.length === 1 ? value.toUpperCase() : value;
  };

  const normalizedResetKey = normalizeKey(resetKey);

  const idleTitle = normalizedResetKey
    ? `${label} (${normalizedResetKey})`
    : label;

  let visitedCount = 0;
  let pending = false;

  const buildHudAnnouncement = (message: string, includePrompt: boolean) => {
    if (!includePrompt || !normalizedResetKey) {
      return message;
    }
    return appendClause(message, `Press ${normalizedResetKey} to restart.`);
  };

  const refreshState = () => {
    const hasVisited = visitedCount > 0;
    if (pending) {
      button.disabled = true;
      button.dataset.state = 'pending';
      button.textContent = pendingLabel;
      button.title = idleTitle;
      button.setAttribute(
        'aria-label',
        appendClause(description, 'Resetting the guided tour…')
      );
      button.dataset.hudAnnounce = appendClause(
        description,
        'Resetting the guided tour…'
      );
      return;
    }
    if (!hasVisited) {
      button.disabled = true;
      button.dataset.state = 'empty';
      button.textContent = emptyLabel;
      button.title = emptyDescription;
      button.setAttribute('aria-label', emptyDescription);
      button.dataset.hudAnnounce = emptyDescription;
      return;
    }
    button.disabled = false;
    button.dataset.state = 'ready';
    button.textContent = label;
    button.title = idleTitle;
    button.setAttribute('aria-label', description);
    button.dataset.hudAnnounce = buildHudAnnouncement(description, true);
  };

  const finalizeReset = () => {
    pending = false;
    refreshState();
  };

  const activate = () => {
    if (pending || visitedCount === 0) {
      return;
    }
    pending = true;
    refreshState();
    try {
      const result = onReset();
      if (isPromiseLike(result)) {
        result
          .catch((error) => {
            console.warn('Failed to reset guided tour state:', error);
          })
          .finally(() => {
            finalizeReset();
          });
      } else {
        finalizeReset();
      }
    } catch (error) {
      console.warn('Failed to reset guided tour state:', error);
      finalizeReset();
    }
  };

  const handleClick = () => {
    activate();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!resetKey) {
      return;
    }
    const matchesKey =
      event.key === resetKey || event.key === resetKey.toUpperCase();
    if (!matchesKey) {
      return;
    }
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    if (pending || visitedCount === 0) {
      return;
    }
    event.preventDefault();
    activate();
  };

  button.addEventListener('click', handleClick);
  if (resetKey) {
    windowTarget.addEventListener('keydown', handleKeydown);
  }

  const unsubscribeVisited = subscribeVisited((visited) => {
    visitedCount = visited.size;
    refreshState();
  });

  refreshState();

  return {
    element: button,
    dispose() {
      button.removeEventListener('click', handleClick);
      if (resetKey) {
        windowTarget.removeEventListener('keydown', handleKeydown);
      }
      unsubscribeVisited();
      if (button.parentElement) {
        button.remove();
      }
    },
  };
}
