import type { LocaleOverrides } from '../types';

export const DE_OVERRIDES: LocaleOverrides = {
  locale: 'de',
  site: {
    name: 'Daniel Smiths immersives Portfolio',
    structuredData: {
      description:
        'Interaktive Exponate im immersiven Portfolio von Daniel Smith.',
      immersiveActionName: 'Immersiven Modus starten',
      properties: {
        labels: {
          category: 'Kategorie',
          outcome: 'Ergebnis',
          status: 'Status',
        },
        categories: { project: 'Projekt', environment: 'Umgebung' },
        statuses: { prototype: 'Prototyp', live: 'Live' },
      },
    },
    textFallback: {
      heading: 'Highlights erkunden',
      intro:
        'Das Text-Portfolio hält jedes Exponat mit kurzen Zusammenfassungen, Ergebnissen und Kennzahlen zugänglich, solange der immersive Modus nicht verfügbar ist.',
      roomHeadingTemplate: 'Exponate in {roomName}',
      metricsHeading: 'Wichtige Kennzahlen',
      linksHeading: 'Weiterführende Links',
      recoveryCta: {
        title: 'Bereit für den ganzen Raum?',
        description:
          'Lösche die gespeicherte Textpräferenz und starte das immersive Portfolio von hier erneut.',
        actionLabel: 'Immersiv erneut versuchen',
        ariaLabel:
          'Immersiven Modus erneut versuchen und gespeicherte Textmodus-Präferenz löschen',
      },
      actions: {
        immersiveLink: 'Immersiv erneut versuchen',
        debugImmersiveLink: 'Debug: immersiven Modus erzwingen',
        clearPreferenceButton: 'Gespeicherte Moduspräferenz löschen',
        clearPreferenceSuccess: 'Gespeicherte Moduspräferenz gelöscht',
        resumeLink: 'Aktuellsten Lebenslauf herunterladen',
        githubLink: 'Projekte auf GitHub ansehen',
      },
      reasonHeadings: {
        manual: 'Nur-Text-Modus aktiviert',
        'webgl-unsupported':
          'Immersiver Modus auf diesem Gerät nicht verfügbar',
        'low-memory': 'Gerät mit wenig Speicher erkannt',
        'low-end-device': 'Leichtes Gerät erkannt',
        'low-performance': 'Performance-Ausweichmodus aktiv',
        'immersive-init-error': 'Immersive Szene hatte einen Fehler',
        'automated-client': 'Automatisierter Client erkannt',
        'data-saver': 'Datensparmodus aktiviert',
        'console-error': 'Laufzeitfehler erkannt',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Steuerung',
      interact: {
        description: 'Interagieren',
        promptTemplates: {
          default: 'Mit {title} interagieren',
          inspect: '{title} ansehen',
          activate: '{title} aktivieren',
        },
      },
      menu: {
        controls: {
          label: 'Steuerung',
          keyHint: 'C',
          title: 'Steuerung öffnen (C)',
        },
        text: {
          label: 'Text',
          keyHint: 'T',
          title: 'In den Textmodus wechseln (T)',
        },
        settings: {
          label: 'Einstellungen',
          keyHint: 'H',
          title: 'Einstellungen und Hilfe öffnen (H)',
        },
      },
    },
    localeToggle: {
      title: 'Sprache',
      description: 'HUD-Sprache und Schreibrichtung wechseln.',
      switchingAnnouncementTemplate: 'Wechsle zur Sprache {target}…',
      selectedAnnouncementTemplate: 'Sprache {label} ausgewählt.',
      failureAnnouncementTemplate:
        'Wechsel zu {target} nicht möglich. {current} bleibt aktiv.',
    },
    modeToggle: {
      idleLabelTemplate: 'Textmodus · {keyHint} drücken',
      idleDescriptionTemplate: 'Zum Nur-Text-Portfolio wechseln',
      idleAnnouncementTemplate:
        'Zum Nur-Text-Portfolio wechseln. Zum Aktivieren {keyHint} drücken.',
      idleTitleTemplate: 'Zum Nur-Text-Portfolio wechseln ({keyHint})',
      pendingLabelTemplate: 'Wechsel in den Textmodus…',
      pendingAnnouncementTemplate:
        'Zum Nur-Text-Portfolio wechseln. Wechsel in den Textmodus…',
      activeLabelTemplate: 'Immersiv erneut versuchen · {keyHint} drücken',
      activeDescriptionTemplate: 'Zum immersiven Portfolio zurückkehren.',
      activeAnnouncementTemplate:
        'Textmodus aktiv. Drücke {keyHint}, um den immersiven Modus erneut zu versuchen.',
    },
    poiOverlay: {
      visited: 'Besucht',
      nextHighlight: 'Nächstes Highlight',
      prototype: 'Prototyp',
      live: 'Live',
      closeDetails: 'POI-Details schließen',
      relatedCaseStudies: 'Verwandte Fallstudien',
      outcomeFallbackLabel: 'Ergebnis',
      discoveryAnnouncementTemplate: '{title} entdeckt. {summary}',
    },
    helpModal: {
      heading: 'Einstellungen und Hilfe',
      description:
        'Passe Barrierefreiheit, Grafikqualität, Audio und Kurzbefehle an.',
      closeLabel: 'Schließen',
      closeAriaLabel: 'Hilfe schließen',
      settings: {
        heading: 'Erlebniseinstellungen',
        description:
          'Audio-, Video- und Barrierefreiheitspräferenzen anpassen.',
      },
      announcements: {
        open: 'Hilfemenü geöffnet. Prüfe Steuerung und Einstellungen.',
        close: 'Hilfemenü geschlossen.',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist',
      summary:
        'Automatisierter Futuroptimist-Skripttisch, der Recherche, Gliederungen und sprechfertige Entwürfe für neue Videos verbindet.',
      outcome: {
        label: 'Ergebnis',
        value:
          'Verwandelt Kreativrecherche in eine wiederverwendbare Skript-Pipeline.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: '1.280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} Sterne',
            fallback: '1.280+',
          },
        },
        {
          label: 'Workflow',
          value: 'Edit-Suite im Resolve-Stil · Dreifach-Display',
        },
        {
          label: 'Fokus',
          value: 'Futuroptimist-Ökosystem-Reels in Arbeit',
        },
      ],
      interactionPrompt: '{title} ansehen',
    },
  },
};
