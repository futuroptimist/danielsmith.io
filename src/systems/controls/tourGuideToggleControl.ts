import type { GuidedTourControlStrings } from '../../assets/i18n/types';

export interface TourGuideToggleControlOptions {
  container: HTMLElement;
  initialEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  strings: Pick<
    GuidedTourControlStrings,
    | 'toggleLabelOn'
    | 'toggleLabelOff'
    | 'toggleTitleOn'
    | 'toggleTitleOff'
    | 'toggleAnnouncementOn'
    | 'toggleAnnouncementOff'
  >;
}

export interface TourGuideToggleControlHandle {
  readonly element: HTMLButtonElement;
  setEnabled(enabled: boolean): void;
  setStrings(strings: TourGuideToggleControlOptions['strings']): void;
  dispose(): void;
}

export function createTourGuideToggleControl({
  container,
  initialEnabled = true,
  onToggle,
  strings: initialStrings,
}: TourGuideToggleControlOptions): TourGuideToggleControlHandle {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tour-toggle';
  container.appendChild(button);

  let enabled = Boolean(initialEnabled);
  let strings = initialStrings;

  const getLabel = () =>
    enabled ? strings.toggleLabelOn : strings.toggleLabelOff;
  const getDescription = () =>
    enabled ? strings.toggleTitleOn : strings.toggleTitleOff;
  const getAnnouncement = () =>
    enabled ? strings.toggleAnnouncementOn : strings.toggleAnnouncementOff;

  const refresh = () => {
    const label = getLabel();
    const description = getDescription();
    button.textContent = label;
    button.dataset.state = enabled ? 'enabled' : 'disabled';
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.setAttribute('aria-label', description);
    button.title = description;
    button.dataset.hudAnnounce = getAnnouncement();
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
      strings = nextStrings;
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
