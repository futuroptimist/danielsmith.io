import { describe, expect, it } from 'vitest';

import {
  AVAILABLE_LOCALES,
  formatMessage,
  getControlOverlayStrings,
  getHelpModalStrings,
  getLocaleDirection,
  getPoiNarrativeLogStrings,
  getPoiCopy,
  getSiteStrings,
  resolveLocale,
} from '../assets/i18n';

describe('i18n utilities', () => {
  it('exposes available locales including pseudo locale scaffolding', () => {
    expect(AVAILABLE_LOCALES).toContain('en');
    expect(AVAILABLE_LOCALES).toContain('en-x-pseudo');
  });

  it('normalizes locale inputs with region modifiers and pseudo identifiers', () => {
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('fr-FR')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('pseudo')).toBe('en-x-pseudo');
    expect(resolveLocale('en_x_pseudo')).toBe('en-x-pseudo');
  });

  it('detects locale direction for RTL and LTR language inputs', () => {
    expect(getLocaleDirection('en')).toBe('ltr');
    expect(getLocaleDirection('en-x-pseudo')).toBe('ltr');
    expect(getLocaleDirection('ar')).toBe('rtl');
    expect(getLocaleDirection('AR_EG')).toBe('rtl');
    expect(getLocaleDirection('fa-IR')).toBe('rtl');
    expect(getLocaleDirection(undefined)).toBe('ltr');
  });

  it('formats template strings with provided values', () => {
    expect(formatMessage('Press {key}', { key: 'H' })).toBe('Press H');
    expect(formatMessage('Open {target}', { target: 'menu' })).toBe(
      'Open menu'
    );
    expect(formatMessage('Hold {missing}', {})).toBe('Hold {missing}');
  });

  it('returns localized HUD strings and applies pseudo locale overrides', () => {
    const englishOverlay = getControlOverlayStrings('en');
    const pseudoOverlay = getControlOverlayStrings('en-x-pseudo');
    expect(englishOverlay.heading).toBe('Controls');
    expect(pseudoOverlay.heading).toBe('⟦Controls⟧');
    expect(pseudoOverlay.items.keyboardMove.keys).toBe(
      englishOverlay.items.keyboardMove.keys
    );
    const helpModal = getHelpModalStrings('en-x-pseudo');
    expect(helpModal.closeLabel).toBe('⟦Close⟧');
  });

  it('exposes narrative log strings with localized announcements', () => {
    const english = getPoiNarrativeLogStrings('en');
    expect(english.heading).toBe('Creator story log');
    expect(
      formatMessage(english.visitedLabelTemplate, { time: '3:30 PM' })
    ).toBe('Visited at 3:30 PM');

    const pseudo = getPoiNarrativeLogStrings('en-x-pseudo');
    expect(pseudo.heading).toBe('⟦Creator story log⟧');
    expect(pseudo.defaultVisitedLabel).toBe('⟦Visited⟧');
    expect(
      formatMessage(pseudo.liveAnnouncementTemplate, { title: 'Story' })
    ).toBe('⟦Story added to the creator story log.⟧');
  });

  it('provides localized copy for POIs with English fallback', () => {
    const copy = getPoiCopy();
    expect(copy['futuroptimist-living-room-tv'].title).toMatch(/Futuroptimist/);
    expect(copy['dspace-backyard-rocket'].metrics?.length).toBeGreaterThan(0);

    const pseudoCopy = getPoiCopy('en-x-pseudo');
    expect(pseudoCopy['futuroptimist-living-room-tv'].title).toBe(
      '⟦Futuroptimist Creator Desk⟧'
    );
    expect(pseudoCopy['tokenplace-studio-cluster'].title).toBe(
      copy['tokenplace-studio-cluster'].title
    );
  });

  it('falls back to English site metadata when pseudo overrides omit values', () => {
    const englishSite = getSiteStrings('en');
    const pseudoSite = getSiteStrings('en-x-pseudo');
    expect(pseudoSite.structuredData.listNameTemplate).toBe(
      englishSite.structuredData.listNameTemplate
    );
    expect(pseudoSite.structuredData.description).toBe(
      '⟦Interactive exhibits within the Daniel Smith immersive portfolio experience.⟧'
    );
    expect(pseudoSite.structuredData.publisher.name).toBe(
      englishSite.structuredData.publisher.name
    );
    expect(pseudoSite.structuredData.publisher.url).toBe(
      englishSite.structuredData.publisher.url
    );
    expect(pseudoSite.structuredData.author.name).toBe(
      englishSite.structuredData.author.name
    );
  });
});
