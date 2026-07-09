import { describe, expect, it, vi } from 'vitest';

import {
  AVAILABLE_LOCALES,
  formatMessage,
  getControlOverlayStrings,
  getDebugCoordinatesStrings,
  getDebugCollidersStrings,
  getHelpModalStrings,
  getLocaleDirection,
  getLocaleToggleStrings,
  getModeAnnouncerStrings,
  getModeToggleStrings,
  getLocaleScript,
  getLocaleStrings,
  isI18nDebugEnabled,
  getPoiOverlayChromeStrings,
  getPoiCopy,
  getSelectableLocales,
  getSiteStrings,
  getSoftwareRendererWarningStrings,
  getSettingsControlStrings,
  resolveInitialLocale,
  resolveLocale,
} from '../assets/i18n';
import {
  CONTROL_ITEM_IDS,
  getControlHelpRows,
} from '../assets/i18n/controlItems';
import { getPoiDefinitions } from '../scene/poi/registry';
import { applyControlOverlayStrings } from '../ui/hud/controlOverlay';
import { createHelpModal } from '../ui/hud/helpModal';

const renderRepresentativeControlsPopover = (locale: string): HTMLElement => {
  const container = document.createElement('div');
  container.innerHTML = `
    <p class="overlay__heading" data-control-text="heading">Placeholder</p>
    <ul class="overlay__list" data-role="control-list">
      ${CONTROL_ITEM_IDS.map(
        (id) => `
          <li class="overlay__item" data-control-item="${id}">
            <span class="overlay__keys">Keys</span>
            <span class="overlay__description">Description</span>
          </li>
        `
      ).join('')}
      <li
        class="overlay__item"
        data-control-item="poiInteract"
        data-role="interact"
        hidden
      >
        <span class="overlay__keys" data-role="interact-label">?</span>
        <span class="overlay__description" data-role="interact-description">???</span>
      </li>
    </ul>
  `;
  applyControlOverlayStrings(container, getControlOverlayStrings(locale));
  return container;
};

const getRenderedControlRows = (container: ParentNode) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      CONTROL_ITEM_IDS.map((id) => `[data-control-item="${id}"]`).join(',')
    )
  ).map((row) => ({
    label: row.querySelector('.overlay__keys')?.textContent ?? '',
    description: row.querySelector('.overlay__description')?.textContent ?? '',
  }));

const renderHelpModal = (locale: string): HTMLElement => {
  const container = document.createElement('div');
  const handle = createHelpModal({
    container,
    content: getHelpModalStrings(locale),
  });
  return handle.element;
};

const getRenderedSettingsControlRows = (container: ParentNode) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      '#help-modal-section-controls .help-modal__item'
    )
  ).map((row) => ({
    label: row.querySelector('.help-modal__item-label')?.textContent ?? '',
    description:
      row.querySelector('.help-modal__item-description')?.textContent ?? '',
  }));

it('provides POI debug detail labels for every locale', () => {
  for (const locale of AVAILABLE_LOCALES) {
    const strings = getPoiOverlayChromeStrings(locale);
    expect(strings.debugDetailsLabel.trim()).not.toBe('');
    expect(strings.debugPoiAnchor.trim()).not.toBe('');
    expect(strings.debugModelTriangles.trim()).not.toBe('');
  }
});

