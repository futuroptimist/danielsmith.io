import type { LocaleOverrides } from '../types';

export const HU_OVERRIDES: LocaleOverrides = {
  locale: 'hu',
  site: {
    name: 'Daniel Smith immerzív portfóliója',
    structuredData: {
      description:
        'Interaktív kiállítások Daniel Smith immerzív portfólióélményében.',
      immersiveActionName: 'Immerzív mód indítása',
      properties: {
        labels: {
          category: 'Kategória',
          outcome: 'Eredmény',
          status: 'Állapot',
        },
        categories: { project: 'Projekt', environment: 'Környezet' },
        statuses: { prototype: 'Prototípus', live: 'Élő' },
      },
    },
    textFallback: {
      heading: 'Fedezd fel a kiemeléseket',
      intro:
        'A szöveges portfólió minden kiállítást elérhetővé tesz rövid összefoglalókkal, eredményekkel és mérőszámokkal, amikor az immerzív mód nem érhető el.',
      roomHeadingTemplate: '{roomName} kiállításai',
      metricsHeading: 'Fő mérőszámok',
      linksHeading: 'További olvasmányok',
      recoveryCta: {
        title: 'Készen állsz a teljes szobára?',
        description:
          'Töröld a mentett szöveges beállítást, és indítsd újra innen az immerzív portfóliót.',
        actionLabel: 'Immerzív mód újrapróbálása',
        ariaLabel:
          'Immerzív mód újrapróbálása és a mentett szöveges mód beállításának törlése',
      },
      actions: {
        immersiveLink: 'Immerzív mód újrapróbálása',
        debugImmersiveLink: 'Hibakeresés: immerzív mód kényszerítése',
        clearPreferenceButton: 'Mentett módbeállítás törlése',
        clearPreferenceSuccess: 'Mentett módbeállítás törölve',
        resumeLink: 'Legfrissebb önéletrajz letöltése',
        githubLink: 'Projektek felfedezése GitHubon',
      },
      reasonHeadings: {
        manual: 'Csak szöveges mód bekapcsolva',
        'webgl-unsupported': 'Az immerzív mód nem érhető el ezen az eszközön',
        'low-memory': 'Kevés memóriájú eszköz észlelve',
        'low-end-device': 'Könnyű eszközprofil észlelve',
        'low-performance': 'Teljesítmény miatti tartalék mód aktív',
        'immersive-init-error': 'Az immerzív jelenet hibába ütközött',
        'automated-client': 'Automatizált kliens észlelve',
        'data-saver': 'Adattakarékos mód bekapcsolva',
        'console-error': 'Futásidejű hibák észlelve',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Vezérlés',
      interact: {
        description: 'Interakció',
        promptTemplates: {
          default: 'Interakció ezzel: {title}',
          inspect: '{title} megvizsgálása',
          activate: '{title} aktiválása',
        },
      },
      menu: {
        controls: {
          label: 'Vezérlés',
          keyHint: 'C',
          title: 'Vezérlés megnyitása (C)',
        },
        text: {
          label: 'Szöveg',
          keyHint: 'T',
          title: 'Váltás szöveges módra (T)',
        },
        settings: {
          label: 'Beállítások',
          keyHint: 'H',
          title: 'Beállítások és súgó megnyitása (H)',
        },
      },
    },
    localeToggle: {
      title: 'Nyelv',
      description: 'A HUD nyelvének és irányának váltása.',
      switchingAnnouncementTemplate: 'Váltás erre a nyelvre: {target}…',
      selectedAnnouncementTemplate: '{label} nyelv kiválasztva.',
      failureAnnouncementTemplate:
        'Nem sikerült váltani erre: {target}. Marad: {current}.',
    },
    modeToggle: {
      idleLabelTemplate: 'Szöveges mód · {keyHint} megnyomása',
      idleDescriptionTemplate: 'Váltás a csak szöveges portfólióra',
      idleAnnouncementTemplate:
        'Váltás a csak szöveges portfólióra. Aktiváláshoz nyomd meg: {keyHint}.',
      idleTitleTemplate: 'Váltás a csak szöveges portfólióra ({keyHint})',
      pendingLabelTemplate: 'Váltás szöveges módra…',
      pendingAnnouncementTemplate:
        'Váltás a csak szöveges portfólióra. Váltás szöveges módra…',
      activeLabelTemplate: 'Immerzív mód újra · {keyHint} megnyomása',
      activeDescriptionTemplate: 'Visszatérés az immerzív portfólióhoz.',
      activeAnnouncementTemplate:
        'Szöveges mód aktív. Nyomd meg: {keyHint}, hogy újra kipróbáld az immerzív módot.',
    },
    poiOverlay: {
      visited: 'Megtekintve',
      nextHighlight: 'Következő kiemelés',
      prototype: 'Prototípus',
      live: 'Élő',
      closeDetails: 'POI-részletek bezárása',
      relatedCaseStudies: 'Kapcsolódó esettanulmányok',
      outcomeFallbackLabel: 'Eredmény',
      discoveryAnnouncementTemplate: '{title} felfedezve. {summary}',
    },
    helpModal: {
      heading: 'Beállítások és súgó',
      description:
        'Állítsd az akadálymentességet, grafikai minőséget, hangot és gyorsbillentyűket.',
      closeLabel: 'Bezárás',
      closeAriaLabel: 'Súgó bezárása',
      settings: {
        heading: 'Élménybeállítások',
        description:
          'Hang-, videó- és akadálymentességi beállítások hangolása.',
      },
      announcements: {
        open: 'Súgómenü megnyitva. Nézd át a vezérlést és beállításokat.',
        close: 'Súgómenü bezárva.',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist',
      summary:
        'Automatizált Futuroptimist szkriptasztal, amely kutatást, vázlatokat és narrációra kész piszkozatokat fűz össze új videókhoz.',
      outcome: {
        label: 'Eredmény',
        value: 'A kreatív kutatást újrahasználható szkriptfolyamattá alakítja.',
      },
      metrics: [
        {
          label: 'Csillagok',
          value: '1 280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} csillag',
            fallback: '1 280+',
          },
        },
        {
          label: 'Munkafolyamat',
          value: 'Resolve-stílusú szerkesztőcsomag · három kijelző',
        },
        {
          label: 'Fókusz',
          value: 'Készülő Futuroptimist-ökoszisztéma klipek',
        },
      ],
      interactionPrompt: '{title} megvizsgálása',
    },
  },
};
