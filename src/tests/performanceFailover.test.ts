import { describe, expect, it, vi } from 'vitest';

import { type ConsoleBudgetExceededDetail } from '../systems/failover/consoleBudgetMonitor';
import {
  createPerformanceFailoverHandler,
  type ImmersiveRendererHandle,
  type PerformanceFailoverEventDetail,
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

  const collectFailoverEvents = (
    target: EventTarget
  ): Array<CustomEvent<PerformanceFailoverEventDetail>> => {
    const events: Array<CustomEvent<PerformanceFailoverEventDetail>> = [];
    target.addEventListener('performancefailover', (event) => {
      events.push(event as CustomEvent<PerformanceFailoverEventDetail>);
    });
    return events;
  };

  it('triggers fallback after sustained low FPS and cleans up renderer', () => {
    const { renderer, canvas, setAnimationLoop, dispose } = createRenderer();
    const removeSpy = vi.spyOn(canvas, 'remove');
    const container = createContainer();
    container.appendChild(canvas);
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();
    const onTrigger = vi.fn();
    const onFallback = vi.fn();

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      onTrigger,
      onFallback,
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
    expect(markAppReady).toHaveBeenCalledWith('fallback', 'low-performance');
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
    expect(onFallback).toHaveBeenCalledWith('low-performance', context);
  });

  it('logs metrics when low-FPS fallback triggers without a custom handler', () => {
    const { renderer, canvas, setAnimationLoop, dispose } = createRenderer();
    const removeSpy = vi.spyOn(canvas, 'remove');
    const container = createContainer();
    container.appendChild(canvas);
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
    });

    for (let i = 0; i < 120; i += 1) {
      handler.update(1 / 20);
    }

    expect(handler.hasTriggered()).toBe(true);
    expect(renderFallback).toHaveBeenCalled();
    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(dispose).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(markAppReady).toHaveBeenCalledWith('fallback', 'low-performance');
    expect(warnSpy).toHaveBeenCalled();
    const [message, payload] = warnSpy.mock.calls[0];
    expect(message).toContain('performance-failover');
    expect(payload).toMatchObject({
      averageFps: expect.any(Number),
      minFps: expect.any(Number),
      medianFps: expect.any(Number),
      p95Fps: expect.any(Number),
      maxFps: expect.any(Number),
      sampleCount: expect.any(Number),
      durationMs: expect.any(Number),
    });

    warnSpy.mockRestore();
  });

  it('emits performance failover events with context payloads', () => {
    const { renderer, canvas } = createRenderer();
    const container = createContainer();
    container.appendChild(canvas);
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();
    const eventTarget = new EventTarget();
    const events = collectFailoverEvents(eventTarget);

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      eventTarget,
    });

    for (let i = 0; i < 160; i += 1) {
      handler.update(1 / 20);
    }

    expect(events).toHaveLength(1);
    const detail = events[0].detail;
    expect(detail.reason).toBe('low-performance');
    expect(detail.context).toMatchObject({
      sampleCount: expect.any(Number),
      p95Fps: expect.any(Number),
    });
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
    const onFallback = vi.fn();

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      onTrigger,
      onBeforeFallback,
      onFallback,
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
    expect(markAppReady).toHaveBeenCalledWith('fallback', 'manual');
    expect(onFallback).toHaveBeenCalledWith('manual', undefined);
  });

  it('warns when failover event dispatch fails', () => {
    const { renderer } = createRenderer();
    const container = createContainer();
    const markAppReady = vi.fn();
    const renderFallback = vi.fn();
    const failingTarget = {
      dispatchEvent: vi.fn(() => {
        throw new Error('dispatch failed');
      }),
    } as unknown as EventTarget;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handler = createPerformanceFailoverHandler({
      renderer,
      container,
      immersiveUrl: IMMERSIVE_URL,
      markAppReady,
      renderFallback,
      eventTarget: failingTarget,
    });

    handler.triggerFallback('manual');

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to dispatch performance failover event.',
      expect.any(Error)
    );

    warnSpy.mockRestore();
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
    expect(markAppReady).toHaveBeenCalledWith('fallback', 'manual');
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
    const failoverEvents = collectFailoverEvents(eventTarget);
    const onExceeded = vi.fn();
    const onFallback = vi.fn();

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
      onFallback,
      eventTarget,
    });

    const instrumented = consoleTarget.error;
    expect(instrumented).not.toBe(originalError);

    consoleTarget.error('runtime failure');

    const consoleDetail = onExceeded.mock
      .calls[0][0] as ConsoleBudgetExceededDetail;

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
    expect(markAppReady).toHaveBeenCalledWith('fallback', 'console-error');
    expect(onFallback).toHaveBeenCalledWith('console-error', consoleDetail);
    expect(consoleDetail.count).toBe(1);
    expect(consoleDetail.sourceCounts['console-error']).toBe(1);
    expect(failoverEvents).toHaveLength(1);
    expect(failoverEvents[0].detail.reason).toBe('console-error');
    expect(failoverEvents[0].detail.context).toEqual(consoleDetail);
    expect(consoleTarget.error).toBe(originalError);
  });
});
