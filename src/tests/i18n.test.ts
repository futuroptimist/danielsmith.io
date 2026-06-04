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
  getSelectableLocales,
  getSiteStrings,
  getSoftwareRendererWarningStrings,
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
    expect(AVAILABLE_LOCALES).toContain('es');
    expect(AVAILABLE_LOCALES).toContain('pt');
    expect(AVAILABLE_LOCALES).toContain('de');
    expect(AVAILABLE_LOCALES).toContain('hu');
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
    expect(resolveLocale('es')).toBe('es');
    expect(resolveLocale('es-ES')).toBe('es');
    expect(resolveLocale('es-MX')).toBe('es');
    expect(resolveLocale('pt')).toBe('pt');
    expect(resolveLocale('pt-BR')).toBe('pt');
    expect(resolveLocale('pt-PT')).toBe('pt');
    expect(resolveLocale('de')).toBe('de');
    expect(resolveLocale('de-DE')).toBe('de');
    expect(resolveLocale('de-AT')).toBe('de');
    expect(resolveLocale('de-CH')).toBe('de');
    expect(resolveLocale('hu')).toBe('hu');
    expect(resolveLocale('hu-HU')).toBe('hu');
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
    expect(getLocaleDirection('es-MX')).toBe('ltr');
    expect(getLocaleDirection('pt-BR')).toBe('ltr');
    expect(getLocaleDirection('de-AT')).toBe('ltr');
    expect(getLocaleDirection('hu-HU')).toBe('ltr');
    expect(getLocaleDirection(undefined)).toBe('ltr');
  });

  it('detects locale scripts for font fallback handling', () => {
    expect(getLocaleScript('en')).toBe('latin');
    expect(getLocaleScript('en-x-pseudo')).toBe('latin');
    expect(getLocaleScript('zh-CN')).toBe('cjk');
    expect(getLocaleScript('ja')).toBe('cjk');
    expect(getLocaleScript('ko-KR')).toBe('cjk');
    expect(getLocaleScript('ar')).toBe('rtl');
    expect(getLocaleScript('es')).toBe('latin');
    expect(getLocaleScript('pt')).toBe('latin');
    expect(getLocaleScript('de')).toBe('latin');
    expect(getLocaleScript('hu')).toBe('latin');
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
    const englishDefinitions = getPoiDefinitions('en');
    const definitions = getPoiDefinitions('zh-Hans');
    const definitionsById = new Map(definitions.map((poi) => [poi.id, poi]));
    const starBackedPois = englishDefinitions.filter((poi) =>
      poi.metrics?.some((metric) => metric.source?.type === 'githubStars')
    );

    expect(starBackedPois.map((poi) => poi.id)).toEqual([
      'futuroptimist-living-room-tv',
      'tokenplace-studio-cluster',
      'gabriel-studio-sentry',
      'flywheel-studio-flywheel',
      'jobbot-studio-terminal',
      'gitshelves-living-room-installation',
      'danielsmith-portfolio-table',
      'f2clipboard-kitchen-console',
      'sigma-kitchen-workbench',
      'wove-kitchen-loom',
      'dspace-backyard-rocket',
      'pr-reaper-backyard-console',
    ]);

    for (const englishPoi of starBackedPois) {
      const englishStarMetric = englishPoi.metrics?.find(
        (metric) => metric.source?.type === 'githubStars'
      );
      const starMetric = definitionsById
        .get(englishPoi.id)
        ?.metrics?.find((metric) => metric.source?.type === 'githubStars');

      expect(
        starMetric,
        `${englishPoi.id} keeps a zh-Hans star metric`
      ).toBeDefined();
      expect(starMetric?.label).toBe('星标');
      expect(starMetric?.source).toMatchObject({
        type: 'githubStars',
        owner: englishStarMetric?.source?.owner,
        repo: englishStarMetric?.source?.repo,
        template: '{value} 个星标',
      });
      expect(starMetric?.source?.fallback).not.toBe('Syncing from GitHub…');
      expect(starMetric?.label).not.toMatch(/stars/i);
      expect(starMetric?.value).not.toMatch(/stars|Syncing from GitHub/i);
      expect(starMetric?.source?.template).not.toMatch(/stars/i);
      expect(starMetric?.source?.fallback).not.toMatch(
        /stars|Syncing from GitHub/i
      );
    }
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
    expect(englishOverlay.items.keyboardZoom.keys).toBe(
      'Shift + = / Shift + -'
    );
    expect(arabicOverlay.items.keyboardZoom.description).toContain(
      'لوحة المفاتيح'
    );
    expect(japaneseOverlay.items.keyboardZoom.description).toContain(
      'キーボード'
    );
    const helpModal = getHelpModalStrings('en-x-pseudo');
    expect(helpModal.closeLabel).toBe('⟦Close⟧');
    expect(helpModal.announcements.open).toBe(
      '⟦Help menu opened. Review controls and settings.⟧'
    );
    expect(helpModal.announcements.close).toBe('⟦Help menu closed.⟧');
    expect(
      helpModal.sections
        .find((section) => section.id === 'movement')
        ?.items.some((item) => item.label.includes('Shift + ='))
    ).toBe(true);
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

    const spanishHelp = getHelpModalStrings('es');
    expect(spanishHelp.sections[0]?.title).toBe('Movimiento y cámara');
    expect(spanishHelp.sections[0]?.items[3]?.description).toBe(
      'Acerca o aleja sin rueda de ratón.'
    );
    const germanHelp = getHelpModalStrings('de');
    expect(germanHelp.sections[2]?.title).toBe('Barrierefreiheit & Fallback');
    expect(germanHelp.sections[2]?.items[3]?.description).toBe(
      'Schalte mit der Audio-Schaltfläche um oder drücke M.'
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
    const publicOptions = (
      ['en', 'zh-Hans', 'ja', 'ar', 'es', 'pt', 'de', 'hu'] as const
    ).map((id) => labels[id].label);

    expect(publicOptions).toContain('中文（简体）');
    expect(getSelectableLocales()).toEqual([
      'en',
      'zh-Hans',
      'ja',
      'ar',
      'es',
      'pt',
      'de',
      'hu',
    ]);
    expect(getSelectableLocales()).not.toContain('en-x-pseudo');
    expect(getSelectableLocales({ exposePseudoLocale: true })).toContain(
      'en-x-pseudo'
    );
    expect(publicOptions).not.toContain('Pseudo');
    expect(isI18nDebugEnabled({ dev: true, search: '' })).toBe(true);
    expect(isI18nDebugEnabled({ dev: false, search: '' })).toBe(false);
    expect(isI18nDebugEnabled({ dev: false, search: '?i18nDebug=1' })).toBe(
      true
    );
    expect(
      isI18nDebugEnabled({
        dev: false,
        search: '',
        storage: { getItem: () => '1' },
      })
    ).toBe(true);
    expect(
      isI18nDebugEnabled({
        dev: false,
        search: '',
        storage: { getItem: () => 'true' },
      })
    ).toBe(false);
  });

  it('keeps placeholder sets aligned with English templates for every locale', () => {
    const collectPlaceholders = (
      value: unknown,
      path: string,
      out: Map<string, string>
    ) => {
      if (typeof value === 'string') {
        const placeholders = Array.from(value.matchAll(/\{(\w+)\}/g)).map(
          (match) => match[1] ?? ''
        );
        if (placeholders.length > 0) {
          out.set(path, placeholders.sort().join(','));
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) =>
          collectPlaceholders(item, `${path}[${index}]`, out)
        );
        return;
      }
      if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(
          ([key, nested]) => {
            collectPlaceholders(nested, `${path}.${key}`, out);
          }
        );
      }
    };

    const english = new Map<string, string>();
    collectPlaceholders(getLocaleStrings('en'), 'locale', english);

    (['es', 'pt', 'de', 'hu'] as const).forEach((locale) => {
      const localized = new Map<string, string>();
      collectPlaceholders(getLocaleStrings(locale), 'locale', localized);
      english.forEach((placeholders, path) => {
        expect(localized.get(path), `${locale} ${path}`).toBe(placeholders);
      });
      localized.forEach((placeholders, path) => {
        expect(placeholders, `${locale} ${path}`).toBe(english.get(path));
      });
    });
  });

  it('provides localized public picker and visible runtime copy for new locales', () => {
    expect(getLocaleToggleStrings('es').options.es).toEqual({
      label: 'Español',
      direction: 'ltr',
    });
    expect(getLocaleToggleStrings('pt').options.pt).toEqual({
      label: 'Português',
      direction: 'ltr',
    });
    expect(getLocaleToggleStrings('de').options.de).toEqual({
      label: 'Deutsch',
      direction: 'ltr',
    });
    expect(getLocaleToggleStrings('hu').options.hu).toEqual({
      label: 'Magyar',
      direction: 'ltr',
    });
    expect(getLocaleToggleStrings('es').title).toBe('Idioma');
    expect(getLocaleToggleStrings('pt').description).toBe(
      'Alterne o idioma e a direção do HUD.'
    );
    expect(getLocaleToggleStrings('de').title).toBe('Sprache');
    expect(getLocaleToggleStrings('hu').description).toBe(
      'Váltsd a HUD nyelvét és irányát.'
    );

    expect(getSiteStrings('es').textFallback.heading).toBe(
      'Explora los destacados'
    );
    expect(getSiteStrings('pt').textFallback.recoveryCta.actionLabel).toBe(
      'Tentar imersivo novamente'
    );
    expect(getHelpModalStrings('de').heading).toBe('Einstellungen & Hilfe');
    expect(getPoiOverlayChromeStrings('hu').nextHighlight).toBe(
      'Következő kiemelés'
    );
    expect(getPoiCopy('es')['tokenplace-studio-cluster'].summary).toContain(
      'peer-to-peer'
    );
    expect(
      getPoiCopy('pt')['futuroptimist-living-room-tv'].outcome?.label
    ).toBe('Resultado');
    expect(getPoiCopy('de')['danielsmith-portfolio-table'].summary).toContain(
      'Three.js/WebGL-Portfolio'
    );
    expect(getPoiCopy('hu')['pr-reaper-backyard-console'].summary).toContain(
      'GitHub Actions workflow'
    );

    const portugueseStrings = getLocaleStrings('pt');
    expect(portugueseStrings.site.textFallback.roomHeadingTemplate).toBe(
      'Exibições de {roomName}'
    );
    expect(
      portugueseStrings.site.structuredData.textCollectionNameTemplate
    ).toBe('Portfólio de texto de {siteName}');
    expect(portugueseStrings.hud.controlOverlay.helpButton.labelTemplate).toBe(
      'Abrir menu · Pressione {shortcut}'
    );
    expect(
      portugueseStrings.hud.controlOverlay.items.touchDrag.description
    ).toBe('Arraste à esquerda para mover e à direita para panorâmica');
    expect(
      portugueseStrings.hud.audioControl.toggle.pendingAnnouncementTemplate
    ).toBe('Alterando estado do áudio…');

    const portugueseWarning = getSoftwareRendererWarningStrings('pt');
    expect(portugueseWarning.descriptionTemplate).toBe(
      'O Chrome está usando {renderer} em vez da aceleração por hardware.'
    );
    (['es', 'pt', 'de', 'hu'] as const).forEach((locale) => {
      const warning = getSoftwareRendererWarningStrings(locale);
      expect(
        new Set([
          warning.continueSafeLabel,
          warning.continuousLabel,
          warning.textModeLabel,
          warning.reloadSafeLabel,
        ]),
        locale
      ).toHaveLength(4);
    });
    expect(
      getPoiCopy('de')['tokenplace-studio-cluster'].metrics?.[0]?.source
    ).toMatchObject({
      template: '{value} Sterne',
    });
  });

  it('does not leak Spanish fallthroughs or English templates into Latin locales', () => {
    const collectStrings = (value: unknown, out: string[] = []): string[] => {
      if (typeof value === 'string') {
        out.push(value);
        return out;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => collectStrings(item, out));
        return out;
      }
      if (value && typeof value === 'object') {
        Object.values(value as Record<string, unknown>).forEach((nested) =>
          collectStrings(nested, out)
        );
      }
      return out;
    };

    const portugueseCopy = collectStrings(getLocaleStrings('pt')).join('\n');
    [
      'Abrir menú',
      'Pulsa {shortcut}',
      'Arrastra a la izquierda',
      'Cambiando estado de audio',
      'Chrome está usando {renderer} en lugar de aceleración por hardware.',
    ].forEach((spanishPhrase) => {
      expect(portugueseCopy).not.toContain(spanishPhrase);
    });

    (['es', 'pt', 'de', 'hu'] as const).forEach((locale) => {
      const structuredData = getSiteStrings(locale).structuredData;
      const textFallback = getSiteStrings(locale).textFallback;
      [
        structuredData.listNameTemplate,
        structuredData.textCollectionNameTemplate,
        textFallback.roomHeadingTemplate,
      ].forEach((template) => {
        expect(template.toLowerCase(), `${locale} ${template}`).not.toContain(
          'exhibits'
        );
        expect(template.toLowerCase(), `${locale} ${template}`).not.toContain(
          'text portfolio'
        );
      });
    });
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
