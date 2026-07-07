import { afterEach, describe, expect, it } from 'vitest';

import {
  ensurePortfolioNamespace,
  setPortfolioSection,
  type PortfolioApiNamespace,
} from '../app/portfolioApi';

const resetPortfolioApi = () => {
  delete window.portfolio;
};

describe('portfolio API namespace helpers', () => {
  afterEach(() => {
    resetPortfolioApi();
  });

  it('creates the window.portfolio namespace when missing', () => {
    expect(window.portfolio).toBeUndefined();

    const namespace = ensurePortfolioNamespace();

    expect(namespace).toEqual({});
    expect(window.portfolio).toBe(namespace);
  });

  it('preserves existing sections when adding a new section', () => {
    const existingGraphics = {
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
    } satisfies NonNullable<PortfolioApiNamespace['graphics']>;
    window.portfolio = { graphics: existingGraphics };

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
        storageKeyVersion: 'v1',
        activeStorageKey: 'audio',
      }),
    } satisfies NonNullable<PortfolioApiNamespace['audio']>;

    setPortfolioSection('audio', audio);

    expect(window.portfolio.graphics).toBe(existingGraphics);
    expect(window.portfolio.audio).toBe(audio);
  });

  it('replaces one section without deleting sibling sections', () => {
    const firstPoi = { getTooltipState: () => createTooltipState('first') };
    const nextPoi = { getTooltipState: () => createTooltipState('next') };
    const githubMetrics = { getDiagnostics: () => ({}) } as NonNullable<
      PortfolioApiNamespace['githubMetrics']
    >;
    window.portfolio = { githubMetrics, poi: firstPoi };

    setPortfolioSection('poi', nextPoi);

    expect(window.portfolio.githubMetrics).toBe(githubMetrics);
    expect(window.portfolio.poi).toBe(nextPoi);
  });

  it('safely reuses window.portfolio when it already exists', () => {
    const existingNamespace: PortfolioApiNamespace = {};
    window.portfolio = existingNamespace;

    const namespace = ensurePortfolioNamespace();

    expect(namespace).toBe(existingNamespace);
    expect(window.portfolio).toBe(existingNamespace);
  });
});

const createTooltipState = (poiId: string) => ({
  overlayVisiblePoiId: poiId,
  worldTooltipVisible: true,
  worldTooltipPoiId: poiId,
  worldTooltipTitle: poiId,
  markerLabelVisible: true,
  markerLabelPoiId: poiId,
  visibleMarkerLabelCount: 1,
  visibleMarkerLabelPoiIds: [poiId],
  activePoiMarkerLabelVisible: true,
  activeInWorldTooltipCount: 1,
  totalInWorldTooltipCount: 1,
});
