export interface ManualModeToggleOptions {
  container: HTMLElement;
  onToggle: () => void | Promise<void>;
  getIsFallbackActive: () => boolean;
  windowTarget?: Window;
  label?: string;
  description?: string;
  keyHint?: string;
  activeLabel?: string;
  activeDescription?: string;
}

export interface ManualModeToggleHandle {
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

export function createManualModeToggle({
  container,
  onToggle,
  getIsFallbackActive,
  windowTarget = window,
  label = 'Text mode · Press T',
  description = 'Switch to the text-only portfolio',
  keyHint = 'T',
  activeLabel = 'Text mode active',
  activeDescription = 'Text mode already active.',
}: ManualModeToggleOptions): ManualModeToggleHandle {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mode-toggle';
  container.appendChild(button);

  let pending = false;

  const normalizeKeyHint = (value: string) =>
    value.length === 1 ? value.toUpperCase() : value;

  const normalizedKeyHint = normalizeKeyHint(keyHint);

  const idleTitle = normalizedKeyHint
    ? `${description} (${normalizedKeyHint})`
    : description;

  const appendClause = (base: string, clause: string) => {
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

  const refreshState = () => {
    const fallbackActive = getIsFallbackActive();
    if (pending) {
      button.disabled = true;
      button.dataset.state = 'pending';
      button.textContent = 'Switching to text mode…';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', description);
      button.title = idleTitle;
      button.dataset.hudAnnounce = appendClause(
        description,
        'Switching to text mode…'
      );
      return;
    }
    if (fallbackActive) {
      button.disabled = true;
      button.dataset.state = 'active';
      button.textContent = activeLabel;
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('aria-label', activeDescription);
      button.title = activeDescription;
      button.dataset.hudAnnounce = activeDescription;
      return;
    }
    button.disabled = false;
    button.dataset.state = 'idle';
    button.textContent = label;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', description);
    button.title = idleTitle;
    const keyPrompt = normalizedKeyHint
      ? `Press ${normalizedKeyHint} to activate.`
      : 'Use this button to activate text mode.';
    button.dataset.hudAnnounce = appendClause(description, keyPrompt);
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
    dispose() {
      button.removeEventListener('click', handleClick);
      windowTarget.removeEventListener('keydown', handleKeydown);
      button.removeEventListener('focus', refreshState);
      if (button.parentElement) {
        button.remove();
      }
    },
  };
}
