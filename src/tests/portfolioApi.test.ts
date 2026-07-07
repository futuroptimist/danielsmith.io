import { describe, expect, it } from 'vitest';

import {
  ensurePortfolioApi,
  setPortfolioApiSection,
  setPortfolioInputSection,
  type PortfolioApi,
} from '../app/portfolioApi';

describe('portfolio API namespace helpers', () => {
  it('creates the namespace when it is missing', () => {
    const target = {} as Pick<Window, 'portfolio'>;

    const namespace = ensurePortfolioApi(target);

    expect(namespace).toEqual({});
    expect(target.portfolio).toBe(namespace);
  });

  it('preserves existing sections when adding a new section', () => {
    const avatar = {
      getActiveVariant: () => 'portfolio',
    } as PortfolioApi['avatar'];
    const target = { portfolio: { avatar } } as Pick<Window, 'portfolio'>;
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
    };

    setPortfolioApiSection('audio', audio, target);

    expect(target.portfolio?.avatar).toBe(avatar);
    expect(target.portfolio?.audio).toBe(audio);
  });

  it('replaces one section without deleting sibling sections', () => {
    const originalGraphics = {
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
    const replacementGraphics = {
      ...originalGraphics,
      getMotionBlurIntensity: () => 0.5,
    };
    const poi = {
      getTooltipState: () => ({
        overlayVisiblePoiId: null,
        worldTooltipVisible: false,
        worldTooltipPoiId: null,
        worldTooltipTitle: null,
        markerLabelVisible: false,
        markerLabelPoiId: null,
        visibleMarkerLabelCount: 0,
        visibleMarkerLabelPoiIds: [],
        activePoiMarkerLabelVisible: false,
        activeInWorldTooltipCount: 0,
        totalInWorldTooltipCount: 0,
      }),
    };
    const target = {
      portfolio: { graphics: originalGraphics, poi },
    } as Pick<Window, 'portfolio'>;

    setPortfolioApiSection('graphics', replacementGraphics, target);

    expect(target.portfolio?.graphics).toBe(replacementGraphics);
    expect(target.portfolio?.poi).toBe(poi);
  });

  it('safely augments an existing namespace and nested input section', () => {
    const existingWorld = {
      getActiveFloor: () => 'ground',
    } as PortfolioApi['world'];
    const target = { portfolio: { world: existingWorld } } as Pick<
      Window,
      'portfolio'
    >;
    const keyBindings = {
      getBindings: () => ({}),
      setBinding: () => undefined,
      resetBinding: () => undefined,
      resetAll: () => undefined,
    };

    const namespace = ensurePortfolioApi(target);
    setPortfolioInputSection('keyBindings', keyBindings, target);

    expect(namespace).toBe(target.portfolio);
    expect(target.portfolio?.world).toBe(existingWorld);
    expect(target.portfolio?.input?.keyBindings).toBe(keyBindings);
  });
});
