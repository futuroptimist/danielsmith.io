import { describe, expect, it, vi } from 'vitest';

import {
  createGraphicsQualityHudControl,
  type GraphicsQuality,
} from '../controls/graphicsQualityHudControl';

describe('createGraphicsQualityHudControl', () => {
  it('renders options, toggles states, and supports keyboard interactions', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let quality: GraphicsQuality = 'cinematic';

    const handle = createGraphicsQualityHudControl({
      container,
      getQuality: () => quality,
      setQuality: (next) => {
        quality = next;
      },
      toggleKey: 'g',
    });

    const options = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.graphics-quality__option'
      )
    );
    expect(options).toHaveLength(2);
    const [cinematicButton, performanceButton] = options;

    expect(cinematicButton.getAttribute('aria-checked')).toBe('true');
    expect(performanceButton.getAttribute('aria-checked')).toBe('false');

    performanceButton.click();
    expect(quality).toBe('performance');
    expect(performanceButton.dataset.state).toBe('active');
    expect(cinematicButton.dataset.state).toBe('inactive');

    handle.refresh();
    expect(performanceButton.getAttribute('aria-checked')).toBe('true');

    performanceButton.focus();
    performanceButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    );
    expect(document.activeElement).toBe(cinematicButton);

    quality = 'performance';
    handle.refresh();
    cinematicButton.focus();
    cinematicButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(quality).toBe('cinematic');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    expect(quality).toBe('performance');

    handle.dispose();
    expect(container.querySelector('.graphics-quality')).toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    expect(quality).toBe('performance');

    performanceButton.click();
    expect(quality).toBe('performance');

    container.remove();
  });

  it('manages async state transitions and recovers from failures', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let quality: GraphicsQuality = 'cinematic';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let resolveToggle: (() => void) | null = null;
    let rejectToggle: ((error: Error) => void) | null = null;
    let callCount = 0;

    const handle = createGraphicsQualityHudControl({
      container,
      getQuality: () => quality,
      setQuality: (next) => {
        quality = next;
        if (callCount === 0) {
          callCount += 1;
          return new Promise<void>((resolve) => {
            resolveToggle = resolve;
          });
        }
        if (callCount === 1) {
          callCount += 1;
          return new Promise<void>((_resolve, reject) => {
            rejectToggle = reject;
          });
        }
        callCount += 1;
        return undefined;
      },
    });

    const performanceButton = container.querySelector<HTMLButtonElement>(
      ".graphics-quality__option[data-quality='performance']"
    );
    expect(performanceButton).toBeTruthy();

    performanceButton?.click();
    expect(container.querySelector('.graphics-quality')?.dataset.pending).toBe(
      'true'
    );

    resolveToggle?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector('.graphics-quality')?.dataset.pending).toBe(
      undefined
    );
    expect(quality).toBe('performance');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    expect(container.querySelector('.graphics-quality')?.dataset.pending).toBe(
      'true'
    );

    rejectToggle?.(new Error('fail'));
    await Promise.resolve();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to set graphics quality:',
      expect.any(Error)
    );
    expect(container.querySelector('.graphics-quality')?.dataset.pending).toBe(
      undefined
    );
    expect(quality).toBe('cinematic');

    handle.dispose();
    container.remove();
    warnSpy.mockRestore();
  });
});