it('pseudo-localizes POI debug detail labels', () => {
  const english = getPoiOverlayChromeStrings('en');
  const pseudo = getPoiOverlayChromeStrings('en-x-pseudo');

  expect(pseudo.debugDetailsLabel).not.toBe(english.debugDetailsLabel);
  expect(pseudo.debugPoiAnchor).not.toBe(english.debugPoiAnchor);
  expect(pseudo.debugModelTriangles).not.toBe(english.debugModelTriangles);
  expect(pseudo.debugDetailsLabel).toMatch(/^⟦.*⟧$/);
  expect(pseudo.debugPoiAnchor).toMatch(/^⟦.*⟧$/);
  expect(pseudo.debugModelTriangles).toMatch(/^⟦.*⟧$/);
});

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

  it('provides localized Settings control copy for every locale', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const strings = getSettingsControlStrings(locale);
      expect(strings.graphicsQuality.title.trim()).not.toBe('');
      expect(strings.accessibilityPresets.title.trim()).not.toBe('');
      expect(strings.avatarVariants.title.trim()).not.toBe('');
      expect(strings.avatarAccessories.title.trim()).not.toBe('');
      expect(strings.motionBlur.label.trim()).not.toBe('');
      for (const group of [
        strings.graphicsQuality,
        strings.accessibilityPresets,
        strings.avatarVariants,
        strings.avatarAccessories,
      ]) {
        for (const option of Object.values(group.options)) {
          expect(option.label.trim()).not.toBe('');
          expect(option.description.trim()).not.toBe('');
        }
      }
    }
  });

  it('pseudo-localizes Settings labels while keeping control key labels stable', () => {
    const pseudo = getSettingsControlStrings('en-x-pseudo');
    expect(pseudo.graphicsQuality.title).toMatch(/^⟦.*⟧$/);
    expect(pseudo.accessibilityPresets.options.standard.label).toMatch(
      /^⟦.*⟧$/
    );
    expect(
      pseudo.avatarAccessories.options['wrist-console'].description
    ).toMatch(/^⟦.*⟧$/);
    expect(
      getControlOverlayStrings('en-x-pseudo').items.keyboardMove.keys
    ).toBe('WASD / Arrow keys');
    expect(getControlOverlayStrings('en-x-pseudo').items.cyclePoi.keys).toBe(
      'Q / E'
    );
  });

  it('localizes previously English zh-Hans Settings regression strings', () => {
    const strings = getSettingsControlStrings('zh-Hans');
    expect(strings.accessibilityPresets.title).not.toMatch(
      /Accessibility presets/i
    );
    expect(strings.accessibilityPresets.options.standard.label).not.toBe(
      'Standard'
    );
    expect(strings.accessibilityPresets.options.calm.label).not.toBe('Calm');
    expect(
      strings.accessibilityPresets.options['high-contrast'].label
    ).not.toBe('High contrast');
    expect(strings.accessibilityPresets.options.photosensitive.label).not.toBe(
      'Photosensitive safe'
    );
    expect(strings.graphicsQuality.title).not.toMatch(/Graphics quality/i);
    expect(strings.avatarVariants.title).not.toMatch(
      /Customization|Avatar style/i
    );
    expect(strings.avatarAccessories.title).not.toBe('Accessories');
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

  it('keeps Settings controls rows in sync with the canonical help rows for every locale', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const helpRows = getControlHelpRows(getControlOverlayStrings(locale));
      const controlsSection = getHelpModalStrings(locale).sections.find(
        (section) => section.id === 'controls'
      );

      expect(
        controlsSection,
        `${locale} exposes a Settings controls section`
      ).toBeDefined();
      expect(controlsSection?.items).toEqual(helpRows);
    }
  });

  it('renders one Settings controls section without stale duplicate sections for every locale', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const helpModal = getHelpModalStrings(locale);
      const sectionIds = helpModal.sections.map((section) => section.id);

      expect(sectionIds.filter((id) => id === 'controls')).toHaveLength(1);
      expect(sectionIds).not.toContain('movement');
      expect(sectionIds).not.toContain('interactions');
    }
  });

  it('omits removed retired-tour settings from current settings copy', () => {
    const staleSettingsTerms = [
      'Narra' + 'tion',
      'Guided ' + 'Tour',
      'tour ' + 'reset',
      'guided ' + 'highlight',
      'next ' + 'recommended',
    ];

    for (const locale of AVAILABLE_LOCALES) {
      const helpModal = getHelpModalStrings(locale);
      const settingsCopy = [
        helpModal.heading,
        helpModal.description,
        helpModal.settings.heading,
        helpModal.settings.description,
        ...helpModal.sections.flatMap((section) => [
          section.title,
          ...section.items.flatMap((item) => [item.label, item.description]),
        ]),
      ].join('\n');

      for (const term of staleSettingsTerms) {
        expect(settingsCopy, `${locale} settings copy`).not.toContain(term);
      }
    }
  });

  it('renders matching shared static control rows in Controls and Settings for every locale', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const controlsPopover = renderRepresentativeControlsPopover(locale);
      const helpModal = renderHelpModal(locale);

      // The hidden POI interact prompt uses data-control-item="poiInteract" and
      // is intentionally separate from the shared static controls legend.
      expect(getRenderedControlRows(controlsPopover)).toEqual(
        getRenderedSettingsControlRows(helpModal)
      );
      expect(getRenderedControlRows(controlsPopover)).toHaveLength(
        CONTROL_ITEM_IDS.length
      );
    }
  });

  it('localizes the lighting debug row without non-English English fallback copy', () => {
    const englishLightingDebug =
      getControlOverlayStrings('en').items.lightingDebug;

    for (const locale of ['ar', 'ja', 'zh-Hans', 'es', 'pt', 'de', 'hu']) {
      const localizedLightingDebug =
        getControlOverlayStrings(locale).items.lightingDebug;

      expect(localizedLightingDebug.keys).toBe(englishLightingDebug.keys);
      expect(localizedLightingDebug.description).not.toBe(
        englishLightingDebug.description
      );
      expect(localizedLightingDebug.description.trim()).not.toBe('');
    }
  });

  it('pseudo-localizes rendered controls descriptions while preserving key labels', () => {
    const englishPopoverRows = getRenderedControlRows(
      renderRepresentativeControlsPopover('en')
    );
    const pseudoPopoverRows = getRenderedControlRows(
      renderRepresentativeControlsPopover('en-x-pseudo')
    );
    const englishSettingsRows = getRenderedSettingsControlRows(
      renderHelpModal('en')
    );
    const pseudoSettingsRows = getRenderedSettingsControlRows(
      renderHelpModal('en-x-pseudo')
    );

    expect(pseudoPopoverRows.map((row) => row.label)).toEqual(
      englishPopoverRows.map((row) => row.label)
    );
    expect(pseudoSettingsRows.map((row) => row.label)).toEqual(
      englishSettingsRows.map((row) => row.label)
    );

    for (const row of [...pseudoPopoverRows, ...pseudoSettingsRows]) {
      expect(row.description).toMatch(/^⟦.*⟧$/);
    }
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
      'axel-studio-tracker',
      'gitshelves-living-room-installation',
      'danielsmith-portfolio-table',
      'f2clipboard-kitchen-console',
      'sigma-kitchen-workbench',
      'wove-kitchen-loom',
      'dspace-backyard-rocket',
      'pr-reaper-backyard-console',
      'sugarkube-backyard-greenhouse',
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

  it('removes the invalid DSPACE Mission Log link from every locale', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const dspace = getPoiDefinitions(locale).find(
        (poi) => poi.id === 'dspace-backyard-rocket'
      );
      const links = dspace?.links ?? [];

      expect(links).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            href: 'https://futuroptimist.dev/projects/dspace',
          }),
        ])
      );
      expect(links.some((link) => /mission log/i.test(link.label))).toBe(false);
    }
  });

  it('keeps localized DSPACE game and docs metric labels current', () => {
    const staleDspaceMetricLabelPattern =
      /^(countdown|cuenta atrás|visszaszámlálás|contagem|stack)$/i;

    for (const locale of AVAILABLE_LOCALES) {
      const dspace = getPoiDefinitions(locale).find(
        (poi) => poi.id === 'dspace-backyard-rocket'
      );
      const groundedMetricLabels =
        dspace?.metrics
          ?.filter((metric) => metric.source?.type !== 'githubStars')
          .map((metric) => metric.label) ?? [];

      expect(groundedMetricLabels, locale).toHaveLength(2);
      expect(groundedMetricLabels, locale).toEqual(
        expect.not.arrayContaining([
          expect.stringMatching(staleDspaceMetricLabelPattern),
        ])
      );
    }
  });

  it('keeps GitHub star metric metadata and neutral fallback copy in every locale', () => {
    const fakeFallbackPattern =
      /(?:\d[\d,.]*\s*(?:\+|k|m)?\s*(?:stars?|estrelas|sterne|星标|スター|نجوم|csillag))/i;

    for (const locale of AVAILABLE_LOCALES) {
      const definitions = getPoiDefinitions(locale);
      const starMetrics = definitions.flatMap((poi) =>
        (poi.metrics ?? [])
          .filter((metric) => metric.source?.type === 'githubStars')
          .map((metric) => ({ poi, metric, source: metric.source }))
      );

      expect(starMetrics.length, locale).toBeGreaterThan(0);
      for (const { poi, metric, source } of starMetrics) {
        expect(source?.owner, `${locale} ${poi.id}`).toEqual(
          expect.any(String)
        );
        expect(source?.repo, `${locale} ${poi.id}`).toEqual(expect.any(String));
        expect(metric.value, `${locale} ${poi.id}`).not.toMatch(
          fakeFallbackPattern
        );
        expect(source?.fallback ?? '', `${locale} ${poi.id}`).not.toMatch(
          fakeFallbackPattern
        );
      }
    }
  });

  it('marks every localized DSPACE GitHub star metric as public and neutral', () => {
    const numericFallbackPattern = /\d/;

    for (const locale of AVAILABLE_LOCALES) {
      const dspace = getPoiDefinitions(locale).find(
        (poi) => poi.id === 'dspace-backyard-rocket'
      );
      const starMetric = dspace?.metrics?.find(
        (metric) => metric.source?.type === 'githubStars'
      );

      expect(dspace, locale).toBeDefined();
      expect(starMetric, locale).toBeDefined();
      expect(starMetric?.source, locale).toMatchObject({
        type: 'githubStars',
        owner: 'democratizedspace',
        repo: 'dspace',
        visibility: 'public',
      });
      expect(starMetric?.value, locale).not.toMatch(numericFallbackPattern);
      expect(starMetric?.source?.fallback ?? '', locale).not.toMatch(
        numericFallbackPattern
      );
    }
  });

  it('adds runtime-backed stars to DSPACE, Sugarkube, and Axel without stale DSPACE owners', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const definitions = getPoiDefinitions(locale);
      const byId = new Map(definitions.map((poi) => [poi.id, poi]));
      const expectedSources = [
        {
          id: 'dspace-backyard-rocket',
          owner: 'democratizedspace',
          repo: 'dspace',
          visibility: 'public',
        },
        {
          id: 'sugarkube-backyard-greenhouse',
          owner: 'futuroptimist',
          repo: 'sugarkube',
          visibility: undefined,
        },
        {
          id: 'axel-studio-tracker',
          owner: 'futuroptimist',
          repo: 'axel',
          visibility: undefined,
        },
      ] as const;

      for (const { id, owner, repo, visibility } of expectedSources) {
        const starMetric = byId
          .get(id)
          ?.metrics?.find((metric) => metric.source?.type === 'githubStars');

        expect(starMetric, `${locale} ${id}`).toBeDefined();
        expect(starMetric?.source, `${locale} ${id}`).toMatchObject({
          type: 'githubStars',
          owner,
          repo,
        });
        expect(starMetric?.source?.visibility, `${locale} ${id}`).toBe(
          visibility
        );
      }

      const starSources = definitions.flatMap((poi) =>
        (poi.metrics ?? [])
          .filter((metric) => metric.source?.type === 'githubStars')
          .map((metric) => metric.source)
      );
      expect(starSources, locale).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            owner: 'futuroptimist',
            repo: 'dspace',
          }),
        ])
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
        .find((section) => section.id === 'controls')
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
    expect(spanishHelp.sections[0]?.title).toBe('Controles');
    expect(spanishHelp.sections[0]?.items[3]?.description).toBe(
      'Acercar o alejar con el teclado'
    );
    const germanHelp = getHelpModalStrings('de');
    expect(germanHelp.sections[1]?.title).toBe('Barrierefreiheit & Fallback');
    expect(germanHelp.sections[1]?.items[3]?.description).toBe(
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
    expect(japanese.closeDetails).toBe('POI の詳細を閉じる');
    expect(getPoiOverlayChromeStrings('zh-Hans').closeDetails).toBe(
      '关闭兴趣点详情'
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
    expect(getPoiOverlayChromeStrings('hu').relatedCaseStudies).toBe(
      'Kapcsolódó esettanulmányok'
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

  it('localizes debug coordinate controls across locales', () => {
    expect(getDebugCoordinatesStrings('en').labelDisabled).toBe(
      'Debug coordinates off'
    );
    expect(getDebugCoordinatesStrings('es').labels.activeFloor).toBe(
      'Piso activo'
    );
    expect(getDebugCoordinatesStrings('pt').values.yes).toBe('Sim');
    expect(getDebugCoordinatesStrings('de').labels.stairNav).toBe(
      'Treppen-Navigationsbereich'
    );
    expect(getDebugCoordinatesStrings('hu').labelEnabled).toBe(
      'Hibakeresési koordináták be'
    );
    expect(getDebugCoordinatesStrings('zh-Hans').labels.predictedFloor).toBe(
      '楼梯预测楼层'
    );
    expect(getDebugCoordinatesStrings('ja').values.none).toBe('なし');
    expect(getDebugCoordinatesStrings('ar').overlayLabel).toBe(
      'إحداثيات التصحيح'
    );
    expect(getDebugCoordinatesStrings('en-x-pseudo').labelDisabled).toBe(
      '⟦Debug coordinates off⟧'
    );
  });

  it('localizes debug collider controls across locales', () => {
    const expectedDebugColliderStrings = {
      ar: {
        labelEnabled: 'تراكب المصادمات مفعّل',
        labelDisabled: 'تراكب المصادمات معطّل',
        descriptionEnabled:
          'يعرض الجدران غير المرئية ومستطيلات التصادم للطابق النشط.',
        descriptionDisabled:
          'تبقى الجدران غير المرئية ومستطيلات التصادم مخفية حتى تفعّلها.',
      },
      de: {
        labelEnabled: 'Collider-Overlay ein',
        labelDisabled: 'Collider-Overlay aus',
        descriptionEnabled:
          'Zeigt unsichtbare Wände und Kollisionsrechtecke der aktiven Etage.',
        descriptionDisabled:
          'Unsichtbare Wände und Kollisionsrechtecke bleiben verborgen, bis du sie einschaltest.',
        idsLabelEnabled: 'Collider-IDs ein',
        idsLabelDisabled: 'Collider-IDs aus',
        idsDescriptionEnabled:
          'Zeigt Collider-ID-Beschriftungen, während das Collider-Overlay aktiv ist.',
        idsDescriptionDisabled:
          'Blendet Collider-ID-Beschriftungen aus, während die Drahtgitter verfügbar bleiben.',
        solidIdsLabelEnabled: 'Solid-IDs ein',
        solidIdsLabelDisabled: 'Solid-IDs aus',
        solidIdsDescriptionEnabled:
          'Zeigt stabile IDs und Drahtgitter für sichtbare Szenen-Solids.',
        solidIdsDescriptionDisabled:
          'Stabile Solid-IDs und Drahtgitter bleiben ausgeblendet.',
      },
      en: {
        labelEnabled: 'Collider overlay on',
        labelDisabled: 'Collider overlay off',
        descriptionEnabled:
          'Shows invisible walls and collision rectangles for the active floor.',
        descriptionDisabled:
          'Invisible walls and collision rectangles stay hidden until you turn them on.',
      },
      'en-x-pseudo': {
        labelEnabled: '⟦Collider overlay on⟧',
        labelDisabled: '⟦Collider overlay off⟧',
        descriptionEnabled:
          '⟦Shows invisible walls and collision rectangles for the active floor.⟧',
        descriptionDisabled:
          '⟦Invisible walls and collision rectangles stay hidden until you turn them on.⟧',
      },
      es: {
        labelEnabled: 'Superposición de colliders activada',
        labelDisabled: 'Superposición de colliders desactivada',
        descriptionEnabled:
          'Muestra muros invisibles y rectángulos de colisión del piso activo.',
        descriptionDisabled:
          'Los muros invisibles y los rectángulos de colisión permanecen ocultos hasta que los actives.',
      },
      hu: {
        labelEnabled: 'Collider-réteg be',
        labelDisabled: 'Collider-réteg ki',
        descriptionEnabled:
          'Megjeleníti az aktív emelet láthatatlan falait és ütközési téglalapjait.',
        descriptionDisabled:
          'A láthatatlan falak és ütközési téglalapok rejtve maradnak, amíg be nem kapcsolod.',
      },
      ja: {
        labelEnabled: 'コライダーオーバーレイオン',
        labelDisabled: 'コライダーオーバーレイオフ',
        descriptionEnabled: '現在の階の見えない壁と衝突矩形を表示します。',
        descriptionDisabled: '見えない壁と衝突矩形はオンにするまで非表示です。',
      },
      pt: {
        labelEnabled: 'Sobreposição de colisores ativada',
        labelDisabled: 'Sobreposição de colisores desativada',
        descriptionEnabled:
          'Mostra paredes invisíveis e retângulos de colisão do piso ativo.',
        descriptionDisabled:
          'As paredes invisíveis e os retângulos de colisão ficam ocultos até você ativá-los.',
      },
      'zh-Hans': {
        labelEnabled: '碰撞体叠加层已开启',
        labelDisabled: '碰撞体叠加层已关闭',
        descriptionEnabled: '显示当前楼层的不可见墙和碰撞矩形。',
        descriptionDisabled: '不可见墙和碰撞矩形会保持隐藏，直到你开启。',
      },
    } as const;

    expect(Object.keys(expectedDebugColliderStrings).sort()).toEqual(
      [...AVAILABLE_LOCALES].sort()
    );
    for (const [locale, expectedStrings] of Object.entries(
      expectedDebugColliderStrings
    )) {
      const debugStrings = getDebugCollidersStrings(locale);
      expect(debugStrings).toMatchObject(expectedStrings);
      for (const key of [
        'idsLabelEnabled',
        'idsLabelDisabled',
        'idsDescriptionEnabled',
        'idsDescriptionDisabled',
        'solidIdsLabelEnabled',
        'solidIdsLabelDisabled',
        'solidIdsDescriptionEnabled',
        'solidIdsDescriptionDisabled',
      ] as const) {
        expect(debugStrings[key]).toEqual(expect.any(String));
        expect(debugStrings[key].trim()).not.toBe('');
      }
    }

    for (const locale of ['de', 'es', 'hu', 'pt'] as const) {
      const debugStrings = getDebugCollidersStrings(locale);
      expect(debugStrings.idsLabelEnabled).not.toBe('Collider IDs on');
      expect(debugStrings.solidIdsLabelEnabled).not.toBe('Solid IDs on');
    }
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

  it('provides localized copy for POIs with English fallback', () => {
    const copy = getPoiCopy();
    expect(copy['futuroptimist-living-room-tv'].title).toMatch(/Futuroptimist/);
    expect(copy['dspace-backyard-rocket'].metrics?.length).toBeGreaterThan(0);

    const pseudoCopy = getPoiCopy('en-x-pseudo');
    expect(pseudoCopy['futuroptimist-living-room-tv'].title).toBe(
      '⟦Futuroptimist⟧'
    );
    expect(pseudoCopy['futuroptimist-living-room-tv'].summary).toBe(
      '⟦Futuroptimist hub for open-source scripts, data pipelines, tests, and YouTube-oriented automation metadata.⟧'
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
