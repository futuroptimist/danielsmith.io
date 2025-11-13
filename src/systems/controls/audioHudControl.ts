import {
  formatMessage,
  getAudioHudControlStrings,
  type AudioHudControlStrings,
} from '../../assets/i18n';

export interface AudioHudControlOptions {
  container: HTMLElement;
  getEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void | Promise<void>;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  windowTarget?: Window;
  toggleKey?: string;
  volumeStep?: number;
  strings?: AudioHudControlStrings;
}

export interface AudioHudControlHandle {
  readonly element: HTMLDivElement;
  refresh(): void;
  setStrings(strings: AudioHudControlStrings): void;
  dispose(): void;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

const formatVolume = (volume: number) => `${Math.round(volume * 100)}%`;

let audioHudInstanceCounter = 0;

interface VolumeUiState {
  readonly valueDisplay: string;
  readonly ariaValueText: string;
  readonly announce: string;
}

function getVolumeUiState(
  enabled: boolean,
  formattedVolume: string,
  strings: AudioHudControlStrings['slider']
): VolumeUiState {
  if (enabled) {
    return {
      valueDisplay: formattedVolume,
      ariaValueText: formattedVolume,
      announce: formatMessage(strings.valueAnnouncementTemplate, {
        volume: formattedVolume,
      }),
    };
  }

  return {
    valueDisplay: formatMessage(strings.mutedValueTemplate, {
      volume: formattedVolume,
    }),
    ariaValueText: formatMessage(strings.mutedAriaValueTemplate, {
      volume: formattedVolume,
    }),
    announce: formatMessage(strings.mutedAnnouncementTemplate, {
      volume: formattedVolume,
    }),
  };
}

export function createAudioHudControl({
  container,
  getEnabled,
  setEnabled,
  getVolume,
  setVolume,
  windowTarget = window,
  toggleKey = 'm',
  volumeStep = 0.05,
  strings: providedStrings,
}: AudioHudControlOptions): AudioHudControlHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'audio-hud';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-busy', 'false');

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'audio-toggle';
  toggleButton.setAttribute('aria-pressed', 'false');

  const volumeLabel = document.createElement('label');
  volumeLabel.className = 'audio-volume';
  const instanceId = (audioHudInstanceCounter += 1);
  const sliderId = `audio-volume-slider-${instanceId}`;
  volumeLabel.htmlFor = sliderId;
  const labelText = document.createElement('span');
  labelText.className = 'audio-volume__label';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = sliderId;
  slider.className = 'audio-volume__slider';
  slider.name = 'ambient-audio-volume';
  slider.min = '0';
  slider.max = '1';
  slider.step = volumeStep.toString();
  slider.setAttribute('aria-valuemin', '0');
  slider.setAttribute('aria-valuemax', '1');

  const valueText = document.createElement('span');
  valueText.className = 'audio-volume__value';
  valueText.setAttribute('aria-live', 'polite');
  const valueTextId = `audio-volume-value-${instanceId}`;
  valueText.id = valueTextId;
  slider.setAttribute('aria-describedby', valueTextId);

  volumeLabel.appendChild(labelText);
  volumeLabel.appendChild(slider);
  volumeLabel.appendChild(valueText);

  wrapper.appendChild(toggleButton);
  wrapper.appendChild(volumeLabel);
  container.appendChild(wrapper);

  const cloneStrings = (
    value: AudioHudControlStrings
  ): AudioHudControlStrings => ({
    keyHint: value.keyHint,
    groupLabel: value.groupLabel,
    toggle: { ...value.toggle },
    slider: { ...value.slider },
  });

  let strings = cloneStrings(providedStrings ?? getAudioHudControlStrings());
  let pending = false;
  let lastKnownEnabled = false;

