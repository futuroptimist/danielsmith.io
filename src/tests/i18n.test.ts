import { describe, expect, it } from 'vitest';

import {
  AVAILABLE_LOCALES,
  formatMessage,
  getControlOverlayStrings,
  getHelpModalStrings,
  getLocaleDirection,
  getLocaleToggleStrings,
  getModeAnnouncerStrings,
  getModeToggleStrings,
  getLocaleScript,
  getPoiNarrativeLogStrings,
  getPoiOverlayStrings,
  getPoiCopy,
  getSiteStrings,
  resolveLocale,
} from '../assets/i18n';
import { getPoiDefinitions } from '../scene/poi/registry';

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
    expect(helpModal.announcements.open).toBe(
      '⟦Help menu opened. Review controls and settings.⟧'
    );
    expect(helpModal.announcements.close).toBe('⟦Help menu closed.⟧');
    const arabicHelp = getHelpModalStrings('ar');
    expect(arabicHelp.heading).toBe('الإعدادات والمساعدة');
    expect(arabicHelp.announcements.open).toBe(
      'تم فتح قائمة المساعدة. راجع عناصر التحكم والإعدادات.'
    );
    const japaneseHelp = getHelpModalStrings('ja');
    expect(japaneseHelp.heading).toBe('設定とヘルプ');
    expect(japaneseHelp.announcements.close).toBe(
      'ヘルプメニューを閉じました。'
    );
  });

  it('returns localized mode toggle strings with formatted key hints', () => {
    const english = getModeToggleStrings('en');
    expect(english.keyHint).toBe('T');
    expect(english.idleLabel).toBe('Text mode · Press T');
    expect(english.idleHudAnnouncement).toBe(
      'Switch to the text-only portfolio. Press T to activate.'
    );
    expect(english.idleTitle).toBe('Switch to the text-only portfolio (T)');
    expect(english.pendingHudAnnouncement).toBe(
      'Switch to the text-only portfolio. Switching to text mode…'
    );
    expect(english.activeLabel).toBe('Try immersive again · Press T');
    expect(english.activeHudAnnouncement).toBe(
      'Text mode active. Press T to try immersive again.'
    );
    expect(english.errorLabel).toBe('Retry text mode · Press T');
    expect(english.errorHudAnnouncement).toBe(
      'Text mode toggle failed. Press T to try again.'
    );
    expect(english.errorTitle).toBe(
      'Text mode toggle failed. Press T to retry text mode.'
    );

    const pseudo = getModeToggleStrings('en-x-pseudo');
    expect(pseudo.keyHint).toBe('T');
    expect(pseudo.idleLabel).toBe('⟦Text mode · Press T⟧');
    expect(pseudo.idleHudAnnouncement).toBe(
      '⟦Switch to the text-only portfolio. Press T to activate.⟧'
    );
    expect(pseudo.pendingHudAnnouncement).toBe(
      '⟦Switch to the text-only portfolio. Switching to text mode…⟧'
    );
    expect(pseudo.activeLabel).toBe('⟦Try immersive again · Press T⟧');
    expect(pseudo.activeHudAnnouncement).toBe(
      '⟦Text mode active. Press T to try immersive again.⟧'
    );
    expect(pseudo.errorLabel).toBe('⟦Retry text mode · Press T⟧');
    expect(pseudo.errorHudAnnouncement).toBe(
      '⟦Text mode toggle failed. Press T to try again.⟧'
    );
    expect(pseudo.errorTitle).toBe(
      '⟦Text mode toggle failed. Press T to retry text mode.⟧'
    );
  });

  it('returns localized locale toggle strings for HUD controls', () => {
    const english = getLocaleToggleStrings('en');
    expect(english.title).toBe('Language');
    expect(english.description).toBe('Switch the HUD language and direction.');
    expect(english.switchingAnnouncementTemplate).toBe(
      'Switching to {target} locale…'
    );
    expect(english.selectedAnnouncementTemplate).toBe(
      '{label} locale selected.'
    );
    expect(english.failureAnnouncementTemplate).toBe(
      'Unable to switch to {target}. Staying on {current} locale.'
    );

    const pseudo = getLocaleToggleStrings('en-x-pseudo');
    expect(pseudo.title).toBe('⟦Language⟧');
    expect(pseudo.switchingAnnouncementTemplate).toBe(
      '⟦Switching to {target} locale…⟧'
    );
  });

  it('builds mode announcer messages from localized HUD and fallback copy', () => {
    const english = getModeAnnouncerStrings('en');
    expect(english.immersiveReady).toBe(
      'Switch to the text-only portfolio. Press T to activate.'
    );
    expect(english.fallbackReasons['data-saver']).toContain('data-saver');

    const arabic = getModeAnnouncerStrings('ar');
    expect(arabic.fallbackReasons['low-performance']).toContain(
      'انخفاضًا مستمرًا في معدل الإطارات'
    );

    english.fallbackReasons.manual = 'Mutated';
    expect(
      getSiteStrings('en').textFallback.reasonDescriptions.manual
    ).not.toBe('Mutated');
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

  it('returns localized POI overlay chrome strings', () => {
    const english = getPoiOverlayStrings('en');
    expect(english.visited).toBe('Visited');
    expect(english.status.prototype).toBe('Prototype');
    expect(
      formatMessage(english.discoveryAnnouncementTemplate, {
        title: 'Flywheel',
        summary: 'Automation lab.',
      })
    ).toBe('Flywheel discovered. Automation lab.');

    const pseudo = getPoiOverlayStrings('en-x-pseudo');
    expect(pseudo.visited).toBe('⟦Visited⟧');
    expect(pseudo.closeDetails).toBe('⟦Close POI details⟧');

    const arabic = getPoiOverlayStrings('ar');
    expect(arabic.visited).toBe('تمت الزيارة');

    const japanese = getPoiOverlayStrings('ja');
    expect(japanese.relatedCaseStudies).toBe('関連ケーススタディ');
  });

  it('provides localized copy for POIs with English fallback', () => {
    const copy = getPoiCopy();
    expect(copy['futuroptimist-living-room-tv'].title).toMatch(/Futuroptimist/);
    expect(copy['dspace-backyard-rocket'].metrics?.length).toBeGreaterThan(0);

    const pseudoCopy = getPoiCopy('en-x-pseudo');
    expect(pseudoCopy['futuroptimist-living-room-tv'].title).toBe(
      '⟦Futuroptimist⟧'
    );
    expect(pseudoCopy['futuroptimist-living-room-tv'].summary).toBe(
      '⟦Automated Futuroptimist scripting desk that stitches research, outlines, and narration-ready drafts for new videos.⟧'
    );
    expect(pseudoCopy['tokenplace-studio-cluster'].title).toBe(
      copy['tokenplace-studio-cluster'].title
    );
  });

  it('localizes POI definitions per locale without mutating shared base data', () => {
    const english = getPoiDefinitions('en');
    const pseudo = getPoiDefinitions('en-x-pseudo');
    const englishAgain = getPoiDefinitions('en');

    const englishPoi = english.find(
      (poi) => poi.id === 'futuroptimist-living-room-tv'
    );
    const pseudoPoi = pseudo.find(
      (poi) => poi.id === 'futuroptimist-living-room-tv'
    );
    const englishAgainPoi = englishAgain.find(
      (poi) => poi.id === 'futuroptimist-living-room-tv'
    );

    expect(englishPoi?.title).toBe('Futuroptimist');
    expect(pseudoPoi?.title).toBe('⟦Futuroptimist⟧');
    expect(pseudoPoi?.interactionPrompt).toContain('⟦Futuroptimist⟧');
    expect(englishAgainPoi?.title).toBe('Futuroptimist');

    if (pseudoPoi?.metrics?.[0]) {
      pseudoPoi.metrics[0].value = 'mutated';
    }

    const freshPseudo = getPoiDefinitions('en-x-pseudo').find(
      (poi) => poi.id === 'futuroptimist-living-room-tv'
    );
    expect(freshPseudo?.metrics?.[0]?.value).not.toBe('mutated');
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
