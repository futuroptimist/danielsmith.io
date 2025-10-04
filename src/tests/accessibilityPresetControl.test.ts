import { describe, expect, it, vi } from 'vitest';

import type { AccessibilityPresetId } from '../accessibility/presetManager';
import { createAccessibilityPresetControl } from '../controls/accessibilityPresetControl';

const OPTIONS = [
  {
    id: 'standard' as AccessibilityPresetId,
    label: 'Standard',
    description: 'Default presentation.',
  },
  {
    id: 'calm' as AccessibilityPresetId,
    label: 'Calm',
    description: 'Reduce motion cues.',
  },
  {
    id: 'photosensitive' as AccessibilityPresetId,
    label: 'Photosensitive safe',
    description: 'Disable bloom and boost contrast.',
  },
];

describe('createAccessibilityPresetControl', () => {
  it('renders options, syncs state, and handles async selection', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let active: AccessibilityPresetId = 'standard';
    let resolveSelection: (() => void) | null = null;

    const handle = createAccessibilityPresetControl({
      container,
      options: OPTIONS,
      getActivePreset: () => active,
      setActivePreset: (next) => {
        active = next;
        return new Promise<void>((resolve) => {
          resolveSelection = resolve;
        });
      },
    });

    const radios = Array.from(
      container.querySelectorAll<HTMLInputElement>('.accessibility-presets__radio')
    );
    const wrapper = container.querySelector<HTMLElement>('.accessibility-presets');
    expect(radios).toHaveLength(3);
    expect(wrapper?.dataset.pending).toBe('false');

    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change'));
    expect(wrapper?.dataset.pending).toBe('true');

    // While pending, subsequent selections are ignored.
    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change'));
    expect(wrapper?.dataset.pending).toBe('true');

    resolveSelection?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper?.dataset.pending).toBe('false');
    expect(radios[1].checked).toBe(true);

    active = 'photosensitive';
    handle.refresh();
    expect(radios[2].checked).toBe(true);

    handle.dispose();
    expect(container.querySelector('.accessibility-presets')).toBeNull();
  });

  it('recovers from failures and logs warnings', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let active: AccessibilityPresetId = 'standard';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createAccessibilityPresetControl({
      container,
      options: OPTIONS,
      getActivePreset: () => active,
      setActivePreset: (next) => {
        active = next;
        throw new Error('nope');
      },
    });

    const radio = container.querySelector<HTMLInputElement>(
      '.accessibility-presets__radio[value="calm"]'
    );
    expect(radio).toBeTruthy();
    if (!radio) {
      warnSpy.mockRestore();
      return;
    }

    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to update accessibility preset:',
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it('throws when no options are provided', () => {
    const container = document.createElement('div');
    expect(() =>
      createAccessibilityPresetControl({
        container,
        options: [],
        getActivePreset: () => 'standard',
        setActivePreset: () => undefined,
      })
    ).toThrow('Accessibility preset control requires at least one option.');
  });
});
