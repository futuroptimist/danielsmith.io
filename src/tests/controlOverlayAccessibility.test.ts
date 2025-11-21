import { afterEach, describe, expect, it } from 'vitest';

import { applyControlOverlayAccessibility } from '../ui/hud/controlOverlayAccessibility';

afterEach(() => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  document.body.innerHTML = '';
});

describe('applyControlOverlayAccessibility', () => {
  it('assigns region semantics and heading linkage', () => {
    const container = document.createElement('div');
    const heading = document.createElement('p');
    heading.id = 'custom-heading';

    applyControlOverlayAccessibility({ container, heading });

    expect(container.getAttribute('role')).toBe('region');
    expect(container.tabIndex).toBe(-1);
    expect(container.getAttribute('aria-labelledby')).toBe('custom-heading');
    expect(heading.id).toBe('custom-heading');
  });

  it('falls back to a generated heading id and preserves existing focus', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const heading = document.createElement('p');
    const helpButton = document.createElement('button');
    const preFocused = document.createElement('button');
    document.body.append(preFocused);
    preFocused.focus();

    applyControlOverlayAccessibility({
      container,
      heading,
      helpButton,
      documentTarget: document,
      focusOnInit: true,
    });

    expect(container.getAttribute('aria-labelledby')).toBe(
      'control-overlay-heading'
    );
    expect(helpButton.getAttribute('aria-haspopup')).toBe('dialog');
    expect(document.activeElement).toBe(preFocused);
  });

  it('focuses the overlay when no other target is active', () => {
    const container = document.createElement('div');
    const heading = document.createElement('p');
    document.body.appendChild(container);

    applyControlOverlayAccessibility({
      container,
      heading,
      documentTarget: document,
      focusOnInit: true,
    });

    expect(document.activeElement).toBe(container);
  });
});
