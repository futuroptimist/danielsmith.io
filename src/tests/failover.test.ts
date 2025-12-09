import { describe, expect, it } from 'vitest';

import { getSiteStrings } from '../assets/i18n';
import { getPoiDefinitions } from '../scene/poi/registry';
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

  it('honors stored text mode preference when no override is provided', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getModePreference: () => 'text',
    });
    expect(decision).toEqual({
      shouldUseFallback: true,
      reason: 'manual',
    });
  });

  it('ignores stored text preference when immersive override is set', () => {
    const decision = evaluateFailoverDecision({
      search: IMMERSIVE_SEARCH,
      createCanvas: canvasFactory,
      getModePreference: () => 'text',
    });
    expect(decision).toEqual({ shouldUseFallback: false });
  });

  it('defaults to immersive when stored preference is immersive', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getModePreference: () => 'immersive',
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

  it('honors performance bypass for low-memory heuristics', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      search: '?disablePerformanceFailover=1',
      getDeviceMemory: () => 0.5,
      minimumDeviceMemory: 1,
    });

    expect(decision).toEqual({ shouldUseFallback: false });
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

  it('honors performance bypass for data-saver heuristics', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      search: '?disablePerformanceFailover=1',
      getNetworkInformation: () => ({ saveData: true }),
    });

    expect(decision).toEqual({ shouldUseFallback: false });
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

  it('treats 3G effective type as slow for data-saver routing', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      getNetworkInformation: () => ({ effectiveType: '3g' }),
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

  it('routes social and chat link expanders to text mode when mode is not forced', () => {
    const userAgents = [
      'facebookexternalhit/1.1',
      'Twitterbot/1.0',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Discordbot/2.0; +https://discordapp.com',
      'TelegramBot (like TwitterBot)',
      'WhatsApp/2.19.81 A',
      'LinkedInBot/1.0 (+https://www.linkedin.com)',
      'SkypeUriPreview Preview',
      'Pinterest/0.2 (+https://www.pinterest.com/bot.html)',
      'Embedly/0.2 (+https://support.embed.ly/)',
      'ia_archiver (+http://www.alexa.com/site/help/webmasters)',
      'Applebot/0.1; +http://www.apple.com/go/applebot',
      'TeamsBot-LinkPreview',
      'ZoominfoBot (zoominfobot at zoominfo dot com)',
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Line/14.2.0 Mobile Safari/537.36',
      'LineBot/1.0',
      'Bytespider (compatible; bytespider;)',
      'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/114.0.5735.60 Mobile Safari/537.36 Google-InspectionTool',
      'DuckDuckBot/1.0; (+https://duckduckgo.com/duckduckbot)',
      'BingPreview/1.0b',
      'PetalBot (compatible; PetalBot; +https://webmaster.petalsearch.com/site/petalbot)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GoogleOther/1.0)',
      'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
      'Mozilla/5.0 (compatible; ClaudeBot/1.0)',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 ' +
        '(KHTML, like Gecko) Mobile/15E148 Instagram 317.0.0.0.115 (iPhone15,3; iOS 17_3; ' +
        'en_US; scale=3.00; 1290x2796; 535159400)',
      'Snapchat/12.78.0.36 (iPhone15,3; iOS 17.3; gzip)',
      'Viber/21.7.0 iPad6,11 iOS17.3',
      'ViberBot/1.0',
      'vkShare; (+http://vk.com/dev/Share)',
    ];

    for (const userAgent of userAgents) {
      const decision = evaluateFailoverDecision({
        createCanvas: canvasFactory,
        getUserAgent: () => userAgent,
      });

      expect(decision).toEqual({
        shouldUseFallback: true,
        reason: 'automated-client',
      });
    }
  });

  it('routes additional crawler user agents to text mode for link previews', () => {
    const userAgents = [
      'Mozilla/5.0 (compatible; Qwantify/2.4; +https://www.qwant.com/)',
      'Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/bot)',
    ];

    for (const userAgent of userAgents) {
      const decision = evaluateFailoverDecision({
        createCanvas: canvasFactory,
        getUserAgent: () => userAgent,
      });

      expect(decision).toEqual({
        shouldUseFallback: true,
        reason: 'automated-client',
      });
    }
  });

  it('routes Node.js, Go, Rust, and Android HTTP clients to text mode when mode is not forced', () => {
    const userAgents = [
      'Go-http-client/1.1',
      'node-fetch/1.0',
      'axios/1.6.0',
      'reqwest/0.11.4',
      'okhttp/4.12.0',
    ];
    for (const userAgent of userAgents) {
      const decision = evaluateFailoverDecision({
        createCanvas: canvasFactory,
        getUserAgent: () => userAgent,
      });
      expect(decision).toEqual({
        shouldUseFallback: true,
        reason: 'automated-client',
      });
    }
  });

  it('routes social preview and chat crawlers to text mode', () => {
    const userAgents = [
      'redditbot/1.0',
      'Quora Link Preview/1.0',
      'BitlyBot/3.0',
    ];

    for (const userAgent of userAgents) {
      const decision = evaluateFailoverDecision({
        createCanvas: canvasFactory,
        getUserAgent: () => userAgent,
      });

      expect(decision).toEqual({
        shouldUseFallback: true,
        reason: 'automated-client',
      });
    }
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

  it('honors performance bypass for low-end hardware heuristics', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      search: '?disablePerformanceFailover=1',
      getHardwareConcurrency: () => 2,
      minimumHardwareConcurrency: 3,
    });

    expect(decision).toEqual({ shouldUseFallback: false });
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

  it('honors performance bypass for low-end user agent heuristics', () => {
    const decision = evaluateFailoverDecision({
      createCanvas: canvasFactory,
      search: '?disablePerformanceFailover=1',
      getUserAgent: () =>
        'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15',
    });

    expect(decision).toEqual({ shouldUseFallback: false });
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
    expect(immersiveLink?.href).toBe(
      new URL(
        createImmersiveModeUrl(customUrl),
        window.location.origin
      ).toString()
    );
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

  it('renders bio, skills, timeline, and contact information from site strings', () => {
    const container = render('manual');
    const strings = getSiteStrings(container.lang).textFallback;

    const aboutSummary = container.querySelector(
      '.text-fallback__about-summary'
    );
    expect(aboutSummary?.textContent).toBe(strings.about.summary);
    const highlights = Array.from(
      container.querySelectorAll('.text-fallback__highlight')
    ).map((item) => item.textContent);
    expect(highlights).toEqual(strings.about.highlights);

    const skills = Array.from(
      container.querySelectorAll('.text-fallback__skills-item')
    ).map((item) => item.textContent?.trim());
    expect(skills).toEqual(
      strings.skills.items.map((item) => `${item.label}: ${item.value}`)
    );

    const timeline = Array.from(
      container.querySelectorAll('.text-fallback__timeline-entry')
    ).map((entry) => entry.textContent?.replace(/\s+/g, ' ').trim());
    expect(timeline).toEqual(
      strings.timeline.entries.map(
        (entry) =>
          `${entry.role} · ${entry.org} ${entry.period} · ${entry.location} ${entry.summary}`
      )
    );

    const contactLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        '.text-fallback__contact-list .text-fallback__link'
      )
    );
    expect(contactLinks.map((link) => link.href)).toEqual([
      `mailto:${strings.contact.email}`,
      'https://example.com/',
      new URL('/resume.pdf', window.location.origin).toString(),
    ]);
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

  it('localizes fallback descriptions using the active locale', () => {
    const originalLang = document.documentElement.lang;
    document.documentElement.lang = 'en-x-pseudo';

    const container = render('low-memory');
    const description = container.querySelector('.text-fallback__description');
    const localized =
      getSiteStrings('en-x-pseudo').textFallback.reasonDescriptions[
        'low-memory'
      ];

    expect(description?.textContent).toBe(localized);

    document.documentElement.lang = originalLang;
  });

  it('localizes fallback headings using the active locale', () => {
    const originalLang = document.documentElement.lang;
    document.documentElement.lang = 'en-x-pseudo';

    const container = render('data-saver');
    const heading = container.querySelector('.text-fallback__title');
    const localized =
      getSiteStrings('en-x-pseudo').textFallback.reasonHeadings['data-saver'];

    expect(heading?.textContent).toBe(localized);

    document.documentElement.lang = originalLang;
  });

  it('localizes action links using site strings for the active locale', () => {
    const originalLang = document.documentElement.lang;
    document.documentElement.lang = 'ar';

    const container = render('manual');
    const actions = getSiteStrings('ar').textFallback.actions;
    const actionLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        '.text-fallback__actions .text-fallback__link'
      )
    );

    expect(actionLinks.map((link) => link.textContent)).toEqual([
      actions.immersiveLink,
      actions.resumeLink,
      actions.githubLink,
    ]);

    document.documentElement.lang = originalLang;
  });

  it('renders a text portfolio entry for every POI', () => {
    document.documentElement.lang = 'en';
    const container = render('manual');
    const portfolio = container.querySelector('.text-fallback__exhibits');
    expect(portfolio).toBeTruthy();
    const rooms = portfolio?.querySelectorAll('.text-fallback__room') ?? [];
    expect(rooms.length).toBeGreaterThan(0);
    const articles = portfolio?.querySelectorAll('.text-fallback__poi') ?? [];
    expect(articles.length).toBe(getPoiDefinitions().length);
    const metricsHeading = portfolio?.querySelector(
      '.text-fallback__poi-metrics-heading'
    );
    expect(metricsHeading?.textContent).toBe(
      getSiteStrings(container.lang).textFallback.metricsHeading
    );
    const linkList = portfolio?.querySelector('.text-fallback__poi-links');
    expect(linkList?.querySelectorAll('a').length).toBeGreaterThan(0);
  });

  it('describes low-end device fallback messaging', () => {
    document.documentElement.lang = 'en';
    const container = render('low-end-device');
    const description = container.querySelector('.text-fallback__description');
    const reason = getSiteStrings(container.lang).textFallback
      .reasonDescriptions['low-end-device'];
    expect(description?.textContent).toBe(reason);
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

  it('propagates resolved locale metadata to lang attributes', () => {
    const originalLang = document.documentElement.lang;
    document.documentElement.lang = 'ja-JP';
    const container = render('manual');
    const section = container.querySelector<HTMLElement>('.text-fallback');

    expect(document.documentElement.lang).toBe('ja');
    expect(container.lang).toBe('ja');
    expect(section?.lang).toBe('ja');

    document.documentElement.lang = originalLang;
  });

  it('maps pseudo locale to en for lang attributes', () => {
    const originalLang = document.documentElement.lang;
    document.documentElement.lang = 'en-x-pseudo';
    const container = render('manual');
    const section = container.querySelector<HTMLElement>('.text-fallback');

    expect(document.documentElement.lang).toBe('en');
    expect(container.lang).toBe('en');
    expect(section?.lang).toBe('en');

    document.documentElement.lang = originalLang;
  });
});
