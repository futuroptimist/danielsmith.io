import type { PoiId } from '../poi/types';

import { AR_OVERRIDES } from './locales/ar';
import { EN_LOCALE_STRINGS } from './locales/en';
import { EN_X_PSEUDO_OVERRIDES } from './locales/en-x-pseudo';
import { JA_OVERRIDES } from './locales/ja';
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
  ModeAnnouncerStrings,
  ModeToggleResolvedStrings,
  MovementLegendStrings,
  PoiCopy,
  PoiNarrativeLogStrings,
  HudCustomizationStrings,
  SiteStrings,
} from './types';

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

const localeCatalog: Record<Locale, LocaleStrings> = Object.freeze({
  en: Object.freeze(cloneValue(EN_LOCALE_STRINGS)),
  'en-x-pseudo': MERGED_PSEUDO,
  ar: AR_LOCALE,
  ja: JA_LOCALE,
});

export const AVAILABLE_LOCALES = Object.freeze(
  Object.keys(localeCatalog) as ReadonlyArray<Locale>
);

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

export function getHudCustomizationStrings(
  input?: LocaleInput
): HudCustomizationStrings {
  return getLocaleStrings(input).hud.customization;
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
