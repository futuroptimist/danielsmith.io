import type { PoiId } from '../../scene/poi/types';

import { AR_OVERRIDES } from './locales/ar';
import { EN_LOCALE_STRINGS } from './locales/en';
import { EN_X_PSEUDO_OVERRIDES } from './locales/en-x-pseudo';
import { JA_OVERRIDES } from './locales/ja';
import { ZH_HANS_OVERRIDES } from './locales/zh-Hans';
import type {
  AudioHudControlStrings,
  ControlOverlayStrings,
  DeepPartial,
  HelpModalStrings,
  Locale,
  LocaleInput,
  LocaleOverrides,
  LocaleStrings,
  LocaleDirection,
  LocaleScript,
  LocaleToggleStrings,
  ModeAnnouncerStrings,
  ModeToggleResolvedStrings,
  MovementLegendStrings,
  PoiCopy,
  PoiNarrativeLogStrings,
  PoiOverlayChromeStrings,
  HudCustomizationStrings,
  GuidedTourControlStrings,
  SoftwareRendererWarningStrings,
  SiteStrings,
} from './types';

export type LocaleToggleResolvedStrings = LocaleToggleStrings;

export * from './types';

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>
    )) {
      result[key] = cloneValue(nested);
    }
    return result as T;
  }
  return value;
}

function applyOverrides<T>(target: T, overrides: DeepPartial<T>): void {
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const overrideValue = overrides[key];
    if (overrideValue === undefined) {
      continue;
    }

    const currentValue = (target as Record<string, unknown>)[key as string];

    if (
      currentValue !== null &&
      typeof currentValue === 'object' &&
      !Array.isArray(currentValue) &&
      overrideValue !== null &&
      typeof overrideValue === 'object' &&
      !Array.isArray(overrideValue)
    ) {
      applyOverrides(
        currentValue,
        overrideValue as DeepPartial<typeof currentValue>
      );
      continue;
    }

    if (Array.isArray(overrideValue)) {
      (target as Record<string, unknown>)[key as string] = overrideValue.map(
        (item) => cloneValue(item)
      ) as unknown;
      continue;
    }

    (target as Record<string, unknown>)[key as string] =
      overrideValue as unknown;
  }
}

function buildLocale(
  base: LocaleStrings,
  overrides: LocaleOverrides | undefined,
  locale: Locale
): LocaleStrings {
  const clone = cloneValue(base);
  if (overrides) {
    applyOverrides(clone, overrides as DeepPartial<LocaleStrings>);
  }
  clone.locale = locale;
  return Object.freeze(clone);
}

const MERGED_PSEUDO = buildLocale(
  EN_LOCALE_STRINGS,
  EN_X_PSEUDO_OVERRIDES,
  'en-x-pseudo'
);

const AR_LOCALE = buildLocale(EN_LOCALE_STRINGS, AR_OVERRIDES, 'ar');
const JA_LOCALE = buildLocale(EN_LOCALE_STRINGS, JA_OVERRIDES, 'ja');
const ZH_HANS_LOCALE = buildLocale(
  EN_LOCALE_STRINGS,
  ZH_HANS_OVERRIDES,
  'zh-Hans'
);

const localeCatalog: Record<Locale, LocaleStrings> = Object.freeze({
  en: Object.freeze(cloneValue(EN_LOCALE_STRINGS)),
  'en-x-pseudo': MERGED_PSEUDO,
  ar: AR_LOCALE,
  ja: JA_LOCALE,
  'zh-Hans': ZH_HANS_LOCALE,
});

export const AVAILABLE_LOCALES = Object.freeze(
  Object.keys(localeCatalog) as ReadonlyArray<Locale>
);

export interface LocaleOption {
  id: Locale;
  label: string;
  direction: LocaleDirection;
  internal?: boolean;
}

const LOCALE_OPTIONS: ReadonlyArray<LocaleOption> = Object.freeze([
  { id: 'en', label: 'English', direction: 'ltr' },
  { id: 'zh-Hans', label: '简体中文', direction: 'ltr' },
  { id: 'ja', label: '日本語', direction: 'ltr' },
  { id: 'ar', label: 'العربية', direction: 'rtl' },
  { id: 'en-x-pseudo', label: 'Pseudo', direction: 'ltr', internal: true },
]);

