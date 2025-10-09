import { describe, expect, it, beforeEach } from 'vitest';

import { createHelpModal } from '../hud/helpModal';
import { getHelpModalStrings } from '../i18n';

function cloneContent() {
  const content = getHelpModalStrings();
  return {
    heading: content.heading,
    description: content.description,
    closeLabel: content.closeLabel,
    closeAriaLabel: content.closeAriaLabel,
    settings: {
      heading: content.settings.heading,
      description: content.settings.description,
    },
    sections: content.sections.map((section) => ({
      id: section.id,
      title: section.title,
      items: section.items.map((item) => ({
        label: item.label,
        description: item.description,
      })),
    })),
  };
}

describe('createHelpModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden by default and toggles visibility when opened', () => {
    const focusAnchor = document.createElement('button');
    focusAnchor.textContent = 'focus anchor';
    document.body.appendChild(focusAnchor);
    focusAnchor.focus();

    const handle = createHelpModal({
      container: document.body,
      content: cloneContent(),
    });

    const backdrop = document.querySelector('.help-modal-backdrop');
    expect(backdrop).toBeInstanceOf(HTMLElement);
    expect((backdrop as HTMLElement).hidden).toBe(true);
    expect(handle.isOpen()).toBe(false);

    handle.open();
    expect(handle.isOpen()).toBe(true);
    expect((backdrop as HTMLElement).hidden).toBe(false);

    handle.close();
    expect(handle.isOpen()).toBe(false);
    expect((backdrop as HTMLElement).hidden).toBe(true);
    expect(document.activeElement).toBe(focusAnchor);
  });

  it('supports custom headings and sections', () => {
    const handle = createHelpModal({
      container: document.body,
      content: {
        heading: 'Custom help',
        description: 'Custom description',
        closeLabel: 'Done',
        closeAriaLabel: 'Close the custom help panel',
        settings: {
          heading: 'Custom settings',
          description: 'Adjust everything here',
        },
        sections: [
          {
            id: 'testing',
            title: 'Testing',
            items: [
              { label: 'A', description: 'First item' },
              { label: 'B', description: 'Second item' },
            ],
          },
        ],
      },
    });

    handle.open();

    const title = document.querySelector('.help-modal__title');
    const sectionHeading = Array.from(
      document.querySelectorAll('.help-modal__section-heading')
    ).find((heading) =>
      !heading.classList.contains('help-modal__section-heading--settings')
    );
    const items = document.querySelectorAll('.help-modal__item');
    const settingsHeading = document.querySelector(
      '.help-modal__section-heading--settings'
    );

    expect(title?.textContent).toBe('Custom help');
    expect(sectionHeading?.textContent).toBe('Testing');
    expect(Array.from(items).map((item) => item.textContent?.trim())).toContain(
      'AFirst item'
    );
    expect(settingsHeading?.textContent).toBe('Custom settings');
  });

  it('closes when Escape is pressed or the backdrop is clicked', () => {
    const handle = createHelpModal({
      container: document.body,
      content: cloneContent(),
    });
    handle.open();

    const backdrop = document.querySelector('.help-modal-backdrop');
    expect(backdrop).toBeInstanceOf(HTMLElement);

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);
    expect(handle.isOpen()).toBe(false);

    handle.open();
    (backdrop as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(handle.isOpen()).toBe(false);
  });

  it('traps focus while open and releases it after closing', () => {
    const before = document.createElement('button');
    before.textContent = 'before';
    document.body.appendChild(before);
    before.focus();

    const handle = createHelpModal({
      container: document.body,
      content: cloneContent(),
    });
    handle.open();

    const closeButton =
      document.querySelector<HTMLButtonElement>('.help-modal__close');
    expect(closeButton).toBeTruthy();
    closeButton?.focus();

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    document.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(closeButton);

    handle.close();
    expect(document.activeElement).toBe(before);
  });

  it('disposes elements and listeners on dispose', () => {
    const handle = createHelpModal({
      container: document.body,
      content: cloneContent(),
    });
    handle.open();
    handle.dispose();

    expect(document.querySelector('.help-modal-backdrop')).toBeNull();
  });
});
