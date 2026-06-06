import type { NarrationToggleStrings } from '../../assets/i18n';
import { getNarrationToggleStrings } from '../../assets/i18n';

export interface NarrationToggleControlOptions {
  container: HTMLElement;
  initialEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  strings?: NarrationToggleStrings;
}

export interface NarrationToggleControlHandle {
  readonly element: HTMLButtonElement;
  setEnabled(enabled: boolean): void;
  setStrings(strings: NarrationToggleStrings): void;
  dispose(): void;
}

export function createNarrationToggleControl({
  container,
  initialEnabled = false,
  onToggle,
  strings: providedStrings,
}: NarrationToggleControlOptions): NarrationToggleControlHandle {
  const defaultStrings = getNarrationToggleStrings();
  let strings: NarrationToggleStrings = {
    ...defaultStrings,
    ...providedStrings,
  };

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tour-toggle narration-toggle';
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
