import { afterEach, describe, expect, it, vi } from 'vitest';

import { EXTERIOR_LOCALE_COPY } from '../../../assets/i18n/exterior';
import { createBusStopControl } from '../busStopControl';

afterEach(() => document.body.replaceChildren());
describe('accessible coming-soon disclosure', () => {
  it('reuses layout measurements until the disclosure changes size', () => {
    const control = createBusStopControl({
      parent: document.body,
      restoreFocus: vi.fn(),
    });
    const measure = vi.spyOn(control.container, 'getBoundingClientRect');
    control.update(true, EXTERIOR_LOCALE_COPY.en, { x: 200, y: 200 });
    const initialReads = measure.mock.calls.length;
    expect(initialReads).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) {
      control.update(true, EXTERIOR_LOCALE_COPY.en, { x: 200 + i, y: 200 });
    }
    expect(measure).toHaveBeenCalledTimes(initialReads);
    control.button.click();
    control.update(true, EXTERIOR_LOCALE_COPY.en, { x: 200, y: 200 });
    expect(measure.mock.calls.length).toBeGreaterThan(initialReads);
    control.dispose();
  });

  it('opens locally, dismisses with Escape and ignores held activation keys', () => {
    const restoreFocus = vi.fn();
    const control = createBusStopControl({
      parent: document.body,
      restoreFocus,
    });
    control.update(true, EXTERIOR_LOCALE_COPY.en, { x: 200, y: 200 });
    expect(control.button.textContent).toBe('Bus stop: Coming Soon');
    control.button.click();
    expect(control.button.getAttribute('aria-expanded')).toBe('true');
    const repeat = new KeyboardEvent('keydown', {
      key: 'Enter',
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    control.button.dispatchEvent(repeat);
    expect(repeat.defaultPrevented).toBe(true);
    expect(control.button.getAttribute('aria-expanded')).toBe('true');
    control.button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(control.button.getAttribute('aria-expanded')).toBe('false');
    expect(restoreFocus).toHaveBeenCalledOnce();
    control.button.click();
    control.button.focus();
    control.update(false, EXTERIOR_LOCALE_COPY.en);
    expect(control.button.getAttribute('aria-expanded')).toBe('false');
    expect(restoreFocus).toHaveBeenCalledTimes(2);
    control.activate();
    expect(control.button.getAttribute('aria-expanded')).toBe('false');
    control.dispose();
    expect(document.body.children).toHaveLength(0);
  });
  it('provides the exact translated message in all nine locales', () => {
    const control = createBusStopControl({
      parent: document.body,
      restoreFocus: vi.fn(),
    });
    for (const strings of Object.values(EXTERIOR_LOCALE_COPY)) {
      control.update(true, strings);
      expect(control.button.textContent).toContain(strings.comingSoon);
      expect(control.container.querySelector('p')?.textContent).toBe(
        strings.busStopMessage
      );
    }
    control.dispose();
  });
});
