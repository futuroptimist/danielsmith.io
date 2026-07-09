import { buildLatinLocaleOverrides } from './latinLocaleOverrides';

export const DE_OVERRIDES = buildLatinLocaleOverrides({
  locale: 'de',
  siteName: 'Daniel Smith Immersives Portfolio',
  nativeLabel: 'Deutsch',
  strings: {
    controls: 'Steuerung',
    settingsHelp: 'Einstellungen & Hilfe',
    language: 'Sprache',
    languageDescription: 'HUD-Sprache und Schreibrichtung wechseln.',
    switching: 'Wechsle zu {target}…',
    selected: '{label} ausgewählt.',
    failure: 'Wechsel zu {target} nicht möglich. {current} bleibt aktiv.',
    textHeading: 'Highlights erkunden',
    textIntro:
      'Das Textportfolio hält jedes Exponat mit Kurzfassungen, Ergebnissen und Metriken zugänglich, wenn der immersive Modus nicht verfügbar ist.',
    recoveryTitle: 'Bereit für den ganzen Raum?',
    recoveryDescription:
      'Lösche die gespeicherte Textpräferenz und starte das immersive Portfolio von hier neu.',
    recoveryAction: 'Immersiv erneut versuchen',
    recoveryAria:
      'Immersiven Modus erneut versuchen und gespeicherte Textmodus-Präferenz löschen',
    metrics: 'Kennzahlen',
    links: 'Weiterlesen',
    outcome: 'Ergebnis',
    stars: 'Sterne',
    syncing: 'Synchronisiere von GitHub…',
    discovered: '{title} entdeckt. {summary}',
    closePoi: 'POI-Details schließen',
    related: 'Verwandte Fallstudien',
    prototype: 'Prototyp',
    live: 'Live',
    textMode: 'Zum Textmodus wechseln',
    tryImmersive: 'Immersiv erneut versuchen',
    audioOn: 'Audio: an',
    audioOff: 'Audio: aus',
    audioSubtitleAmbientLabel: 'Ambient-Audio',
    audioSubtitlePoiLabel: 'Prioritätsuntertitel',
    audioSubtitleDismissAmbient: 'Untertitel schließen',
    audioSubtitleDismissPoi: 'Prioritätsuntertitel schließen',
    debugCoordinatesLabelEnabled: 'Debug-Koordinaten ein',
    debugCoordinatesLabelDisabled: 'Debug-Koordinaten aus',
    debugCoordinatesDescriptionEnabled:
      'Zeigt das Overlay für XYZ, Etage, Kamera und Treppe.',
    debugCoordinatesDescriptionDisabled:
      'Debug-Koordinaten bleiben verborgen, bis du sie einschaltest.',
    debugCoordinatesOverlayLabel: 'Debug-Koordinaten',
    debugCoordinatesPosition: 'XYZ',
    debugCoordinatesActiveFloor: 'Aktive Etage',
    debugCoordinatesPredictedFloor: 'Vorhergesagte Treppenetage',
    debugCoordinatesCameraZoom: 'Kamera-Zoom',
    debugCoordinatesStairWidth: 'Treppenbreite',
    debugCoordinatesLanding: 'Podest',
    debugCoordinatesStairNav: 'Treppen-Navigationsbereich',
    debugCoordinatesStairZone: 'Treppenzone',
    debugCoordinatesRoom: 'Raum',
    debugCoordinatesYes: 'Ja',
    debugCoordinatesNo: 'Nein',
    debugCoordinatesNone: 'Keine',
    debugCollidersLabelEnabled: 'Collider-Overlay ein',
    debugCollidersLabelDisabled: 'Collider-Overlay aus',
    debugCollidersDescriptionEnabled:
      'Zeigt unsichtbare Wände und Kollisionsrechtecke der aktiven Etage.',
    debugCollidersDescriptionDisabled:
      'Unsichtbare Wände und Kollisionsrechtecke bleiben verborgen, bis du sie einschaltest.',
    debugCollidersIdsLabelEnabled: 'Collider-IDs ein',
    debugCollidersIdsLabelDisabled: 'Collider-IDs aus',
    debugCollidersIdsDescriptionEnabled:
      'Zeigt Collider-ID-Beschriftungen, während das Collider-Overlay aktiv ist.',
    debugCollidersIdsDescriptionDisabled:
      'Blendet Collider-ID-Beschriftungen aus, während die Drahtgitter verfügbar bleiben.',
    debugCollidersSolidIdsLabelEnabled: 'Solid-IDs ein',
    debugCollidersSolidIdsLabelDisabled: 'Solid-IDs aus',
    debugCollidersSolidIdsDescriptionEnabled:
      'Zeigt stabile IDs und Drahtgitter für sichtbare Szenen-Solids.',
    debugCollidersSolidIdsDescriptionDisabled:
      'Stabile Solid-IDs und Drahtgitter bleiben ausgeblendet.',
    debugCollidersFpsLabelEnabled: 'FPS-Zähler ein',
    debugCollidersFpsLabelDisabled: 'FPS-Zähler aus',
    debugCollidersFpsDescriptionEnabled:
      'Zeigt ein nicht interaktives stats.js-FPS-Panel für immersive Diagnosen.',
    debugCollidersFpsDescriptionDisabled:
      'Blendet das stats.js-FPS-Panel aus, während Diagnosen verfügbar bleiben.',
  },
  poi: {
    futuroptimist: {
      summary:
        'Automatisierter Futuroptimist-Skripttisch, der Recherche, Gliederungen und sprechfertige Entwürfe verbindet.',
      outcome:
        'Hält wöchentliche Highlight-Skripte ohne manuelle Formatierung in der Automatisierungspipeline.',
      metrics: [
        'Workflow',
        'Resolve-artige Editing-Suite · drei Displays',
        'Fokus',
        'Reels zum Futuroptimist-Ökosystem in Arbeit',
      ],
    },
    tokenplace: {
      summary:
        'Sichere Peer-to-Peer-Plattform für generative KI mit Relay- und Compute-Node-Pfaden, um ungenutzte Rechenleistung als Gemeingut zu teilen.',
      outcome:
        'Quickstart-Skripte starten Relay, Server und Mock-LLM-Stack lokal zum Testen.',
      metrics: [
        'Cluster',
        'Python-Einstiege relay.py und server.py',
        'Netzwerk',
        'Ephemere Tokens · verschlüsselte Bursts',
      ],
    },
    gabriel: {
      summary:
        'Privacy-first „Schutzengel“-LLM für lokales Security-Coaching mit token.place oder Offline-Inferenz.',
      outcome:
        'Ingestion-, Analyse-, Benachrichtigungs- und UI-Stacks bleiben über typisierte Schnittstellen synchron.',
      metrics: [
        'Fokus',
        '360°-Lidar-Scan + lokale Heuristiken',
        'Takt',
        'FAQ und Repo-Dokumentation',
      ],
    },
    flywheel: {
      summary:
        'GitHub-Template und Automatisierungs-Hub mit Linting, Tests, Docs und Codex-Prompts für schnelles Repo-Bootstrapping.',
      outcome:
        'Liefert wiederholbare CI und Prompt-Bibliotheken, damit neue Repos gesund starten.',
      metrics: [
        'Automatisierung',
        'CI-Scaffolds · typisierte Prompts · QA-Schleifen',
        'Docs CTA',
        'Stand, Welle, Adapter und Physik-Dokumente',
      ],
    },
    jobbot: {
      summary:
        'Selbst gehosteter Jobsuche-Copilot mit CLI und experimenteller Web-UI für Outreach und Bewerbungs-Tracking.',
      outcome:
        'End-to-End-Workflows spiegeln Docs und Tests, damit Recruiter-Outreach abgedeckt bleibt.',
      metrics: [
        'Status',
        'Local-first CLI mit Web-UI-Preview',
        'Stack',
        'Node.js 20+ · npm-Skripte · Playwright-Preview',
        'Flows',
        'Outreach-Ingestion und Lifecycle-Tracking',
      ],
    },
    axel: {
      summary:
        'Ziel- und Quest-Tracker, der Repos mit agentic LLMs, Analytics-Helfern und pipx-freundlicher CLI organisiert.',
      outcome:
        'Alpha-Releases halten README, FAQ und Threat Model mit pytest synchron.',
      metrics: [
        'Status',
        'Alpha · pipx install axel',
        'Repo-Analytics',
        'Quest-Planung aus Repo-Listen und Scans',
        'Docs',
        'FAQ · bekannte Probleme · Threat Model mit Tests',
      ],
    },
    gitshelves: {
      summary:
        'CLI, die GitHub-Beitragsdaten in OpenSCAD- und STL-Modelle für 3D-gedruckte Gridfinity-Regale verwandelt.',
      outcome:
        'Exportiert SCAD/STL-Paare mit Metadaten, damit Regale Beitragsverläufe spiegeln.',
      metrics: [
        'Material',
        '42-mm-Gridfinity-kompatible Blöcke',
        'Sync',
        'Aus GitHub-Zeitachsen generiert',
      ],
    },
    portfolio: {
      summary:
        'Orthografisches Three.js/WebGL-Portfolio mit Tastaturnavigation und robustem Text-Fallback für Barrierefreiheit.',
      outcome: 'Hält immersive und Text-Deploys bei jedem Release synchron.',
      metrics: [
        'Stack',
        'Vite · Three.js · barrierefreies HUD',
        'Deploy',
        'CI smoke + Docs + Lint-Gates',
      ],
    },
    f2clipboard: {
      summary:
        'CLI, die Codex-Aufgabenseiten und GitHub-Logs einliest, Secrets redigiert und einfügbaren Markdown ausgibt.',
      outcome:
        'Automatisiert CI-Log-Sammlung und Zusammenfassung für schnelle Debug-Handoffs.',
      metrics: [
        'Geschwindigkeit',
        'Codex-Task → GitHub-PR-Checks → Markdown',
        'Formate',
        'Secret-Redaktion vor Zusammenfassung oder Ausgabe',
      ],
    },
    sigma: {
      summary:
        'ESP32-„AI pin“, der Push-to-talk-Audio an Whisper streamt und TTS in einem 3D-gedruckten OpenSCAD-Gehäuse zurückgibt.',
      outcome:
        'Enthält Firmware, Gehäuse-CAD, STL-Exporte und Montage-Doks, die CI aktuell hält.',
      metrics: [
        'Hardware',
        'ESP32 · OpenSCAD-Gehäuse',
        'Modi',
        'Push-to-talk · Whisper + TTS-Relay',
      ],
    },
    wove: {
      summary:
        'Open-Source-Toolkit zum Lernen von Stricken und Häkeln auf dem Weg zu einem Roboterwebstuhl mit OpenSCAD-Hardware.',
      outcome:
        'Docs decken Maschenproben-Rechner, Planner-Exporte und Spannungsprofile für Garnstärken ab.',
      metrics: [
        'Handwerk',
        'Webstuhl kalibriert aus CAD-Stichkarten',
        'Roadmap',
        'Pfad zu robotischen Weblaboren',
      ],
    },
    dspace: {
      summary:
        'DSPACE-Exponat für das Web-Idle-Game Democratized Space mit Ressourcen, Quests, Erkundung und Orbitstarts.',
      outcome:
        'Verlinkt das öffentliche Repository democratizedspace/dspace und die offiziellen Spieldokumente statt ungeprüfter Missionslogs.',
      metrics: [
        'Spiel',
        'Ressourcenverwaltung · Quests · Erkundung',
        'Docs',
        'Öffentliche Docs und Entwicklerleitfaden',
      ],
    },
    prReaper: {
      summary:
        'GitHub-Actions-Workflow, der veraltete PRs massenhaft mit Dry-run-Preview und optionaler Branch-Bereinigung schließt.',
      outcome:
        'Ein-Klick-Workflow dokumentiert Inputs, Sicherheitsmodell und Audit-Ausgaben im README.',
      metrics: [
        'Sweep',
        'Veraltete PRs mit Preview-Modus massenhaft schließen',
        'Takt',
        'Cron + manuelle Dry-runs',
      ],
    },
    sugarkube: {
      summary:
        'k3s-auf-Raspberry-Pi-Plattform mit netzunabhängigem Solarwürfel, dokumentiert mit CAD, Pi-Images und Feldguides.',
      outcome:
        'Schritt-für-Schritt-Docs zu Solarhardware, Pi-Provisioning und Kubernetes-Helfern.',
      metrics: [
        'Plattform',
        'k3s, Kubernetes-Helfer, Cloudflare-Tunnel und Solarnotizen',
        'Hardware',
        'Solarwürfel-CAD, Pi-Trägerplatten und Elektronik',
        'Guides',
        'Pi-Images und Headless-Provisioning',
      ],
    },
  },
});
