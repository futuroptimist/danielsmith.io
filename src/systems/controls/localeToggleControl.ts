import {
  getLocaleToggleStrings,
  type Locale,
  type LocaleToggleResolvedStrings,
} from '../../assets/i18n';

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
  strings?: LocaleToggleResolvedStrings;
}

export interface LocaleToggleControlHandle {
  readonly element: HTMLElement;
  setStrings(strings: LocaleToggleResolvedStrings): void;
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
  strings: providedStrings,
}: LocaleToggleControlOptions): LocaleToggleControlHandle {
  if (!options.length) {
    throw new Error('Locale toggle requires at least one option.');
  }

  const DEFAULT_STRINGS = getLocaleToggleStrings();
  let strings: LocaleToggleResolvedStrings = {
    ...DEFAULT_STRINGS,
    ...(providedStrings ?? {}),
  };

  const wrapper = document.createElement('section');
  wrapper.className = 'locale-toggle';
  wrapper.dataset.pending = 'false';

  const heading = document.createElement('h2');
  heading.className = 'locale-toggle__title';
  heading.textContent = strings.title;

  const descriptionParagraph = document.createElement('p');
  descriptionParagraph.className = 'locale-toggle__description';
  descriptionParagraph.textContent = strings.description;

  const optionsList = document.createElement('div');
  optionsList.className = 'locale-toggle__options';
  optionsList.setAttribute('role', 'radiogroup');
  optionsList.setAttribute('aria-label', strings.title);

  const status = document.createElement('div');
  status.className = 'locale-toggle__status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  wrapper.append(heading, descriptionParagraph, optionsList, status);
  container.appendChild(wrapper);

  const setStatusMessage = (message: string) => {
    status.textContent = message;
  };

  const formatTemplate = (
    template: string,
    replacements: { label?: string; target?: string; current?: string }
  ) =>
    template.replace(
      /\{(label|target|current)\}/g,
      (match, key: 'label' | 'target' | 'current') => replacements[key] ?? match
    );

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

  // Wrapper kept as the public "pending state" API for this control.
  // If pending behavior needs to change, update logic in setPendingAttributes
  // without affecting call sites that use setPending.
  const setPending = (value: boolean) => {
    setPendingAttributes(value);
  };

  const announceFailure = (targetLabel: string) => {
    const currentLabel = getLocaleLabel(getActiveLocale());
    setStatusMessage(
      formatTemplate(strings.failureAnnouncementTemplate, {
        target: targetLabel,
        current: currentLabel,
      })
    );
  };

  const updateActiveState = ({ preserveStatus = false } = {}) => {
    const active = getActiveLocale();
    buttons.forEach((button, locale) => {
      const isActive = locale === active;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.dataset.state = isActive ? 'active' : 'idle';
      if (isActive && !preserveStatus) {
        setStatusMessage(
          formatTemplate(strings.selectedAnnouncementTemplate, {
            label: button.textContent ?? locale,
          })
        );
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
    setStatusMessage(
      formatTemplate(strings.switchingAnnouncementTemplate, {
        target: pendingLabel,
      })
    );
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
            announceFailure(pendingLabel);
            updateActiveState({ preserveStatus: true });
          });
      } else {
        setPending(false);
        updateActiveState();
      }
    } catch (error) {
      console.warn('Failed to change locale', error);
      setPending(false);
      announceFailure(pendingLabel);
      updateActiveState({ preserveStatus: true });
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
    setStrings(nextStrings: LocaleToggleResolvedStrings) {
      strings = { ...DEFAULT_STRINGS, ...(nextStrings ?? DEFAULT_STRINGS) };
      heading.textContent = strings.title;
      descriptionParagraph.textContent = strings.description;
      optionsList.setAttribute('aria-label', strings.title);
      updateActiveState();
    },
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
