import { getModeToggleStrings } from '../../assets/i18n';
import type { ModeToggleResolvedStrings } from '../../assets/i18n';

export interface ManualModeToggleOptions {
  container: HTMLElement;
  onToggle: () => void | Promise<void>;
  getIsFallbackActive: () => boolean;
  windowTarget?: Window;
  strings?: ModeToggleResolvedStrings;
}

export interface ManualModeToggleHandle {
  readonly element: HTMLButtonElement;
  setStrings(strings: ModeToggleResolvedStrings): void;
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

export function createManualModeToggle({
  container,
  onToggle,
  getIsFallbackActive,
  windowTarget = window,
  strings: providedStrings,
}: ManualModeToggleOptions): ManualModeToggleHandle {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mode-toggle';
  container.appendChild(button);

  let pending = false;

  const DEFAULT_STRINGS = getModeToggleStrings();

  const cloneStrings = (
    value: ModeToggleResolvedStrings
  ): ModeToggleResolvedStrings => ({ ...value });

  let strings = cloneStrings(providedStrings ?? DEFAULT_STRINGS);

  const normalizeKeyHint = (value: string) =>
    value.length === 1 ? value.toUpperCase() : value;

  const setDisabledState = (disabled: boolean) => {
    button.disabled = disabled;
    if (disabled) {
      button.setAttribute('aria-disabled', 'true');
      container.setAttribute('aria-disabled', 'true');
      return;
    }

    button.removeAttribute('aria-disabled');
    container.removeAttribute('aria-disabled');
  };

  const withFallback = (value: string, fallback: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  };

  const getIdleTitle = () => {
    const title = strings.idleTitle.trim();
    if (title) {
      return title;
    }
    const description = withFallback(
      strings.idleDescription,
      DEFAULT_STRINGS.idleDescription
    );
    const normalizedKeyHint = normalizeKeyHint(strings.keyHint);
    return normalizedKeyHint
      ? `${description} (${normalizedKeyHint})`
      : description;
  };

  const getIdleAnnouncement = () =>
    withFallback(
      strings.idleHudAnnouncement,
      withFallback(strings.idleDescription, DEFAULT_STRINGS.idleHudAnnouncement)
    );

  const getPendingAnnouncement = () =>
    withFallback(strings.pendingHudAnnouncement, getIdleAnnouncement());

  const getActiveAnnouncement = () =>
    withFallback(
      strings.activeHudAnnouncement,
      withFallback(
        strings.activeDescription,
        DEFAULT_STRINGS.activeHudAnnouncement
      )
    );

  const refreshState = () => {
    const fallbackActive = getIsFallbackActive();
    const setContainerState = (state: 'idle' | 'pending' | 'active') => {
      container.dataset.modeToggleState = state;
      if (state === 'pending') {
        container.setAttribute('aria-busy', 'true');
      } else {
        container.removeAttribute('aria-busy');
      }
    };
    if (pending) {
      setContainerState('pending');
      setDisabledState(true);
      button.dataset.state = 'pending';
      button.setAttribute('aria-busy', 'true');
      button.textContent = withFallback(
        strings.pendingLabel,
        DEFAULT_STRINGS.pendingLabel
      );
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute(
        'aria-label',
        withFallback(strings.idleDescription, DEFAULT_STRINGS.idleDescription)
      );
      button.title = getIdleTitle();
      button.dataset.hudAnnounce = getPendingAnnouncement();
      return;
    }
    if (fallbackActive) {
      setContainerState('active');
      setDisabledState(true);
      button.dataset.state = 'active';
      button.removeAttribute('aria-busy');
      button.textContent = withFallback(
        strings.activeLabel,
        DEFAULT_STRINGS.activeLabel
      );
      button.setAttribute('aria-pressed', 'true');
      const activeDescription = withFallback(
        strings.activeDescription,
        DEFAULT_STRINGS.activeDescription
      );
      button.setAttribute('aria-label', activeDescription);
      button.title = activeDescription;
      button.dataset.hudAnnounce = getActiveAnnouncement();
      return;
    }
    setContainerState('idle');
    setDisabledState(false);
    button.dataset.state = 'idle';
    button.removeAttribute('aria-busy');
    button.textContent = withFallback(
      strings.idleLabel,
      DEFAULT_STRINGS.idleLabel
    );
    button.setAttribute('aria-pressed', 'false');
    const idleDescription = withFallback(
      strings.idleDescription,
      DEFAULT_STRINGS.idleDescription
    );
    button.setAttribute('aria-label', idleDescription);
    button.title = getIdleTitle();
    button.dataset.hudAnnounce = getIdleAnnouncement();
  };

  const setPendingState = (next: boolean) => {
    pending = next;
    refreshState();
  };

  const activate = () => {
    refreshState();
    if (pending || getIsFallbackActive()) {
      return;
    }
    setPendingState(true);
    const finalize = () => {
      queueMicrotask(() => {
        setPendingState(false);
      });
    };
    try {
      const result = onToggle();
      if (isPromiseLike(result)) {
        result
          .then(() => {
            finalize();
          })
          .catch((error) => {
            console.warn('Manual mode toggle failed:', error);
            finalize();
          });
      } else {
        finalize();
      }
    } catch (error) {
      console.warn('Manual mode toggle failed:', error);
      finalize();
    }
  };

  const handleClick = () => {
    activate();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    const keyHint = strings.keyHint;
    if (event.key !== keyHint && event.key !== keyHint.toLowerCase()) {
      return;
    }
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    if (pending || getIsFallbackActive()) {
      return;
    }
    event.preventDefault();
    activate();
  };

  button.addEventListener('click', handleClick);
  windowTarget.addEventListener('keydown', handleKeydown);
  button.addEventListener('focus', refreshState);

  refreshState();

  return {
    element: button,
    setStrings(nextStrings: ModeToggleResolvedStrings) {
      strings = cloneStrings(nextStrings ?? DEFAULT_STRINGS);
      refreshState();
    },
    dispose() {
      button.removeEventListener('click', handleClick);
      windowTarget.removeEventListener('keydown', handleKeydown);
      button.removeEventListener('focus', refreshState);
      container.removeAttribute('aria-busy');
      container.removeAttribute('aria-disabled');
      delete container.dataset.modeToggleState;
      if (button.parentElement) {
        button.remove();
      }
    },
  };
}
