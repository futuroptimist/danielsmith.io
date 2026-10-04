import { describe, expect, it, vi } from 'vitest';

import { EXTERIOR_LOCALE_COPY } from '../../../assets/i18n/exterior';
import { createBusStopDescription } from '../busStopDescription';

describe('passive bus-stop sign description', () => {
  it('describes the sign in every locale without a focus target or input listener', () => {
    const parent = document.createElement('div');
    const addListener = vi.spyOn(window, 'addEventListener');
    const build = createBusStopDescription(parent);
    const description = parent.querySelector<HTMLElement>(
      '[data-bus-stop-description]'
    )!;
    expect(description.hidden).toBe(true);
    expect(description.className).toBe('visually-hidden');
    for (const strings of Object.values(EXTERIOR_LOCALE_COPY)) {
      build.update(true, strings);
      expect(description.textContent).toBe(
        `${strings.busStop}: ${strings.comingSoon}`
      );
      expect(description.hidden).toBe(false);
    }
    expect(description.tabIndex).toBe(-1);
    expect(description.hasAttribute('aria-live')).toBe(false);
    expect(
      parent.querySelector('button, a, [role="button"], [tabindex]')
    ).toBeNull();
    expect(addListener).not.toHaveBeenCalled();
    addListener.mockRestore();
    build.update(false, EXTERIOR_LOCALE_COPY.en);
    expect(description.hidden).toBe(true);
    build.dispose();
    build.dispose();
    expect(parent.children).toHaveLength(0);
  });
});
