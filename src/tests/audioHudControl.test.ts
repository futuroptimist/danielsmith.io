import { describe, expect, it, vi } from 'vitest';

import { createAudioHudControl } from '../controls/audioHudControl';

describe('createAudioHudControl', () => {
  it('renders controls, syncs state, and handles async toggles', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let enabled = false;
    let volume = 0.6;
    let toggleCallCount = 0;
    let resolveToggle: (() => void) | undefined;

    const handle = createAudioHudControl({
      container,
      getEnabled: () => enabled,
      setEnabled: (next) => {
        enabled = next;
        toggleCallCount += 1;
        return new Promise<void>((resolve) => {
          resolveToggle = () => resolve();
        });
      },
      getVolume: () => volume,
      setVolume: (value) => {
        volume = value;
      },
    });

    const button = container.querySelector<HTMLButtonElement>(
      'button.audio-toggle'
    );
    const slider = container.querySelector<HTMLInputElement>(
      '.audio-volume__slider'
    );
    const valueText = container.querySelector('.audio-volume__value');
    expect(button).toBeTruthy();
    expect(slider).toBeTruthy();
    expect(valueText?.textContent).toBe('60%');
    expect(button?.dataset.hudAnnounce).toBe(
      'Ambient audio off. Press M to toggle.'
    );
    expect(slider?.dataset.hudAnnounce).toBe('Ambient audio volume slider.');

    button?.dispatchEvent(new Event('click'));
    expect(toggleCallCount).toBe(1);
    expect(button?.disabled).toBe(true);

    // Second click while pending should be ignored.
    button?.dispatchEvent(new Event('click'));
    expect(toggleCallCount).toBe(1);

    resolveToggle?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(button?.disabled).toBe(false);
    expect(button?.dataset.state).toBe('on');
    expect(button?.dataset.hudAnnounce).toBe(
      'Ambient audio on. Press M to toggle.'
    );

    slider!.value = '0.82';
    slider?.dispatchEvent(new Event('input'));
    expect(volume).toBeCloseTo(0.82, 5);
    expect(valueText?.textContent).toBe('82%');

    volume = 0.25;
    enabled = false;
    handle.refresh();
    expect(button?.dataset.state).toBe('off');
    expect(valueText?.textContent).toBe('25%');
    expect(button?.dataset.hudAnnounce).toBe(
      'Ambient audio off. Press M to toggle.'
    );

    slider!.value = '1.6';
    slider?.dispatchEvent(new Event('input'));
    expect(volume).toBe(1);
    expect(valueText?.textContent).toBe('100%');

    handle.dispose();
    expect(container.querySelector('.audio-hud')).toBeNull();
  });

  it('responds to keyboard toggles and recovers from failures', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let enabled = true;
    let rejected = false;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handle = createAudioHudControl({
      container,
      getEnabled: () => enabled,
      setEnabled: () => {
        enabled = !enabled;
        if (!rejected) {
          rejected = true;
          return Promise.reject(new Error('fail'));
        }
        return undefined;
      },
      getVolume: () => 0.4,
      setVolume: vi.fn(),
      toggleKey: 'm',
    });

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'm', ctrlKey: true })
    );
    expect(warnSpy).not.toHaveBeenCalled();

    const event = new KeyboardEvent('keydown', { key: 'M' });
    window.dispatchEvent(event);
    await Promise.resolve();
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to toggle ambient audio:',
      expect.any(Error)
    );
    const button = container.querySelector<HTMLButtonElement>(
      'button.audio-toggle'
    );
    expect(button?.dataset.hudAnnounce).toBe(
      'Ambient audio off. Press M to toggle.'
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
    expect(warnSpy).toHaveBeenCalledTimes(1);

    expect(button?.dataset.hudAnnounce).toBe(
      'Ambient audio on. Press M to toggle.'
    );

    handle.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
