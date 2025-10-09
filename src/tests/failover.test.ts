import { describe, expect, it } from 'vitest';

import {
  evaluateFailoverDecision,
  isWebglSupported,
  renderTextFallback,
  type FallbackReason,
} from '../failover';
import { createImmersiveModeUrl } from '../immersiveUrl';

const IMMERSIVE_URL = createImmersiveModeUrl({
  pathname: '/',
  search: '',
  hash: '',
});
const IMMERSIVE_SEARCH = IMMERSIVE_URL.includes('?')
  ? `?${IMMERSIVE_URL.split('?')[1]}`
  : '';

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
      search: IMMERSIVE_SEARCH,
      createCanvas: canvasFactory,
    });
    expect(decision).toEqual({ shouldUseFallback: false });
  });

  it('allows immersive override even when WebGL detection fails', () => {
    const decision = evaluateFailoverDecision({
      search: IMMERSIVE_SEARCH,
      createCanvas: () =>
        ({
          getContext: () => null,
        }) as unknown as HTMLCanvasElement,
    });
    expect(decision).toEqual({ shouldUseFallback: false });
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
      search: IMMERSIVE_SEARCH,
      createCanvas: canvasFactory,
      getDeviceMemory: () => 0.25,
      minimumDeviceMemory: 1,
    });
    expect(decision).toEqual({ shouldUseFallback: false });
  });

  it('routes automated clients to text mode when mode is not forced', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getUserAgent: () =>
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'automated-client',
    });
  });

  it('does not force fallback for automated client when immersive override is present', () => {
    const decision = evaluateFailoverDecision({
      search: IMMERSIVE_SEARCH,
      createCanvas: canvasFactory,
      getUserAgent: () => 'HeadlessChrome/118.0.0.0',
    });
    expect(decision).toEqual({ shouldUseFallback: false });
  });

  it('ignores automated heuristics when user agent is unavailable', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getUserAgent: () => undefined,
    });
    expect(decision).toEqual({ shouldUseFallback: false });
  });
});

describe('renderTextFallback', () => {
  const render = (reason: FallbackReason) => {
    const container = document.createElement('div');
    renderTextFallback(container, {
      reason,
      immersiveUrl: IMMERSIVE_URL,
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

  it('describes automated client fallback messaging', () => {
    const container = render('automated-client');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/automated client/i);
  });

  it('applies rtl direction metadata based on document language', () => {
    const originalLang = document.documentElement.lang;
    const originalDir = document.documentElement.getAttribute('dir');
    const originalDataset = document.documentElement.dataset.localeDirection;
    document.documentElement.lang = 'ar';
    document.documentElement.removeAttribute('dir');
    delete document.documentElement.dataset.localeDirection;

    const container = render('manual');
    const section = container.querySelector<HTMLElement>('.text-fallback');

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.dataset.localeDirection).toBe('rtl');
    expect(container.dataset.localeDirection).toBe('rtl');
    expect(section?.dir).toBe('rtl');
    expect(section?.style.textAlign).toBe('right');

    document.documentElement.lang = originalLang;
    if (originalDir) {
      document.documentElement.setAttribute('dir', originalDir);
    } else {
      document.documentElement.removeAttribute('dir');
    }
    if (originalDataset) {
      document.documentElement.dataset.localeDirection = originalDataset;
    } else {
      delete document.documentElement.dataset.localeDirection;
    }
  });

  it('falls back to navigator language when document language is empty', () => {
    const originalLang = document.documentElement.lang;
    const originalDir = document.documentElement.getAttribute('dir');
    const originalDataset = document.documentElement.dataset.localeDirection;
    const originalNavigatorLanguage = Object.getOwnPropertyDescriptor(
      window.navigator,
      'language'
    );
    document.documentElement.lang = '';
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'fa-IR',
    });

    const container = render('manual');

    expect(container.dataset.localeDirection).toBe('rtl');
    expect(document.documentElement.dir).toBe('rtl');

    document.documentElement.lang = originalLang;
    if (originalDir) {
      document.documentElement.setAttribute('dir', originalDir);
    } else {
      document.documentElement.removeAttribute('dir');
    }
    if (originalDataset) {
      document.documentElement.dataset.localeDirection = originalDataset;
    } else {
      delete document.documentElement.dataset.localeDirection;
    }
    if (originalNavigatorLanguage) {
      Object.defineProperty(window.navigator, 'language', originalNavigatorLanguage);
    }
  });
});
