import { describe, expect, it, vi } from 'vitest';

import { createGraphicsQualityControl } from '../controls/graphicsQualityControl';

describe('createGraphicsQualityControl', () => {
  it('renders select options and updates description', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let preset: 'cinematic' | 'performance' = 'cinematic';

    const handle = createGraphicsQualityControl({
      container,
      getQuality: () => preset,
      setQuality: (next) => {
        preset = next;
      },
    });

    const select = container.querySelector<HTMLSelectElement>('.graphics-quality__select');
    const description = container.querySelector('.graphics-quality__description');
    expect(select).toBeTruthy();
    expect(select?.options.length).toBe(2);
    expect(description?.textContent).toContain('Full bloom');

    select!.value = 'performance';
    select?.dispatchEvent(new Event('change'));

    expect(preset).toBe('performance');
    expect(description?.textContent).toContain('Disables bloom');

    preset = 'cinematic';
    handle.refresh();
    expect(select?.value).toBe('cinematic');

    handle.dispose();
    expect(container.querySelector('.graphics-quality')).toBeNull();
  });

  it('cycles presets via keyboard and ignores modifiers', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const setQuality = vi.fn();
    let preset: string = 'cinematic';

    createGraphicsQualityControl({
      container,
      getQuality: () => preset,
      setQuality: (next) => {
        preset = next;
        setQuality(next);
      },
      cycleKey: 'g',
    });

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'g', ctrlKey: true })
    );
    expect(setQuality).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'G' }));
    expect(setQuality).toHaveBeenCalledWith('performance');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    expect(setQuality).toHaveBeenLastCalledWith('cinematic');
  });

  it('falls back to cinematic when getter returns unknown value', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let preset: string = 'unknown';

    const handle = createGraphicsQualityControl({
      container,
      getQuality: () => preset,
      setQuality: (next) => {
        preset = next;
      },
      cycleKey: 'x',
    });

    const select = container.querySelector<HTMLSelectElement>('.graphics-quality__select');
    expect(select?.value).toBe('cinematic');

    select!.value = 'performance';
    select?.dispatchEvent(new Event('change'));
    expect(preset).toBe('performance');

    handle.dispose();
  });
});
