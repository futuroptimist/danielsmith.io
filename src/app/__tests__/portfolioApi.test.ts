import { afterEach, describe, expect, it } from 'vitest';

import {
  deletePortfolioSection,
  ensurePortfolioApi,
  setPortfolioSection,
  type PortfolioApi,
} from '../portfolioApi';

describe('portfolio API namespace helpers', () => {
  afterEach(() => {
    delete window.portfolio;
  });

  it('creates the window.portfolio namespace', () => {
    const portfolio = ensurePortfolioApi();

    expect(portfolio).toBe(window.portfolio);
    expect(window.portfolio).toEqual({});
  });

  it('preserves existing sections when adding a new section', () => {
    const githubMetrics = {
      getDiagnostics: () => ({}),
    } as PortfolioApi['githubMetrics'];
    window.portfolio = { githubMetrics };

    const audio = {
      getState: () => ({
        preferenceEnabled: true,
        ambientEnabled: true,
        ambientSourcesPlaying: [],
        ambientSourcesPlayingCount: 0,
        ambientBedVolumes: [],
        footstepEnabled: true,
        footstepPlaying: false,
        masterVolume: 1,
        baseVolume: 1,
        audioContextState: 'unknown' as const,
        storageKeyVersion: 'test',
        activeStorageKey: 'test',
      }),
    };

    setPortfolioSection('audio', audio);

    expect(window.portfolio.githubMetrics).toBe(githubMetrics);
    expect(window.portfolio.audio).toBe(audio);
  });

  it('replaces one section without deleting sibling sections', () => {
    const firstGraphics = {
      getMotionBlurIntensity: () => 0,
      setMotionBlurIntensity: () => undefined,
      getMotionBlurState: () => ({
        enabled: false,
        damp: 0,
        intensity: 0,
        pendingHistoryReset: false,
        historyResetRequestCount: 0,
        lastHistoryResetDamp: null,
      }),
      resetMotionBlurHistory: () => undefined,
    };
    const nextGraphics = { ...firstGraphics, getMotionBlurIntensity: () => 1 };
    const poi = { getTooltipState: () => ({}) } as PortfolioApi['poi'];
    window.portfolio = { graphics: firstGraphics, poi };

    setPortfolioSection('graphics', nextGraphics);

    expect(window.portfolio.graphics).toBe(nextGraphics);
    expect(window.portfolio.poi).toBe(poi);
  });

  it('operates safely when window.portfolio already exists', () => {
    const existing = { world: undefined } satisfies PortfolioApi;
    window.portfolio = existing;

    const portfolio = ensurePortfolioApi();
    deletePortfolioSection('world');

    expect(portfolio).toBe(existing);
    expect(window.portfolio).toBe(existing);
    expect('world' in window.portfolio).toBe(false);
  });
});
