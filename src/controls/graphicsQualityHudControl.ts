export type GraphicsQuality = 'cinematic' | 'performance';

export interface GraphicsQualityHudOptions {
  container: HTMLElement;
  getQuality: () => GraphicsQuality;
  setQuality: (quality: GraphicsQuality) => void | Promise<void>;
  windowTarget?: Window;
  toggleKey?: string;
}

export interface GraphicsQualityHudControlHandle {
  readonly element: HTMLDivElement;
  refresh(): void;
  dispose(): void;
}

interface GraphicsQualityOption {
  value: GraphicsQuality;
  label: string;
  detail: string;
}

const QUALITY_OPTIONS: readonly GraphicsQualityOption[] = [
  {
    value: 'cinematic',
    label: 'Cinematic',
    detail: 'Full bloom and high-fidelity lighting',
  },
  {
    value: 'performance',
    label: 'Performance',
    detail: 'Optimized effects for higher frame rates',
  },
] as const;

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

export function createGraphicsQualityHudControl({
  container,
  getQuality,
  setQuality,
  windowTarget = window,
  toggleKey = 'g',
}: GraphicsQualityHudOptions): GraphicsQualityHudControlHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'graphics-quality';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'Graphics quality presets');

  const legend = document.createElement('p');
  legend.className = 'graphics-quality__legend';
  legend.textContent = 'Graphics';

  const description = document.createElement('p');
  description.className = 'graphics-quality__description';
  description.textContent = 'Balance visual fidelity with performance on your device.';

  const optionsRoot = document.createElement('div');
  optionsRoot.className = 'graphics-quality__options';
  optionsRoot.setAttribute('role', 'radiogroup');
  optionsRoot.setAttribute('aria-label', 'Graphics quality');

  type OptionEntry = {
    value: GraphicsQuality;
    button: HTMLButtonElement;
    handleClick: () => void;
    handleKeydown: (event: KeyboardEvent) => void;
  };

  const optionEntries: OptionEntry[] = [];

  let pending = false;

  const setPendingState = (next: boolean) => {
    pending = next;
    if (next) {
      wrapper.dataset.pending = 'true';
      optionEntries.forEach((entry) => {
        entry.button.setAttribute('aria-disabled', 'true');
      });
    } else {
      delete wrapper.dataset.pending;
      optionEntries.forEach((entry) => {
        entry.button.removeAttribute('aria-disabled');
      });
    }
  };

  const focusOption = (value: GraphicsQuality) => {
    const entry = optionEntries.find((option) => option.value === value);
    entry?.button.focus();
  };

  const getOptionIndex = (value: GraphicsQuality) =>
    optionEntries.findIndex((option) => option.value === value);

  const focusByOffset = (current: GraphicsQuality, offset: number) => {
    if (optionEntries.length === 0) {
      return;
    }
    const currentIndex = getOptionIndex(current);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + offset + optionEntries.length) % optionEntries.length;
    optionEntries[nextIndex]?.button.focus();
  };

  const updateOptions = () => {
    const activeValue = getQuality();
    optionEntries.forEach((entry, index) => {
      const isActive = entry.value === activeValue;
      entry.button.dataset.state = isActive ? 'active' : 'inactive';
      entry.button.setAttribute('aria-checked', isActive ? 'true' : 'false');
      entry.button.tabIndex = isActive || (activeValue === undefined && index === 0) ? 0 : -1;
    });
  };

  const attemptQualityChange = (next: GraphicsQuality): boolean => {
    if (pending) {
      return false;
    }
    const current = getQuality();
    if (current === next) {
      updateOptions();
      return false;
    }
    let result: void | Promise<void>;
    try {
      result = setQuality(next);
    } catch (error) {
      console.warn('Failed to set graphics quality:', error);
      updateOptions();
      return false;
    }
    if (isPromiseLike(result)) {
      setPendingState(true);
      updateOptions();
      result
        .then(() => {
          setPendingState(false);
          updateOptions();
        })
        .catch((error) => {
          console.warn('Failed to set graphics quality:', error);
          setPendingState(false);
          updateOptions();
        });
    } else {
      updateOptions();
    }
    return true;
  };

  QUALITY_OPTIONS.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'graphics-quality__option';
    button.dataset.quality = option.value;
    button.setAttribute('role', 'radio');

    const label = document.createElement('span');
    label.className = 'graphics-quality__option-label';
    label.textContent = option.label;

    const detail = document.createElement('span');
    detail.className = 'graphics-quality__option-detail';
    detail.textContent = option.detail;

    button.append(label, detail);

    const handleClick = () => {
      const changed = attemptQualityChange(option.value);
      if (changed) {
        focusOption(option.value);
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusByOffset(option.value, -1);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        focusByOffset(option.value, 1);
        return;
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        const changed = attemptQualityChange(option.value);
        if (changed) {
          focusOption(option.value);
        }
      }
    };

    button.addEventListener('click', handleClick);
    button.addEventListener('keydown', handleKeydown);

    optionEntries.push({
      value: option.value,
      button,
      handleClick,
      handleKeydown,
    });
    optionsRoot.appendChild(button);
  });

  wrapper.append(legend, description, optionsRoot);
  container.appendChild(wrapper);

  updateOptions();

  const handleToggleKey = (event: KeyboardEvent) => {
    if (event.key !== toggleKey && event.key !== toggleKey.toUpperCase()) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    event.preventDefault();
    const current = getQuality();
    const next = current === 'cinematic' ? 'performance' : 'cinematic';
    const changed = attemptQualityChange(next);
    if (changed) {
      focusOption(next);
    }
  };

  windowTarget.addEventListener('keydown', handleToggleKey);

  return {
    element: wrapper,
    refresh: () => {
      updateOptions();
    },
    dispose: () => {
      optionEntries.forEach((entry) => {
        entry.button.removeEventListener('click', entry.handleClick);
        entry.button.removeEventListener('keydown', entry.handleKeydown);
      });
      windowTarget.removeEventListener('keydown', handleToggleKey);
      if (wrapper.parentElement) {
        wrapper.remove();
      }
      setPendingState(false);
    },
  };
}
