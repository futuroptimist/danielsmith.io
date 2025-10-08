import { afterEach, describe, expect, it } from 'vitest';

import { createHudFocusAnnouncer } from '../accessibility/hudFocusAnnouncer';

describe('createHudFocusAnnouncer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const dispatchFocusIn = (element: HTMLElement) => {
    const event = new FocusEvent('focusin', { bubbles: true });
    element.dispatchEvent(event);
  };

  it('announces dataset-provided messages on focus', () => {
    const announcer = createHudFocusAnnouncer({ documentTarget: document });
    const button = document.createElement('button');
    button.dataset.hudAnnounce = 'Open help overlay.';
    document.body.appendChild(button);

    dispatchFocusIn(button);

    expect(announcer.element.textContent).toBe('Open help overlay.');

    announcer.dispose();
  });

  it('appends value text to aria label announcements', () => {
    const announcer = createHudFocusAnnouncer({ documentTarget: document });
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.setAttribute('aria-label', 'Ambient audio volume');
    slider.setAttribute('aria-valuetext', '60%');
    document.body.appendChild(slider);

    dispatchFocusIn(slider);

    expect(announcer.element.textContent).toBe(
      'Ambient audio volume. Current value 60%.'
    );

    announcer.dispose();
  });

  it('incorporates aria-describedby content in announcements', () => {
    const announcer = createHudFocusAnnouncer({ documentTarget: document });
    const description = document.createElement('div');
    description.id = 'hud-desc';
    description.textContent = 'Press enter to activate.';
    document.body.appendChild(description);

    const button = document.createElement('button');
    button.textContent = 'Manual mode';
    button.setAttribute('aria-describedby', 'hud-desc');
    document.body.appendChild(button);

    dispatchFocusIn(button);

    expect(announcer.element.textContent).toBe(
      'Manual mode. Press enter to activate.'
    );

    announcer.dispose();
  });

  it('prefers ancestor dataset messages when targets lack overrides', () => {
    const announcer = createHudFocusAnnouncer({ documentTarget: document });
    const wrapper = document.createElement('div');
    wrapper.dataset.hudAnnounce = 'Audio controls.';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.setAttribute('aria-valuetext', '70%');
    wrapper.appendChild(slider);
    document.body.appendChild(wrapper);

    dispatchFocusIn(slider);

    expect(announcer.element.textContent).toBe(
      'Audio controls. Current value 70%.'
    );

    announcer.dispose();
  });

  it('stops announcing once disposed', () => {
    const announcer = createHudFocusAnnouncer({ documentTarget: document });
    const liveRegion = announcer.element;
    const button = document.createElement('button');
    button.dataset.hudAnnounce = 'Should not announce after dispose.';
    document.body.appendChild(button);

    announcer.dispose();

    dispatchFocusIn(button);

    expect(liveRegion.textContent).toBe('');
  });
});
