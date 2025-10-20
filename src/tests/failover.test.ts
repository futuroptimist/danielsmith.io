import { describe, expect, it } from 'vitest';

import {
  evaluateFailoverDecision,
  isWebglSupported,
  renderTextFallback,
  type FallbackReason,
  type RenderTextFallbackOptions,
} from '../systems/failover';
import { createImmersiveModeUrl } from '../ui/immersiveUrl';

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

  it('routes data-saver clients to text mode when mode is not forced', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getNetworkInformation: () => ({ saveData: true }),
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'data-saver',
    });
  });

  it('reads save-data hints from navigator.connection when available', () => {
    const original = Object.getOwnPropertyDescriptor(
      window.navigator,
      'connection'
    );
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });

    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
    });

    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'data-saver',
    });

    if (original) {
      Object.defineProperty(window.navigator, 'connection', original);
    } else {
      delete (window.navigator as Navigator & { connection?: unknown })
        .connection;
    }
  });

  it('ignores navigator.connection when no data-saver hints are present', () => {
    const original = Object.getOwnPropertyDescriptor(
      window.navigator,
      'connection'
    );
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: {},
    });

    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
    });

    expect(decision).toEqual({ shouldUseFallback: false });

    if (original) {
      Object.defineProperty(window.navigator, 'connection', original);
    } else {
      delete (window.navigator as Navigator & { connection?: unknown })
        .connection;
    }
  });

  it('routes slow connections to text mode when mode is not forced', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getNetworkInformation: () => ({ effectiveType: 'slow-2g' }),
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'data-saver',
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

  it('respects immersive override even when data-saver is active', () => {
    const decision = evaluateFailoverDecision({
      search: IMMERSIVE_SEARCH,
      createCanvas: canvasFactory,
      getNetworkInformation: () => ({ saveData: true }),
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

  it('routes low hardware concurrency devices to text mode', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getHardwareConcurrency: () => 2,
      minimumHardwareConcurrency: 3,
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'low-end-device',
    });
  });

  it('routes low-end user agents to text mode', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getUserAgent: () =>
        'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15',
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'low-end-device',
    });
  });

  it('does not force fallback for low hardware concurrency when immersive override is present', () => {
    const decision = evaluateFailoverDecision({
      search: IMMERSIVE_SEARCH,
      createCanvas: canvasFactory,
      getHardwareConcurrency: () => 1,
      minimumHardwareConcurrency: 3,
    });
    expect(decision).toEqual({ shouldUseFallback: false });
  });

  it('routes webdriver-flagged clients to text mode when mode is not forced', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getUserAgent: () => undefined,
      getIsWebDriver: () => true,
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

  it('does not force fallback when webdriver flag is set but immersive override is present', () => {
    const decision = evaluateFailoverDecision({
      search: IMMERSIVE_SEARCH,
      createCanvas: canvasFactory,
      getIsWebDriver: () => true,
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
  const render = (
    reason: FallbackReason,
    overrides: Partial<RenderTextFallbackOptions> = {}
  ) => {
    const container = document.createElement('div');
    renderTextFallback(container, {
      reason,
      resumeUrl: '/resume.pdf',
      githubUrl: 'https://example.com',
      ...overrides,
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

  it('defaults immersive link to the override-enforced URL when unspecified', () => {
    const container = render('manual');
    const immersiveLink = container.querySelector<HTMLAnchorElement>(
      '[data-action="immersive"]'
    );
    expect(immersiveLink?.href).toBe(
      new URL(createImmersiveModeUrl(), window.location.origin).toString()
    );
  });

  it('respects custom immersive links when provided', () => {
    const customUrl = 'https://portfolio.test/demo?force=immersive';
    const container = render('manual', { immersiveUrl: customUrl });
    const immersiveLink = container.querySelector<HTMLAnchorElement>(
      '[data-action="immersive"]'
    );
    expect(immersiveLink?.href).toBe(customUrl);
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

  it('signals console error fallback messaging when runtime errors occur', () => {
    const container = render('console-error');
    const section = container.querySelector('.text-fallback');
    expect(section?.getAttribute('data-reason')).toBe('console-error');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/runtime error/i);
  });

  it('announces performance-triggered fallback messaging', () => {
    const container = render('low-performance');
    const section = container.querySelector('.text-fallback');
    expect(section?.getAttribute('data-reason')).toBe('low-performance');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/frame/);
  });

  it('highlights data-saver fallback messaging', () => {
    const container = render('data-saver');
    const section = container.querySelector('.text-fallback');
    expect(section?.getAttribute('data-reason')).toBe('data-saver');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/data-saver|bandwidth/i);
  });

  it('describes automated client fallback messaging', () => {
    const container = render('automated-client');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/automated client/i);
  });

  it('describes low-end device fallback messaging', () => {
    const container = render('low-end-device');
    const description = container.querySelector('.text-fallback__description');
    expect(description?.textContent).toMatch(/lightweight device/i);
  });

  it('applies rtl direction metadata based on document language', () => {
    const originalLang = document.documentElement.lang;
    const originalDir = document.documentElement.getAttribute('dir');
    const originalDataset = document.documentElement.dataset.localeDirection;
    const originalScript = document.documentElement.dataset.localeScript;
    document.documentElement.lang = 'ar';
    document.documentElement.removeAttribute('dir');
    delete document.documentElement.dataset.localeDirection;
    delete document.documentElement.dataset.localeScript;

    const container = render('manual');
    const section = container.querySelector<HTMLElement>('.text-fallback');

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.dataset.localeDirection).toBe('rtl');
    expect(document.documentElement.dataset.localeScript).toBe('rtl');
    expect(container.dataset.localeDirection).toBe('rtl');
    expect(container.dataset.localeScript).toBe('rtl');
    expect(section?.dir).toBe('rtl');
    expect(section?.style.textAlign).toBe('right');
    expect(section?.dataset.localeScript).toBe('rtl');

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
    if (originalScript) {
      document.documentElement.dataset.localeScript = originalScript;
    } else {
      delete document.documentElement.dataset.localeScript;
    }
  });

  it('falls back to navigator language when document language is empty', () => {
    const originalLang = document.documentElement.lang;
    const originalDir = document.documentElement.getAttribute('dir');
    const originalDataset = document.documentElement.dataset.localeDirection;
    const originalScript = document.documentElement.dataset.localeScript;
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
    expect(container.dataset.localeScript).toBe('rtl');
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
    if (originalScript) {
      document.documentElement.dataset.localeScript = originalScript;
    } else {
      delete document.documentElement.dataset.localeScript;
    }
    if (originalNavigatorLanguage) {
      Object.defineProperty(
        window.navigator,
        'language',
        originalNavigatorLanguage
      );
    }
  });

  it('applies cjk script metadata when the document language is Chinese', () => {
    const originalLang = document.documentElement.lang;
    const originalDir = document.documentElement.getAttribute('dir');
    const originalDirection = document.documentElement.dataset.localeDirection;
    const originalScript = document.documentElement.dataset.localeScript;
    document.documentElement.lang = 'zh-CN';
    document.documentElement.removeAttribute('dir');
    delete document.documentElement.dataset.localeDirection;
    delete document.documentElement.dataset.localeScript;

    const container = render('manual');
    const section = container.querySelector<HTMLElement>('.text-fallback');

    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.dataset.localeScript).toBe('cjk');
    expect(container.dataset.localeScript).toBe('cjk');
    expect(section?.dataset.localeScript).toBe('cjk');

    document.documentElement.lang = originalLang;
    if (originalDir) {
      document.documentElement.setAttribute('dir', originalDir);
    } else {
      document.documentElement.removeAttribute('dir');
    }
    if (originalDirection) {
      document.documentElement.dataset.localeDirection = originalDirection;
    } else {
      delete document.documentElement.dataset.localeDirection;
    }
    if (originalScript) {
      document.documentElement.dataset.localeScript = originalScript;
    } else {
      delete document.documentElement.dataset.localeScript;
    }
  });
});
