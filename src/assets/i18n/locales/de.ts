import type { LocaleOverrides } from '../types';

export const DE_OVERRIDES: LocaleOverrides = {
  locale: 'de',
  site: {
    name: 'Daniel Smith Immersives Portfolio',
    structuredData: {
      description:
        'Interactive stellt innerhalb des immersiven Portfolio-Erlebnisses Daniel Smith aus.',
      listNameTemplate: '{siteName} Ausstellungen',
      textCollectionNameTemplate: '{siteName} Textportfolio',
      textCollectionDescription:
        'Schnell ladende Zusammenfassungen aller immersiven Ausstellungen, die auf eine barrierefreie und crawlerfreundliche Lektüre abgestimmt sind.',
      immersiveActionName: 'Immersiven Modus starten',
      properties: {
        labels: {
          category: 'Kategorie',
          outcome: '-Ergebnis',
          status: '-Status',
        },
        categories: {
          project: '-Projekt',
          environment: '-Umgebung',
        },
        statuses: {
          prototype: '-Prototyp',
          live: 'Live',
        },
      },
      publisher: {
        name: 'Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
        logoUrl: 'https://danielsmith.io/favicon.ico',
      },
      author: {
        name: 'Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
      },
    },
    textFallback: {
      heading: 'Highlights erkunden',
      intro:
        'Das Textportfolio sorgt dafür, dass jede Ausstellung mit schnellen Zusammenfassungen, Ergebnissen und Kennzahlen zugänglich bleibt, während der immersive Modus nicht verfügbar ist.',
      roomHeadingTemplate: '{roomName} stellt aus',
      metricsHeading: 'Schlüsselkennzahlen',
      linksHeading: 'Weiterführende Literatur',
      about: {
        heading: 'Über Daniel',
        summary:
          'Site Reliability Engineer mit sechs Jahren bei YouTube mit Schwerpunkt auf Automatisierung, Observability und stetige Releases.',
        highlights: [
          'Entwickelte Entwicklerplattformen und Agententools, um den Versand sicher zu beschleunigen.',
          'Mentorenteams für SLOs, Reaktion auf Vorfälle und Zuverlässigkeitsüberprüfungen.',
          'Erforscht das immersive WebGL-Storytelling, das immer auf zugänglichen Text zurückgreift.',
        ],
      },
      skills: {
        heading: '-Fähigkeiten auf einen Blick',
        items: [
          {
            label: '-Sprachen',
            value:
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C',
          },
          {
            label: 'Infrastruktur und Werkzeuge',
            value:
              'Kubernetes, Docker, Google Cloud (BigQuery), GitHub Aktionen, WebGL/Three.js, React/Next.js, Astro',
          },
          {
            label: '-Praktiken',
            value:
              'SRE (SLOs, Reaktion auf Vorfälle, Kapazität), Beobachtbarkeit, CI/CD, Tests, prompte Dokumentation und Agentencodierung',
          },
        ],
      },
      timeline: {
        heading: 'Arbeitszeitplan',
        entries: [
          {
            period: 'September 2018 – Mai 2025',
            location: 'San Bruno, CA',
            role: 'Site Reliability Engineer (L4)',
            org: 'YouTube (Google)',
            summary:
              'Bereitschaftsdienst auf mehreren Oberflächen, automatisierte Überwachung in Python/Go/SQL/C++ und geführte Zuverlässigkeitsüberprüfungen für Führungskräfte.',
          },
          {
            period: 'Januar 2017 – September 2018\nDas holografische Terminal',
            location: 'Stennis Space Center, MS',
            role: 'Softwareentwickler',
            org: 'Marineforschungslabor',
            summary:
              'lieferte C++/Qt-Datenverarbeitungsanwendungen und Remote-Demos im Rahmen von Scrum-Sprints.',
          },
          {
            period: 'März 2014 – Dezember 2016',
            location: 'Hattiesburg, MS',
            role: 'Softwareentwickler',
            org: 'Die University of Southern Mississippi',
            summary:
              'hat Objective-C-Frameworks für die Live-Inhaltsbereitstellung in Universitäts-iOS-Apps entwickelt.',
          },
        ],
      },
      contact: {
        heading: 'Kontakt',
        emailLabel: 'E-Mail',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: 'Lebenslauf (PDF)',
        resumeUrl: 'docs/resume/2025-09/resume.pdf',
      },
      recoveryCta: {
        title: 'Bereit für den ganzen Raum?',
        description:
          'Löschen Sie die gespeicherten Texteinstellungen und starten Sie das immersive Portfolio von hier aus neu.',
        actionLabel: 'Versuchen Sie es noch einmal mit Immersive',
        ariaLabel:
          'Versuchen Sie es erneut mit dem immersiven Modus und löschen Sie die Einstellung für den gespeicherten Textmodus',
      },
      actions: {
        immersiveLink: 'Versuchen Sie es noch einmal mit Immersive',
        debugImmersiveLink: 'Debug: Immersiven Modus erzwingen',
        clearPreferenceButton: 'Gespeicherte Moduseinstellung löschen',
        clearPreferenceSuccess: 'Gespeicherte Moduseinstellung gelöscht',
        resumeLink: 'Laden Sie den neuesten Lebenslauf herunter',
        githubLink: 'Entdecken Sie Projekte auf GitHub',
      },
      reasonHeadings: {
        manual: 'Nur-Text-Modus aktiviert',
        'webgl-unsupported':
          'Immersive-Modus ist auf diesem Gerät nicht verfügbar',
        'low-memory': 'Wenig Speichergerät erkannt',
        'low-end-device': 'Lightweight-Gerät erkannt',
        'low-performance': 'Performance-Fallback aktiv',
        'immersive-init-error':
          'In der immersiven Szene ist ein Fehler aufgetreten',
        'automated-client': 'Automatisierter Client erkannt',
        'data-saver': 'Datensparmodus aktiviert',
        'console-error': 'Laufzeitfehler erkannt',
      },
      reasonDescriptions: {
        manual:
          'Sie haben die vereinfachte Portfolioansicht angefordert. Die immersive Szene bleibt nur einen Klick entfernt.',
        'webgl-unsupported':
          'Ihr Browser oder Gerät konnte den WebGL-Renderer nicht starten. Genießen Sie den schnellen Textüberblick, während wir die immersive Szene beleuchten.',
        'low-memory':
          'Ihr Gerät hat begrenzten Speicher gemeldet, daher haben wir die einfache Texttour gestartet, um einen reibungslosen Ablauf zu gewährleisten.',
        'low-end-device':
          'Wir haben ein Lightweight-Geräteprofil erkannt und daher die schnelle Texttour geladen, um die Navigation reaktionsfähig zu halten.',
        'low-performance':
          'Wir haben anhaltend niedrige Bildraten festgestellt und sind daher auf die reaktionsfähige Texttour umgestiegen, um das Erlebnis knackig zu halten.',
        'immersive-init-error':
          'Beim Starten der immersiven Szene ist ein Fehler aufgetreten, daher haben wir Ihnen stattdessen die Textübersicht präsentiert.',
        'automated-client':
          'Wir haben einen automatisierten Client entdeckt und daher das schnell ladende Textportfolio für zuverlässige Vorschauen und Crawler angezeigt.',
        'console-error':
          'Wir haben einen Laufzeitfehler festgestellt und zur stabilen Texttour gewechselt, während die immersive Szene wiederhergestellt wird.',
        'data-saver':
          'Ihr Browser hat eine Datensparfunktion angefordert, daher haben wir die einfache Texttour eingeführt, um die Bandbreite zu minimieren und gleichzeitig die Highlights zugänglich zu halten.',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Steuerung',
      items: {
        keyboardMove: {
          keys: 'WASD / Pfeiltasten',
          description: '-Umzug',
        },
        pointerDrag: {
          keys: 'Linke Maustaste',
          description: 'Zum Schwenken ziehen',
        },
        pointerZoom: {
          keys: 'Scrollrad',
          description: '-Zoom',
        },
        touchDrag: {
          keys: 'Touch',
          description:
            'Ziehen Sie die linke Hälfte zum Verschieben und die rechte Hälfte zum Schwenken',
        },
        touchPinch: {
          keys: 'Pinch',
          description: '-Zoom',
        },
        cyclePoi: {
          keys: 'F/E',
          description: 'Fahrrad-POIs',
        },
        toggleTextMode: {
          keys: 'T',
          description: 'Wechseln Sie in den Textmodus',
        },
      },
      interact: {
        defaultLabel: 'Eintreten',
        description: 'Interagieren',
        promptTemplates: {
          default: 'Interagiert mit {title}',
          inspect: '{title} prüfen',
          activate: '{title} aktivieren',
        },
      },
      helpButton: {
        labelTemplate: 'Menü öffnen · {shortcut} drücken',
        announcementTemplate:
          'Einstellungen und Hilfe öffnen. Drücken Sie {shortcut}, um die Steuerelemente und Tipps zur Barrierefreiheit zu lesen.',
        shortcutFallback: 'H',
      },
      menu: {
        controls: {
          label: '-Steuerung',
          keyHint: 'C',
          title: 'Offene Steuerung (C)',
        },
        text: {
          label: '-Text',
          keyHint: 'T',
          title: 'In den Textmodus wechseln (T)',
        },
        settings: {
          label: '-Einstellungen',
          keyHint: 'H',
          title: 'Einstellungen und Hilfe öffnen (H)',
        },
      },
      mobileToggle: {
        expandLabel: 'Alle Steuerelemente anzeigen',
        collapseLabel: 'Zusätzliche Steuerelemente ausblenden',
        expandAnnouncement:
          'Zeigt die vollständige Steuerliste für mobile Player an.',
        collapseAnnouncement:
          'Ausblenden zusätzlicher Steuerelemente, um die Liste kompakt zu halten.',
      },
    },
    movementLegend: {
      defaultDescription: 'Interagieren',
      labels: {
        keyboard: 'Eintreten',
        pointer: 'Klicken',
        touch: 'Tippen Sie auf',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: 'Drücken Sie {label} bis {prompt}',
        pointer: '{label} bis {prompt}',
        touch: '{label} bis {prompt}',
        gamepad: 'Drücken Sie {label} bis {prompt}',
      },
    },
    customization: {
      heading: '-Anpassung',
      description:
        'Optimieren Sie den Mannequin-Stil und die Begleitausrüstung für die aktuelle Mission.',
      variants: {
        title: 'Avatar-Stil',
        description: 'Wechsel-Outfits für den Mannequin-Entdecker.',
      },
      accessories: {
        title: '-Zubehör',
        description:
          'Wechseln Sie zwischen der Handgelenkkonsole und den holografischen Drohnenbegleitern.',
      },
    },
    audioControl: {
      keyHint: 'M',
      groupLabel: 'Ambient-Audio-Steuerung',
      toggle: {
        onLabelTemplate: 'Audio: Ein · Drücken Sie {keyHint} zum Stummschalten',
        offLabelTemplate:
          'Audio: Aus · Drücken Sie {keyHint}, um die Stummschaltung aufzuheben',
        titleTemplate: 'Umgebungsgeräusch umschalten ({keyHint})',
        announcementOnTemplate:
          'Ambient Audio an. Drücken Sie {keyHint} zum Umschalten.',
        announcementOffTemplate:
          'Umgebungsgeräusch aus. Drücken Sie {keyHint} zum Umschalten.',
        pendingAnnouncementTemplate:
          'Umschalten des Umgebungsaudiostatus. Bitte warten…',
      },
      slider: {
        label: 'Umgebungslautstärke',
        ariaLabel: 'Umgebungslautstärke',
        hudLabel: 'Lautstärkeregler für Umgebungsgeräusche.',
        valueAnnouncementTemplate: 'Umgebungslautstärke {volume}.',
        mutedAnnouncementTemplate:
          'Umgebungsgeräusch stummgeschaltet. Lautstärke auf {volume} eingestellt.',
        mutedValueTemplate: 'stummgeschaltet · {volume}',
        mutedAriaValueTemplate: 'stummgeschaltet ({volume})',
      },
    },
    localeToggle: {
      title: 'Sprache',
      description: 'Wechseln Sie die HUD-Sprache und -Richtung.',
      options: {
        en: {
          label: 'English',
          direction: 'ltr',
        },
        ja: {
          label: '日本語',
          direction: 'ltr',
        },
        ar: {
          label: 'العربية',
          direction: 'rtl',
        },
        'zh-Hans': {
          label: '中文（简体）',
          direction: 'ltr',
        },
        es: {
          label: 'Español',
          direction: 'ltr',
        },
        pt: {
          label: 'Português',
          direction: 'ltr',
        },
        de: {
          label: 'Deutsch',
          direction: 'ltr',
        },
        hu: {
          label: 'Magyar',
          direction: 'ltr',
        },
        'en-x-pseudo': {
          label: 'Pseudo',
          direction: 'ltr',
        },
      },
      switchingAnnouncementTemplate: 'Wechsel zum {target}-Gebietsschema…',
      selectedAnnouncementTemplate: '{label}-Gebietsschema ausgewählt.',
      failureAnnouncementTemplate:
        'Wechsel zu {target} nicht möglich. Bleiben Sie im {current}-Gebietsschema.',
    },
    tourGuideToggle: {
      labelEnabled: 'Führung am',
      labelDisabled: 'Führung ab',
      descriptionEnabled:
        'Hebt das nächste empfohlene Ausstellungsstück in der immersiven Tour hervor.',
      descriptionDisabled:
        '-Führung werden ausgeblendet, bis Sie sie wieder aktivieren.',
    },
    tourReset: {
      heading: 'Führung\nDie Highlights der',
      resetKey: 'g',
      label: 'Führung neu starten',
      description:
        'Löschen Sie besuchte POIs und spielen Sie den kuratierten Pfad erneut ab.',
      emptyLabel: 'Führung bereit',
      emptyDescription:
        'Erkunden Sie Ausstellungen, um das Zurücksetzen der Führung freizuschalten.',
      pendingLabel: 'Tour wird zurückgesetzt…',
      pendingDescription: 'Zurücksetzen der Führung…',
      restartPromptTemplate: 'Drücken Sie {key}, um neu zu starten.',
      guidedTourDescription: 'Empfohlene Exponate im Leerlauf anzeigen.',
      guidedTourLabelOn: 'Höhepunkte der Führung: Am',
      guidedTourLabelOff: 'Höhepunkte der Führung: Aus',
      toggleAnnouncementOn:
        'Highlights der geführten Tour aktiviert. Aktivieren Sie diese Option, um Empfehlungen zu deaktivieren.',
      toggleAnnouncementOff:
        'Highlights der Führung deaktiviert. Aktivieren, um Empfehlungen zu aktivieren.',
      toggleTitleOn: 'Highlights der geführten Tour deaktivieren',
      toggleTitleOff: 'Highlights der geführten Tour aktivieren',
    },
    softwareRendererWarning: {
      fallbackRendererLabel: '-Software WebGL-Renderer',
      title: 'Software-Rendering erkannt',
      descriptionTemplate:
        'Chrome verwendet {renderer} anstelle der Hardwarebeschleunigung. Basic Render Driver, SwiftShader, WARP und llvmpipe können bei kontinuierlicher WebGL-Animation abstürzen.',
      recommendation:
        'Aktivieren Sie die Browser-Hardwarebeschleunigung für ein reibungsloses immersives Portfolio. Im sicheren Immersive-Modus sind Screenshots und Debugging mit einer begrenzten Bildrate verfügbar.',
      continueSafeLabel: 'Weiter im sicheren Immersivmodus',
      continuousLabel: 'Kontinuierliches Immersiv auf jeden Fall aktivieren',
      textModeLabel: 'Textmodus verwenden',
      reloadSafeLabel: 'Laden Sie diese sichere immersive URL neu',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: 'Textmodus · Drücken Sie {keyHint}',
      idleDescriptionTemplate: 'Wechseln Sie zum Nur-Text-Portfolio',
      idleAnnouncementTemplate:
        'Wechseln Sie zum Nur-Text-Portfolio. Drücken Sie {keyHint} zum Aktivieren.',
      idleTitleTemplate: 'Wechsel zum Nur-Text-Portfolio ({keyHint})',
      pendingLabelTemplate: 'Wechsel in den Textmodus…',
      pendingAnnouncementTemplate:
        'Wechseln Sie zum Nur-Text-Portfolio. In den Textmodus wechseln…',
      activeLabelTemplate:
        'Versuchen Sie es noch einmal mit Immersiv. · Drücken Sie {keyHint}',
      activeDescriptionTemplate: 'Rückkehr zum immersiven Portfolio.',
      activeAnnouncementTemplate:
        'Textmodus aktiv. Drücken Sie {keyHint}, um es erneut mit Immersive zu versuchen.',
      errorLabelTemplate: 'Textmodus erneut versuchen · Drücken Sie {keyHint}',
      errorDescriptionTemplate:
        'Textmodusumschaltung fehlgeschlagen. Versuchen Sie es erneut oder nutzen Sie den immersiven Link.',
      errorAnnouncementTemplate:
        'Textmodusumschaltung fehlgeschlagen. Drücken Sie {keyHint}, um es erneut zu versuchen.',
      errorTitleTemplate:
        'Das Umschalten des Textmodus ist fehlgeschlagen. Drücken Sie {keyHint}, um den Textmodus erneut zu versuchen.',
    },
    poiOverlay: {
      visited: 'Besucht',
      nextHighlight: 'Nächstes Highlight',
      prototype: '-Prototyp',
      live: 'Live',
      closeDetails: 'POI-Details schließen',
      relatedCaseStudies: 'Verwandte Fallstudien',
      outcomeFallbackLabel: '-Ergebnis',
      discoveryAnnouncementTemplate: '{title} entdeckt. {summary}',
    },
    narrativeLog: {
      heading: 'Creator-Story-Protokoll',
      visitedHeading: 'Besuchte Ausstellungen',
      empty:
        'Besuchen Sie Ausstellungen, um narrative Einträge freizuschalten, die die Ausstellung des Schöpfers dokumentieren.',
      defaultVisitedLabel: 'Besucht',
      visitedLabelTemplate: 'Besucht bei {time}',
      liveAnnouncementTemplate:
        '{title} zum Story-Log des Erstellers hinzugefügt.',
      journey: {
        heading: 'Journey schlägt',
        empty: 'Entdecken Sie neue Exponate, um Reiseerzählungen zu verweben.',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          'Innerhalb des {room} {descriptor} verschiebt sich die Geschichte von {fromPoi} hin zu {toPoi}.',
        crossRoomTemplate:
          'Wir verlassen den {fromRoom} {fromDescriptor} und begeben uns auf den {toRoom} {toDescriptor}, um den {toPoi} ins Rampenlicht zu rücken.',
        crossSectionTemplate:
          'Tritt {direction} durch die Schwelle, fließt der Pfad in den {toRoom} {toDescriptor}, um {toPoi} zu erreichen.',
        fallbackTemplate: 'Die Erzählung fließt in Richtung {toPoi}.',
        announcementTemplate: 'Journey-Update – {label}: {story}',
        directions: {
          indoors: 'wieder drinnen',
          outdoors: 'im Freien',
        },
      },
      rooms: {
        livingRoom: {
          label: 'Wohnzimmer',
          descriptor: 'beleuchtetes Zwielicht-Gartenareal',
          zone: 'interior',
        },
        studio: {
          label: '-Studio',
          descriptor: '-Automatisierungslabor',
          zone: 'interior',
        },
        kitchen: {
          label: 'Küchenlabor',
          descriptor: 'kulinarischer Robotikflügel',
          zone: 'interior',
        },
        backyard: {
          label: 'Hinterhof-Observatorium\nKinolounge',
          descriptor: 'dämmerungsbeleuchteter Garten',
          zone: 'exterior',
        },
      },
    },
    helpModal: {
      heading: '-Einstellungen und Hilfe',
      description:
        'Passen Sie Voreinstellungen für Barrierefreiheit, Grafikqualität, Audio und Überprüfungsverknüpfungen an. Verwenden Sie die Hilfe-Verknüpfung (Standard H oder ?), um dieses Bedienfeld umzuschalten.',
      closeLabel: 'Schließen',
      closeAriaLabel: 'Hilfe schließen',
      settings: {
        heading: 'Erlebniseinstellungen',
        description:
          'Passen Sie die Audio-, Video- und Barrierefreiheitseinstellungen an. Diese Steuerelemente bleiben auch dann verfügbar, wenn das Menü über Tastaturkürzel geschlossen wird.',
      },
      sections: [
        {
          id: 'movement',
          title: 'Bewegung und Kamera',
          items: [
            {
              label: 'WASD / Pfeiltasten',
              description: 'Rollen Sie den Explorer durch das Haus.',
            },
            {
              label: 'Maus ziehen',
              description: 'Schwenken Sie die isometrische Kamera.',
            },
            {
              label: 'Scrollrad',
              description: 'Zoomstufe anpassen.',
            },
            {
              label: 'Touch-Joysticks',
              description:
                'Ziehen Sie das linke Pad zum Bewegen und das rechte Pad zum Schwenken.',
            },
            {
              label: 'Pinch',
              description: 'Zoom auf Touch-Geräten.',
            },
          ],
        },
        {
          id: 'interactions',
          title: '-Interaktionen',
          items: [
            {
              label: 'Annäherung an leuchtende POIs',
              description:
                'Drücken Sie Ihre Interaktionstaste (Eingabetaste/Leertaste/F), tippen oder klicken Sie, um das Ausstellungs-Overlay zu öffnen.',
            },
            {
              label: 'Q / E oder ← / →',
              description:
                'Wechseln Sie den Fokus zwischen interessanten Punkten mit der Tastatur.',
            },
            {
              label: 'T',
              description:
                'Umschalten zwischen immersivem Modus und Text-Fallback.',
            },
            {
              label: 'Shift + L',
              description:
                'Vergleichen Sie die Kinobeleuchtung mit dem Debug-Pass.',
            },
          ],
        },
        {
          id: 'accessibility',
          title: 'Zugänglichkeit und Failover',
          items: [
            {
              label: 'Geringe Leistung',
              description:
                'Die Szene wechselt automatisch in den Textmodus unter 30 FPS.',
            },
            {
              label: 'Manuelle Umschaltung',
              description:
                'Verwenden Sie jederzeit die Textmodustaste auf dem Bildschirm oder drücken Sie T.',
            },
            {
              label: 'Schieberegler für Bewegungsunschärfe',
              description:
                'Passen Sie die Spurstärke mit den Einstellungen → Bewegungsunschärfesteuerung an.',
            },
            {
              label: 'Umgebungsgeräusch',
              description:
                'Wechseln Sie mit der Audio-Taste oder drücken Sie M.',
            },
          ],
        },
      ],
      announcements: {
        open: '-Hilfemenü geöffnet. Überprüfen Sie die Steuerelemente und Einstellungen.',
        close: 'Hilfemenü geschlossen.',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist\nDas',
      summary:
        'Automatisiertes Futuroptimist-Skriptpult, das Recherchen, Skizzen und erzählfertige Entwürfe für neue Videos zusammenfügt.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Hält den Fluss wöchentlicher Highlight-Skripte aus der Automatisierungspipeline ohne manuelle Formatierung aufrecht.',
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
          label: '-Workflow',
          value: 'Bearbeitungssuite im Resolve-Stil · Dreifache Anzeige',
        },
        {
          label: 'Fokus',
          value: 'Futuroptimist-Ökosystem ist im Gange\nDie Medienwand',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist',
        },
        {
          label: 'Docs',
          href: 'https://futuroptimist.dev',
        },
      ],
      narration: {
        caption: 'Futuroptimist strahlt Highlight-Rollen durch das Wohnzimmer.',
      },
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary:
        'Sichere generative Peer-to-Peer-KI-Plattform, die auf einem Raspberry Pi-Gitter mit verschlüsselten Relay- und Serverknoten läuft.',
      outcome: {
        label: '-Ergebnis',
        value:
          '-Schnellstartskripte rufen den Relay-, Server- und Mock-LLM-Stack lokal zum Testen auf.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'token.place',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: '-Cluster',
          value: '12× Pi 5-Knoten in modularen Einschüben',
        },
        {
          label: '-Netzwerk',
          value: 'Ephemere Token · verschlüsselte Bursts',
        },
      ],
      links: [
        {
          label: '-Site',
          href: 'https://token.place',
        },
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/token.place',
        },
      ],
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary:
        'Datenschutzorientiertes „Schutzengel“-LLM, das lokales Sicherheitscoaching bietet und sich in token.place oder Offline-Inferenz integrieren lässt.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Modulare Erfassungs-, Analyse-, Benachrichtigungs- und UI-Stacks bleiben über typisierte Schnittstellen aufeinander abgestimmt.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gabriel',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: 'Fokus',
          value: '360°-Lidar-Sweep + lokale Heuristik',
        },
        {
          label: 'Trittfrequenz\nKategorie',
          value: 'Roter Alarm blinkt alle 1,0 s',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/gabriel',
        },
      ],
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary:
        'GitHub-Vorlage und Automatisierungs-Hub, der Linting, Tests, Dokumente und Codex-Eingabeaufforderungen für schnelles Repo-Bootstrapping bündelt.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Liefert wiederholbare CI (Lint, Tests, Dokumente) und Prompt-Bibliotheken, damit neue Repos fehlerfrei starten.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'flywheel',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: '-Automatisierung',
          value: 'CI-Gerüste · getippte Eingabeaufforderungen · QA-Schleifen',
        },
        {
          label: 'Docs CTA',
          value: 'flywheel.futuroptimist.dev →',
        },
      ],
      links: [
        {
          label: 'Flywheel Repo\nDie kinetische Nabe',
          href: 'https://github.com/futuroptimist/flywheel',
        },
        {
          label: 'Docs',
          href: 'https://flywheel.futuroptimist.dev',
        },
      ],
      narration: {
        caption:
          'Flywheel surrt lebendig und beleuchtet Automatisierungsaufforderungen und Werkzeuge.',
      },
      interactionPrompt: '{title}-Systeme einbinden',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000',
      summary:
        'Selbstgehosteter Copilot für die Jobsuche mit CLI und experimenteller Web-Benutzeroberfläche zur Aufnahme von Outreach- und Tracking-Anwendungen.',
      outcome: {
        label: '-Ergebnis',
        value:
          'End-to-End-Workflows spiegeln Dokumente und Tests wider, sodass die Kontaktabläufe für Personalvermittler abgedeckt bleiben.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'jobbot3000',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: '-Status',
          value: 'Local-First-CLI mit Vorschau-Web-Benutzeroberfläche',
        },
        {
          label: '-Stapel',
          value: 'Node.js 20+ · npm-Skripte · Playwright-Vorschau',
        },
        {
          label: '-Flows',
          value: 'Recruiter-Outreach-Aufnahme und Lebenszyklusverfolgung',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/jobbot3000',
        },
        {
          label: '-Automatisierungsprotokoll',
          href: 'https://futuroptimist.dev/automation',
        },
      ],
      narration: {
        caption:
          'Jobbot überträgt Automatisierungstelemetrie in schimmernden Overlays.',
      },
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary:
        'Goal und Quest-Tracker, der Repos mit Agenten-LLMs, Analysehelfern und einer Pipx-freundlichen CLI organisiert.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Alpha-Releases halten README, FAQ und Bedrohungsmodellabdeckung mit der Pytest-Suite synchron.',
      },
      metrics: [
        {
          label: '-Status',
          value: 'Alpha · Pipx-Installationsachse',
        },
        {
          label: 'Repo-Analyse',
          value: 'Questplanung anhand von Repo-Listen und Scans',
        },
        {
          label: 'Docs',
          value:
            'FAQ · bekannte Probleme · Bedrohungsmodell mit Tests beibehalten',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/axel',
        },
      ],
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves',
      summary:
        '-CLI, die GitHub-Beitragsdaten in OpenSCAD- und STL-Modelle für 3D-gedruckte Gridfinity-Regale umwandelt.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Exportiert SCAD/STL-Paare mit Metadaten, sodass gedruckte Regale die Beitragszeitpläne widerspiegeln.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gitshelves',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: '-Material',
          value: '42 mm Gridfinity-kompatible Blöcke',
        },
        {
          label: '-Synchronisierung',
          value: 'Automatisch generiert aus GitHub-Zeitleisten',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/gitshelves',
        },
      ],
    },
    'danielsmith-portfolio-table': {
      title: 'danielsmith.io',
      summary:
        'Orthografisches Three.js/WebGL-Portfolio mit Tastaturnavigation und robustem Text-Fallback für Barrierefreiheit.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Sorgt für immersive und ausgerichtete Textbereitstellungen in jeder Version.',
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
          label: '-Stapel',
          value: 'Vite · Three.js · Barrierefreiheits-HUD',
        },
        {
          label: '-Bereitstellung',
          value: 'CI-Rauch + Dokumente + Flusentore',
        },
      ],
      links: [
        {
          label: 'Live-Site',
          href: 'https://danielsmith.io',
        },
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/danielsmith.io',
        },
      ],
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary:
        '-CLI, die Codex-Aufgabenseiten und GitHub-Protokolle aufnimmt, Geheimnisse redigiert und fertige Markdown-Zusammenfassungen ausgibt.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Automatisiert die Erfassung und Zusammenfassung von CI-Protokollen für eine schnelle Debugging-Übergabe.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'f2clipboard',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: 'Geschwindigkeit',
          value:
            '-Kopieren schlägt fehl, meldet sich in weniger als 3 Sekunden an',
        },
        {
          label: '-Formate',
          value: 'CLI + Zwischenablage + Markdown-Ausgabe',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/f2clipboard',
        },
      ],
    },
    'sigma-kitchen-workbench': {
      title: 'Sigma',
      summary:
        'ESP32 „AI-Pin“, der Push-to-Talk-Audio an Whisper streamt und TTS in einem 3D-gedruckten OpenSCAD-Gehäuse zurückgibt.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Beinhaltet Firmware, Gehäuse-CAD, STL-Exporte und Montagedokumente, die von CI auf dem neuesten Stand gehalten werden.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sigma',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: '-Hardware',
          value: 'ESP32 · OpenSCAD-Gehäuse',
        },
        {
          label: '-Modi',
          value: 'Push-to-Talk · Whisper + TTS-Relais',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/sigma',
        },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary:
        'Open-Source-Toolkit zum Erlernen des Strickens und Häkelns beim Aufbau eines Roboterwebstuhls mit OpenSCAD-Hardware.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Docs umfasst Messgeräterechner, Planerexporte und Spannungsprofile für alle Garngewichte.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'wove',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: 'Handwerk',
          value: 'Loom kalibriert anhand von CAD-Stichkarten',
        },
        {
          label: '-Roadmap',
          value: 'Weg zu Roboterweblaboren',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/wove',
        },
      ],
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary:
        'Backyard-Startportal für das private DSPACE-Raketenprojekt mit telemetriegesteuerten Countdown-Hinweisen und einem öffentlichen Missionsprotokoll.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Behält Countdown-Sequenznotizen neben GitHub- und Missionsprotokoll-Links bei, während das Repo privat bleibt.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'dspace',
            visibility: 'private',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: 'Countdown',
          value: 'Autonome T-0-Sequenzierung',
        },
        {
          label: '-Stapel',
          value: 'Three.js FX · Raumklang',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/dspace',
        },
        {
          label: 'Missionsprotokoll',
          href: 'https://futuroptimist.dev/projects/dspace',
        },
      ],
      narration: {
        caption:
          'dSpace-Startrampe knistert vor Countdown-Energie neben dem Hinterhofweg.',
        durationMs: 6000,
      },
      interactionPrompt: '{title}-Countdown starten',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'GitHub Actions-Workflow, der veraltete Pull-Requests mit Probelaufvorschauen und optionaler Branch-Bereinigung massenhaft schließt.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Ein-Knopf-Workflow dokumentiert Eingaben, Sicherheitsmodell und Audit-Ausgaben in der README-Datei.',
      },
      metrics: [
        {
          label: 'Sterne',
          value: 'Synchronisierung von GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'pr-reaper',
            format: 'compact',
            template: '{value} Sterne',
            fallback: 'Synchronisierung von GitHub…',
          },
        },
        {
          label: '-Sweep',
          value: 'Massenschließen veralteter PRs mit Vorschaumodus',
        },
        {
          label: 'Trittfrequenz\nKategorie',
          value: 'Cron-Trigger + manuelle Probeläufe',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/pr-reaper',
        },
      ],
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube\nDas Gewächshaus',
      summary:
        'k3s-on-Raspberry-Pi-Plattform gepaart mit einer netzunabhängigen Solarwürfelinstallation, dokumentiert mit CAD, Pi-Bildern und Feldführern.',
      outcome: {
        label: '-Ergebnis',
        value:
          'Schritt-für-Schritt-Dokumente behandeln Solar-Hardware, Pi-Bereitstellung und Kubernetes-Helfer für belastbare Homelabs.',
      },
      metrics: [
        {
          label: '-Plattform',
          value:
            'k3s, Kubernetes-Helfer, Cloudflare-Tunnel und Hinweise zur Solarneigung/Bewässerung',
        },
        {
          label: '-Hardware',
          value: 'Solarwürfel CAD, Pi-Trägerplatten, Elektronikdokumente',
        },
        {
          label: '-Anleitungen',
          value: 'Feldleitfäden für Pi-Images und Headless-Provisioning',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/sugarkube',
        },
        {
          label: 'Gewächshausprotokoll',
          href: 'https://futuroptimist.dev/projects/sugarkube',
        },
      ],
      narration: {
        caption:
          'Sugarkube schaltet sanfte Wachstumslichter und die Koi-Teich-Atmosphäre synchron.',
        durationMs: 6500,
      },
    },
  },
};
