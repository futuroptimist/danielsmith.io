import type { Locale, LocaleOverrides } from '../types';

type LatinLocale = Extract<Locale, 'es' | 'pt' | 'de' | 'hu'>;

interface LatinLocaleSeed {
  locale: LatinLocale;
  siteName: string;
  textHeading: string;
  textIntro: string;
  roomHeadingTemplate: string;
  metricsHeading: string;
  linksHeading: string;
  aboutHeading: string;
  aboutSummary: string;
  skillsHeading: string;
  timelineHeading: string;
  contactHeading: string;
  recoveryTitle: string;
  recoveryDescription: string;
  recoveryAction: string;
  languageTitle: string;
  languageDescription: string;
  switchingTemplate: string;
  selectedTemplate: string;
  failureTemplate: string;
  settingsHeading: string;
  settingsDescription: string;
  controlsHeading: string;
  interact: string;
  textMode: string;
  audioOn: string;
  audioOff: string;
  guidedOn: string;
  guidedOff: string;
  tourHeading: string;
  tourReset: string;
  poiVisited: string;
  poiNext: string;
  poiPrototype: string;
  poiLive: string;
  closeDetails: string;
  relatedCaseStudies: string;
  outcomeLabel: string;
  discoveredTemplate: string;
  storyLog: string;
  visitedHeading: string;
  journeyHeading: string;
  softwareTitle: string;
  softwareRecommendation: string;
  move: string;
  pan: string;
  zoom: string;
  cyclePoi: string;
  languageOptions: Record<LatinLocale, string>;
  poiSummaries: Record<string, string>;
}

const sharedPoiTitles = {
  'futuroptimist-living-room-tv': 'Futuroptimist',
  'tokenplace-studio-cluster': 'token.place',
  'gabriel-studio-sentry': 'Gabriel',
  'flywheel-studio-flywheel': 'Flywheel',
  'jobbot-studio-terminal': 'Jobbot3000',
  'axel-studio-tracker': 'Axel',
  'gitshelves-living-room-installation': 'Gitshelves',
  'danielsmith-portfolio-table': 'danielsmith.io',
  'f2clipboard-kitchen-console': 'f2clipboard',
  'sigma-kitchen-workbench': 'Sigma',
  'wove-kitchen-loom': 'Wove',
  'dspace-backyard-rocket': 'DSPACE',
  'pr-reaper-backyard-console': 'PR Reaper',
  'sugarkube-backyard-greenhouse': 'Sugarkube',
} as const;

const poiOrder = Object.keys(sharedPoiTitles) as Array<
  keyof typeof sharedPoiTitles
>;

function buildPoi(seed: LatinLocaleSeed): LocaleOverrides['poi'] {
  return Object.fromEntries(
    poiOrder.map((id) => {
      const title = sharedPoiTitles[id];
      return [
        id,
        {
          title,
          summary: seed.poiSummaries[id],
          outcome: {
            label: seed.outcomeLabel,
            value: seed.poiSummaries[id],
          },
          metrics: [
            { label: seed.metricsHeading, value: seed.poiPrototype },
            { label: seed.poiLive, value: seed.poiLive },
          ],
          interactionPrompt: `${seed.interact} ${title}`,
          narration: {
            caption: seed.poiSummaries[id],
          },
        },
      ];
    })
  ) as LocaleOverrides['poi'];
}

const labels = {
  en: { label: 'English', direction: 'ltr' },
  es: { label: 'Español', direction: 'ltr' },
  pt: { label: 'Português', direction: 'ltr' },
  de: { label: 'Deutsch', direction: 'ltr' },
  hu: { label: 'Magyar', direction: 'ltr' },
  ja: { label: '日本語', direction: 'ltr' },
  ar: { label: 'العربية', direction: 'rtl' },
  'zh-Hans': { label: '中文（简体）', direction: 'ltr' },
  'en-x-pseudo': { label: 'Pseudo', direction: 'ltr' },
} as const;

