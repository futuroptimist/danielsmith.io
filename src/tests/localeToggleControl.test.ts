import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Locale } from '../assets/i18n';
import { createLocaleToggleControl } from '../systems/controls/localeToggleControl';

const OPTIONS: ReadonlyArray<{ id: Locale; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' },
];

describe('createLocaleToggleControl', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders locale buttons and marks the active selection', () => {
    let active: Locale = 'en';
    const control = createLocaleToggleControl({
      container: document.body,
      options: OPTIONS,
      getActiveLocale: () => active,
      setActiveLocale: (locale) => {
        active = locale;
      },
    });

    const buttons = document.querySelectorAll<HTMLButtonElement>(
      '.locale-toggle__option'
    );
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.dataset.state).toBe('active');
    expect(buttons[1]?.dataset.state).toBe('idle');

    buttons[1]?.click();
    control.refresh();

    expect(buttons[0]?.dataset.state).toBe('idle');
    expect(buttons[1]?.dataset.state).toBe('active');
    control.dispose();
  });

  it('disables buttons while awaiting async updates', async () => {
    let active: Locale = 'en';
    const resolver = vi.fn();
    let resolvePromise: (() => void) | null = null;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = () => {
        resolve();
        resolver();
      };
    });

    createLocaleToggleControl({
      container: document.body,
      options: OPTIONS,
      getActiveLocale: () => active,
      setActiveLocale: (locale) => {
        active = locale;
        return promise;
      },
    });

    const buttons = document.querySelectorAll<HTMLButtonElement>(
      '.locale-toggle__option'
    );
    buttons[1]?.click();

    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(true);
    expect(resolver).not.toHaveBeenCalled();

    resolvePromise?.();
    await promise;

    expect(buttons[0]?.disabled).toBe(false);
    expect(buttons[1]?.disabled).toBe(false);
    expect(resolver).toHaveBeenCalled();
  });
});
