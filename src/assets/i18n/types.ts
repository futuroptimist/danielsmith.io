import type {
  PoiId,
  PoiInteraction,
  PoiMetricSource,
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
    lightingDebug: ControlOverlayItemStrings;
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

export interface LocalizedOptionStrings {
  label: string;
  description: string;
}

export interface SettingsControlsStrings {
  graphicsQuality: {
    title: string;
    description: string;
    selectedAnnouncementTemplate: string;
    presets: Record<
      'cinematic' | 'balanced' | 'performance',
      LocalizedOptionStrings
    >;
  };
  accessibilityPresets: {
    title: string;
    description: string;
    selectedAnnouncementTemplate: string;
    presets: Record<
      'standard' | 'calm' | 'high-contrast' | 'photosensitive',
      LocalizedOptionStrings
    >;
  };
  motionBlur: {
    label: string;
    description: string;
    groupLabel: string;
    hudLabel: string;
    values: {
      off: string;
      lowTemplate: string;
      mediumTemplate: string;
      highTemplate: string;
    };
  };
  avatarVariants: {
    selectedAnnouncementTemplate: string;
    swatchTitleTemplate: string;
    options: Record<'portfolio' | 'casual' | 'formal', LocalizedOptionStrings>;
  };
  avatarAccessories: {
    enabledAnnouncementTemplate: string;
    disabledAnnouncementTemplate: string;
    options: Record<'wrist-console' | 'holo-drone', LocalizedOptionStrings>;
  };
}

export interface DebugCoordinatesStrings {
  labelEnabled: string;
  labelDisabled: string;
  descriptionEnabled: string;
  descriptionDisabled: string;
  overlayLabel: string;
  labels: {
    position: string;
    activeFloor: string;
    predictedFloor: string;
    cameraZoom: string;
    stairWidth: string;
    landing: string;
    stairNav: string;
    stairZone: string;
    room: string;
  };
  values: {
    yes: string;
    no: string;
    none: string;
  };
}

export interface DebugCollidersStrings {
  labelEnabled: string;
  labelDisabled: string;
  descriptionEnabled: string;
  descriptionDisabled: string;
  idsLabelEnabled: string;
  idsLabelDisabled: string;
  idsDescriptionEnabled: string;
  idsDescriptionDisabled: string;
  solidIdsLabelEnabled: string;
  solidIdsLabelDisabled: string;
  solidIdsDescriptionEnabled: string;
  solidIdsDescriptionDisabled: string;
  fpsLabelEnabled: string;
  fpsLabelDisabled: string;
  fpsDescriptionEnabled: string;
  fpsDescriptionDisabled: string;
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

export interface LowFpsRecoveryStrings {
  title: string;
  body: string;
  dismissLabel: string;
  downgradeBalancedLabel: string;
  downgradePerformanceLabel: string;
  textModeLabel: string;
  announcement: string;
}

export interface PoiOverlayChromeStrings {
  visited: string;
  prototype: string;
  live: string;
  closeDetails: string;
  relatedCaseStudies: string;
  outcomeFallbackLabel: string;
  discoveryAnnouncementTemplate: string;
  debugDetailsLabel: string;
  debugPoiAnchor: string;
  debugModelTriangles: string;
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
    debugCoordinates: DebugCoordinatesStrings;
    debugColliders: DebugCollidersStrings;
    settingsControls: SettingsControlsStrings;
    softwareRendererWarning: SoftwareRendererWarningStrings;
    lowFpsRecovery: LowFpsRecoveryStrings;
    helpModal: HelpModalStrings;
    customization: HudCustomizationStrings;
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
