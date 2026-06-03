import { describe, expect, it, vi } from 'vitest';

import {
  getLocaleToggleStrings,
  type Locale,
  type LocaleToggleResolvedStrings,
} from '../assets/i18n';
import { createLocaleToggleControl } from '../systems/controls/localeToggleControl';

describe('createLocaleToggleControl', () => {
  const strings: LocaleToggleResolvedStrings = {
    title: '言語設定',
    description: 'HUD の言語と方向を切り替えます。',
    switchingAnnouncementTemplate: '{target} ロケールに切り替え中…',
    selectedAnnouncementTemplate: '{label} ロケールを選択しました。',
    failureAnnouncementTemplate:
      '{target} に切り替えられませんでした。{current} のままです。',
    options: getLocaleToggleStrings('ja').options,
  };

  it('renders localized labels and selection announcements', () => {
    const container = document.createElement('div');
    let activeLocale: Locale = 'en';
    const handle = createLocaleToggleControl({
      container,
      options: [
        { id: 'en', label: 'English' },
        { id: 'ja', label: '日本語', direction: 'ltr' },
      ],
      getActiveLocale: () => activeLocale,
      setActiveLocale: (locale) => {
        activeLocale = locale;
      },
      strings,
    });

    const heading = container.querySelector('.locale-toggle__title');
    expect(heading?.textContent).toBe(strings.title);
    const description = container.querySelector('.locale-toggle__description');
    expect(description?.textContent).toBe(strings.description);

    const status = container.querySelector('.locale-toggle__status');
    expect(status?.textContent).toBe('English ロケールを選択しました。');

    handle.setStrings({ ...strings, title: '言語 / Language' });
    expect(heading?.textContent).toBe('言語 / Language');

    handle.dispose();
  });

  it('can select Mandarin and let callers update document language', () => {
    const container = document.createElement('div');
    let activeLocale: Locale = 'en';
    const handle = createLocaleToggleControl({
      container,
      options: [
        { id: 'en', label: 'English' },
        { id: 'zh-Hans', label: '中文（简体）', direction: 'ltr' },
      ],
      getActiveLocale: () => activeLocale,
      setActiveLocale: (locale) => {
        activeLocale = locale;
        document.documentElement.lang = locale;
      },
    });

    container
      .querySelector<HTMLButtonElement>('[data-locale="zh-Hans"]')
      ?.click();

    expect(activeLocale).toBe('zh-Hans');
    expect(document.documentElement.lang).toBe('zh-Hans');
    handle.dispose();
  });

  it('announces switching and failures with localized templates', async () => {
    const container = document.createElement('div');
    const failingToggle = vi.fn(async () => {
      throw new Error('nope');
    });
    const handle = createLocaleToggleControl({
      container,
      options: [
        { id: 'en', label: 'English' },
        { id: 'ja', label: '日本語' },
      ],
      getActiveLocale: () => 'en',
      setActiveLocale: failingToggle,
      strings,
    });

    const jaButton = container.querySelector<HTMLButtonElement>(
      '.locale-toggle__option[data-locale="ja"]'
    );
    jaButton?.click();

    const status = container.querySelector('.locale-toggle__status');
    expect(status?.textContent).toBe('日本語 ロケールに切り替え中…');

    const pendingToggle = failingToggle.mock.results[0]
      ?.value as Promise<unknown>;
    await pendingToggle?.catch(() => {});

    await vi.waitFor(() => {
      expect(status?.textContent).toBe(
        '日本語 に切り替えられませんでした。English のままです。'
      );
    });
    expect(failingToggle).toHaveBeenCalledWith('ja');

    handle.dispose();
  });
});
