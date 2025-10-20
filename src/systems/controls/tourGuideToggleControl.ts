export interface TourGuideToggleControlOptions {
  container: HTMLElement;
  initialEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  labelEnabled?: string;
  labelDisabled?: string;
  descriptionEnabled?: string;
  descriptionDisabled?: string;
}

export interface TourGuideToggleControlHandle {
  readonly element: HTMLButtonElement;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

const defaultEnabledLabel = 'Guided tour on';
const defaultDisabledLabel = 'Guided tour off';
const defaultEnabledDescription =
  'Highlights the next recommended exhibit in the immersive tour.';
const defaultDisabledDescription =
  'Guided tour highlights are hidden until you turn them back on.';

export function createTourGuideToggleControl({
  container,
  initialEnabled = true,
  onToggle,
  labelEnabled = defaultEnabledLabel,
  labelDisabled = defaultDisabledLabel,
  descriptionEnabled = defaultEnabledDescription,
  descriptionDisabled = defaultDisabledDescription,
}: TourGuideToggleControlOptions): TourGuideToggleControlHandle {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tour-toggle';
  container.appendChild(button);

  let enabled = Boolean(initialEnabled);

  const getLabel = () => (enabled ? labelEnabled : labelDisabled);
  const getDescription = () =>
    enabled ? descriptionEnabled : descriptionDisabled;

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
    dispose() {
      button.removeEventListener('click', toggle);
      if (button.parentElement) {
        button.remove();
      }
    },
  };
}
