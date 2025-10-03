import { describe, expect, it, vi } from 'vitest';

import {
  evaluateFailoverDecision,
  isWebglSupported,
  renderTextFallback,
  type FallbackReason,
} from '../failover';

describe('isWebglSupported', () => {
  it('returns true when any WebGL context is available', () => {
    const supported = isWebglSupported({
      createCanvas: () =>
        ({
          getContext: (name: string) => (name === 'webgl' ? {} : null),
        }) as unknown as HTMLCanvasElement,
    });
    expect(supported).toBe(true);
  });

  it('returns false when context creation fails', () => {
    const supported = isWebglSupported({
      createCanvas: () =>
        ({
          getContext: () => null,
        }) as unknown as HTMLCanvasElement,
    });
    expect(supported).toBe(false);
  });
});

describe('evaluateFailoverDecision', () => {
  const canvasFactory = () =>
    ({
      getContext: () => ({}) as RenderingContext,
    }) as unknown as HTMLCanvasElement;

  it('forces fallback when mode=text is set', () => {
    const decision = evaluateFailoverDecision({
      search: '?mode=text',
      createCanvas: canvasFactory,
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'manual',
    });
  });

  it('returns fallback when WebGL is unavailable', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: () =>
        ({
          getContext: () => null,
        }) as unknown as HTMLCanvasElement,
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'webgl-unsupported',
    });
  });

  it('respects manual immersive override when WebGL works', () => {
    const decision = evaluateFailoverDecision({
      search: '?mode=immersive',
      createCanvas: canvasFactory,
    });
    expect(decision).toEqual({ shouldUseFallback: false });
  });

  it('falls back even with immersive override if WebGL fails', () => {
    const decision = evaluateFailoverDecision({
      search: '?mode=immersive',
      createCanvas: () =>
        ({
          getContext: () => null,
        }) as unknown as HTMLCanvasElement,
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'webgl-unsupported',
    });
  });

  it('triggers fallback when reported memory is below the threshold', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getDeviceMemory: () => 0.5,
      minimumDeviceMemory: 1,
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'low-memory',
    });
  });

  it('allows immersive override when memory is low but WebGL works', () => {
    const decision = evaluateFailoverDecision({
      search: '?mode=immersive',
      createCanvas: canvasFactory,
      getDeviceMemory: () => 0.25,
      minimumDeviceMemory: 1,
    });
    expect(decision).toEqual({ shouldUseFallback: false });
  });

  it('auto routes automated clients to the text fallback', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      userAgent:
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'automated-client',
    });
  });

  it('can be customised with alternate automated client detection heuristics', () => {
    const detector = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      userAgent: 'ExampleUA/1.0',
      isAutomatedClient: detector,
    });
    expect(detector).toHaveBeenCalledWith('ExampleUA/1.0');
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'automated-client',
    });

    const override = evaluateFailoverDecision({
      search: '?mode=immersive',
      createCanvas: canvasFactory,
      userAgent: 'ExampleUA/1.0',
      isAutomatedClient: () => true,
    });
    expect(override).toEqual({ shouldUseFallback: false });
  });
});

describe('renderTextFallback', () => {
  const render = (reason: FallbackReason) => {
    const container = document.createElement('div');
    renderTextFallback(container, {
      reason,
      immersiveUrl: '/?mode=immersive',
      resumeUrl: '/resume.pdf',
      githubUrl: 'https://example.com',
    });
    return container;
  };

  it('renders fallback messaging with manual reason', () => {
    const container = render('manual');
    expect(container.getAttribute('data-mode')).toBe('text');
    const title = container.querySelector('.text-fallback__title');
    expect(title?.textContent).toMatch(/Text-only mode/);
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('.text-fallback__link')
    );
    expect(links.map((link) => link.href)).toContain('https://example.com/');
  });

  it('indicates WebGL unsupported reason', () => {
    const container = render('webgl-unsupported');
    const section = container.querySelector('.text-fallback');
    expect(section?.getAttribute('data-reason')).toBe('webgl-unsupported');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/WebGL/);
  });

  it('describes memory-driven fallback messaging', () => {
    const container = render('low-memory');
    const section = container.querySelector('.text-fallback');
    expect(section?.getAttribute('data-reason')).toBe('low-memory');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/memory/i);
  });

  it('announces performance-triggered fallback messaging', () => {
    const container = render('low-performance');
    const section = container.querySelector('.text-fallback');
    expect(section?.getAttribute('data-reason')).toBe('low-performance');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/frame/);
  });

  it('explains automated client fallback messaging', () => {
    const container = render('automated-client');
    const section = container.querySelector('.text-fallback');
    expect(section?.getAttribute('data-reason')).toBe('automated-client');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/automated/i);
  });
});
