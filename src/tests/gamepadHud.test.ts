import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { getControlOverlayStrings } from '../assets/i18n';
import { applyControlOverlayStrings } from '../ui/hud/controlOverlay';
import { createResponsiveControlOverlay } from '../ui/hud/responsiveControlOverlay';

describe('Gamepad HUD category', () => {
  afterEach(() => document.body.replaceChildren());

  it.each(['desktop', 'mobile'] as const)(
    'keeps discoverable controls alongside existing methods on %s',
    (layout) => {
      const html = readFileSync('index.html', 'utf8');
      document.body.innerHTML = new DOMParser().parseFromString(
        html,
        'text/html'
      ).body.innerHTML;
      const container = document.querySelector<HTMLElement>(
        '[data-role="controls-popover"]'
      )!.parentElement!;
      const strings = getControlOverlayStrings('en');
      applyControlOverlayStrings(container, strings);
      const overlay = createResponsiveControlOverlay({
        container,
        strings,
        initialLayout: layout,
      });
      const popover = container.querySelector<HTMLElement>(
        '[data-role="controls-popover"]'
      )!;
      const category = container.querySelector<HTMLElement>(
        '[data-role="gamepad-controls"]'
      )!;
      expect(popover.hidden).toBe(true);
      overlay.open();
      expect(popover.hidden).toBe(false);
      expect(category.hidden).toBe(false);
      expect(category.getAttribute('aria-labelledby')).toBe(
        'gamepad-controls-heading'
      );
      expect(category.querySelector('h2')?.textContent).toBe(
        strings.gamepadHeading
      );
      expect(
        category.querySelectorAll('[data-input-methods="gamepad"]')
      ).toHaveLength(5);
      expect(category.textContent).toContain('Bottom face button (A / Cross)');
      expect(category.textContent).toContain('Unknown mappings stay inactive');
      container.dataset.activeInput = 'gamepad';
      overlay.refresh();
      expect(
        category
          .querySelector('[data-control-item="gamepadMove"]')
          ?.getAttribute('data-active-method')
      ).toBe('true');
      for (const id of ['keyboardMove', 'pointerDrag', 'touchDrag']) {
        const row = container.querySelector<HTMLElement>(
          `[data-control-item="${id}"]`
        )!;
        expect(row).not.toBeNull();
        expect(row.hidden).toBe(false);
        expect(row.dataset.activeMethod).toBe('false');
      }
      overlay.close();
      expect(popover.hidden).toBe(true);
      overlay.dispose();
    }
  );
});
