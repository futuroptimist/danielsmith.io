import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale, LocaleToggleResolvedStrings } from '../../assets/i18n';

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
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
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

  it('keeps canonical option labels when refreshed strings omit newer locales', () => {
    const container = createContainer();
    const control = createLocaleToggleControl({
      container,
      options: [
        { id: 'en', label: 'English' },
        { id: 'zh-Hans', label: '中文（简体）' },
        { id: 'es', label: 'Español' },
        { id: 'pt', label: 'Português' },
        { id: 'de', label: 'Deutsch' },
        { id: 'hu', label: 'Magyar' },
      ],
      getActiveLocale: () => 'zh-Hans',
      setActiveLocale: vi.fn(),
    });

    control.setStrings({
      title: '语言',
      description: '选择 HUD 和文本导览语言。',
      switchingAnnouncementTemplate: '正在切换到 {target}…',
      selectedAnnouncementTemplate: '已选择 {label}。',
      failureAnnouncementTemplate: '无法切换到 {target}。保持 {current}。',
      options: {
        en: { label: 'English', direction: 'ltr' },
        'zh-Hans': { label: '中文（简体）', direction: 'ltr' },
      } as unknown as LocaleToggleResolvedStrings['options'],
    });

    expect(
      control.element.querySelector('[data-locale="es"]')?.textContent
    ).toBe('Español');
    expect(
      control.element.querySelector('[data-locale="pt"]')?.textContent
    ).toBe('Português');
    expect(
      control.element.querySelector('[data-locale="de"]')?.textContent
    ).toBe('Deutsch');
    expect(
      control.element.querySelector('[data-locale="hu"]')?.textContent
    ).toBe('Magyar');
  });
});
