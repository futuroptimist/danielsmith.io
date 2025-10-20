import { describe, expect, it } from 'vitest';

import {
  AVAILABLE_LOCALES,
  formatMessage,
  getControlOverlayStrings,
  getHelpModalStrings,
  getLocaleDirection,
  getLocaleScript,
  getPoiNarrativeLogStrings,
  getPoiCopy,
  getSiteStrings,
  resolveLocale,
} from '../assets/i18n';

describe('i18n utilities', () => {
  it('exposes available locales including pseudo locale scaffolding', () => {
    expect(AVAILABLE_LOCALES).toContain('en');
    expect(AVAILABLE_LOCALES).toContain('en-x-pseudo');
    expect(AVAILABLE_LOCALES).toContain('ar');
    expect(AVAILABLE_LOCALES).toContain('ja');
  });

  it('normalizes locale inputs with region modifiers and pseudo identifiers', () => {
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('fr-FR')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('pseudo')).toBe('en-x-pseudo');
    expect(resolveLocale('en_x_pseudo')).toBe('en-x-pseudo');
    expect(resolveLocale('ar-EG')).toBe('ar');
    expect(resolveLocale('ja-JP')).toBe('ja');
  });

  it('detects locale direction for RTL and LTR language inputs', () => {
    expect(getLocaleDirection('en')).toBe('ltr');
    expect(getLocaleDirection('en-x-pseudo')).toBe('ltr');
    expect(getLocaleDirection('ar')).toBe('rtl');
    expect(getLocaleDirection('AR_EG')).toBe('rtl');
    expect(getLocaleDirection('fa-IR')).toBe('rtl');
    expect(getLocaleDirection('ja-JP')).toBe('ltr');
    expect(getLocaleDirection(undefined)).toBe('ltr');
  });

  it('detects locale scripts for font fallback handling', () => {
    expect(getLocaleScript('en')).toBe('latin');
    expect(getLocaleScript('en-x-pseudo')).toBe('latin');
    expect(getLocaleScript('zh-CN')).toBe('cjk');
    expect(getLocaleScript('ja')).toBe('cjk');
    expect(getLocaleScript('ko-KR')).toBe('cjk');
    expect(getLocaleScript('ar')).toBe('rtl');
    expect(getLocaleScript(undefined)).toBe('latin');
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
    const arabicOverlay = getControlOverlayStrings('ar');
    const japaneseOverlay = getControlOverlayStrings('ja');
    expect(englishOverlay.heading).toBe('Controls');
    expect(pseudoOverlay.heading).toBe('⟦Controls⟧');
    expect(arabicOverlay.heading).toBe('عناصر التحكم');
    expect(japaneseOverlay.heading).toBe('操作');
    expect(pseudoOverlay.items.keyboardMove.keys).toBe(
      englishOverlay.items.keyboardMove.keys
    );
    const helpModal = getHelpModalStrings('en-x-pseudo');
    expect(helpModal.closeLabel).toBe('⟦Close⟧');
    const arabicHelp = getHelpModalStrings('ar');
    expect(arabicHelp.heading).toBe('الإعدادات والمساعدة');
    const japaneseHelp = getHelpModalStrings('ja');
    expect(japaneseHelp.heading).toBe('設定とヘルプ');
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

    const arabic = getPoiNarrativeLogStrings('ar');
    expect(arabic.heading).toBe('سجل القصة');
    expect(formatMessage(arabic.visitedLabelTemplate, { time: '٣:٣٠ م' })).toBe(
      'تمت الزيارة في ٣:٣٠ م'
    );

    const japanese = getPoiNarrativeLogStrings('ja');
    expect(japanese.heading).toBe('クリエイターストーリーログ');
    expect(
      formatMessage(japanese.visitedLabelTemplate, { time: '15:30' })
    ).toBe('15:30 に訪問');
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
    const arabicSite = getSiteStrings('ar');
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
    expect(pseudoSite.structuredData.textCollectionNameTemplate).toBe(
      englishSite.structuredData.textCollectionNameTemplate
    );
    expect(pseudoSite.structuredData.textCollectionDescription).toBe(
      englishSite.structuredData.textCollectionDescription
    );
    expect(pseudoSite.structuredData.immersiveActionName).toBe(
      englishSite.structuredData.immersiveActionName
    );
    expect(arabicSite.name).toBe('محفظة دانيل سميث الغامرة');
    expect(arabicSite.structuredData.description).toBe(
      'جولة تفاعلية في مشاريع دانيل سميث مع معارض ثلاثية الأبعاد وتعليقات صوتية.'
    );
  });
});
