import { describe, expect, it, vi } from 'vitest';

import { createGraphicsQualityControl } from '../controls/graphicsQualityControl';
import {
  GRAPHICS_QUALITY_PRESETS,
  type GraphicsQualityLevel,
} from '../graphics/qualityManager';

describe('createGraphicsQualityControl', () => {
  const presets = GRAPHICS_QUALITY_PRESETS.map(
    ({ id, label, description }) => ({
      id,
      label,
      description,
    })
  );

  it('renders presets, updates state, and handles refreshes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let level: GraphicsQualityLevel = 'cinematic';
    const setActive = vi.fn((next: GraphicsQualityLevel) => {
      level = next;
    });

    const control = createGraphicsQualityControl({
      container,
      presets,
      getActiveLevel: () => level,
      setActiveLevel: setActive,
    });

    const options = Array.from(
      container.querySelectorAll<HTMLInputElement>('.graphics-quality__radio')
    );
    expect(options).toHaveLength(presets.length);
    expect(options[0].checked).toBe(true);

    options[1].checked = true;
    options[1].dispatchEvent(new Event('change'));
    expect(setActive).toHaveBeenCalledWith('balanced');
    expect(level).toBe('balanced');

    control.refresh();
    expect(options[1].checked).toBe(true);
    expect(
      container.querySelector('.graphics-quality__status')?.textContent
    ).toContain('Balanced preset selected');

    control.dispose();
    expect(container.querySelector('.graphics-quality')).toBeNull();
  });

  it('handles async updates and reverts on failure', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let level: GraphicsQualityLevel = 'cinematic';
    let rejectNext = true;

    const setActive = vi.fn((next: GraphicsQualityLevel) => {
      if (rejectNext) {
        rejectNext = false;
        return Promise.reject(new Error('nope'));
      }
      level = next;
      return Promise.resolve();
    });

    const control = createGraphicsQualityControl({
      container,
      presets,
      getActiveLevel: () => level,
      setActiveLevel: setActive,
    });

    const radios = container.querySelectorAll<HTMLInputElement>(
      '.graphics-quality__radio'
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change'));
    await vi.waitFor(() =>
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to update graphics quality:',
        expect.any(Error)
      )
    );
    expect(radios[0].checked).toBe(true);

    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(level).toBe('performance'));
    expect(level).toBe('performance');
    expect(radios[2].checked).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    control.dispose();
    warnSpy.mockRestore();
  });

  it('throws when no presets are provided', () => {
    expect(() =>
      createGraphicsQualityControl({
        container: document.createElement('div'),
        presets: [],
        getActiveLevel: () => 'cinematic',
        setActiveLevel: () => {},
      })
    ).toThrow(/requires at least one preset/i);
  });
});
