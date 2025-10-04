import { describe, expect, it, vi } from 'vitest';

import { ACCESSIBILITY_DEFAULTS } from '../accessibility/preferences';
import {
  applyAccessibilityDataset,
  createAccessibilityHudControl,
} from '../controls/accessibilityHudControl';

describe('createAccessibilityHudControl', () => {
  it('renders toggles, syncs state, and handles async updates', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const state = { ...ACCESSIBILITY_DEFAULTS };
    const listeners: Array<() => void> = [];

    const applyState = (key: 'reduceMotion' | 'highContrast', value: boolean) => {
      state[key] = value;
      listeners.forEach((listener) => listener());
    };

    let attempt = 0;
    let settleToggle: (() => void) | null = null;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handle = createAccessibilityHudControl({
      container,
      toggles: [
        {
          id: 'reduceMotion',
          label: 'Reduce motion',
          description: 'Limit parallax and floating POIs.',
          getState: () => state.reduceMotion,
          setState: (value) => {
            attempt += 1;
            if (attempt === 1) {
              return Promise.reject(new Error('fail'));
            }
            return new Promise<void>((resolve) => {
              settleToggle = () => {
                applyState('reduceMotion', value);
                resolve();
                settleToggle = null;
              };
            });
          },
        },
        {
          id: 'highContrast',
          label: 'High contrast',
          description: 'Boost overlay contrast and text legibility.',
          getState: () => state.highContrast,
          setState: (value) => {
            applyState('highContrast', value);
          },
        },
      ],
    });

    listeners.push(() => handle.refresh());

    const toggles = container.querySelectorAll<HTMLInputElement>(
      '.accessibility-presets__checkbox'
    );
    expect(toggles).toHaveLength(2);
    expect(toggles[0].checked).toBe(false);

    toggles[0].checked = true;
    toggles[0].dispatchEvent(new Event('change'));

    await Promise.resolve();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to update accessibility toggle:',
      expect.any(Error)
    );
    expect(toggles[0].checked).toBe(false);

    warnSpy.mockClear();

    toggles[0].checked = true;
    toggles[0].dispatchEvent(new Event('change'));

    await Promise.resolve();
    settleToggle?.();
    await Promise.resolve();

    expect(state.reduceMotion).toBe(true);
    expect(toggles[0].checked).toBe(true);

    toggles[1].checked = true;
    toggles[1].dispatchEvent(new Event('change'));

    expect(state.highContrast).toBe(true);

    handle.refresh();
    expect(toggles[1].checked).toBe(true);

    handle.dispose();
    toggles[0].dispatchEvent(new Event('change'));
    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(container.querySelector('.accessibility-presets')).toBeNull();

    warnSpy.mockRestore();
  });

  it('requires at least one toggle', () => {
    const container = document.createElement('div');
    expect(() =>
      createAccessibilityHudControl({
        container,
        toggles: [],
      })
    ).toThrowError('Accessibility HUD control requires at least one toggle.');
  });
});

describe('applyAccessibilityDataset', () => {
  it('updates dataset attributes for reduce motion and contrast', () => {
    const element = document.createElement('div');
    applyAccessibilityDataset(element, {
      reduceMotion: true,
      highContrast: false,
    });
    expect(element.dataset.accessibilityReduceMotion).toBe('true');
    expect(element.dataset.accessibilityContrast).toBe('default');

    applyAccessibilityDataset(element, {
      reduceMotion: false,
      highContrast: true,
    });
    expect(element.dataset.accessibilityReduceMotion).toBe('false');
    expect(element.dataset.accessibilityContrast).toBe('high');
  });
});
