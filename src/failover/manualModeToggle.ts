export interface ManualModeToggleOptions {
  container: HTMLElement;
  onToggle: () => void | Promise<void>;
  getIsFallbackActive: () => boolean;
  windowTarget?: Window;
  label?: string;
  description?: string;
  keyHint?: string;
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
}: ManualModeToggleOptions): ManualModeToggleHandle {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mode-toggle';
  button.textContent = label;
  button.title = `${description} (${keyHint})`;
  button.setAttribute('aria-label', description);
  button.dataset.state = 'idle';
  container.appendChild(button);

  let pending = false;

  const setPendingState = (next: boolean) => {
    pending = next;
    button.disabled = next;
    button.dataset.state = next ? 'pending' : 'idle';
    if (next) {
      button.textContent = 'Switching to text mode…';
    } else {
      button.textContent = label;
    }
  };

  const activate = () => {
    if (pending || getIsFallbackActive()) {
      return;
    }
    setPendingState(true);
    const finalize = () => {
      queueMicrotask(() => {
        if (!getIsFallbackActive()) {
          setPendingState(false);
        }
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

  return {
    element: button,
    dispose() {
      button.removeEventListener('click', handleClick);
      windowTarget.removeEventListener('keydown', handleKeydown);
      if (button.parentElement) {
        button.remove();
      }
    },
  };
}
