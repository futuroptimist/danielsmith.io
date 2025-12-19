import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getModeAnnouncerStrings } from '../assets/i18n';
import { renderTextFallback } from '../systems/failover';
import {
  __resetModeAnnouncementForTests,
  createModeAnnouncer,
  getModeAnnouncer,
  initializeModeAnnouncementObserver,
} from '../ui/accessibility/modeAnnouncer';

const flushObserver = async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

describe('createModeAnnouncer', () => {
  afterEach(() => {
    __resetModeAnnouncementForTests();
  });

  it('creates a visually hidden live region with default messaging', () => {
    const announcer = createModeAnnouncer();
    expect(announcer.element.getAttribute('role')).toBe('status');
    expect(announcer.element.getAttribute('aria-live')).toBe('polite');
    announcer.announceFallback('manual');
    expect(announcer.element.textContent).toMatch(/text mode enabled/i);
    announcer.announceFallback('low-end-device');
    expect(announcer.element.textContent).toMatch(
      /lightweight device profile/i
    );
    announcer.announceFallback('data-saver');
    expect(announcer.element.textContent).toMatch(/data-saver experience/i);
    announcer.announceFallback('console-error');
    expect(announcer.element.textContent).toMatch(/runtime error/i);
    announcer.announceImmersiveReady();
    expect(announcer.element.textContent).toMatch(/immersive mode ready/i);
  });

  it('respects custom messages when provided', () => {
    const doc = document.implementation.createHTMLDocument('Mode');
    const announcer = createModeAnnouncer({
      documentTarget: doc,
      immersiveMessage: 'Custom immersive',
      fallbackMessages: { manual: 'Custom manual message' },
    });
    announcer.announceFallback('manual');
    expect(announcer.element.textContent).toBe('Custom manual message');
    announcer.announceImmersiveReady();
    expect(announcer.element.textContent).toBe('Custom immersive');
    announcer.dispose();
  });

  it('updates message catalogs and re-announces the active fallback when requested', () => {
    const announcer = createModeAnnouncer({
      fallbackMessages: { manual: 'Initial manual' },
      immersiveMessage: 'Initial immersive',
    });
    announcer.announceFallback('manual');
    announcer.setMessages(
      { fallbackMessages: { manual: 'Localized manual' } },
      { reannounce: true }
    );
    expect(announcer.element.textContent).toBe('Localized manual');

    announcer.announceImmersiveReady();
    announcer.setMessages({ immersiveReady: 'Localized immersive' });
    announcer.announceImmersiveReady();
    expect(announcer.element.textContent).toBe('Localized immersive');
    announcer.dispose();
  });

  it('re-announces the immersive message when reannounce is requested', () => {
    const announcer = createModeAnnouncer({
      immersiveMessage: 'Initial immersive',
    });

    announcer.announceImmersiveReady();
    announcer.setMessages(
      { immersiveReady: 'Localized immersive' },
      { reannounce: true }
    );

    expect(announcer.element.textContent).toBe('Localized immersive');
    announcer.dispose();
  });

  it('increments the announcement sequence when re-announcing identical text', () => {
    const announcer = createModeAnnouncer({
      fallbackMessages: { manual: 'Shared announcement' },
    });
    const region = announcer.element;

    announcer.announceFallback('manual');
    const firstSequence = region.dataset.announcementSeq;

    announcer.setMessages({}, { reannounce: true });

    expect(region.dataset.announcementSeq).not.toBe(firstSequence);
    expect(region.textContent).toBe('Shared announcement');
    announcer.dispose();
  });

  it('suppresses duplicate fallback announcements while handling updates', async () => {
    const announcer = createModeAnnouncer();
    const region = announcer.element;
    const setSpy = vi.spyOn(region, 'textContent', 'set');

    announcer.announceFallback('manual');
    await flushObserver();
    const initialSetCount = setSpy.mock.calls.length;
    expect(initialSetCount).toBeGreaterThanOrEqual(1);
    const firstMessage = region.textContent;

    announcer.announceFallback('manual');
    await flushObserver();
    expect(setSpy.mock.calls.length).toBe(initialSetCount);
    expect(region.textContent).toBe(firstMessage);

    announcer.announceFallback('console-error');
    await flushObserver();
    expect(setSpy.mock.calls.length).toBeGreaterThan(initialSetCount);
    const lastCall = setSpy.mock.calls.at(-1);
    const finalAnnouncement =
      (lastCall && lastCall[0]) ?? region.textContent ?? '';
    expect(finalAnnouncement).toMatch(/runtime error/i);

    setSpy.mockRestore();
  });

  it('re-announces when the fallback reason changes even with matching text', async () => {
    const announcer = createModeAnnouncer({
      fallbackMessages: {
        manual: 'Shared announcement',
        'low-memory': 'Shared announcement',
      },
    });
    const region = announcer.element;
    const setSpy = vi.spyOn(region, 'textContent', 'set');

    announcer.announceFallback('manual');
    await flushObserver();
    const initialCallCount = setSpy.mock.calls.length;

    announcer.announceFallback('low-memory');
    await flushObserver();

    expect(setSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
    const lastAnnouncement = setSpy.mock.calls.at(-1)?.at(0);
    expect(lastAnnouncement).toBe('Shared announcement');

    setSpy.mockRestore();
  });
});

describe('initializeModeAnnouncementObserver', () => {
  beforeEach(() => {
    __resetModeAnnouncementForTests();
    document.documentElement.dataset.appMode = 'loading';
    document.documentElement.setAttribute('data-app-loading', '');
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.documentElement.dataset.appMode = 'loading';
    document.documentElement.setAttribute('data-app-loading', '');
    document.body.innerHTML = '';
    __resetModeAnnouncementForTests();
  });

  const englishModeAnnouncements = getModeAnnouncerStrings('en');

  it('announces fallback transitions using the rendered reason', async () => {
    initializeModeAnnouncementObserver();
    const container = document.createElement('div');
    document.body.append(container);
    renderTextFallback(container, {
      reason: 'low-performance',
      immersiveUrl: '/immersive',
    });
    document.documentElement.dataset.appMode = 'fallback';
    await flushObserver();
    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toBe(
      englishModeAnnouncements.fallbackReasons['low-performance']
    );
  });

  it('localizes fallback announcements based on the document language', () => {
    const originalLang = document.documentElement.lang;
    document.documentElement.lang = 'ar';
    const container = document.createElement('div');
    document.body.append(container);

    renderTextFallback(container, {
      reason: 'data-saver',
      immersiveUrl: '/immersive',
    });

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toContain('تجربة موفّرة للبيانات');

    document.documentElement.lang = originalLang;
  });

  it('announces data-saver failover reasons surfaced by the fallback view', async () => {
    initializeModeAnnouncementObserver();
    const container = document.createElement('div');
    document.body.append(container);
    renderTextFallback(container, {
      reason: 'data-saver',
      immersiveUrl: '/immersive',
    });
    document.documentElement.dataset.appMode = 'fallback';
    await flushObserver();
    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toMatch(/data-saver experience/i);
  });

  it('announces immersive transitions when the mode changes back', async () => {
    initializeModeAnnouncementObserver();
    const announcer = getModeAnnouncer();
    announcer.element.textContent = '';
    document.documentElement.dataset.appMode = 'immersive';
    await flushObserver();
    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toMatch(/immersive mode ready/i);
  });

  it('announces the current mode immediately when already set', () => {
    const container = document.createElement('div');
    document.body.append(container);
    renderTextFallback(container, {
      reason: 'console-error',
      immersiveUrl: '/immersive',
    });
    document.documentElement.dataset.appMode = 'fallback';

    initializeModeAnnouncementObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toMatch(/runtime error/i);
  });

  it('announces fallback reasons stored on the document root', () => {
    document.documentElement.dataset.appMode = 'fallback';
    document.documentElement.dataset.fallbackReason = 'data-saver';
    document.body.innerHTML = '';

    initializeModeAnnouncementObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toMatch(/data-saver experience/i);
  });

  it('reuses a single announcer instance per document', () => {
    initializeModeAnnouncementObserver();
    const first = getModeAnnouncer();
    const second = getModeAnnouncer();
    expect(second).toBe(first);
  });

  it('announces prerendered fallback views even when the mode attribute is missing', () => {
    const container = document.createElement('div');
    document.body.append(container);
    renderTextFallback(container, {
      reason: 'webgl-unsupported',
      immersiveUrl: '/immersive',
    });
    document.documentElement.removeAttribute('data-app-mode');

    initializeModeAnnouncementObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toBe(
      englishModeAnnouncements.fallbackReasons['webgl-unsupported']
    );
  });

  it('responds when a fallback view is injected without changing the mode attribute', async () => {
    initializeModeAnnouncementObserver();
    document.documentElement.removeAttribute('data-app-mode');
    const container = document.createElement('div');
    document.body.append(container);

    renderTextFallback(container, {
      reason: 'low-end-device',
      immersiveUrl: '/immersive',
    });

    await flushObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toMatch(/lightweight device profile/i);
  });

  it('announces manual fallbacks when injected markup omits valid reasons', async () => {
    initializeModeAnnouncementObserver();
    document.documentElement.removeAttribute('data-app-mode');

    const container = document.createElement('div');
    document.body.append(container);

    const fallback = document.createElement('section');
    fallback.className = 'text-fallback';
    fallback.dataset.reason = 'unknown-reason';
    container.appendChild(fallback);

    await flushObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toBe(
      englishModeAnnouncements.fallbackReasons.manual
    );
    expect(document.documentElement.dataset.fallbackReason).toBe('manual');
  });

  it('re-announces when the fallback reason on the document root changes', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    renderTextFallback(container, {
      reason: 'manual',
      immersiveUrl: '/immersive',
    });
    document.documentElement.dataset.appMode = 'fallback';

    initializeModeAnnouncementObserver();

    document.documentElement.dataset.fallbackReason = 'low-performance';

    await flushObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toBe(
      englishModeAnnouncements.fallbackReasons['low-performance']
    );
  });

  it('re-announces when the rendered fallback view updates its reason', async () => {
    initializeModeAnnouncementObserver();

    const container = document.createElement('div');
    document.body.append(container);

    renderTextFallback(container, {
      reason: 'automated-client',
      immersiveUrl: '/immersive',
    });
    document.documentElement.dataset.appMode = 'fallback';

    await flushObserver();

    const fallbackView = document.querySelector<HTMLElement>('.text-fallback');
    fallbackView?.setAttribute('data-reason', 'webgl-unsupported');

    await flushObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toBe(
      englishModeAnnouncements.fallbackReasons['webgl-unsupported']
    );
  });

  it('refreshes announcements when the fallback view re-renders with the same reason', async () => {
    initializeModeAnnouncementObserver();

    const container = document.createElement('div');
    document.body.append(container);

    renderTextFallback(container, {
      reason: 'manual',
      immersiveUrl: '/immersive',
    });
    document.documentElement.dataset.appMode = 'fallback';

    await flushObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    const initialSequence = region?.dataset.announcementSeq;

    container.innerHTML = '';

    renderTextFallback(container, {
      reason: 'manual',
      immersiveUrl: '/immersive',
    });

    await flushObserver();

    expect(region?.dataset.announcementSeq).not.toBe(initialSequence);
    expect(region?.textContent).toBe(
      englishModeAnnouncements.fallbackReasons.manual
    );
  });

  it('defaults to manual announcements when fallback reasons are cleared', async () => {
    initializeModeAnnouncementObserver();

    const container = document.createElement('div');
    document.body.append(container);

    renderTextFallback(container, {
      reason: 'low-performance',
      immersiveUrl: '/immersive',
    });
    document.documentElement.dataset.appMode = 'fallback';

    await flushObserver();

    const fallbackView = document.querySelector<HTMLElement>('.text-fallback');
    fallbackView?.removeAttribute('data-reason');

    await flushObserver();

    const region = document.querySelector<HTMLElement>(
      '[data-mode-announcer="true"]'
    );
    expect(region?.textContent).toBe(
      englishModeAnnouncements.fallbackReasons.manual
    );
    expect(document.documentElement.dataset.fallbackReason).toBe('manual');
  });
});
