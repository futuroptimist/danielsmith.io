import { describe, expect, it, vi } from 'vitest';

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
  getLocaleStrings,
  getTourGuideToggleStrings,
  getTourResetControlStrings,
  isI18nDebugEnabled,
  getPoiNarrativeLogStrings,
  getPoiOverlayChromeStrings,
  getPoiCopy,
  getSiteStrings,
  resolveInitialLocale,
  resolveLocale,
} from '../assets/i18n';
import { getPoiDefinitions } from '../scene/poi/registry';

describe('i18n utilities', () => {
  it('exposes available locales including pseudo locale scaffolding', () => {
    expect(AVAILABLE_LOCALES).toContain('en');
    expect(AVAILABLE_LOCALES).toContain('en-x-pseudo');
    expect(AVAILABLE_LOCALES).toContain('ar');
    expect(AVAILABLE_LOCALES).toContain('ja');
    expect(AVAILABLE_LOCALES).toContain('zh-Hans');
  });

  it('normalizes locale inputs with region modifiers and pseudo identifiers', () => {
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('fr-FR')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('pseudo')).toBe('en-x-pseudo');
    expect(resolveLocale('en_x_pseudo')).toBe('en-x-pseudo');
    expect(resolveLocale('ar-EG')).toBe('ar');
    expect(resolveLocale('ja-JP')).toBe('ja');
    expect(resolveLocale('zh-CN')).toBe('zh-Hans');
    expect(resolveLocale('zh_CN')).toBe('zh-Hans');
    expect(resolveLocale('zh-SG')).toBe('zh-Hans');
    expect(resolveLocale('zh-Hans')).toBe('zh-Hans');
    expect(resolveLocale('zh-Hans-CN')).toBe('zh-Hans');
    expect(resolveLocale('cmn-Hans-CN')).toBe('zh-Hans');
    expect(resolveLocale('zh-TW')).toBe('en');
    expect(resolveLocale('zh-HK')).toBe('en');
    expect(resolveLocale('zh-Hant')).toBe('en');
  });

  it('ignores stored pseudo locales outside the i18n debug gate', () => {
    const clearStoredLocale = vi.fn();

    expect(
      resolveInitialLocale({
        storedLocale: 'en-x-pseudo',
        detectedLanguage: 'zh-CN',
        exposePseudoLocale: false,
        clearStoredLocale,
      })
    ).toBe('zh-Hans');
    expect(clearStoredLocale).toHaveBeenCalledTimes(1);

    expect(
      resolveInitialLocale({
        storedLocale: 'en-x-pseudo',
        detectedLanguage: 'zh-CN',
        exposePseudoLocale: true,
        clearStoredLocale,
      })
    ).toBe('en-x-pseudo');
    expect(clearStoredLocale).toHaveBeenCalledTimes(1);
  });

  it('detects locale direction for RTL and LTR language inputs', () => {
    expect(getLocaleDirection('en')).toBe('ltr');
    expect(getLocaleDirection('en-x-pseudo')).toBe('ltr');
    expect(getLocaleDirection('ar')).toBe('rtl');
    expect(getLocaleDirection('AR_EG')).toBe('rtl');
    expect(getLocaleDirection('fa-IR')).toBe('rtl');
    expect(getLocaleDirection('ja-JP')).toBe('ltr');
    expect(getLocaleDirection('zh-Hans')).toBe('ltr');
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

  it('localizes POI definitions per call without mutating previous copies', () => {
    const englishDefinitions = getPoiDefinitions('en');
    const pseudoDefinitions = getPoiDefinitions('en-x-pseudo');
    const englishPoi = englishDefinitions.find(
      (poi) => poi.id === 'futuroptimist-living-room-tv'
    );
    const pseudoPoi = pseudoDefinitions.find(
      (poi) => poi.id === 'futuroptimist-living-room-tv'
    );

    expect(englishPoi?.title).toBe('Futuroptimist');
    expect(pseudoPoi?.title).toBe('⟦Futuroptimist⟧');
    expect(pseudoPoi?.interactionPrompt).toBe('⟦Inspect ⟦Futuroptimist⟧⟧');
    expect(englishPoi?.title).toBe('Futuroptimist');
    expect(englishDefinitions).not.toBe(pseudoDefinitions);
    expect(englishPoi).not.toBe(pseudoPoi);
  });

  it('localizes zh-Hans GitHub star metric copy without English fallback', () => {
    const definitions = getPoiDefinitions('zh-Hans');
    const tokenplace = definitions.find(
      (poi) => poi.id === 'tokenplace-studio-cluster'
    );
    const starMetric = tokenplace?.metrics?.find(
      (metric) => metric.source?.type === 'githubStars'
    );

    expect(tokenplace?.id).toBe('tokenplace-studio-cluster');
    expect(starMetric?.label).toBe('星标');
    expect(starMetric?.value).toBe('正在从 GitHub 同步…');
    expect(starMetric?.source).toMatchObject({
      type: 'githubStars',
      owner: 'futuroptimist',
      repo: 'token.place',
      template: '{value} 个星标',
      fallback: '正在从 GitHub 同步…',
    });
    expect(starMetric?.label).not.toMatch(/stars/i);
    expect(starMetric?.source?.template).not.toMatch(/stars/i);
  });

  it('deep-clones localized POI metric sources per call', () => {
    const firstDefinitions = getPoiDefinitions('en-x-pseudo');
    const firstPoi = firstDefinitions.find(
      (poi) => poi.id === 'tokenplace-studio-cluster'
    );
    const firstSource = firstPoi?.metrics?.[0]?.source;

    expect(firstSource).toMatchObject({
      type: 'githubStars',
      owner: 'futuroptimist',
      repo: 'token.place',
    });

    if (firstSource) {
      firstSource.owner = 'mutated-owner';
      firstSource.repo = 'mutated-repo';
    }

    const freshDefinitions = getPoiDefinitions('en-x-pseudo');
    const freshPoi = freshDefinitions.find(
      (poi) => poi.id === 'tokenplace-studio-cluster'
    );

    expect(freshPoi?.metrics?.[0]?.source).toMatchObject({
      type: 'githubStars',
      owner: 'futuroptimist',
      repo: 'token.place',
    });
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
    expect(getControlOverlayStrings('zh-Hans').heading).toBe('控制');
    expect(getHelpModalStrings('zh-Hans').heading).toBe('设置与帮助');
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

  it('returns localized POI overlay chrome strings', () => {
    const english = getPoiOverlayChromeStrings('en');
    const pseudo = getPoiOverlayChromeStrings('en-x-pseudo');
    const arabic = getPoiOverlayChromeStrings('ar');
    const japanese = getPoiOverlayChromeStrings('ja');

    expect(english.closeDetails).toBe('Close POI details');
    expect(english.discoveryAnnouncementTemplate).toContain('{title}');
    expect(pseudo.closeDetails).toBe('⟦Close POI details⟧');
    expect(pseudo.relatedCaseStudies).toBe('⟦Related case studies⟧');
    expect(arabic.prototype).toBe('نموذج أولي');
    expect(japanese.nextHighlight).toBe('次のハイライト');
    expect(getPoiOverlayChromeStrings('zh-Hans').nextHighlight).toBe(
      '下一个亮点'
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

    const chinese = getLocaleToggleStrings('zh-Hans');
    expect(chinese.title).toBe('语言');
    expect(chinese.options['zh-Hans'].label).toBe('中文（简体）');
  });

  it('exposes Mandarin and hides pseudo behind the explicit i18n debug gate', () => {
    const labels = getLocaleToggleStrings('en').options;
    const publicOptions = (['en', 'ja', 'ar', 'zh-Hans'] as const).map(
      (id) => labels[id].label
    );

    expect(publicOptions).toContain('中文（简体）');
    expect(publicOptions).not.toContain('Pseudo');
    expect(isI18nDebugEnabled({ dev: false, search: '' })).toBe(false);
    expect(isI18nDebugEnabled({ dev: false, search: '?i18nDebug=1' })).toBe(
      true
    );
    expect(
      isI18nDebugEnabled({
        dev: false,
        search: '',
        storage: { getItem: () => 'true' },
      })
    ).toBe(true);
  });

  it('keeps every resolved locale populated with required visible strings', () => {
    const assertNoMissingStrings = (value: unknown, path: string): void => {
      if (typeof value === 'string') {
        expect(value.trim(), path).not.toBe('');
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) =>
          assertNoMissingStrings(item, `${path}[${index}]`)
        );
        return;
      }
      if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(
          ([key, nested]) => {
            assertNoMissingStrings(nested, `${path}.${key}`);
          }
        );
      }
    };

    AVAILABLE_LOCALES.forEach((locale) => {
      assertNoMissingStrings(getLocaleStrings(locale), locale);
    });
  });

  it('localizes guided tour controls for Mandarin and pseudo locale', () => {
    expect(getTourGuideToggleStrings('zh-Hans').labelEnabled).toBe(
      '导览已开启'
    );
    expect(getTourResetControlStrings('zh-Hans').heading).toBe('导览');
    expect(getTourGuideToggleStrings('en-x-pseudo').labelEnabled).toBe(
      '⟦Guided tour on⟧'
    );
    expect(getTourResetControlStrings('en-x-pseudo').label).toBe(
      '⟦Restart guided tour⟧'
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

    const chinese = getPoiNarrativeLogStrings('zh-Hans');
    expect(chinese.heading).toBe('创作者故事日志');
    expect(formatMessage(chinese.visitedLabelTemplate, { time: '15:30' })).toBe(
      '访问时间 15:30'
    );
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

    const chineseCopy = getPoiCopy('zh-Hans');
    expect(chineseCopy['tokenplace-studio-cluster'].summary).toContain(
      '端到端加密'
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