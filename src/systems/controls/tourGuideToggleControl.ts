import {
  getTourGuideToggleStrings,
  type TourGuideToggleStrings,
} from '../../assets/i18n';

export interface TourGuideToggleControlOptions {
  container: HTMLElement;
  initialEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  strings?: TourGuideToggleStrings;
}

export interface TourGuideToggleControlHandle {
  readonly element: HTMLButtonElement;
  setEnabled(enabled: boolean): void;
  setStrings(strings: TourGuideToggleStrings): void;
  dispose(): void;
}

export function createTourGuideToggleControl({
  container,
  initialEnabled = true,
  onToggle,
  strings: providedStrings,
}: TourGuideToggleControlOptions): TourGuideToggleControlHandle {
  const defaultStrings = getTourGuideToggleStrings();
  let strings: TourGuideToggleStrings = {
    ...defaultStrings,
    ...providedStrings,
  };

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tour-toggle';
  container.appendChild(button);

  let enabled = Boolean(initialEnabled);

  const getLabel = () =>
    enabled ? strings.labelEnabled : strings.labelDisabled;
  const getDescription = () =>
    enabled ? strings.descriptionEnabled : strings.descriptionDisabled;

  const refresh = () => {
    const label = getLabel();
    const description = getDescription();
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
      if (button.parentElement) {
        button.remove();
      }
    },
  };
}
