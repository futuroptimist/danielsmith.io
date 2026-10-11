import { describe, expect, it, vi } from 'vitest';

import { sampleAquiloopCycle } from '../scene/structures/aquiloopCycle';
import { createAquiloopControls } from '../ui/aquiloopControls';

describe('Aquiloop controls', () => {
  it('exposes quantities and a native pause button, then cleans up', () => {
    const suspend = vi.fn();
    const controls = createAquiloopControls(suspend);
    controls.update(sampleAquiloopCycle(330), true);
    const panel = document.querySelector('.aquiloop-controls')!;
    expect(panel.textContent).toContain('120.0 / 150');
    expect(panel.textContent).toContain('3.75 / 5');
    const button = panel.querySelector('button')!;
    button.click();
    expect(controls.paused).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    expect(controls.paused).toBe(false);
    expect(suspend).toHaveBeenCalledTimes(2);
    controls.update(sampleAquiloopCycle(360), true);
    expect(panel.querySelector('[aria-live]')?.textContent).toContain(
      'Game replenishment'
    );
    controls.dispose();
    expect(document.querySelector('.aquiloop-controls')).toBeNull();
  });
});
