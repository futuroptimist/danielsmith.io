import { describe, expect, it, vi } from 'vitest';

import { createMotionBlurController } from '../scene/graphics/motionBlurController';

describe('createMotionBlurController', () => {
  it('disables the afterimage pass at zero intensity so it no-ops in the composer', () => {
    const controller = createMotionBlurController();

    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.setIntensity(0.7);
    expect(controller.pass.enabled).toBe(true);

    controller.setIntensity(0);
    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBe(0);
    expect(controller.getHistoryState()).toMatchObject({
      pendingReset: true,
      lastResetDamp: 0,
    });

    const renderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(),
      clear: vi.fn(),
    };
    const buffer = { texture: {} };
    controller.pass.render(
      renderer as never,
      buffer as never,
      buffer as never,
      0,
      false
    );
    expect(controller.pass.enabled).toBe(false);

    controller.dispose();
  });

  it('maps intensity upward to AfterimagePass damp instead of preserving at zero', () => {
    const controller = createMotionBlurController({ intensity: 0.5 });

    expect(controller.getIntensity()).toBeCloseTo(0.5, 5);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.46, 5);

    controller.setIntensity(1);
    expect(controller.getIntensity()).toBe(1);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.92, 5);

    controller.dispose();
  });

  it('clamps invalid values, disables at zero, and respects max damp overrides', () => {
    const controller = createMotionBlurController({
      intensity: Number.NaN,
      maxDamp: 0.8,
    });

    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.setIntensity(2);
    expect(controller.getIntensity()).toBe(1);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.8, 5);

    controller.setIntensity(Number.NEGATIVE_INFINITY);
    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    const renderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(),
      clear: vi.fn(),
    };
    const buffer = { texture: {} };
    controller.pass.render(
      renderer as never,
      buffer as never,
      buffer as never,
      0,
      false
    );
    expect(controller.pass.enabled).toBe(false);

    controller.setIntensity(Number.POSITIVE_INFINITY);
    expect(controller.getIntensity()).toBe(0);
    expect(controller.pass.enabled).toBe(false);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.dispose();
  });

  it('allows maxDamp zero as an explicit no-history upper bound', () => {
    const controller = createMotionBlurController({
      intensity: 1,
      maxDamp: 0,
    });

    expect(controller.getIntensity()).toBe(1);
    expect(controller.pass.enabled).toBe(true);
    expect(controller.pass.uniforms.damp.value).toBe(0);

    controller.dispose();
  });

  it('clears history on the next render after toggling to or from zero', () => {
    const controller = createMotionBlurController({ intensity: 0.6 });
    const observedDampValues: number[] = [];

    controller.setIntensity(0);
    controller.setIntensity(0.5);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.46, 5);

    const renderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(() => {
        observedDampValues.push(controller.pass.uniforms.damp.value);
      }),
      clear: vi.fn(),
    };
    const buffer = { texture: {} };

    controller.pass.render(
      renderer as never,
      buffer as never,
      buffer as never,
      0,
      false
    );

    expect(observedDampValues[0]).toBe(0);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.46, 5);
    expect(controller.getHistoryState()).toMatchObject({
      pendingReset: false,
      lastResetDamp: 0,
    });

    controller.dispose();
  });

  it('clears history on demand for camera projection changes', () => {
    const controller = createMotionBlurController({ intensity: 0.4 });
    const observedDampValues: number[] = [];

    const requestsBeforeReset = controller.getHistoryState().resetRequestCount;

    controller.resetHistory();
    const renderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(() => {
        observedDampValues.push(controller.pass.uniforms.damp.value);
      }),
      clear: vi.fn(),
    };
    const buffer = { texture: {} };

    controller.pass.render(
      renderer as never,
      buffer as never,
      buffer as never,
      0,
      false
    );

    expect(observedDampValues[0]).toBe(0);
    expect(controller.pass.uniforms.damp.value).toBeCloseTo(0.368, 5);
    expect(controller.getHistoryState()).toMatchObject({
      pendingReset: false,
      resetRequestCount: requestsBeforeReset + 1,
      lastResetDamp: 0,
    });

    controller.dispose();
  });

  it('disposes the underlying pass resources', () => {
    const controller = createMotionBlurController({ intensity: 0.1 });
    const disposeSpy = vi.spyOn(controller.pass, 'dispose');

    controller.dispose();

    expect(disposeSpy).toHaveBeenCalled();
  });
});
