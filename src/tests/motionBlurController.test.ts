import { Color } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { createMotionBlurController } from '../scene/graphics/motionBlurController';

describe('createMotionBlurController', () => {
  it('starts disabled at zero intensity with a clearing damp value', () => {
    const controller = createMotionBlurController({ intensity: 0 });

    expect(controller.getIntensity()).toBe(0);
    expect(controller.isEnabled()).toBe(false);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);
    expect(controller.getResetCount()).toBeGreaterThanOrEqual(1);

    controller.dispose();
  });

  it('maps nonzero intensity to AfterimagePass damp without inverting semantics', () => {
    const controller = createMotionBlurController({ intensity: 0.5 });

    expect(controller.getIntensity()).toBeCloseTo(0.5, 5);
    expect(controller.isEnabled()).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.46, 5);

    controller.setIntensity(0.25);
    expect(controller.getIntensity()).toBeCloseTo(0.25, 5);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.23, 5);

    controller.dispose();
  });

  it('clamps invalid and out-of-range intensity values safely', () => {
    const controller = createMotionBlurController({
      intensity: Number.POSITIVE_INFINITY,
      maxDamp: 0.8,
    });

    expect(controller.getIntensity()).toBe(0);
    expect(controller.isEnabled()).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.setIntensity(2);
    expect(controller.getIntensity()).toBe(1);
    expect(controller.isEnabled()).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.8, 5);

    controller.setIntensity(Number.NaN);
    expect(controller.getIntensity()).toBe(0);
    expect(controller.isEnabled()).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.dispose();
  });

  it('clears feedback history when toggling from nonzero to zero', () => {
    const renderer = {
      clear: vi.fn(),
      getClearAlpha: vi.fn(() => 1),
      getClearColor: vi.fn((target: Color) => target.set(0xffffff)),
      getRenderTarget: vi.fn(() => null),
      setClearColor: vi.fn(),
      setRenderTarget: vi.fn(),
    };
    const controller = createMotionBlurController({
      intensity: 0.6,
      renderer: renderer as never,
    });
    const resetsBeforeZero = controller.getResetCount();

    controller.setIntensity(0);

    expect(controller.getIntensity()).toBe(0);
    expect(controller.isEnabled()).toBe(false);
    expect(controller.pass.uniforms.tOld.value).toBeNull();
    expect(controller.pass.uniforms.tNew.value).toBeNull();
    expect(controller.getResetCount()).toBe(resetsBeforeZero + 1);
    expect(renderer.clear).toHaveBeenCalledTimes(4);
    expect(renderer.setRenderTarget).toHaveBeenCalledWith(
      controller.pass.textureOld
    );
    expect(renderer.setRenderTarget).toHaveBeenCalledWith(
      controller.pass.textureComp
    );

    controller.dispose();
  });

  it('clears stale history before re-enabling a previously disabled pass', () => {
    const controller = createMotionBlurController({ intensity: 0.6 });

    controller.setIntensity(0);
    const resetsBeforeEnable = controller.getResetCount();
    controller.setIntensity(0.4);

    expect(controller.isEnabled()).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.368, 5);
    expect(controller.getResetCount()).toBe(resetsBeforeEnable + 1);

    controller.dispose();
  });

  it('disposes the underlying pass resources', () => {
    const controller = createMotionBlurController({ intensity: 0.1 });
    const disposeSpy = vi.spyOn(controller.pass, 'dispose');

    controller.dispose();

    expect(disposeSpy).toHaveBeenCalled();
  });
});
