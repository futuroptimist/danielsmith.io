import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '../../assets/i18n';

import {
  type LocaleToggleOption,
  createLocaleToggleControl,
} from './localeToggleControl';

const options: LocaleToggleOption[] = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية', direction: 'rtl' },
  { id: 'ja', label: '日本語' },
];

const createContainer = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const expectPendingCleared = async (element: HTMLElement) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (element.getAttribute('aria-busy') === 'false') {
      break;
    }
    await flushMicrotasks();
  }
  expect(element.getAttribute('aria-busy')).toBe('false');
  expect(element.dataset.pending).toBe('false');
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createLocaleToggleControl', () => {
  it('marks the active locale and mirrors selection in the status message', () => {
    let activeLocale: Locale = 'en';
    const container = createContainer();
    const control = createLocaleToggleControl({
      container,
      options,
      getActiveLocale: () => activeLocale,
      setActiveLocale: (locale) => {
        activeLocale = locale;
      },
      title: 'Language',
      description: 'Switch language for HUD and text tour.',
    });

    const status = control.element.querySelector(
      '.locale-toggle__status'
    ) as HTMLElement;
    const japaneseButton = control.element.querySelector(
      '[data-locale="ja"]'
    ) as HTMLButtonElement;

    expect(status.textContent).toBe('English locale selected.');

    japaneseButton.click();

    expect(japaneseButton.getAttribute('aria-pressed')).toBe('true');
    expect(status.textContent).toBe('日本語 locale selected.');
    expect(control.element.dataset.pending).toBe('false');
  });

  it('exposes pending state with aria-busy and a switching announcement', async () => {
    let activeLocale: Locale = 'en';
    let resolveSwitch!: () => void;
    const setActiveLocale = vi.fn((locale: Locale) => {
      return new Promise<void>((resolve) => {
        resolveSwitch = () => {
          activeLocale = locale;
          resolve();
        };
      });
    });

    const container = createContainer();
    const control = createLocaleToggleControl({
      container,
      options,
      getActiveLocale: () => activeLocale,
      setActiveLocale,
    });

    const arabicButton = control.element.querySelector(
      '[data-locale="ar"]'
    ) as HTMLButtonElement;
    const status = control.element.querySelector(
      '.locale-toggle__status'
    ) as HTMLElement;

    arabicButton.click();

    expect(control.element.getAttribute('aria-busy')).toBe('true');
    expect(control.element.dataset.pending).toBe('true');
    expect(arabicButton.disabled).toBe(true);
    expect(status.textContent).toBe('Switching to العربية locale…');

    resolveSwitch();
    await flushMicrotasks();

    await expectPendingCleared(control.element);
    expect(status.textContent).toBe('العربية locale selected.');
  });

  it('announces failures and restores the previous locale state', async () => {
    const activeLocale: Locale = 'en';
    const setActiveLocale = vi.fn(() =>
      Promise.reject(new Error('network unavailable'))
    );
    const container = createContainer();
    const control = createLocaleToggleControl({
      container,
      options,
      getActiveLocale: () => activeLocale,
      setActiveLocale,
    });

    const arabicButton = control.element.querySelector(
      '[data-locale="ar"]'
    ) as HTMLButtonElement;
    const status = control.element.querySelector(
      '.locale-toggle__status'
    ) as HTMLElement;

    arabicButton.click();
    await flushMicrotasks();

    await expectPendingCleared(control.element);
    expect(arabicButton.getAttribute('aria-pressed')).toBe('false');
    expect(status.textContent).toBe(
      'Unable to switch to العربية. Staying on English locale.'
    );
  });
});
