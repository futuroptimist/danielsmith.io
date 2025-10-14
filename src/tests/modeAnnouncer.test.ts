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

  it('reuses a single announcer instance per document', () => {
    initializeModeAnnouncementObserver();
    const first = getModeAnnouncer();
    const second = getModeAnnouncer();
    expect(second).toBe(first);
  });
});