export function buildLatinLocale(seed: LatinLocaleSeed): LocaleOverrides {
  return {
    locale: seed.locale,
    site: {
      name: seed.siteName,
      structuredData: {
        description: seed.textIntro,
        listNameTemplate: '{siteName} exhibits',
        textCollectionNameTemplate: '{siteName} text portfolio',
        textCollectionDescription: seed.textIntro,
        immersiveActionName: seed.recoveryAction,
        properties: {
          labels: {
            category: seed.settingsHeading,
            outcome: seed.outcomeLabel,
            status: seed.poiLive,
          },
          categories: { project: 'Project', environment: 'Environment' },
          statuses: { prototype: seed.poiPrototype, live: seed.poiLive },
        },
        publisher: { name: 'Daniel Smith' },
        author: { name: 'Daniel Smith' },
      },
      textFallback: {
        heading: seed.textHeading,
        intro: seed.textIntro,
        roomHeadingTemplate: seed.roomHeadingTemplate,
        metricsHeading: seed.metricsHeading,
        linksHeading: seed.linksHeading,
        about: {
          heading: seed.aboutHeading,
          summary: seed.aboutSummary,
          highlights: [
            seed.textIntro,
            seed.recoveryDescription,
            seed.settingsDescription,
          ],
        },
        skills: {
          heading: seed.skillsHeading,
          items: [
            {
              label: 'Languages',
              value: 'Python, Go, SQL, C++, TypeScript/JavaScript',
            },
            {
              label: 'Infra',
              value: 'Kubernetes, Docker, Google Cloud, WebGL/Three.js',
            },
            { label: 'Practices', value: 'SRE, observability, CI/CD, testing' },
          ],
        },
        timeline: { heading: seed.timelineHeading },
        contact: { heading: seed.contactHeading },
        recoveryCta: {
          title: seed.recoveryTitle,
          description: seed.recoveryDescription,
          actionLabel: seed.recoveryAction,
          ariaLabel: seed.recoveryAction,
        },
        actions: {
          immersiveLink: seed.recoveryAction,
          debugImmersiveLink: seed.recoveryAction,
          clearPreferenceButton: seed.textMode,
          clearPreferenceSuccess: seed.textMode,
          resumeLink: seed.linksHeading,
          githubLink: seed.relatedCaseStudies,
        },
      },
    },
    hud: {
      controlOverlay: {
        heading: seed.controlsHeading,
        items: {
          keyboardMove: { keys: 'WASD / Arrows', description: seed.move },
          pointerDrag: { keys: 'Mouse drag', description: seed.pan },
          pointerZoom: { keys: 'Wheel', description: seed.zoom },
          touchDrag: { keys: 'Touch', description: seed.move },
          touchPinch: { keys: 'Pinch', description: seed.zoom },
          cyclePoi: { keys: 'Q / E', description: seed.cyclePoi },
          toggleTextMode: { keys: 'T', description: seed.textMode },
        },
        interact: {
          defaultLabel: 'Enter',
          description: seed.interact,
          promptTemplates: {
            default: `${seed.interact} {title}`,
            inspect: `${seed.interact} {title}`,
            activate: `${seed.interact} {title}`,
          },
        },
        helpButton: {
          labelTemplate: `${seed.settingsHeading} · {shortcut}`,
          announcementTemplate: `${seed.settingsHeading}: {shortcut}`,
          shortcutFallback: seed.settingsHeading,
        },
        menu: {
          controls: {
            label: seed.controlsHeading,
            keyHint: 'C',
            title: seed.controlsHeading,
          },
          text: {
            label: seed.textMode,
            keyHint: 'T',
            title: seed.textMode,
          },
          settings: {
            label: seed.settingsHeading,
            keyHint: 'H',
            title: seed.settingsHeading,
          },
        },
      },
      movementLegend: {
        defaultDescription: seed.move,
        labels: {
          keyboard: 'Keyboard',
          pointer: 'Pointer',
          touch: 'Touch',
        },
        interactPromptTemplates: {
          keyboard: `${seed.interact} {label}: {prompt}`,
          pointer: `${seed.interact} {label}: {prompt}`,
          touch: `${seed.interact} {label}: {prompt}`,
          default: `${seed.interact} {prompt}`,
        },
      },
      audioControl: {
        groupLabel: 'Audio',
        toggle: {
          onLabelTemplate: `${seed.audioOn} · {keyHint}`,
          offLabelTemplate: `${seed.audioOff} · {keyHint}`,
          titleTemplate: `${seed.audioOn} ({keyHint})`,
          announcementOnTemplate: `${seed.audioOn}. {keyHint}.`,
          announcementOffTemplate: `${seed.audioOff}. {keyHint}.`,
          pendingAnnouncementTemplate: seed.audioOn,
        },
        slider: {
          label: 'Volume',
          ariaLabel: 'Volume',
          hudLabel: 'Volume',
          valueAnnouncementTemplate: '{volume}',
          mutedAnnouncementTemplate: `${seed.audioOff}. {volume}`,
          mutedValueTemplate: `${seed.audioOff} · {volume}`,
          mutedAriaValueTemplate: `${seed.audioOff} ({volume})`,
        },
      },
      localeToggle: {
        title: seed.languageTitle,
        description: seed.languageDescription,
        options: labels,
        switchingAnnouncementTemplate: seed.switchingTemplate,
        selectedAnnouncementTemplate: seed.selectedTemplate,
        failureAnnouncementTemplate: seed.failureTemplate,
      },
      tourGuideToggle: {
        labelEnabled: seed.guidedOn,
        labelDisabled: seed.guidedOff,
        descriptionEnabled: seed.guidedOn,
        descriptionDisabled: seed.guidedOff,
      },
      tourReset: {
        heading: seed.tourHeading,
        label: seed.tourReset,
        description: seed.tourReset,
        emptyLabel: seed.guidedOff,
        emptyDescription: seed.guidedOff,
        pendingLabel: seed.guidedOn,
        pendingDescription: seed.guidedOn,
        restartPromptTemplate: `${seed.tourReset}: {key}`,
        guidedTourDescription: seed.guidedOn,
        guidedTourLabelOn: seed.guidedOn,
        guidedTourLabelOff: seed.guidedOff,
        toggleAnnouncementOn: seed.guidedOn,
        toggleAnnouncementOff: seed.guidedOff,
        toggleTitleOn: seed.guidedOn,
        toggleTitleOff: seed.guidedOff,
      },
      modeToggle: {
        keyHint: 'T',
        idleLabelTemplate: `${seed.textMode} · {keyHint}`,
        idleDescriptionTemplate: seed.textMode,
        idleAnnouncementTemplate: `${seed.textMode}. {keyHint}.`,
        idleTitleTemplate: `${seed.textMode} ({keyHint})`,
        pendingLabelTemplate: `${seed.textMode}…`,
        pendingAnnouncementTemplate: `${seed.textMode}…`,
        activeLabelTemplate: `${seed.recoveryAction} · {keyHint}`,
        activeDescriptionTemplate: seed.recoveryAction,
        activeAnnouncementTemplate: `${seed.recoveryAction}. {keyHint}.`,
        errorLabelTemplate: `${seed.recoveryAction} · {keyHint}`,
        errorDescriptionTemplate: seed.recoveryAction,
        errorAnnouncementTemplate: `${seed.recoveryAction}. {keyHint}.`,
        errorTitleTemplate: `${seed.recoveryAction} ({keyHint})`,
      },
      softwareRendererWarning: {
        fallbackRendererLabel: 'WebGL',
        title: seed.softwareTitle,
        recommendation: seed.softwareRecommendation,
        continueSafeLabel: seed.softwareRecommendation,
        continuousLabel: seed.softwareRecommendation,
        textModeLabel: seed.textMode,
        reloadSafeLabel: seed.recoveryAction,
      },
      helpModal: {
        heading: seed.settingsHeading,
        description: seed.settingsDescription,
        closeLabel: seed.closeDetails,
        closeAriaLabel: seed.closeDetails,
        sections: [
          {
            id: 'movement',
            title: seed.controlsHeading,
            items: [
              { label: 'WASD', description: seed.move },
              { label: 'Mouse', description: seed.pan },
              { label: 'Wheel', description: seed.zoom },
            ],
          },
          {
            id: 'interactions',
            title: seed.interact,
            items: [
              { label: 'POI', description: seed.interact },
              { label: 'T', description: seed.textMode },
            ],
          },
          {
            id: 'accessibility',
            title: seed.settingsHeading,
            items: [
              { label: seed.audioOn, description: seed.audioOff },
              { label: seed.guidedOn, description: seed.guidedOff },
            ],
          },
        ],
        settings: {
          heading: seed.settingsHeading,
          description: seed.settingsDescription,
        },
        announcements: { open: seed.settingsHeading, close: seed.closeDetails },
      },
      customization: {
        heading: seed.settingsHeading,
        description: seed.settingsDescription,
        variants: {
          title: seed.settingsHeading,
          description: seed.settingsDescription,
        },
        accessories: {
          title: seed.settingsHeading,
          description: seed.settingsDescription,
        },
      },
      narrativeLog: {
        heading: seed.storyLog,
        visitedHeading: seed.visitedHeading,
        empty: seed.poiNext,
        defaultVisitedLabel: seed.poiVisited,
        visitedLabelTemplate: `${seed.poiVisited} {time}`,
        liveAnnouncementTemplate: '{title}',
        journey: {
          heading: seed.journeyHeading,
          empty: seed.poiNext,
          entryLabelTemplate: '{from} → {to}',
          sameRoomTemplate: '{room} {descriptor}: {fromPoi} → {toPoi}',
          crossRoomTemplate:
            '{fromRoom} {fromDescriptor} → {toRoom} {toDescriptor}: {toPoi}',
          crossSectionTemplate:
            '{direction} → {toRoom} {toDescriptor}: {toPoi}',
          fallbackTemplate: '{toPoi}',
          announcementTemplate: '{label}: {story}',
          directions: { indoors: seed.move, outdoors: seed.move },
        },
      },
      poiOverlay: {
        visited: seed.poiVisited,
        nextHighlight: seed.poiNext,
        prototype: seed.poiPrototype,
        live: seed.poiLive,
        closeDetails: seed.closeDetails,
        relatedCaseStudies: seed.relatedCaseStudies,
        outcomeFallbackLabel: seed.outcomeLabel,
        discoveryAnnouncementTemplate: seed.discoveredTemplate,
      },
    },
    poi: buildPoi(seed),
  };
}
