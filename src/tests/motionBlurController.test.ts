import { describe, expect, it, vi } from 'vitest';

import { createMotionBlurController } from '../scene/graphics/motionBlurController';

describe('createMotionBlurController', () => {
  it('applies the initial intensity and updates the damp uniform', () => {
    const controller = createMotionBlurController({ intensity: 0.5 });

    expect(controller.getIntensity()).toBeCloseTo(0.5, 5);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.96, 5);

    controller.setIntensity(0.25);
    expect(controller.getIntensity()).toBeCloseTo(0.25, 5);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.98, 5);

    controller.dispose();
  });

  it('clamps out-of-range intensity values and respects max damp overrides', () => {
    const controller = createMotionBlurController({
      intensity: 2,
      maxDamp: 0.8,
    });

    expect(controller.getIntensity()).toBe(1);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.8, 5);

    controller.setIntensity(-0.4);
    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.uniforms.damp.value).toBe(1);

    controller.dispose();
  });

  it('disposes the underlying pass resources', () => {
    const controller = createMotionBlurController({ intensity: 0.1 });
    const disposeSpy = vi.spyOn(controller.pass, 'dispose');

    controller.dispose();

    expect(disposeSpy).toHaveBeenCalled();
  });
});
