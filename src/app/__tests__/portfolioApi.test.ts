import { describe, expect, it } from 'vitest';

import {
  clearPortfolioSection,
  ensurePortfolioApi,
  setPortfolioSection,
} from '../portfolioApi';

describe('portfolioApi namespace helpers', () => {
  const createWindow = (portfolio?: Window['portfolio']) =>
    ({
      portfolio,
    }) as Window;

  it('creates the window.portfolio namespace when it is missing', () => {
    const targetWindow = createWindow();

    const portfolioNamespace = ensurePortfolioApi(targetWindow);

    expect(targetWindow.portfolio).toBe(portfolioNamespace);
    expect(portfolioNamespace).toEqual({});
  });

  it('preserves existing sections when adding a new section', () => {
    const githubMetrics = {
      getDiagnostics: () => ({ cachedRepoCount: 1 }),
    } as Window['portfolio']['githubMetrics'];
    const targetWindow = createWindow({ githubMetrics });

    const audio = {
      getState: () => ({ preferenceEnabled: true }),
    } as Window['portfolio']['audio'];
    setPortfolioSection('audio', audio, targetWindow);

    expect(targetWindow.portfolio?.githubMetrics).toBe(githubMetrics);
    expect(targetWindow.portfolio?.audio).toBe(audio);
  });

  it('replaces one section without deleting sibling sections', () => {
    const firstAudio = {
      getState: () => ({ preferenceEnabled: false }),
    } as Window['portfolio']['audio'];
    const nextAudio = {
      getState: () => ({ preferenceEnabled: true }),
    } as Window['portfolio']['audio'];
    const narration = {
      getState: () => ({ visible: false }),
    } as Window['portfolio']['narration'];
    const targetWindow = createWindow({ audio: firstAudio, narration });

    setPortfolioSection('audio', nextAudio, targetWindow);

    expect(targetWindow.portfolio?.audio).toBe(nextAudio);
    expect(targetWindow.portfolio?.narration).toBe(narration);
  });

  it('recreates the namespace when window.portfolio is a falsy non-object value', () => {
    const targetWindow = createWindow(false as unknown as Window['portfolio']);

    const audio = {
      getState: () => ({ preferenceEnabled: true }),
    } as Window['portfolio']['audio'];
    setPortfolioSection('audio', audio, targetWindow);

    expect(targetWindow.portfolio?.audio).toBe(audio);
  });

  it('clears one section without deleting sibling sections', () => {
    const audio = {
      getState: () => ({ preferenceEnabled: true }),
    } as Window['portfolio']['audio'];
    const narration = {
      getState: () => ({ visible: false }),
    } as Window['portfolio']['narration'];
    const targetWindow = createWindow({ audio, narration });

    clearPortfolioSection('audio', targetWindow);

    expect(targetWindow.portfolio?.audio).toBeUndefined();
    expect(targetWindow.portfolio?.narration).toBe(narration);
  });

  it('does not create an empty namespace when clearing a missing portfolio API', () => {
    const targetWindow = createWindow();

    clearPortfolioSection('audio', targetWindow);

    expect(targetWindow.portfolio).toBeUndefined();
  });

  it('returns the existing namespace when window.portfolio already exists', () => {
    const existing = {
      world: { getActiveFloor: () => 'ground' },
    } as Window['portfolio'];
    const targetWindow = createWindow(existing);

    const portfolioNamespace = ensurePortfolioApi(targetWindow);

    expect(portfolioNamespace).toBe(existing);
    expect(targetWindow.portfolio).toBe(existing);
  });
});
