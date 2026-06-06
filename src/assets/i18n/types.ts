import type {
  PoiId,
  PoiInteraction,
  PoiMetricSource,
  PoiNarration,
  PoiOutcome,
} from '../../scene/poi/types';
import type { FallbackReason } from '../../types/failover';
import type { InputMethod } from '../../ui/hud/movementLegend';

export type Locale =
  | 'en'
  | 'en-x-pseudo'
  | 'ar'
  | 'ja'
  | 'zh-Hans'
  | 'es'
  | 'pt'
  | 'de'
  | 'hu';
export type LocaleDirection = 'ltr' | 'rtl';
export type LocaleScript = 'latin' | 'cjk' | 'rtl';

export interface ControlOverlayItemStrings {
  keys: string;
  description: string;
}

export interface ControlOverlayMenuItemStrings {
  label: string;
  keyHint: string;
  title: string;
}

export interface ControlOverlayStrings {
  heading: string;
  items: {
    keyboardMove: ControlOverlayItemStrings;
    pointerDrag: ControlOverlayItemStrings;
    pointerZoom: ControlOverlayItemStrings;
    keyboardZoom: ControlOverlayItemStrings;
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
  menu: {
    controls: ControlOverlayMenuItemStrings;
    text: ControlOverlayMenuItemStrings;
    settings: ControlOverlayMenuItemStrings;
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

export interface AudioSubtitleStrings {
  labels: {
    ambient: string;
    poi: string;
  };
  dismissLabels: {
    ambient: string;
    poi: string;
  };
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
  description: string;
}

export interface LocaleToggleStrings {
  title: string;
  description: string;
  options: Record<Locale, LocaleOptionStrings>;
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
  description: string;
  variants: { title: string; description: string };
  accessories: { title: string; description: string };
}

export interface LocaleOptionStrings {
  label: string;
  direction: LocaleDirection;
}

export interface TourGuideToggleStrings {
  labelEnabled: string;
  labelDisabled: string;
  descriptionEnabled: string;
  descriptionDisabled: string;
}

export interface NarrationToggleStrings {
  labelEnabled: string;
  labelDisabled: string;
  descriptionEnabled: string;
  descriptionDisabled: string;
}

export interface DebugCoordinatesControlStrings {
  labelEnabled: string;
  labelDisabled: string;
  descriptionEnabled: string;
  descriptionDisabled: string;
}

export interface DebugCoordinatesOverlayStrings {
  title: string;
  roomFallback: string;
  labels: {
    position: string;
    activeFloor: string;
    predictedFloor: string;
    cameraZoom: string;
    stairWidth: string;
    landing: string;
    stairNavArea: string;
    stairZone: string;
    room: string;
  };
  boolean: {
    yes: string;
    no: string;
  };
}

export interface TourResetControlStrings {
  heading: string;
  resetKey: string;
  label: string;
  description: string;
  emptyLabel: string;
  emptyDescription: string;
  pendingLabel: string;
  pendingDescription: string;
  restartPromptTemplate: string;
  guidedTourDescription: string;
  guidedTourLabelOn: string;
  guidedTourLabelOff: string;
  toggleAnnouncementOn: string;
  toggleAnnouncementOff: string;
  toggleTitleOn: string;
  toggleTitleOff: string;
}

export interface SoftwareRendererWarningStrings {
  fallbackRendererLabel: string;
  title: string;
  descriptionTemplate: string;
  recommendation: string;
  continueSafeLabel: string;
  continuousLabel: string;
  textModeLabel: string;
  reloadSafeLabel: string;
}

export interface PoiOverlayChromeStrings {
  visited: string;
  nextHighlight: string;
  prototype: string;
  live: string;
  closeDetails: string;
  relatedCaseStudies: string;
  outcomeFallbackLabel: string;
  discoveryAnnouncementTemplate: string;
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

export interface SiteStructuredDataPropertyStrings {
  labels: {
    category: string;
    outcome: string;
    status: string;
  };
  categories: Record<'project' | 'environment', string>;
  statuses: Record<'prototype' | 'live', string>;
}

export interface SiteStructuredDataStrings {
  description: string;
  listNameTemplate: string;
  textCollectionNameTemplate: string;
  textCollectionDescription: string;
  immersiveActionName: string;
  properties: SiteStructuredDataPropertyStrings;
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
  recoveryCta: {
    title: string;
    description: string;
    actionLabel: string;
    ariaLabel: string;
  };
  actions: {
    immersiveLink: string;
    debugImmersiveLink: string;
    clearPreferenceButton: string;
    clearPreferenceSuccess: string;
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
    audioSubtitles: AudioSubtitleStrings;
    modeToggle: ModeToggleStrings;
    localeToggle: LocaleToggleStrings;
    tourGuideToggle: TourGuideToggleStrings;
    narrationToggle: NarrationToggleStrings;
    debugCoordinatesControl: DebugCoordinatesControlStrings;
    debugCoordinatesOverlay: DebugCoordinatesOverlayStrings;
    tourReset: TourResetControlStrings;
    softwareRendererWarning: SoftwareRendererWarningStrings;
    helpModal: HelpModalStrings;
    customization: HudCustomizationStrings;
    narrativeLog: PoiNarrativeLogStrings;
    poiOverlay: PoiOverlayChromeStrings;
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
