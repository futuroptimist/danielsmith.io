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
    nextHighlight: 'Nächstes Highlight',
    related: 'Verwandte Fallstudien',
    prototype: 'Prototyp',
    live: 'Live',
    textMode: 'Zum Textmodus wechseln',
    tryImmersive: 'Immersiv erneut versuchen',
    guidedTour: 'Geführte Tour',
    guidedTourOn: 'Geführte Tour an',
    guidedTourOff: 'Geführte Tour aus',
    audioOn: 'Audio: an',
    audioOff: 'Audio: aus',
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
        'Sichere Peer-to-Peer-Plattform für generative KI auf einem Raspberry-Pi-Gitter mit verschlüsseltem Relay und Serverknoten.',
      outcome:
        'Quickstart-Skripte starten Relay, Server und Mock-LLM-Stack lokal zum Testen.',
      metrics: [
        'Cluster',
        '12× Pi-5-Knoten in modularen Einschüben',
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
        'Roter Alarmblitz alle 1,0 s',
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
        'Docs',
        'README: CI, templates, prompts',
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
        'Fehlerlogs in unter 3 s kopieren',
        'Formate',
        'CLI + Zwischenablage + Markdown-Ausgabe',
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
        'Öffentliches Democratized-Space-Web-Idle-Game über Ressourcenmanagement, Quests, Erkundung und Orbit.',
      outcome:
        'Hält Quest-Inhalte, Dokumentation und QA-Workflows über öffentliches Repo und Docs auffindbar.',
      metrics: [
        'Spiel',
        'Ressourcenmanagement · Quests · Erkundung',
        'Stack',
        'Quest-Guides · Tests · Deployment',
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
