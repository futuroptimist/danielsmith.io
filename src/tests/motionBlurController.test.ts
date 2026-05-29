import { WebGLRenderTarget } from 'three';
import { describe, expect, it, vi } from 'vitest';

import {
  createMotionBlurController,
  resolveDampValue,
} from '../scene/graphics/motionBlurController';

describe('createMotionBlurController', () => {
  it('disables the AfterimagePass and clears damp at zero intensity', () => {
    const controller = createMotionBlurController({ intensity: 0 });

    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.dispose();
  });

  it('maps intensity upward because larger damp values retain more history', () => {
    const controller = createMotionBlurController({ intensity: 0.5 });

    expect(controller.getIntensity()).toBeCloseTo(0.5, 5);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.46, 5);

    controller.setIntensity(0.25);
    expect(controller.getIntensity()).toBeCloseTo(0.25, 5);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.23, 5);

    controller.dispose();
  });

  it('clamps out-of-range, invalid intensity values and max damp overrides', () => {
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

  it('explicitly resolves zero damp for invalid inputs and clamps max damp', () => {
    expect(resolveDampValue(0, 0.92)).toBe(0);
    expect(resolveDampValue(Number.NaN, 0.92)).toBe(0);
    expect(resolveDampValue(1, 2)).toBe(1);
    expect(resolveDampValue(1, -1)).toBe(0);
  });

  it('clears retained render targets when history is reset', () => {
    const controller = createMotionBlurController({ intensity: 0.6 });
    const previousTarget = new WebGLRenderTarget(1, 1);
    const renderer = {
      clear: vi.fn(),
      getClearAlpha: vi.fn(() => 0.75),
      getClearColor: vi.fn(
        (color: { setRGB: (r: number, g: number, b: number) => void }) => {
          color.setRGB(0.1, 0.2, 0.3);
          return color;
        }
      ),
      getRenderTarget: vi.fn(() => previousTarget),
      setClearColor: vi.fn(),
      setRenderTarget: vi.fn(),
    };

    controller.resetHistory(renderer as never);

    expect(renderer.setRenderTarget).toHaveBeenCalledWith(
      controller.pass.textureOld
    );
    expect(renderer.setRenderTarget).toHaveBeenCalledWith(
      controller.pass.textureComp
    );
    expect(renderer.clear).toHaveBeenCalledTimes(2);
    expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(previousTarget);
    expect(renderer.setClearColor).toHaveBeenLastCalledWith(
      expect.objectContaining({ isColor: true }),
      0.75
    );

    previousTarget.dispose();
    controller.dispose();
  });

  it('disables and clears stale feedback when toggling from nonzero to zero', () => {
    const controller = createMotionBlurController({ intensity: 0.7 });

    expect(controller.pass.enabled).toBe(true);

    controller.setIntensity(0);

    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.setIntensity(0.4);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.368, 5);

    controller.dispose();
  });

  it('disposes the underlying pass resources', () => {
    const controller = createMotionBlurController({ intensity: 0.1 });
    const disposeSpy = vi.spyOn(controller.pass, 'dispose');

    controller.dispose();

    expect(disposeSpy).toHaveBeenCalled();
  });
});
