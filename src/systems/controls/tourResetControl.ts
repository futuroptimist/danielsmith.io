import type { PoiVisitedListener } from '../../scene/poi/visitedState';
import {
  GuidedTourPreference,
  defaultGuidedTourPreference,
} from '../guidedTour/preference';

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
  guidedTourPreference?: GuidedTourPreference;
  guidedTourDescription?: string;
  guidedTourLabelOn?: string;
  guidedTourLabelOff?: string;
}

export interface TourResetControlHandle {
  readonly element: HTMLElement;
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
  guidedTourPreference = defaultGuidedTourPreference,
  guidedTourDescription = 'Show recommended exhibits when idle.',
  guidedTourLabelOn = 'Guided tour highlights: On',
  guidedTourLabelOff = 'Guided tour highlights: Off',
}: TourResetControlOptions): TourResetControlHandle {
  const wrapper = document.createElement('section');
  wrapper.className = 'guided-tour-control';
  wrapper.dataset.pending = 'false';

  const heading = document.createElement('h2');
  heading.className = 'guided-tour-control__title';
  heading.textContent = 'Guided tour';
  wrapper.appendChild(heading);

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'guided-tour-control__description';
  descriptionParagraph.textContent = guidedTourDescription;
  wrapper.appendChild(descriptionParagraph);

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'guided-tour-control__toggle';
  toggleButton.setAttribute('aria-pressed', 'false');
  toggleButton.dataset.state = 'off';
  wrapper.appendChild(toggleButton);

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'tour-reset';
  resetButton.dataset.state = 'empty';
  resetButton.setAttribute('aria-label', description);
  wrapper.appendChild(resetButton);

  container.appendChild(wrapper);

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
  let guidedTourEnabled = guidedTourPreference.isEnabled();

  const buildToggleAnnouncement = (enabled: boolean) => {
    const stateLabel = enabled ? 'enabled' : 'disabled';
    return `Guided tour highlights ${stateLabel}. Activate to ${
      enabled ? 'disable' : 'enable'
    } recommendations.`;
  };

  const refreshToggle = () => {
    guidedTourEnabled = guidedTourPreference.isEnabled();
    toggleButton.dataset.state = guidedTourEnabled ? 'on' : 'off';
    toggleButton.textContent = guidedTourEnabled
      ? guidedTourLabelOn
      : guidedTourLabelOff;
    toggleButton.setAttribute(
      'aria-pressed',
      guidedTourEnabled ? 'true' : 'false'
    );
    toggleButton.dataset.hudAnnounce =
      buildToggleAnnouncement(guidedTourEnabled);
    toggleButton.title = guidedTourEnabled
      ? 'Disable guided tour highlights'
      : 'Enable guided tour highlights';
    wrapper.dataset.guidedTour = guidedTourEnabled ? 'on' : 'off';
  };

  const buildHudAnnouncement = (message: string, includePrompt: boolean) => {
    if (!includePrompt || !normalizedResetKey) {
      return message;
    }
    return appendClause(message, `Press ${normalizedResetKey} to restart.`);
  };

  const refreshState = () => {
    const hasVisited = visitedCount > 0;
    if (pending) {
      resetButton.disabled = true;
      resetButton.dataset.state = 'pending';
      resetButton.textContent = pendingLabel;
      resetButton.title = idleTitle;
      resetButton.setAttribute(
        'aria-label',
        appendClause(description, 'Resetting the guided tour…')
      );
      resetButton.dataset.hudAnnounce = appendClause(
        description,
        'Resetting the guided tour…'
      );
      wrapper.dataset.pending = 'true';
      return;
    }
    if (!hasVisited) {
      resetButton.disabled = true;
      resetButton.dataset.state = 'empty';
      resetButton.textContent = emptyLabel;
      resetButton.title = emptyDescription;
      resetButton.setAttribute('aria-label', emptyDescription);
      resetButton.dataset.hudAnnounce = emptyDescription;
      wrapper.dataset.pending = 'false';
      return;
    }
    resetButton.disabled = false;
    resetButton.dataset.state = 'ready';
    resetButton.textContent = label;
    resetButton.title = idleTitle;
    resetButton.setAttribute('aria-label', description);
    resetButton.dataset.hudAnnounce = buildHudAnnouncement(description, true);
    wrapper.dataset.pending = 'false';
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

  const handleToggleClick = () => {
    guidedTourPreference.toggle('control');
  };

  const unsubscribePreference = guidedTourPreference.subscribe(() => {
    refreshToggle();
  });

  toggleButton.addEventListener('click', handleToggleClick);
  refreshToggle();

  resetButton.addEventListener('click', handleClick);
  if (resetKey) {
    windowTarget.addEventListener('keydown', handleKeydown);
  }

  const unsubscribeVisited = subscribeVisited((visited) => {
    visitedCount = visited.size;
    refreshState();
  });

  refreshState();

  return {
    element: wrapper,
    dispose() {
      resetButton.removeEventListener('click', handleClick);
      if (resetKey) {
        windowTarget.removeEventListener('keydown', handleKeydown);
      }
      unsubscribeVisited();
      unsubscribePreference();
      toggleButton.removeEventListener('click', handleToggleClick);
      if (wrapper.parentElement) {
        wrapper.remove();
      }
    },
  };
}
