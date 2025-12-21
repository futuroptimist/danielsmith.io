import type { FallbackReason } from '../../types/failover';
import type { InputMethod } from '../../ui/hud/movementLegend';
import type {
  PoiId,
  PoiInteraction,
  PoiMetricSource,
  PoiNarration,
  PoiOutcome,
} from '../poi/types';

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
  mobileToggle: {
    expandLabel: string;
    collapseLabel: string;
    expandAnnouncement: string;
    collapseAnnouncement: string;
  };
}

export interface MovementLegendStrings {
  defaultDescription: string;
  labels: Record<InputMethod, string>;
  interactPromptTemplates: Record<InputMethod | 'default', string>;
}

export interface AudioHudControlStrings {
  keyHint: string;
  groupLabel: string;
  toggle: {
    onLabelTemplate: string;
    offLabelTemplate: string;
    titleTemplate: string;
    announcementOnTemplate: string;
    announcementOffTemplate: string;
    pendingAnnouncementTemplate: string;
  };
  slider: {
    label: string;
    ariaLabel: string;
    hudLabel: string;
    valueAnnouncementTemplate: string;
    mutedAnnouncementTemplate: string;
    mutedValueTemplate: string;
    mutedAriaValueTemplate: string;
  };
}

export interface ModeToggleStrings {
  keyHint: string;
  idleLabelTemplate: string;
  idleDescriptionTemplate: string;
  idleAnnouncementTemplate: string;
  idleTitleTemplate: string;
  pendingLabelTemplate: string;
  pendingAnnouncementTemplate: string;
  activeLabelTemplate: string;
  activeDescriptionTemplate: string;
  activeAnnouncementTemplate: string;
  errorLabelTemplate: string;
  errorDescriptionTemplate: string;
  errorAnnouncementTemplate: string;
  errorTitleTemplate?: string;
}

export interface ModeToggleResolvedStrings {
  keyHint: string;
  idleLabel: string;
  idleDescription: string;
  idleHudAnnouncement: string;
  idleTitle: string;
  pendingLabel: string;
  pendingHudAnnouncement: string;
  activeLabel: string;
  activeDescription: string;
  activeHudAnnouncement: string;
  errorLabel: string;
  errorDescription: string;
  errorHudAnnouncement: string;
  errorTitle: string;
}

export interface ModeAnnouncerStrings {
  immersiveReady: string;
  fallbackReasons: Record<FallbackReason, string>;
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

export interface LocaleToggleStrings {
  title: string;
  description: string;
  switchingAnnouncementTemplate: string;
  selectedAnnouncementTemplate: string;
  failureAnnouncementTemplate: string;
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

export interface HudCustomizationStrings {
  heading: string;
  description?: string;
  variants: { title: string; description: string };
  accessories: { title: string; description: string };
}

export interface PoiNarrativeLogStrings {
  heading: string;
  visitedHeading: string;
  empty: string;
  defaultVisitedLabel: string;
  visitedLabelTemplate: string;
  liveAnnouncementTemplate: string;
  journey: {
    heading: string;
    empty: string;
    entryLabelTemplate: string;
    sameRoomTemplate: string;
    crossRoomTemplate: string;
    crossSectionTemplate: string;
    fallbackTemplate: string;
    announcementTemplate: string;
    directions: {
      indoors: string;
      outdoors: string;
    };
  };
  rooms: Record<
    string,
    {
      label: string;
      descriptor: string;
      zone: 'interior' | 'exterior';
    }
  >;
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

export interface SiteTextFallbackStrings {
  heading: string;
  intro: string;
  roomHeadingTemplate: string;
  metricsHeading: string;
  linksHeading: string;
  about: {
    heading: string;
    summary: string;
    highlights: string[];
  };
  skills: {
    heading: string;
    items: {
      label: string;
      value: string;
    }[];
  };
  timeline: {
    heading: string;
    entries: {
      period: string;
      location: string;
      role: string;
      org: string;
      summary: string;
    }[];
  };
  contact: {
    heading: string;
    emailLabel: string;
    email: string;
    githubLabel: string;
    githubUrl: string;
    resumeLabel: string;
    resumeUrl: string;
  };
  actions: {
    immersiveLink: string;
    resumeLink: string;
    githubLink: string;
  };
  reasonHeadings: Record<FallbackReason, string>;
  reasonDescriptions: Record<FallbackReason, string>;
}

export interface SiteStrings {
  name: string;
  structuredData: SiteStructuredDataStrings;
  textFallback: SiteTextFallbackStrings;
}

export interface PoiCopy {
  title: string;
  summary: string;
  outcome?: PoiOutcome;
  metrics?: ReadonlyArray<{
    label: string;
    value: string;
    source?: PoiMetricSource;
  }>;
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
    audioControl: AudioHudControlStrings;
    modeToggle: ModeToggleStrings;
    localeToggle: LocaleToggleStrings;
    helpModal: HelpModalStrings;
    customization: HudCustomizationStrings;
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
