import { describe, expect, it, vi } from 'vitest';

import {
  createPerformanceFailoverHandler,
  type ImmersiveRendererHandle,
  type PerformanceFailoverTriggerContext,
} from '../systems/failover/performanceFailover';
import { createImmersiveModeUrl } from '../ui/immersiveUrl';

const IMMERSIVE_URL = createImmersiveModeUrl({
  pathname: '/',
  search: '',
  hash: '',
});

class FakeWindowTarget {
  private readonly target = new EventTarget();

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    this.target.addEventListener(type, listener);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    this.target.removeEventListener(type, listener);
  }

  dispatch(type: string, detail?: unknown): void {
    const event = new Event(type);
    Object.assign(event, { detail });
    this.target.dispatchEvent(event);
  }
}

describe('createPerformanceFailoverHandler', () => {
  const createRenderer = () => {
    const canvas = document.createElement('canvas');
    const setAnimationLoop = vi.fn();
    const dispose = vi.fn();
    const renderer: ImmersiveRendererHandle = {
      domElement: canvas,
      setAnimationLoop,
      dispose,
    };
    return { renderer, canvas, setAnimationLoop, dispose };
  };

  const createContainer = () => {
    const container = document.createElement('div');
    return container;
  };

  it('triggers fallback after sustained low FPS and cleans up renderer', () => {
    const { renderer, canvas, setAnimationLoop, dispose } = createRenderer();
    const removeSpy = vi.spyOn(canvas, 'remove');
    const container = createContainer();
    container.appendChild(canvas);
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();
    const onTrigger = vi.fn();

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      onTrigger,
    });

    const frameDelta = 1 / 20; // 20 FPS
    const framesNeeded = Math.ceil((5 + 0.001) * 20);
    for (let i = 0; i < framesNeeded; i += 1) {
      handler.update(frameDelta);
    }

    expect(handler.hasTriggered()).toBe(true);
    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(dispose).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(renderFallback).toHaveBeenCalledWith(container, {
      reason: 'low-performance',
      immersiveUrl: IMMERSIVE_URL,
      resumeUrl: undefined,
      githubUrl: undefined,
    });
    expect(markAppReady).toHaveBeenCalledWith('fallback');
    expect(onTrigger).toHaveBeenCalled();
    const context = onTrigger.mock
      .calls[0][0] as PerformanceFailoverTriggerContext;
    expect(context.averageFps).toBeLessThan(25);
    expect(context.durationMs).toBeGreaterThanOrEqual(5000);
    expect(context.sampleCount).toBeGreaterThan(0);
    expect(context.minFps).toBeLessThanOrEqual(context.p95Fps);
    expect(context.maxFps).toBeGreaterThanOrEqual(context.p95Fps);
    expect(context.medianFps).toBeGreaterThanOrEqual(context.minFps);
    expect(context.medianFps).toBeLessThanOrEqual(context.maxFps);
  });

  it('ignores sporadic low FPS frames', () => {
    const { renderer } = createRenderer();
    const container = createContainer();
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
    });

    handler.update(1 / 15);
    handler.update(1 / 60);
    handler.update(1 / 15);
    handler.update(1 / 60);

    expect(handler.hasTriggered()).toBe(false);
    expect(renderFallback).not.toHaveBeenCalled();
    expect(markAppReady).not.toHaveBeenCalled();
  });

  it('resets low FPS tracker when frame delta exceeds maxFrameDeltaMs', () => {
    const { renderer } = createRenderer();
    const container = createContainer();
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      maxFrameDeltaMs: 200,
    });

    handler.update(1 / 20);
    handler.update(0.25); // 250ms delta, should reset
    for (let i = 0; i < 80; i += 1) {
      handler.update(1 / 20);
    }

    expect(handler.hasTriggered()).toBe(false);
    expect(renderFallback).not.toHaveBeenCalled();
  });

  it('allows manual fallback triggering with preparation hooks', () => {
    const { renderer, canvas, setAnimationLoop, dispose } = createRenderer();
    const removeSpy = vi.spyOn(canvas, 'remove');
    const container = createContainer();
    container.appendChild(canvas);
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();
    const onTrigger = vi.fn();
    const onBeforeFallback = vi.fn();

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      onTrigger,
      onBeforeFallback,
    });

    handler.triggerFallback('manual');

    expect(handler.hasTriggered()).toBe(true);
    expect(onBeforeFallback).toHaveBeenCalledWith('manual');
    expect(onTrigger).not.toHaveBeenCalled();
    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(dispose).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(renderFallback).toHaveBeenCalledWith(container, {
      reason: 'manual',
      immersiveUrl: IMMERSIVE_URL,
      resumeUrl: undefined,
      githubUrl: undefined,
    });
    expect(markAppReady).toHaveBeenCalledWith('fallback');
  });

  it('can disable automated fallback while keeping manual toggles available', () => {
    const { renderer, canvas, setAnimationLoop, dispose } = createRenderer();
    const removeSpy = vi.spyOn(canvas, 'remove');
    const container = createContainer();
    container.appendChild(canvas);
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      disabled: true,
    });

    for (let i = 0; i < 500; i += 1) {
      handler.update(1 / 10);
    }

    expect(handler.hasTriggered()).toBe(false);
    expect(renderFallback).not.toHaveBeenCalled();
    expect(markAppReady).not.toHaveBeenCalled();

    handler.triggerFallback('manual');

    expect(handler.hasTriggered()).toBe(true);
    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(dispose).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(renderFallback).toHaveBeenCalledWith(container, {
      reason: 'manual',
      immersiveUrl: IMMERSIVE_URL,
      resumeUrl: undefined,
      githubUrl: undefined,
    });
    expect(markAppReady).toHaveBeenCalledWith('fallback');
  });

  it('triggers fallback when console error budget is exceeded', () => {
    const { renderer, canvas, setAnimationLoop, dispose } = createRenderer();
    const removeSpy = vi.spyOn(canvas, 'remove');
    const container = createContainer();
    container.appendChild(canvas);
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();
    const consoleTarget = { error: vi.fn() } as Pick<Console, 'error'>;
    const originalError = consoleTarget.error;
    const windowTarget = new FakeWindowTarget();
    const eventTarget = new EventTarget();
    const onExceeded = vi.fn();

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      consoleFailover: {
        budget: 0,
        consoleTarget,
        windowTarget,
        eventTarget,
        eventName: 'test:console-budget',
        onExceeded,
      },
    });

    const instrumented = consoleTarget.error;
    expect(instrumented).not.toBe(originalError);

    consoleTarget.error('runtime failure');

    expect(handler.hasTriggered()).toBe(true);
    expect(onExceeded).toHaveBeenCalledTimes(1);
    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(dispose).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(renderFallback).toHaveBeenCalledWith(container, {
      reason: 'console-error',
      immersiveUrl: IMMERSIVE_URL,
      resumeUrl: undefined,
      githubUrl: undefined,
    });
    expect(markAppReady).toHaveBeenCalledWith('fallback');
    expect(consoleTarget.error).toBe(originalError);
  });
});
