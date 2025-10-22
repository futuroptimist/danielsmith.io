export interface AudioHudControlOptions {
  container: HTMLElement;
  getEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void | Promise<void>;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  windowTarget?: Window;
  toggleKey?: string;
  volumeStep?: number;
  toggleLabelOn?: string;
  toggleLabelOff?: string;
}

export interface AudioHudControlHandle {
  readonly element: HTMLDivElement;
  refresh(): void;
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

interface VolumeUiState {
  readonly valueDisplay: string;
  readonly ariaValueText: string;
  readonly announce: string;
}

function getVolumeUiState(
  enabled: boolean,
  formattedVolume: string
): VolumeUiState {
  if (enabled) {
    return {
      valueDisplay: formattedVolume,
      ariaValueText: formattedVolume,
      announce: `Ambient audio volume ${formattedVolume}.`,
    };
  }

  return {
    valueDisplay: `Muted · ${formattedVolume}`,
    ariaValueText: `Muted (${formattedVolume})`,
    announce: `Ambient audio muted. Volume set to ${formattedVolume}.`,
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
  toggleLabelOn = 'Audio: On · Press M to mute',
  toggleLabelOff = 'Audio: Off · Press M to unmute',
}: AudioHudControlOptions): AudioHudControlHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'audio-hud';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'Ambient audio controls');

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'audio-toggle';
  toggleButton.title = 'Toggle ambient audio';
  toggleButton.setAttribute('aria-pressed', 'false');

  const volumeLabel = document.createElement('label');
  volumeLabel.className = 'audio-volume';
  volumeLabel.htmlFor = 'audio-volume-slider';
  const labelText = document.createElement('span');
  labelText.className = 'audio-volume__label';
  labelText.textContent = 'Ambient volume';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'audio-volume-slider';
  slider.className = 'audio-volume__slider';
  slider.name = 'ambient-audio-volume';
  slider.min = '0';
  slider.max = '1';
  slider.step = volumeStep.toString();
  slider.setAttribute('aria-label', 'Ambient audio volume');
  slider.setAttribute('aria-valuemin', '0');
  slider.setAttribute('aria-valuemax', '1');
  slider.dataset.hudAnnounce = 'Ambient audio volume slider.';

  const valueText = document.createElement('span');
  valueText.className = 'audio-volume__value';
  valueText.setAttribute('aria-live', 'polite');

  volumeLabel.appendChild(labelText);
  volumeLabel.appendChild(slider);
  volumeLabel.appendChild(valueText);

  wrapper.appendChild(toggleButton);
  wrapper.appendChild(volumeLabel);
  container.appendChild(wrapper);

  let pending = false;
  let lastKnownEnabled = false;

  const normalizeKey = (value: string) =>
    value.length === 1 ? value.toUpperCase() : value;
  const normalizedToggleKey = normalizeKey(toggleKey);

  const updateToggle = () => {
    const enabled = getEnabled();
    lastKnownEnabled = enabled;
    const nextLabel = enabled ? toggleLabelOn : toggleLabelOff;
    toggleButton.dataset.state = enabled ? 'on' : 'off';
    toggleButton.textContent = nextLabel;
    toggleButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    toggleButton.disabled = pending;
    wrapper.dataset.pending = pending ? 'true' : 'false';
    const toggleMessage = enabled
      ? `Ambient audio on. Press ${normalizedToggleKey} to toggle.`
      : `Ambient audio off. Press ${normalizedToggleKey} to toggle.`;
    toggleButton.dataset.hudAnnounce = toggleMessage;
    updateVolume(enabled);
  };

  const updateVolume = (enabled = lastKnownEnabled) => {
    const volume = clamp(getVolume(), 0, 1);
    slider.value = volume.toString();
    slider.setAttribute('aria-valuenow', volume.toFixed(2));
    const formatted = formatVolume(volume);
    const uiState = getVolumeUiState(enabled, formatted);
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

  updateToggle();

  return {
    element: wrapper,
    refresh() {
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