export const I18N_DEBUG_STORAGE_KEY = 'danielsmith.io:i18n-debug';

export function isI18nDebugEnabled({
  dev = false,
  search = '',
  storage,
}: {
  dev?: boolean;
  search?: string;
  storage?: Pick<Storage, 'getItem'> | null;
} = {}): boolean {
  const params = new URLSearchParams(
    search.startsWith('?') ? search : `?${search}`
  );
  if (params.get('i18nDebug') === '1') {
    return true;
  }
  if (dev) {
    return true;
  }
  try {
    return storage?.getItem(I18N_DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function getLocaleOptions({
  includeInternal = false,
}: { includeInternal?: boolean } = {}): ReadonlyArray<LocaleOption> {
  return LOCALE_OPTIONS.filter((option) => includeInternal || !option.internal);
}

function normalizeLocaleInput(input: LocaleInput): string {
  if (!input) {
    return '';
  }
  return `${input}`.toLowerCase().replace(/_/g, '-').trim();
}

export function resolveLocale(input: LocaleInput): Locale {
  const normalized = normalizeLocaleInput(input);

  if (
    normalized === 'en-x-pseudo' ||
    normalized === 'pseudo' ||
    normalized === 'x-pseudo'
  ) {
    return 'en-x-pseudo';
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  if (normalized.startsWith('ar')) {
    return 'ar';
  }

  if (normalized.startsWith('ja')) {
    return 'ja';
  }

  if (
    normalized === 'zh' ||
    normalized.startsWith('zh-') ||
    normalized.startsWith('cmn')
  ) {
    return 'zh-Hans';
  }

  return 'en';
}

const RTL_LOCALE_CODES = new Set([
  'ar',
  'dv',
  'fa',
  'he',
  'ku',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
]);

const CJK_LOCALE_CODES = new Set([
  'ja',
  'ja-jp',
  'ko',
  'ko-kr',
  'yue',
  'zh',
  'zh-cn',
  'zh-hans',
  'zh-hant',
  'zh-hk',
  'zh-mo',
  'zh-sg',
  'zh-tw',
]);

export function getLocaleDirection(input?: LocaleInput): LocaleDirection {
  const normalized = normalizeLocaleInput(input);
  if (!normalized) {
    return 'ltr';
  }

  if (RTL_LOCALE_CODES.has(normalized)) {
    return 'rtl';
  }

  const [primary] = normalized.split('-', 1);
  if (primary && RTL_LOCALE_CODES.has(primary)) {
    return 'rtl';
  }

  return 'ltr';
}

export function getLocaleScript(input?: LocaleInput): LocaleScript {
  const normalized = normalizeLocaleInput(input);
  if (!normalized) {
    return 'latin';
  }

  const [primary] = normalized.split('-', 1);

  if (CJK_LOCALE_CODES.has(normalized) || CJK_LOCALE_CODES.has(primary ?? '')) {
    return 'cjk';
  }

  if (RTL_LOCALE_CODES.has(normalized) || RTL_LOCALE_CODES.has(primary ?? '')) {
    return 'rtl';
  }

  return 'latin';
}

export function getLocaleStrings(input?: LocaleInput): LocaleStrings {
  const locale = resolveLocale(input);
  return localeCatalog[locale];
}

export function getPoiCopy(
  input?: LocaleInput
): Readonly<Record<PoiId, PoiCopy>> {
  return getLocaleStrings(input).poi;
}

export function getPoiOverlayChromeStrings(
  input?: LocaleInput
): PoiOverlayChromeStrings {
  return getLocaleStrings(input).hud.poiOverlay;
}

export function formatMessage(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const replacement = values[key];
    return replacement === undefined ? match : String(replacement);
  });
}

export function getControlOverlayStrings(
  input?: LocaleInput
): ControlOverlayStrings {
  return getLocaleStrings(input).hud.controlOverlay;
}

export function getHelpModalStrings(input?: LocaleInput): HelpModalStrings {
  return getLocaleStrings(input).hud.helpModal;
}

export function getMovementLegendStrings(
  input?: LocaleInput
): MovementLegendStrings {
  return getLocaleStrings(input).hud.movementLegend;
}

export function getAudioHudControlStrings(
  input?: LocaleInput
): AudioHudControlStrings {
  const strings = getLocaleStrings(input).hud.audioControl;
  return cloneValue(strings);
}

export function getLocaleToggleStrings(
  input?: LocaleInput
): LocaleToggleResolvedStrings {
  return cloneValue(getLocaleStrings(input).hud.localeToggle);
}

export function getHudCustomizationStrings(
  input?: LocaleInput
): HudCustomizationStrings {
  return getLocaleStrings(input).hud.customization;
}

export function getGuidedTourControlStrings(
  input?: LocaleInput
): GuidedTourControlStrings {
  return getLocaleStrings(input).hud.guidedTour;
}

export function getSoftwareRendererWarningStrings(
  input?: LocaleInput
): SoftwareRendererWarningStrings {
  return getLocaleStrings(input).hud.softwareRendererWarning;
}

export function getModeToggleStrings(
  input?: LocaleInput
): ModeToggleResolvedStrings {
  const localeStrings = getLocaleStrings(input).hud.modeToggle;
  const rawKeyHint = localeStrings.keyHint;
  const normalizedKeyHint =
    rawKeyHint.length === 1 ? rawKeyHint.toUpperCase() : rawKeyHint;
  const formatWithHint = (template: string) =>
    formatMessage(template, { keyHint: normalizedKeyHint });

  const resolveTitle = (template: string | undefined, fallback: string) => {
    const formatted = template ? formatWithHint(template) : '';
    const normalized = formatted.trim();
    if (normalized.length > 0) {
      return normalized;
    }
    return fallback;
  };

  return {
    keyHint: rawKeyHint,
    idleLabel: formatWithHint(localeStrings.idleLabelTemplate),
    idleDescription: formatWithHint(localeStrings.idleDescriptionTemplate),
    idleHudAnnouncement: formatWithHint(localeStrings.idleAnnouncementTemplate),
    idleTitle: formatWithHint(localeStrings.idleTitleTemplate),
    pendingLabel: formatWithHint(localeStrings.pendingLabelTemplate),
    pendingHudAnnouncement: formatWithHint(
      localeStrings.pendingAnnouncementTemplate
    ),
    activeLabel: formatWithHint(localeStrings.activeLabelTemplate),
    activeDescription: formatWithHint(localeStrings.activeDescriptionTemplate),
    activeHudAnnouncement: formatWithHint(
      localeStrings.activeAnnouncementTemplate
    ),
    errorLabel: formatWithHint(localeStrings.errorLabelTemplate),
    errorDescription: formatWithHint(localeStrings.errorDescriptionTemplate),
    errorHudAnnouncement: formatWithHint(
      localeStrings.errorAnnouncementTemplate
    ),
    errorTitle: resolveTitle(
      localeStrings.errorTitleTemplate,
      formatWithHint(localeStrings.errorDescriptionTemplate)
    ),
  } satisfies ModeToggleResolvedStrings;
}

export function getModeAnnouncerStrings(
  input?: LocaleInput
): ModeAnnouncerStrings {
  const localeStrings = getLocaleStrings(input);
  const modeToggle = getModeToggleStrings(localeStrings.locale);

  return {
    immersiveReady: modeToggle.idleHudAnnouncement,
    fallbackReasons: cloneValue(
      localeStrings.site.textFallback.reasonDescriptions
    ),
  } satisfies ModeAnnouncerStrings;
}

export function getPoiNarrativeLogStrings(
  input?: LocaleInput
): PoiNarrativeLogStrings {
  return getLocaleStrings(input).hud.narrativeLog;
}

export function getSiteStrings(input?: LocaleInput): SiteStrings {
  return getLocaleStrings(input).site;
}
