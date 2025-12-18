import type { Locale } from '../../assets/i18n';

export interface LocaleToggleOption {
  id: Locale;
  label: string;
  direction?: 'ltr' | 'rtl';
}

export interface LocaleToggleControlOptions {
  container: HTMLElement;
  options: ReadonlyArray<LocaleToggleOption>;
  getActiveLocale: () => Locale;
  setActiveLocale: (locale: Locale) => void | Promise<void>;
  title?: string;
  description?: string;
}

export interface LocaleToggleControlHandle {
  readonly element: HTMLElement;
  refresh(): void;
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

export function createLocaleToggleControl({
  container,
  options,
  getActiveLocale,
  setActiveLocale,
  title = 'Language',
  description = 'Switch the HUD language and direction.',
}: LocaleToggleControlOptions): LocaleToggleControlHandle {
  if (!options.length) {
    throw new Error('Locale toggle requires at least one option.');
  }

  const wrapper = document.createElement('section');
  wrapper.className = 'locale-toggle';
  wrapper.dataset.pending = 'false';

  const heading = document.createElement('h2');
  heading.className = 'locale-toggle__title';
  heading.textContent = title;

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'locale-toggle__description';
  descriptionParagraph.textContent = description;

  const optionsList = document.createElement('div');
  optionsList.className = 'locale-toggle__options';
  optionsList.setAttribute('role', 'radiogroup');
  optionsList.setAttribute('aria-label', title);

  const status = document.createElement('div');
  status.className = 'locale-toggle__status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  wrapper.append(heading, descriptionParagraph, optionsList, status);
  container.appendChild(wrapper);

  const setStatusMessage = (message: string) => {
    status.textContent = message;
  };

  const buttons = new Map<Locale, HTMLButtonElement>();
  let pending = false;

  const setPendingAttributes = (value: boolean) => {
    const pendingValue = value ? 'true' : 'false';
    pending = value;
    wrapper.dataset.pending = pendingValue;
    wrapper.setAttribute('aria-busy', pendingValue);
    buttons.forEach((button) => {
      button.disabled = value;
      button.setAttribute('aria-busy', pendingValue);
    });
  };

  const getLocaleLabel = (locale: Locale) =>
    buttons.get(locale)?.textContent ?? locale;

  const setPending = (value: boolean) => {
    setPendingAttributes(value);
  };

  const announceFailure = (targetLabel: string) => {
    const currentLabel = getLocaleLabel(getActiveLocale());
    setStatusMessage(
      `Unable to switch to ${targetLabel}. Staying on ${currentLabel} locale.`
    );
  };

  const updateActiveState = () => {
    const active = getActiveLocale();
    buttons.forEach((button, locale) => {
      const isActive = locale === active;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.dataset.state = isActive ? 'active' : 'idle';
      if (isActive) {
        setStatusMessage(`${button.textContent} locale selected.`);
      }
    });
  };

  const handleSelection = (locale: Locale) => {
    if (pending) {
      updateActiveState();
      return;
    }
    if (locale === getActiveLocale()) {
      updateActiveState();
      return;
    }
    const pendingLabel = getLocaleLabel(locale);
    setStatusMessage(`Switching to ${pendingLabel} locale…`);
    setPending(true);
    try {
      const result = setActiveLocale(locale);
      if (isPromiseLike(result)) {
        result
          .then(() => {
            setPending(false);
            updateActiveState();
          })
          .catch((error) => {
            console.warn('Failed to change locale', error);
            setPending(false);
            updateActiveState();
            announceFailure(pendingLabel);
          });
      } else {
        setPending(false);
        updateActiveState();
      }
    } catch (error) {
      console.warn('Failed to change locale', error);
      setPending(false);
      updateActiveState();
      announceFailure(pendingLabel);
    }
  };

  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'locale-toggle__option';
    button.textContent = option.label;
    button.dataset.locale = option.id;
    if (option.direction) {
      button.dir = option.direction;
    }
    button.addEventListener('click', () => handleSelection(option.id));
    optionsList.appendChild(button);
    buttons.set(option.id, button);
  });

  updateActiveState();

  return {
    element: wrapper,
    refresh: updateActiveState,
    dispose() {
      buttons.forEach((button) => {
        const clone = button.cloneNode(true) as HTMLButtonElement;
        button.replaceWith(clone);
      });
      wrapper.remove();
      buttons.clear();
    },
  };
}
