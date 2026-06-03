import { formatMessage, getTourResetControlStrings } from '../../assets/i18n';
import type { TourResetControlStrings } from '../../assets/i18n';
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
  strings?: TourResetControlStrings;
  /** @deprecated Pass strings.resetKey instead. */
  resetKey?: string;
  /** @deprecated Pass strings.label instead. */
  label?: string;
  /** @deprecated Pass strings.description instead. */
  description?: string;
  /** @deprecated Pass strings.emptyLabel instead. */
  emptyLabel?: string;
  /** @deprecated Pass strings.emptyDescription instead. */
  emptyDescription?: string;
  /** @deprecated Pass strings.pendingLabel instead. */
  pendingLabel?: string;
  /** @deprecated Pass strings.guidedTourDescription instead. */
  guidedTourDescription?: string;
  /** @deprecated Pass strings.guidedTourLabelOn instead. */
  guidedTourLabelOn?: string;
  /** @deprecated Pass strings.guidedTourLabelOff instead. */
  guidedTourLabelOff?: string;
  guidedTourPreference?: GuidedTourPreference;
}

export interface TourResetControlHandle {
  readonly element: HTMLElement;
  setStrings(strings: TourResetControlStrings): void;
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
  strings: providedStrings,
  resetKey,
  label,
  description,
  emptyLabel,
  emptyDescription,
  pendingLabel,
  guidedTourDescription,
  guidedTourLabelOn,
  guidedTourLabelOff,
  guidedTourPreference = defaultGuidedTourPreference,
}: TourResetControlOptions): TourResetControlHandle {
  const defaultStrings = getTourResetControlStrings();
  const deprecatedStringOverrides: Partial<TourResetControlStrings> = {
    ...(resetKey ? { resetKey } : {}),
    ...(label ? { label } : {}),
    ...(description ? { description } : {}),
    ...(emptyLabel ? { emptyLabel } : {}),
    ...(emptyDescription ? { emptyDescription } : {}),
    ...(pendingLabel ? { pendingLabel } : {}),
    ...(guidedTourDescription ? { guidedTourDescription } : {}),
    ...(guidedTourLabelOn ? { guidedTourLabelOn } : {}),
    ...(guidedTourLabelOff ? { guidedTourLabelOff } : {}),
  };
  let strings: TourResetControlStrings = {
    ...defaultStrings,
    ...providedStrings,
    ...deprecatedStringOverrides,
  };
  const wrapper = document.createElement('section');
  wrapper.className = 'guided-tour-control';
  wrapper.dataset.pending = 'false';
  wrapper.setAttribute('aria-busy', 'false');

  const heading = document.createElement('h2');
  heading.className = 'guided-tour-control__title';
  heading.textContent = strings.heading;
  wrapper.appendChild(heading);

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'guided-tour-control__description';
  descriptionParagraph.textContent = strings.guidedTourDescription;
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
  resetButton.setAttribute('aria-label', strings.description);
  resetButton.setAttribute('aria-busy', 'false');
  wrapper.appendChild(resetButton);

  container.appendChild(wrapper);

  const normalizeKey = (value: string | undefined) => {
    if (!value) {
      return '';
    }
    return value.length === 1 ? value.toUpperCase() : value;
  };

  let normalizedResetKey = normalizeKey(strings.resetKey);

  const getIdleTitle = () =>
    normalizedResetKey
      ? `${strings.label} (${normalizedResetKey})`
      : strings.label;

  let visitedCount = 0;
  let pending = false;
  let guidedTourEnabled = guidedTourPreference.isEnabled();

  const buildToggleAnnouncement = (enabled: boolean) =>
    enabled ? strings.toggleAnnouncementOn : strings.toggleAnnouncementOff;

  const refreshToggle = () => {
    guidedTourEnabled = guidedTourPreference.isEnabled();
    toggleButton.dataset.state = guidedTourEnabled ? 'on' : 'off';
    toggleButton.textContent = guidedTourEnabled
      ? strings.guidedTourLabelOn
      : strings.guidedTourLabelOff;
    toggleButton.setAttribute(
      'aria-pressed',
      guidedTourEnabled ? 'true' : 'false'
    );
    toggleButton.dataset.hudAnnounce =
      buildToggleAnnouncement(guidedTourEnabled);
    toggleButton.title = guidedTourEnabled
      ? strings.toggleTitleOn
      : strings.toggleTitleOff;
    wrapper.dataset.guidedTour = guidedTourEnabled ? 'on' : 'off';
  };

  const buildHudAnnouncement = (message: string, includePrompt: boolean) => {
    if (!includePrompt || !normalizedResetKey) {
      return message;
    }
    return appendClause(
      message,
      formatMessage(strings.restartPromptTemplate, { key: normalizedResetKey })
    );
  };

  const refreshState = () => {
    const hasVisited = visitedCount > 0;
    if (pending) {
      resetButton.disabled = true;
      resetButton.dataset.state = 'pending';
      resetButton.textContent = strings.pendingLabel;
      resetButton.title = getIdleTitle();
      resetButton.setAttribute(
        'aria-label',
        appendClause(strings.description, strings.pendingDescription)
      );
      resetButton.dataset.hudAnnounce = appendClause(
        strings.description,
        strings.pendingDescription
      );
      wrapper.dataset.pending = 'true';
      wrapper.setAttribute('aria-busy', 'true');
      resetButton.setAttribute('aria-busy', 'true');
      return;
    }
    if (!hasVisited) {
      resetButton.disabled = true;
      resetButton.dataset.state = 'empty';
      resetButton.textContent = strings.emptyLabel;
      resetButton.title = strings.emptyDescription;
      resetButton.setAttribute('aria-label', strings.emptyDescription);
      resetButton.dataset.hudAnnounce = strings.emptyDescription;
      wrapper.dataset.pending = 'false';
      wrapper.setAttribute('aria-busy', 'false');
      resetButton.setAttribute('aria-busy', 'false');
      return;
    }
    resetButton.disabled = false;
    resetButton.dataset.state = 'ready';
    resetButton.textContent = strings.label;
    resetButton.title = getIdleTitle();
    resetButton.setAttribute('aria-label', strings.description);
    resetButton.dataset.hudAnnounce = buildHudAnnouncement(
      strings.description,
      true
    );
    wrapper.dataset.pending = 'false';
    wrapper.setAttribute('aria-busy', 'false');
    resetButton.setAttribute('aria-busy', 'false');
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
    if (!strings.resetKey) {
      return;
    }
    const matchesKey =
      event.key === strings.resetKey ||
      event.key === strings.resetKey.toUpperCase();
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
  if (strings.resetKey) {
    windowTarget.addEventListener('keydown', handleKeydown);
  }

  const unsubscribeVisited = subscribeVisited((visited) => {
    visitedCount = visited.size;
    refreshState();
  });

  refreshState();

  return {
    element: wrapper,
    setStrings(nextStrings) {
      const previousResetKey = strings.resetKey;
      strings = {
        ...defaultStrings,
        ...nextStrings,
        ...deprecatedStringOverrides,
      };
      normalizedResetKey = normalizeKey(strings.resetKey);
      heading.textContent = strings.heading;
      descriptionParagraph.textContent = strings.guidedTourDescription;
      if (previousResetKey !== strings.resetKey) {
        if (previousResetKey) {
          windowTarget.removeEventListener('keydown', handleKeydown);
        }
        if (strings.resetKey) {
          windowTarget.addEventListener('keydown', handleKeydown);
        }
      }
      refreshToggle();
      refreshState();
    },
    dispose() {
      resetButton.removeEventListener('click', handleClick);
      if (strings.resetKey) {
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
