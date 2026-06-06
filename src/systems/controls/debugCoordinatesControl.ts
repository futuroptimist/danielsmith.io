import type { DebugCoordinatesControlStrings } from '../../assets/i18n';
import { getDebugCoordinatesControlStrings } from '../../assets/i18n';

export interface DebugCoordinatesControlOptions {
  container: HTMLElement;
  initialEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  strings?: DebugCoordinatesControlStrings;
}

export interface DebugCoordinatesControlHandle {
  readonly element: HTMLButtonElement;
  setEnabled(enabled: boolean): void;
  setStrings(strings: DebugCoordinatesControlStrings): void;
  dispose(): void;
}

export function createDebugCoordinatesControl({
  container,
  initialEnabled = false,
  onToggle,
  strings: providedStrings,
}: DebugCoordinatesControlOptions): DebugCoordinatesControlHandle {
  const defaultStrings = getDebugCoordinatesControlStrings();
  let strings: DebugCoordinatesControlStrings = {
    ...defaultStrings,
    ...providedStrings,
  };

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tour-toggle debug-coordinates-toggle';
  container.appendChild(button);

  let enabled = Boolean(initialEnabled);

  const refresh = () => {
    const label = enabled ? strings.labelEnabled : strings.labelDisabled;
    const description = enabled
      ? strings.descriptionEnabled
      : strings.descriptionDisabled;
    button.textContent = label;
    button.dataset.state = enabled ? 'enabled' : 'disabled';
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.setAttribute('aria-label', description);
    button.title = description;
    button.dataset.hudAnnounce = `${label}. ${description}`;
  };

  const toggle = () => {
    enabled = !enabled;
    refresh();
    onToggle?.(enabled);
  };

  button.addEventListener('click', toggle);
  refresh();

  return {
    element: button,
    setEnabled(next) {
      if (enabled === next) {
        return;
      }
      enabled = next;
      refresh();
    },
    setStrings(nextStrings) {
      strings = { ...defaultStrings, ...nextStrings };
      refresh();
    },
    dispose() {
      button.removeEventListener('click', toggle);
      button.remove();
    },
  };
}
