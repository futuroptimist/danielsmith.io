import type { InputMethod } from '../../ui/hud/movementLegend';
import type { PoiId, PoiInteraction, PoiNarration } from '../poi/types';

export type Locale = 'en' | 'en-x-pseudo' | 'ar' | 'ja';
export type LocaleDirection = 'ltr' | 'rtl';
export type LocaleScript = 'latin' | 'cjk' | 'rtl';

export interface ControlOverlayItemStrings {
  keys: string;
  description: string;
}

export interface ControlOverlayStrings {
  heading: string;
  items: {
    keyboardMove: ControlOverlayItemStrings;
    pointerDrag: ControlOverlayItemStrings;
    pointerZoom: ControlOverlayItemStrings;
    touchDrag: ControlOverlayItemStrings;
    touchPinch: ControlOverlayItemStrings;
    cyclePoi: ControlOverlayItemStrings;
    toggleTextMode: ControlOverlayItemStrings;
  };
  interact: {
    defaultLabel: string;
    description: string;
    promptTemplates: Record<PoiInteraction | 'default', string>;
  };
  helpButton: {
    labelTemplate: string;
    announcementTemplate: string;
    shortcutFallback: string;
  };
}

export interface MovementLegendStrings {
  defaultDescription: string;
  labels: Record<InputMethod, string>;
  interactPromptTemplates: Record<InputMethod | 'default', string>;
}

export interface HelpModalItemStrings {
  label: string;
  description: string;
}

export interface HelpModalSectionStrings {
  id: string;
  title: string;
  items: readonly HelpModalItemStrings[];
}

export interface HelpModalSettingsStrings {
  heading: string;
  description?: string;
}

export interface HelpModalStrings {
  heading: string;
  description: string;
  closeLabel: string;
  closeAriaLabel: string;
  settings: HelpModalSettingsStrings;
  sections: readonly HelpModalSectionStrings[];
  announcements: {
    open: string;
    close: string;
  };
}

export interface PoiNarrativeLogStrings {
  heading: string;
  empty: string;
  defaultVisitedLabel: string;
  visitedLabelTemplate: string;
  liveAnnouncementTemplate: string;
}

export type StructuredDataEntityType = 'Person' | 'Organization';

export interface SiteStructuredDataEntityStrings {
  name: string;
  url?: string;
  type?: StructuredDataEntityType;
  logoUrl?: string;
}

export interface SiteStructuredDataStrings {
  description: string;
  listNameTemplate: string;
  textCollectionNameTemplate: string;
  textCollectionDescription: string;
  immersiveActionName: string;
  publisher: SiteStructuredDataEntityStrings;
  author: SiteStructuredDataEntityStrings;
}

export interface SiteStrings {
  name: string;
  structuredData: SiteStructuredDataStrings;
}

export interface PoiCopy {
  title: string;
  summary: string;
  metrics?: ReadonlyArray<{ label: string; value: string }>;
  links?: ReadonlyArray<{ label: string; href: string }>;
  narration?: PoiNarration;
  interactionPrompt?: string;
}

export interface LocaleStrings {
  locale: Locale;
  site: SiteStrings;
  hud: {
    controlOverlay: ControlOverlayStrings;
    movementLegend: MovementLegendStrings;
    helpModal: HelpModalStrings;
    narrativeLog: PoiNarrativeLogStrings;
  };
  poi: Record<PoiId, PoiCopy>;
}

export type LocaleInput = Locale | string | null | undefined;

type Primitive = string | number | boolean | null | undefined;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Primitive
    ? T[K]
    : T[K] extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepPartial<U>>
      : DeepPartial<T[K]>;
};

export type LocaleOverrides = DeepPartial<LocaleStrings> & { locale?: Locale };
