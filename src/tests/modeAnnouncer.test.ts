import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
    expect(region?.textContent).toMatch(/frame rates dipped/i);
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
    expect(region?.textContent).toMatch(/webgl is unavailable/i);
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
    expect(region?.textContent).toMatch(/frame rates dipped/i);
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
    expect(region?.textContent).toMatch(/webgl is unavailable/i);
  });
});
