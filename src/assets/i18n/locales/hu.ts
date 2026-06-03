import { buildLatinLocale } from './latinLocaleFactory';

export const HU_OVERRIDES = buildLatinLocale({
  locale: 'hu',
  siteName: 'Daniel Smith immerzív portfóliója',
  textHeading: 'Fedezd fel a kiemelt részeket',
  textIntro:
    'A szöveges portfólió minden kiállítást elérhetővé tesz rövid összefoglalókkal, eredményekkel és mérőszámokkal, amikor az immerzív mód nem érhető el.',
  roomHeadingTemplate: '{roomName} kiállításai',
  metricsHeading: 'Fő mérőszámok',
  linksHeading: 'További olvasnivaló',
  aboutHeading: 'Danielről',
  aboutSummary:
    'Site Reliability Engineer hat év YouTube-tapasztalattal, automatizálásra, megfigyelhetőségre és stabil kiadásokra fókuszálva.',
  skillsHeading: 'Készségek röviden',
  timelineHeading: 'Munkaidővonal',
  contactHeading: 'Kapcsolat',
  recoveryTitle: 'Készen állsz a teljes szobára?',
  recoveryDescription:
    'Töröld a mentett szöveges beállítást, és indítsd újra innen az immerzív portfóliót.',
  recoveryAction: 'Próbáld újra az immerzív módot',
  languageTitle: 'Nyelv',
  languageDescription: 'Váltsd a HUD nyelvét és írásirányát.',
  switchingTemplate: 'Váltás erre: {target}…',
  selectedTemplate: '{label} nyelv kiválasztva.',
  failureTemplate: 'Nem sikerült váltani erre: {target}. Marad: {current}.',
  settingsHeading: 'Beállítások és súgó',
  settingsDescription:
    'Állítsd az akadálymentességet, grafikát, hangot és gyorsbillentyűket.',
  controlsHeading: 'Vezérlés',
  interact: 'Interakció ezzel:',
  textMode: 'Váltás szöveges módra',
  audioOn: 'Hang bekapcsolva',
  audioOff: 'Hang kikapcsolva',
  guidedOn: 'Vezetett túra bekapcsolva',
  guidedOff: 'Vezetett túra kikapcsolva',
  tourHeading: 'Vezetett túra',
  tourReset: 'Vezetett túra újraindítása',
  poiVisited: 'Meglátogatva',
  poiNext: 'Következő kiemelés',
  poiPrototype: 'Prototípus',
  poiLive: 'Élő',
  closeDetails: 'Részletek bezárása',
  relatedCaseStudies: 'Kapcsolódó esettanulmányok',
  outcomeLabel: 'Eredmény',
  discoveredTemplate: '{title} felfedezve. {summary}',
  storyLog: 'Történetnapló',
  visitedHeading: 'Meglátogatott kiállítások',
  journeyHeading: 'Útvonalpontok',
  softwareTitle: 'Szoftveres renderelés észlelve',
  softwareRecommendation:
    'Kapcsold be a hardveres gyorsítást a simább immerzív portfólióhoz.',
  move: 'Mozgás',
  pan: 'Kamera pásztázása',
  zoom: 'Nagyítás',
  cyclePoi: 'POI váltása',
  languageOptions: {
    es: 'Español',
    pt: 'Português',
    de: 'Deutsch',
    hu: 'Magyar',
  },
  poiSummaries: {
    'futuroptimist-living-room-tv':
      'Futuroptimist forgatókönyvasztal, amely kutatást, vázlatokat és narrációkész piszkozatokat fűz össze.',
    'tokenplace-studio-cluster':
      'Peer-to-peer generatív AI-platform titkosított relékkel és helyi csomópontokkal.',
    'gabriel-studio-sentry':
      'Adatvédelemre épülő őrangyal LLM helyi biztonsági tanácsadáshoz.',
    'flywheel-studio-flywheel':
      'Automatizálási rendszer, amely ötleteket, teszteket és review-kat megbízható szállítássá alakít.',
    'jobbot-studio-terminal':
      'Álláskereső terminál, amely pályázatokat, jeleket és utánkövetést rendez.',
    'axel-studio-tracker':
      'Szokás- és energianapló, amely láthatóvá teszi a prioritásokat.',
    'gitshelves-living-room-installation':
      'Vizuális könyvtár, amely GitHub-repókat bejárható polcokká alakít.',
    'danielsmith-portfolio-table':
      'Központi danielsmith.io-asztal, amely szakmai történetet és projekteket kapcsol össze.',
    'f2clipboard-kitchen-console':
      'Könnyű konzol vágólapok és gyors munkafolyamatok szinkronizálásához.',
    'sigma-kitchen-workbench':
      'Munkapad agent-kísérletekhez, értékeléshez és automatizáláshoz.',
    'wove-kitchen-loom':
      'Termékszövőszék, amely jegyzeteket, prototípusokat és döntéseket tiszta szállá fon.',
    'dspace-backyard-rocket':
      'DSPACE rakéta szimulációkkal, küldetésekkel és űrbeli vizualizációkkal.',
    'pr-reaper-backyard-console':
      'Konzol, amely metszi az elavult pull requesteket és egészségesen tartja a review-sort.',
    'sugarkube-backyard-greenhouse':
      'Sugarkube üvegház kicsi, napenergiás és reprodukálható Kubernetes-laborokhoz.',
  },
});
