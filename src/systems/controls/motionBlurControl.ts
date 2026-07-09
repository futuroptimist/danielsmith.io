import { formatMessage, getSettingsControlsStrings } from '../../assets/i18n';
import type { SettingsControlsStrings } from '../../assets/i18n/types';

export interface MotionBlurControlOptions {
  container: HTMLElement;
  /** Returns the base motion blur intensity between 0 and 1. */
  getIntensity: () => number;
  /** Updates the base motion blur intensity. Values will be clamped to [0, 1]. */
  setIntensity: (intensity: number) => void;
  step?: number;
  label?: string;
  description?: string;
  strings?: SettingsControlsStrings['motionBlur'];
  windowTarget?: Window;
}

export interface MotionBlurControlHandle {
  readonly element: HTMLDivElement;
  refresh(): void;
  dispose(): void;
}

const DEFAULT_STEP = 0.05;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function formatIntensity(
  value: number,
  strings: SettingsControlsStrings['motionBlur']
): string {
  if (value <= 0.001) {
    return strings.values.off;
  }
  if (value < 0.34) {
    return formatMessage(strings.values.lowTemplate, {
      value: `${Math.round(value * 100)}`,
    });
  }
  if (value < 0.67) {
    return formatMessage(strings.values.mediumTemplate, {
      value: `${Math.round(value * 100)}`,
    });
  }
  return formatMessage(strings.values.highTemplate, {
    value: `${Math.round(value * 100)}`,
  });
}

export function createMotionBlurControl({
  container,
  getIntensity,
  setIntensity,
  step = DEFAULT_STEP,
  label,
  description,
  strings: providedStrings,
  windowTarget = window,
}: MotionBlurControlOptions): MotionBlurControlHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'motion-blur-control';
  wrapper.setAttribute('role', 'group');
  const strings = providedStrings ?? getSettingsControlsStrings().motionBlur;
  const resolvedLabel = label ?? strings.label;
  const resolvedDescription = description ?? strings.description;

  wrapper.setAttribute('aria-label', strings.groupLabel);

  const heading = document.createElement('div');
  heading.className = 'motion-blur-control__heading';
  heading.textContent = resolvedLabel;
  wrapper.appendChild(heading);

  const sliderLabel = document.createElement('label');
  sliderLabel.className = 'motion-blur-control__label';
  sliderLabel.htmlFor = 'motion-blur-slider';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'motion-blur-slider';
  slider.className = 'motion-blur-control__slider';
  slider.name = 'motion-blur-intensity';
  slider.min = '0';
  slider.max = '1';
  slider.step = step.toString();
  slider.setAttribute('aria-label', resolvedLabel);
  slider.dataset.hudAnnounce = strings.sliderAnnouncement;

  const valueText = document.createElement('span');
  valueText.className = 'motion-blur-control__value';
  valueText.setAttribute('aria-live', 'polite');

  sliderLabel.appendChild(slider);
  sliderLabel.appendChild(valueText);
  wrapper.appendChild(sliderLabel);

  if (resolvedDescription) {
    const descriptionText = document.createElement('p');
    descriptionText.className = 'motion-blur-control__description';
    descriptionText.textContent = resolvedDescription;
    wrapper.appendChild(descriptionText);
  }

  container.appendChild(wrapper);

  const updateValueDisplay = (value: number) => {
    const clamped = clamp01(value);
    slider.value = clamped.toString();
    slider.setAttribute('aria-valuenow', clamped.toFixed(2));
    const formatted = formatIntensity(clamped, strings);
    slider.setAttribute('aria-valuetext', formatted);
    valueText.textContent = formatted;
    wrapper.dataset.state = clamped <= 0.001 ? 'off' : 'on';
  };

  const refresh = () => {
    updateValueDisplay(getIntensity());
  };

  const handleInput = () => {
    const value = clamp01(Number.parseFloat(slider.value));
    setIntensity(value);
    refresh();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== '0') {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    slider.value = '0';
    handleInput();
  };

  slider.addEventListener('input', handleInput);
  windowTarget.addEventListener('keydown', handleKeydown);

  refresh();

  return {
    element: wrapper,
    refresh,
    dispose() {
      slider.removeEventListener('input', handleInput);
      windowTarget.removeEventListener('keydown', handleKeydown);
      if (wrapper.parentElement) {
        wrapper.remove();
      }
    },
  };
}
