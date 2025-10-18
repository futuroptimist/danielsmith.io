import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMotionBlurControl } from '../systems/controls/motionBlurControl';

describe('createMotionBlurControl', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders the slider and refreshes from the getter', () => {
    let intensity = 0.6;
    const handle = createMotionBlurControl({
      container,
      getIntensity: () => intensity,
      setIntensity: vi.fn((value: number) => {
        intensity = value;
      }),
    });

    const slider = container.querySelector<HTMLInputElement>(
      'input[type="range"]'
    );
    const valueText = container.querySelector<HTMLSpanElement>(
      '.motion-blur-control__value'
    );

    expect(slider).not.toBeNull();
    expect(slider?.value).toBe('0.6');
    expect(valueText?.textContent).toBe('60% · Medium trails');

    intensity = 0.18;
    handle.refresh();

    expect(slider?.value).toBe('0.18');
    expect(valueText?.textContent).toBe('18% · Low trails');

    handle.dispose();
  });

  it('clamps input values and exposes an off shortcut', () => {
    let intensity = 0.45;
    const setIntensity = vi.fn((value: number) => {
      intensity = value;
    });

    const handle = createMotionBlurControl({
      container,
      getIntensity: () => intensity,
      setIntensity,
    });

    const slider = container.querySelector<HTMLInputElement>(
      'input[type="range"]'
    );
    const wrapper = container.querySelector<HTMLDivElement>(
      '.motion-blur-control'
    );

    expect(slider).not.toBeNull();
    expect(wrapper?.dataset.state).toBe('on');

    if (!slider || !wrapper) {
      throw new Error('Slider not initialized');
    }

    slider.value = '1.5';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(setIntensity).toHaveBeenLastCalledWith(1);
    expect(slider.value).toBe('1');
    expect(slider.getAttribute('aria-valuetext')).toBe('100% · High trails');
    expect(wrapper.dataset.state).toBe('on');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

    expect(setIntensity).toHaveBeenLastCalledWith(0);
    expect(slider.value).toBe('0');
    expect(slider.getAttribute('aria-valuetext')).toBe('Off');
    expect(wrapper.dataset.state).toBe('off');

    handle.dispose();
  });
});
