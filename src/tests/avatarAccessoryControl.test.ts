import { describe, expect, it, vi } from 'vitest';

import { createAvatarAccessoryControl } from '../systems/controls/avatarAccessoryControl';

describe('createAvatarAccessoryControl', () => {
  const OPTIONS = [
    {
      id: 'wrist-console' as const,
      label: 'Wrist console',
      description: 'Telemetry cuff that mirrors HUD diagnostics.',
    },
    {
      id: 'holo-drone' as const,
      label: 'Holographic drone',
      description: 'Orbiting scout drone with ambient glow.',
    },
  ];

  it('renders checkboxes and manages async toggles', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const enabled = new Map<string, boolean>();
    let resolveToggle: (() => void) | undefined;

    const handle = createAvatarAccessoryControl({
      container,
      options: OPTIONS,
      isAccessoryEnabled: (id) => enabled.get(id) ?? false,
      setAccessoryEnabled: () =>
        new Promise<void>((resolve) => {
          resolveToggle = resolve;
        }),
    });

    const wrapper = container.querySelector<HTMLElement>('.avatar-accessories');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.dataset.pending).toBe('false');

    const checkboxes = container.querySelectorAll<HTMLInputElement>(
      '.avatar-accessories__checkbox'
    );
    expect(checkboxes).toHaveLength(OPTIONS.length);

    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change'));
    expect(wrapper?.dataset.pending).toBe('true');

    enabled.set('wrist-console', true);
    resolveToggle?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper?.dataset.pending).toBe('false');
    expect(checkboxes[0].checked).toBe(true);
    expect(
      container.querySelector('.avatar-accessories__status')?.textContent
    ).toContain('enabled');

    enabled.set('wrist-console', false);
    handle.refresh();
    expect(checkboxes[0].checked).toBe(false);
  });

  it('logs warnings when updates throw', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createAvatarAccessoryControl({
      container,
      options: OPTIONS,
      isAccessoryEnabled: () => false,
      setAccessoryEnabled: () => {
        throw new Error('nope');
      },
    });

    const checkbox = container.querySelector<HTMLInputElement>(
      '.avatar-accessories__checkbox'
    );
    expect(checkbox).toBeTruthy();
    checkbox!.checked = true;
    checkbox!.dispatchEvent(new Event('change'));
    expect(warn).toHaveBeenCalledWith(
      'Failed to update avatar accessories:',
      expect.any(Error)
    );
    warn.mockRestore();
  });

  it('requires at least one option', () => {
    const container = document.createElement('div');
    expect(() =>
      createAvatarAccessoryControl({
        container,
        options: [],
        isAccessoryEnabled: () => false,
        setAccessoryEnabled: () => undefined,
      })
    ).toThrow('Avatar accessory control requires at least one option.');
  });

  it('renders presets and applies loadouts', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let presetSnapshot = [
      {
        id: 'minimalist' as const,
        label: 'Minimal',
        description: 'No accessories.',
        unlocked: true,
        applied: true,
      },
      {
        id: 'scout-drone' as const,
        label: 'Scout drone',
        description: 'Deploy the drone companion.',
        unlocked: false,
        applied: false,
      },
    ];

    const applySpy = vi.fn();

    const handle = createAvatarAccessoryControl({
      container,
      options: OPTIONS,
      isAccessoryEnabled: () => false,
      setAccessoryEnabled: () => undefined,
      presets: {
        getPresets: () => presetSnapshot,
        applyPreset: (id) => {
          applySpy(id);
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              presetSnapshot = presetSnapshot.map((preset) =>
                preset.id === id
                  ? { ...preset, unlocked: true, applied: true }
                  : { ...preset, applied: false }
              );
              resolve();
            }, 0);
          });
        },
      },
    });

    const presetButtons = container.querySelectorAll<HTMLButtonElement>(
      '.avatar-accessories__preset-button'
    );
    expect(presetButtons).toHaveLength(2);
    expect(presetButtons[1].disabled).toBe(true);
    expect(
      container.querySelector(
        '.avatar-accessories__preset[data-state="locked"] .avatar-accessories__preset-description'
      )?.textContent
    ).toContain('(locked)');

    presetSnapshot = [
      presetSnapshot[0],
      { ...presetSnapshot[1], unlocked: true },
    ];
    handle.refresh();

    expect(presetButtons[1].disabled).toBe(false);
    presetButtons[1].click();
    expect(applySpy).toHaveBeenCalledWith('scout-drone');

    await new Promise((resolve) => setTimeout(resolve, 0));
    handle.refresh();

    expect(presetButtons[1].getAttribute('aria-pressed')).toBe('true');
    expect(
      container.querySelector('.avatar-accessories__status')?.textContent
    ).toContain('loadout equipped');
    expect(
      container.querySelector(
        '.avatar-accessories__preset[data-state="active"] .avatar-accessories__preset-description'
      )?.textContent
    ).not.toContain('(locked)');

    handle.dispose();
    container.remove();
  });
});
