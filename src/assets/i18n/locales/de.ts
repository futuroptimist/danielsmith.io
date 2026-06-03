import { buildLatinLocale } from './latinLocaleFactory';

export const DE_OVERRIDES = buildLatinLocale({
  locale: 'de',
  siteName: 'Immersives Portfolio von Daniel Smith',
  textHeading: 'Highlights erkunden',
  textIntro:
    'Das Textportfolio hält jede Ausstellung mit kurzen Zusammenfassungen, Ergebnissen und Kennzahlen zugänglich, wenn der immersive Modus nicht verfügbar ist.',
  roomHeadingTemplate: 'Ausstellungen in {roomName}',
  metricsHeading: 'Wichtige Kennzahlen',
  linksHeading: 'Weiterführende Links',
  aboutHeading: 'Über Daniel',
  aboutSummary:
    'Site Reliability Engineer mit sechs Jahren bei YouTube, fokussiert auf Automatisierung, Observability und stabile Releases.',
  skillsHeading: 'Fähigkeiten im Überblick',
  timelineHeading: 'Beruflicher Zeitstrahl',
  contactHeading: 'Kontakt',
  recoveryTitle: 'Bereit für den ganzen Raum?',
  recoveryDescription:
    'Lösche die gespeicherte Textpräferenz und starte das immersive Portfolio von hier erneut.',
  recoveryAction: 'Immersiven Modus erneut versuchen',
  languageTitle: 'Sprache',
  languageDescription: 'Ändere Sprache und Schreibrichtung des HUD.',
  switchingTemplate: 'Wechsle zu {target}…',
  selectedTemplate: 'Sprache {label} ausgewählt.',
  failureTemplate: 'Wechsel zu {target} nicht möglich. {current} bleibt aktiv.',
  settingsHeading: 'Einstellungen und Hilfe',
  settingsDescription:
    'Passe Barrierefreiheit, Grafik, Audio und Kurzbefehle an.',
  controlsHeading: 'Steuerung',
  interact: 'Interagieren mit',
  textMode: 'In den Textmodus wechseln',
  audioOn: 'Audio ein',
  audioOff: 'Audio aus',
  guidedOn: 'Geführte Tour ein',
  guidedOff: 'Geführte Tour aus',
  tourHeading: 'Geführte Tour',
  tourReset: 'Geführte Tour neu starten',
  poiVisited: 'Besucht',
  poiNext: 'Nächstes Highlight',
  poiPrototype: 'Prototyp',
  poiLive: 'Live',
  closeDetails: 'Details schließen',
  relatedCaseStudies: 'Verwandte Fallstudien',
  outcomeLabel: 'Ergebnis',
  discoveredTemplate: '{title} entdeckt. {summary}',
  storyLog: 'Story-Protokoll',
  visitedHeading: 'Besuchte Ausstellungen',
  journeyHeading: 'Stationen der Reise',
  softwareTitle: 'Software-Rendering erkannt',
  softwareRecommendation:
    'Aktiviere Hardwarebeschleunigung für ein flüssigeres immersives Portfolio.',
  move: 'Bewegen',
  pan: 'Kamera verschieben',
  zoom: 'Zoomen',
  cyclePoi: 'POI wechseln',
  languageOptions: {
    es: 'Español',
    pt: 'Português',
    de: 'Deutsch',
    hu: 'Magyar',
  },
  poiSummaries: {
    'futuroptimist-living-room-tv':
      'Futuroptimist-Skripttisch, der Recherche, Gliederungen und erzählfertige Entwürfe verbindet.',
    'tokenplace-studio-cluster':
      'Peer-to-Peer-Plattform für generative KI mit verschlüsselten Relays und lokalen Knoten.',
    'gabriel-studio-sentry':
      'Datenschutzorientierter Guardian-Angel-LLM für lokale Sicherheitsberatung.',
    'flywheel-studio-flywheel':
      'Automatisierungssystem, das Ideen, Tests und Reviews in zuverlässige Lieferungen verwandelt.',
    'jobbot-studio-terminal':
      'Job-Suchterminal, das Bewerbungen, Signale und Nachverfolgung organisiert.',
    'axel-studio-tracker':
      'Tracker für Gewohnheiten und Energie, der Prioritäten sichtbar hält.',
    'gitshelves-living-room-installation':
      'Visuelle Bibliothek, die GitHub-Repositories in erkundbare Regale verwandelt.',
    'danielsmith-portfolio-table':
      'Zentraler danielsmith.io-Tisch, der berufliche Geschichte und Projekte verbindet.',
    'f2clipboard-kitchen-console':
      'Leichte Konsole zum Synchronisieren von Zwischenablage und schnellen Workflows.',
    'sigma-kitchen-workbench':
      'Werkbank für Agentenexperimente, Bewertung und Automatisierung.',
    'wove-kitchen-loom':
      'Produkt-Webstuhl, der Notizen, Prototypen und Entscheidungen zu einem klaren Faden verbindet.',
    'dspace-backyard-rocket':
      'DSPACE-Rakete mit Simulationen, Missionen und Weltraumvisualisierungen.',
    'pr-reaper-backyard-console':
      'Konsole, die veraltete Pull Requests beschneidet und Review-Warteschlangen gesund hält.',
    'sugarkube-backyard-greenhouse':
      'Sugarkube-Gewächshaus für kleine, solare und reproduzierbare Kubernetes-Labore.',
  },
});
