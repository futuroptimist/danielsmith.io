import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { createMotionBlurController } from '../scene/graphics/motionBlurController';

function createRendererStub() {
  let activeTarget: WebGLRenderTarget | null = null;
  const renderer = {
    clear: vi.fn(),
    getRenderTarget: vi.fn(() => activeTarget),
    setRenderTarget: vi.fn((target: WebGLRenderTarget | null) => {
      activeTarget = target;
    }),
  } as unknown as WebGLRenderer;
  return renderer;
}

describe('createMotionBlurController', () => {
  it('starts disabled by default so the afterimage pass is a no-op', () => {
    const controller = createMotionBlurController();

    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.dispose();
  });

  it('applies intensity as shader damp instead of inverting the scale', () => {
    const controller = createMotionBlurController({ intensity: 0.5 });

    expect(controller.getIntensity()).toBeCloseTo(0.5, 5);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.46, 5);

    controller.setIntensity(0.25);
    expect(controller.getIntensity()).toBeCloseTo(0.25, 5);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.23, 5);

    controller.dispose();
  });

  it('clamps invalid intensity values and respects max damp overrides', () => {
    const controller = createMotionBlurController({
      intensity: Number.POSITIVE_INFINITY,
      maxDamp: 0.8,
    });

    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.setIntensity(2);
    expect(controller.getIntensity()).toBe(1);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.8, 5);

    controller.setIntensity(Number.NaN);
    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.dispose();
  });

  it('clears feedback history when toggling from nonzero intensity to zero', () => {
    const controller = createMotionBlurController({ intensity: 0.6 });
    const renderer = createRendererStub();

    controller.setIntensity(0);
    controller.reset(renderer);

    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);
    expect(renderer.clear).toHaveBeenCalledTimes(2);
    expect(renderer.setRenderTarget).toHaveBeenCalledWith(
      controller.pass.textureOld
    );
    expect(renderer.setRenderTarget).toHaveBeenCalledWith(
      controller.pass.textureComp
    );
    expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(null);

    controller.dispose();
  });

  it('disposes the underlying pass resources', () => {
    const controller = createMotionBlurController({ intensity: 0.1 });
    const disposeSpy = vi.spyOn(controller.pass, 'dispose');

    controller.dispose();

    expect(disposeSpy).toHaveBeenCalled();
  });
});