  const normalizeKeyHint = (value: string | undefined) => {
    if (!value) {
      return '';
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    return trimmed.length === 1 ? trimmed.toUpperCase() : trimmed;
  };

  const DEFAULT_KEY_HINT = 'M';

  const resolveKeyHint = () => {
    const explicit = normalizeKeyHint(toggleKey);
    if (explicit) {
      return explicit;
    }
    const fromStrings = normalizeKeyHint(strings.keyHint);
    if (fromStrings) {
      return fromStrings;
    }
    return DEFAULT_KEY_HINT;
  };

  let keyHint = resolveKeyHint();
  let toggleLabels = {
    on: formatMessage(strings.toggle.onLabelTemplate, { keyHint }),
    off: formatMessage(strings.toggle.offLabelTemplate, { keyHint }),
  };
  let toggleAnnouncements = {
    on: formatMessage(strings.toggle.announcementOnTemplate, { keyHint }),
    off: formatMessage(strings.toggle.announcementOffTemplate, { keyHint }),
  };
  let toggleTitle = formatMessage(strings.toggle.titleTemplate, { keyHint });

  const applyStrings = () => {
    keyHint = resolveKeyHint();
    toggleLabels = {
      on: formatMessage(strings.toggle.onLabelTemplate, { keyHint }),
      off: formatMessage(strings.toggle.offLabelTemplate, { keyHint }),
    };
    toggleAnnouncements = {
      on: formatMessage(strings.toggle.announcementOnTemplate, { keyHint }),
      off: formatMessage(strings.toggle.announcementOffTemplate, { keyHint }),
    };
    toggleTitle = formatMessage(strings.toggle.titleTemplate, { keyHint });
    wrapper.setAttribute('aria-label', strings.groupLabel);
    toggleButton.title = toggleTitle;
    labelText.textContent = strings.slider.label;
    slider.setAttribute('aria-label', strings.slider.ariaLabel);
    slider.dataset.hudAnnounce = strings.slider.hudLabel;
  };

  const updateToggle = () => {
    const enabled = getEnabled();
    lastKnownEnabled = enabled;
    const nextLabel = enabled ? toggleLabels.on : toggleLabels.off;
    toggleButton.dataset.state = enabled ? 'on' : 'off';
    toggleButton.textContent = nextLabel;
    toggleButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    toggleButton.disabled = pending;
    wrapper.dataset.pending = pending ? 'true' : 'false';
    wrapper.setAttribute('aria-busy', pending ? 'true' : 'false');
    toggleButton.dataset.hudAnnounce = enabled
      ? toggleAnnouncements.on
      : toggleAnnouncements.off;
    updateVolume(enabled);
  };

  const updateVolume = (enabled = lastKnownEnabled) => {
    const volume = clamp(getVolume(), 0, 1);
    slider.value = volume.toString();
    slider.setAttribute('aria-valuenow', volume.toFixed(2));
    const formatted = formatVolume(volume);
    const uiState = getVolumeUiState(enabled, formatted, strings.slider);
    slider.setAttribute('aria-valuetext', uiState.ariaValueText);
    slider.dataset.hudAnnounce = uiState.announce;
    valueText.textContent = uiState.valueDisplay;
  };

  const finalizeToggle = () => {
    pending = false;
    updateToggle();
  };

  const activateToggle = () => {
    if (pending) {
      return;
    }
    const enabled = getEnabled();
    const nextState = !enabled;
    pending = true;
    updateToggle();
    try {
      const result = setEnabled(nextState);
      if (isPromiseLike(result)) {
        result
          .catch((error) => {
            console.warn('Failed to toggle ambient audio:', error);
          })
          .finally(() => {
            finalizeToggle();
          });
      } else {
        finalizeToggle();
      }
    } catch (error) {
      console.warn('Failed to toggle ambient audio:', error);
      finalizeToggle();
    }
  };

  const handleSliderInput = () => {
    const value = clamp(Number.parseFloat(slider.value), 0, 1);
    setVolume(value);
    updateVolume();
  };

  const handleToggleClick = () => {
    activateToggle();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== toggleKey && event.key !== toggleKey.toUpperCase()) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    event.preventDefault();
    activateToggle();
  };

  toggleButton.addEventListener('click', handleToggleClick);
  slider.addEventListener('input', handleSliderInput);
  windowTarget.addEventListener('keydown', handleKeydown);

  applyStrings();
  updateToggle();

  return {
    element: wrapper,
    refresh() {
      updateToggle();
    },
    setStrings(nextStrings) {
      strings = cloneStrings(nextStrings);
      applyStrings();
      updateToggle();
    },
    dispose() {
      toggleButton.removeEventListener('click', handleToggleClick);
      slider.removeEventListener('input', handleSliderInput);
      windowTarget.removeEventListener('keydown', handleKeydown);
      if (wrapper.parentElement) {
        wrapper.remove();
      }
    },
  };
}
