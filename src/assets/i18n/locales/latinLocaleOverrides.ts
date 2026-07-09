import type {
  HelpModalSectionStrings,
  Locale,
  LocaleOverrides,
} from '../types';

type LatinLocale = Extract<Locale, 'es' | 'pt' | 'de' | 'hu'>;

interface LatinLocaleCopy {
  locale: LatinLocale;
  siteName: string;
  nativeLabel: string;
  strings: {
    controls: string;
    settingsHelp: string;
    language: string;
    languageDescription: string;
    switching: string;
    selected: string;
    failure: string;
    textHeading: string;
    textIntro: string;
    recoveryTitle: string;
    recoveryDescription: string;
    recoveryAction: string;
    recoveryAria: string;
    metrics: string;
    links: string;
    outcome: string;
    stars: string;
    syncing: string;
    discovered: string;
    closePoi: string;
    related: string;
    prototype: string;
    live: string;
    textMode: string;
    tryImmersive: string;
    audioOn: string;
    audioOff: string;
    audioSubtitleAmbientLabel: string;
    audioSubtitlePoiLabel: string;
    audioSubtitleDismissAmbient: string;
    audioSubtitleDismissPoi: string;
    debugCoordinatesLabelEnabled: string;
    debugCoordinatesLabelDisabled: string;
    debugCoordinatesDescriptionEnabled: string;
    debugCoordinatesDescriptionDisabled: string;
    debugCoordinatesOverlayLabel: string;
    debugCoordinatesPosition: string;
    debugCoordinatesActiveFloor: string;
    debugCoordinatesPredictedFloor: string;
    debugCoordinatesCameraZoom: string;
    debugCoordinatesStairWidth: string;
    debugCoordinatesLanding: string;
    debugCoordinatesStairNav: string;
    debugCoordinatesStairZone: string;
    debugCoordinatesRoom: string;
    debugCoordinatesYes: string;
    debugCoordinatesNo: string;
    debugCoordinatesNone: string;
    debugCollidersLabelEnabled: string;
    debugCollidersLabelDisabled: string;
    debugCollidersDescriptionEnabled: string;
    debugCollidersDescriptionDisabled: string;
    debugCollidersIdsLabelEnabled?: string;
    debugCollidersIdsLabelDisabled?: string;
    debugCollidersIdsDescriptionEnabled?: string;
    debugCollidersIdsDescriptionDisabled?: string;
    debugCollidersSolidIdsLabelEnabled?: string;
    debugCollidersSolidIdsLabelDisabled?: string;
    debugCollidersSolidIdsDescriptionEnabled?: string;
    debugCollidersSolidIdsDescriptionDisabled?: string;
    debugCollidersFpsLabelEnabled?: string;
    debugCollidersFpsLabelDisabled?: string;
    debugCollidersFpsDescriptionEnabled?: string;
    debugCollidersFpsDescriptionDisabled?: string;
  };
  poi: Record<string, { summary: string; outcome: string; metrics: string[] }>;
}

const optionLabels = {
  en: { label: 'English', direction: 'ltr' },
  ja: { label: '日本語', direction: 'ltr' },
  ar: { label: 'العربية', direction: 'rtl' },
  'zh-Hans': { label: '中文（简体）', direction: 'ltr' },
  es: { label: 'Español', direction: 'ltr' },
  pt: { label: 'Português', direction: 'ltr' },
  de: { label: 'Deutsch', direction: 'ltr' },
  hu: { label: 'Magyar', direction: 'ltr' },
  'en-x-pseudo': { label: 'Pseudo', direction: 'ltr' },
} as const;

const localizedTemplates: Record<
  LatinLocale,
  {
    githubStarsTemplate: string;
    listNameTemplate: string;
    textCollectionNameTemplate: string;
    categoryLabel: string;
    statusLabel: string;
    projectCategory: string;
    environmentCategory: string;
    roomHeadingTemplate: string;
    keyboardMove: string;
    pointerDrag: string;
    keyboardZoom: string;
    touchDrag: string;
    cyclePoi: string;
    interactDefault: string;
    interactDescription: string;
    lightingDebug: string;
    interactDefaultPrompt: string;
    interactInspectPrompt: string;
    interactActivatePrompt: string;
    helpButtonLabelTemplate: string;
    helpButtonAnnouncementTemplate: string;
    controlsTitle: string;
    audioGroupLabel: string;
    audioTitleTemplate: string;
    audioPendingAnnouncement: string;
    audioSliderLabel: string;
    audioSliderAriaLabel: string;
    audioSliderHudLabel: string;
    audioValueAnnouncementTemplate: string;
    audioMutedAnnouncementTemplate: string;
    audioMutedValueTemplate: string;
    audioMutedAriaValueTemplate: string;
    fallbackRendererLabel: string;
    softwareRendererTitle: string;
    softwareRendererDescriptionTemplate: string;
    softwareRendererRecommendation: string;
    continueSafeLabel: string;
    continuousLabel: string;
    reloadSafeLabel: string;
    flywheelInteractionPrompt: string;
    dspaceInteractionPrompt: string;
  }
> = {
  es: {
    githubStarsTemplate: '{value} estrellas',
    listNameTemplate: 'Exhibiciones de {siteName}',
    textCollectionNameTemplate: 'Portafolio de texto de {siteName}',
    categoryLabel: 'Categoría',
    statusLabel: 'Estado',
    projectCategory: 'Proyecto',
    environmentCategory: 'Entorno',
    roomHeadingTemplate: 'Exhibiciones de {roomName}',
    keyboardMove: 'Mover',
    pointerDrag: 'Arrastrar para panorámica',
    keyboardZoom: 'Acercar o alejar con el teclado',
    touchDrag:
      'Arrastra a la izquierda para mover y a la derecha para panorámica',
    cyclePoi: 'Recorrer POI',
    interactDefault: 'Entrar',
    interactDescription: 'Interactuar',
    lightingDebug: 'Alternar vista de depuración de iluminación',
    interactDefaultPrompt: 'Interactuar con {title}',
    interactInspectPrompt: 'Inspeccionar {title}',
    interactActivatePrompt: 'Activar {title}',
    helpButtonLabelTemplate: 'Abrir menú · Pulsa {shortcut}',
    helpButtonAnnouncementTemplate:
      'Abrir ajustes y ayuda. Pulsa {shortcut} para revisar controles y accesibilidad.',
    controlsTitle: 'Abrir controles (C)',
    audioGroupLabel: 'Controles de audio ambiental',
    audioTitleTemplate: 'Alternar audio ambiental ({keyHint})',
    audioPendingAnnouncement: 'Cambiando estado de audio…',
    audioSliderLabel: 'Volumen ambiental',
    audioSliderAriaLabel: 'Volumen del audio ambiental',
    audioSliderHudLabel: 'Control de volumen ambiental.',
    audioValueAnnouncementTemplate: 'Volumen ambiental {volume}.',
    audioMutedAnnouncementTemplate:
      'Audio ambiental silenciado. Volumen {volume}.',
    audioMutedValueTemplate: 'Silenciado · {volume}',
    audioMutedAriaValueTemplate: 'Silenciado ({volume})',
    fallbackRendererLabel: 'renderizador WebGL por software',
    softwareRendererTitle: 'Renderizado por software detectado',
    softwareRendererDescriptionTemplate:
      'Chrome está usando {renderer} en lugar de aceleración por hardware.',
    softwareRendererRecommendation:
      'Usa el modo seguro para reducir la carga o cambia al modo texto.',
    continueSafeLabel: 'Continuar en inmersivo seguro',
    continuousLabel: 'Activar inmersivo continuo de todos modos',
    reloadSafeLabel: 'Recargar esta URL inmersiva segura',
    flywheelInteractionPrompt: 'Activar sistemas {title}',
    dspaceInteractionPrompt: 'Lanzar cuenta atrás de {title}',
  },
  pt: {
    githubStarsTemplate: '{value} estrelas',
    listNameTemplate: 'Exibições de {siteName}',
    textCollectionNameTemplate: 'Portfólio de texto de {siteName}',
    categoryLabel: 'Categoria',
    statusLabel: 'Estado',
    projectCategory: 'Projeto',
    environmentCategory: 'Ambiente',
    roomHeadingTemplate: 'Exibições de {roomName}',
    keyboardMove: 'Mover',
    pointerDrag: 'Arrastar para panorâmica',
    keyboardZoom: 'Aproximar ou afastar pelo teclado',
    touchDrag: 'Arraste à esquerda para mover e à direita para panorâmica',
    cyclePoi: 'Percorrer POIs',
    interactDefault: 'Entrar',
    interactDescription: 'Interagir',
    lightingDebug: 'Alternar visualização de depuração de iluminação',
    interactDefaultPrompt: 'Interagir com {title}',
    interactInspectPrompt: 'Inspecionar {title}',
    interactActivatePrompt: 'Ativar {title}',
    helpButtonLabelTemplate: 'Abrir menu · Pressione {shortcut}',
    helpButtonAnnouncementTemplate:
      'Abrir configurações e ajuda. Pressione {shortcut} para revisar controles e acessibilidade.',
    controlsTitle: 'Abrir controles (C)',
    audioGroupLabel: 'Controles de áudio ambiente',
    audioTitleTemplate: 'Alternar áudio ambiente ({keyHint})',
    audioPendingAnnouncement: 'Alterando estado do áudio…',
    audioSliderLabel: 'Volume ambiente',
    audioSliderAriaLabel: 'Volume do áudio ambiente',
    audioSliderHudLabel: 'Controle de volume ambiente.',
    audioValueAnnouncementTemplate: 'Volume ambiente {volume}.',
    audioMutedAnnouncementTemplate:
      'Áudio ambiente silenciado. Volume {volume}.',
    audioMutedValueTemplate: 'Silenciado · {volume}',
    audioMutedAriaValueTemplate: 'Silenciado ({volume})',
    fallbackRendererLabel: 'renderizador WebGL por software',
    softwareRendererTitle: 'Renderização por software detectada',
    softwareRendererDescriptionTemplate:
      'O Chrome está usando {renderer} em vez da aceleração por hardware.',
    softwareRendererRecommendation:
      'Use o modo seguro para reduzir a carga ou alterne para o modo texto.',
    continueSafeLabel: 'Continuar no imersivo seguro',
    continuousLabel: 'Ativar imersivo contínuo mesmo assim',
    reloadSafeLabel: 'Recarregar esta URL imersiva segura',
    flywheelInteractionPrompt: 'Ativar sistemas {title}',
    dspaceInteractionPrompt: 'Iniciar contagem regressiva de {title}',
  },
  de: {
    githubStarsTemplate: '{value} Sterne',
    listNameTemplate: '{siteName}-Exponate',
    textCollectionNameTemplate: '{siteName}-Textportfolio',
    categoryLabel: 'Kategorie',
    statusLabel: 'Status',
    projectCategory: 'Projekt',
    environmentCategory: 'Umgebung',
    roomHeadingTemplate: '{roomName}-Exponate',
    keyboardMove: 'Bewegen',
    pointerDrag: 'Ziehen zum Schwenken',
    keyboardZoom: 'Per Tastatur hinein- oder herauszoomen',
    touchDrag: 'Links bewegen, rechts schwenken',
    cyclePoi: 'POIs wechseln',
    interactDefault: 'Öffnen',
    interactDescription: 'Interagieren',
    lightingDebug: 'Beleuchtungs-Debugansicht umschalten',
    interactDefaultPrompt: 'Mit {title} interagieren',
    interactInspectPrompt: '{title} ansehen',
    interactActivatePrompt: '{title} aktivieren',
    helpButtonLabelTemplate: 'Menü öffnen · {shortcut} drücken',
    helpButtonAnnouncementTemplate:
      'Einstellungen und Hilfe öffnen. Drücke {shortcut}, um Steuerelemente und Barrierefreiheit zu prüfen.',
    controlsTitle: 'Steuerung öffnen (C)',
    audioGroupLabel: 'Ambient-Audio-Steuerung',
    audioTitleTemplate: 'Ambient-Audio umschalten ({keyHint})',
    audioPendingAnnouncement: 'Audio wird umgeschaltet…',
    audioSliderLabel: 'Ambient-Lautstärke',
    audioSliderAriaLabel: 'Ambient-Audio-Lautstärke',
    audioSliderHudLabel: 'Regler für Ambient-Audio.',
    audioValueAnnouncementTemplate: 'Ambient-Lautstärke {volume}.',
    audioMutedAnnouncementTemplate: 'Ambient-Audio stumm. Lautstärke {volume}.',
    audioMutedValueTemplate: 'Stumm · {volume}',
    audioMutedAriaValueTemplate: 'Stumm ({volume})',
    fallbackRendererLabel: 'Software-WebGL-Renderer',
    softwareRendererTitle: 'Software-Rendering erkannt',
    softwareRendererDescriptionTemplate:
      'Chrome verwendet {renderer} statt Hardwarebeschleunigung.',
    softwareRendererRecommendation:
      'Nutze den sicheren Modus, um die Last zu senken, oder wechsle in den Textmodus.',
    continueSafeLabel: 'Im sicheren immersiven Modus fortfahren',
    continuousLabel: 'Kontinuierlichen immersiven Modus trotzdem aktivieren',
    reloadSafeLabel: 'Diese sichere immersive URL neu laden',
    flywheelInteractionPrompt: '{title}-Systeme starten',
    dspaceInteractionPrompt: '{title}-Countdown starten',
  },
  hu: {
    githubStarsTemplate: '{value} csillag',
    listNameTemplate: '{siteName} kiállításai',
    textCollectionNameTemplate: '{siteName} szöveges portfóliója',
    categoryLabel: 'Kategória',
    statusLabel: 'Állapot',
    projectCategory: 'Projekt',
    environmentCategory: 'Környezet',
    roomHeadingTemplate: '{roomName} kiállításai',
    keyboardMove: 'Mozgás',
    pointerDrag: 'Húzás a pásztázáshoz',
    keyboardZoom: 'Nagyítás vagy kicsinyítés billentyűzettel',
    touchDrag: 'Bal oldalon mozgás, jobb oldalon pásztázás',
    cyclePoi: 'POI-k váltása',
    interactDefault: 'Megnyitás',
    interactDescription: 'Interakció',
    lightingDebug: 'Világítási hibakereső nézet váltása',
    interactDefaultPrompt: 'Interakció: {title}',
    interactInspectPrompt: '{title} megtekintése',
    interactActivatePrompt: '{title} aktiválása',
    helpButtonLabelTemplate: 'Menü megnyitása · {shortcut}',
    helpButtonAnnouncementTemplate:
      'Beállítások és súgó megnyitása. Nyomd meg: {shortcut}.',
    controlsTitle: 'Vezérlés megnyitása (C)',
    audioGroupLabel: 'Környezeti hang vezérlése',
    audioTitleTemplate: 'Környezeti hang váltása ({keyHint})',
    audioPendingAnnouncement: 'Hangállapot váltása…',
    audioSliderLabel: 'Környezeti hangerő',
    audioSliderAriaLabel: 'Környezeti hang hangereje',
    audioSliderHudLabel: 'Környezeti hangerő csúszka.',
    audioValueAnnouncementTemplate: 'Környezeti hangerő {volume}.',
    audioMutedAnnouncementTemplate:
      'Környezeti hang némítva. Hangerő {volume}.',
    audioMutedValueTemplate: 'Némítva · {volume}',
    audioMutedAriaValueTemplate: 'Némítva ({volume})',
    fallbackRendererLabel: 'szoftveres WebGL renderer',
    softwareRendererTitle: 'Szoftveres renderelés észlelve',
    softwareRendererDescriptionTemplate:
      'A Chrome {renderer} használ hardveres gyorsítás helyett.',
    softwareRendererRecommendation:
      'Használd a biztonságos módot a terhelés csökkentéséhez, vagy válts szöveges módra.',
    continueSafeLabel: 'Folytatás biztonságos immerzív módban',
    continuousLabel: 'Folyamatos immerzív mód engedélyezése így is',
    reloadSafeLabel: 'Biztonságos immerzív URL újratöltése',
    flywheelInteractionPrompt: '{title} rendszerek indítása',
    dspaceInteractionPrompt: '{title} visszaszámlálás indítása',
  },
};

const settingsCopies = {
  es: {
    graphicsTitle: 'Calidad gráfica',
    graphicsDescription:
      'Elige un ajuste para el rendimiento de tu dispositivo.',
    cinematic: 'Cinemático',
    balanced: 'Equilibrado',
    performance: 'Rendimiento',
    cinematicDesc:
      'Posprocesado completo, modelos 3D detallados, bloom e iluminación cinematográfica.',
    balancedDesc:
      'Bloom moderado, resolución reducida y modelos 3D medios para portátiles.',
    performanceDesc:
      'Desactiva bloom, baja resolución y usa modelos 3D ligeros para priorizar FPS.',
    accessibilityTitle: 'Preajustes de accesibilidad',
    accessibilityDescription:
      'Ajusta ayudas de movimiento y contraste del HUD.',
    standard: 'Estándar',
    calm: 'Calma',
    highContrast: 'Alto contraste',
    photosensitive: 'Seguro fotosensible',
    standardDesc: 'Visuales y audio con equilibrio predeterminado.',
    calmDesc: 'Suaviza bloom, brillo LED y audio ambiente.',
    highContrastDesc:
      'Aumenta legibilidad del HUD manteniendo señales de movimiento.',
    photosensitiveDesc:
      'Desactiva bloom, atenúa emisivos y aumenta contraste del HUD.',
    selected: 'Preajuste {label} seleccionado.',
    motionBlurHeading: 'Intensidad de desenfoque de movimiento',
    motionBlurDescription:
      'Ajusta las estelas de cámara y avatar en movimiento rápido.',
    motionBlurGroup: 'Controles de desenfoque de movimiento',
    motionBlurAnnouncement: 'Intensidad de desenfoque de movimiento cambiada.',
    motionBlurOff: 'Desactivado',
    motionBlurLow: '{percent}% · Estelas bajas',
    motionBlurMedium: '{percent}% · Estelas medias',
    motionBlurHigh: '{percent}% · Estelas altas',
  },
  pt: {
    graphicsTitle: 'Qualidade gráfica',
    graphicsDescription:
      'Escolha uma predefinição para o desempenho do dispositivo.',
    cinematic: 'Cinemático',
    balanced: 'Equilibrado',
    performance: 'Desempenho',
    cinematicDesc:
      'Pós-processamento completo, modelos 3D detalhados, bloom e iluminação cinematográfica.',
    balancedDesc:
      'Bloom moderado, resolução reduzida e modelos 3D médios para notebooks.',
    performanceDesc:
      'Desativa bloom, reduz resolução e usa modelos 3D leves para priorizar FPS.',
    accessibilityTitle: 'Predefinições de acessibilidade',
    accessibilityDescription:
      'Ajuste auxílios de movimento e contraste do HUD.',
    standard: 'Padrão',
    calm: 'Calmo',
    highContrast: 'Alto contraste',
    photosensitive: 'Seguro para fotossensibilidade',
    standardDesc: 'Visuais e áudio no equilíbrio padrão.',
    calmDesc: 'Suaviza bloom, brilho LED e áudio ambiente.',
    highContrastDesc:
      'Aumenta legibilidade do HUD mantendo pistas de movimento.',
    photosensitiveDesc:
      'Desativa bloom, reduz emissivos e aumenta contraste do HUD.',
    selected: 'Predefinição {label} selecionada.',
    motionBlurHeading: 'Intensidade do desfoque de movimento',
    motionBlurDescription:
      'Ajuste os rastros de câmera e avatar em movimento rápido.',
    motionBlurGroup: 'Controles de desfoque de movimento',
    motionBlurAnnouncement: 'Intensidade do desfoque de movimento alterada.',
    motionBlurOff: 'Desligado',
    motionBlurLow: '{percent}% · Rastros baixos',
    motionBlurMedium: '{percent}% · Rastros médios',
    motionBlurHigh: '{percent}% · Rastros altos',
  },
  de: {
    graphicsTitle: 'Grafikqualität',
    graphicsDescription: 'Wähle ein Preset passend zur Geräteleistung.',
    cinematic: 'Kino',
    balanced: 'Ausgewogen',
    performance: 'Leistung',
    cinematicDesc:
      'Volles Postprocessing, detaillierte 3D-Modelle, Kino-Bloom und Licht.',
    balancedDesc:
      'Moderater Bloom, reduzierte Auflösung und mittlere 3D-Modelle für Laptops.',
    performanceDesc:
      'Deaktiviert Bloom, senkt Auflösung und nutzt leichte 3D-Modelle für FPS.',
    accessibilityTitle: 'Barrierefreiheits-Presets',
    accessibilityDescription: 'Passe Bewegungshilfen und HUD-Kontrast an.',
    standard: 'Normal',
    calm: 'Ruhig',
    highContrast: 'Hoher Kontrast',
    photosensitive: 'Fotosensibel sicher',
    standardDesc: 'Standardbalance für Bild und Audio.',
    calmDesc: 'Dämpft Bloom, LED-Glühen und Ambient-Audio.',
    highContrastDesc: 'Erhöht HUD-Lesbarkeit bei aktiven Bewegungshinweisen.',
    photosensitiveDesc:
      'Deaktiviert Bloom, dämpft Emissives und erhöht HUD-Kontrast.',
    selected: 'Preset {label} ausgewählt.',
    motionBlurHeading: 'Bewegungsunschärfe-Intensität',
    motionBlurDescription:
      'Passe Spuren bei schnellen Kamera- und Avatarbewegungen an.',
    motionBlurGroup: 'Steuerung für Bewegungsunschärfe',
    motionBlurAnnouncement: 'Bewegungsunschärfe-Intensität geändert.',
    motionBlurOff: 'Aus',
    motionBlurLow: '{percent}% · Niedrige Spuren',
    motionBlurMedium: '{percent}% · Mittlere Spuren',
    motionBlurHigh: '{percent}% · Hohe Spuren',
  },
  hu: {
    graphicsTitle: 'Grafikai minőség',
    graphicsDescription: 'Válassz előbeállítást az eszköz teljesítményéhez.',
    cinematic: 'Filmszerű',
    balanced: 'Kiegyensúlyozott',
    performance: 'Teljesítmény',
    cinematicDesc:
      'Teljes utófeldolgozás, részletes 3D modellek, filmszerű bloom és fények.',
    balancedDesc:
      'Mérsékelt bloom, csökkentett felbontás és közepes 3D modellek laptopokra.',
    performanceDesc:
      'Kikapcsolja a bloomot, csökkenti a felbontást és könnyű modelleket használ.',
    accessibilityTitle: 'Akadálymentesítési előbeállítások',
    accessibilityDescription: 'Mozgási segédek és HUD-kontraszt hangolása.',
    standard: 'Alap',
    calm: 'Nyugodt',
    highContrast: 'Nagy kontraszt',
    photosensitive: 'Fényérzékeny-barát',
    standardDesc: 'Alapértelmezett vizuális és audio egyensúly.',
    calmDesc: 'Lágyítja a bloomot, LED-fényt és környezeti hangot.',
    highContrastDesc: 'Növeli a HUD olvashatóságát mozgási jelzésekkel.',
    photosensitiveDesc:
      'Kikapcsolja a bloomot, tompítja az emisszív fényeket és növeli a kontrasztot.',
    selected: '{label} előbeállítás kiválasztva.',
    motionBlurHeading: 'Mozgáselmosás erőssége',
    motionBlurDescription:
      'Állítsd a gyors kamera- és avatarmozgás csóvahatását.',
    motionBlurGroup: 'Mozgáselmosás vezérlők',
    motionBlurAnnouncement: 'Mozgáselmosás erőssége módosítva.',
    motionBlurOff: 'Ki',
    motionBlurLow: '{percent}% · Gyenge csóvák',
    motionBlurMedium: '{percent}% · Közepes csóvák',
    motionBlurHigh: '{percent}% · Erős csóvák',
  },
} as const;

function buildSettingsHud(
  locale: LatinLocale,
  copy: (typeof settingsCopies)[LatinLocale]
) {
  const customizationCopy = {
    es: {
      heading: 'Personalización',
      description: 'Ajusta el estilo del maniquí y los compañeros.',
      variantsTitle: 'Estilo de avatar',
      variantsDescription: 'Cambia atuendos del explorador.',
      portfolio: 'Portafolio',
      portfolioDesc: 'Traje crepuscular con visor neón.',
      casual: 'Informal',
      casualDesc: 'Sudadera atardecer con acentos turquesa.',
      formal: 'De gala',
      formalDesc: 'Blazer carbón con detalles dorados.',
      accessoriesTitle: 'Accesorios',
      accessoriesDescription: 'Alterna consola de muñeca o dron holográfico.',
      wrist: 'Consola de muñeca',
      wristDesc: 'Brazalete de telemetría que refleja diagnósticos.',
      drone: 'Dron holográfico',
      droneDesc: 'Dron explorador con brillo orbital suave.',
      avatarSelected: 'Avatar {label} seleccionado.',
      enabled: '{label} activado.',
      disabled: '{label} desactivado.',
    },
    pt: {
      heading: 'Personalização',
      description: 'Ajuste o estilo do manequim e companheiros.',
      variantsTitle: 'Estilo do avatar',
      variantsDescription: 'Troque roupas do explorador.',
      portfolio: 'Portfólio',
      portfolioDesc: 'Traje crepuscular com visor neon.',
      casual: 'Descontraído',
      casualDesc: 'Moletom pôr do sol com acentos teal.',
      formal: 'Elegante',
      formalDesc: 'Blazer carvão com detalhes dourados.',
      accessoriesTitle: 'Acessórios',
      accessoriesDescription: 'Alterne console de pulso ou drone holográfico.',
      wrist: 'Console de pulso',
      wristDesc: 'Bracelete de telemetria com diagnósticos do HUD.',
      drone: 'Drone holográfico',
      droneDesc: 'Drone batedor com brilho orbital suave.',
      avatarSelected: 'Avatar {label} selecionado.',
      enabled: '{label} ativado.',
      disabled: '{label} desativado.',
    },
    de: {
      heading: 'Anpassung',
      description: 'Passe Stil und Begleitgeräte des Mannequins an.',
      variantsTitle: 'Avatar-Stil',
      variantsDescription: 'Wechsle Outfits des Erkunders.',
      portfolio: 'Mappe',
      portfolioDesc: 'Dämmerungsanzug mit Neonvisier.',
      casual: 'Lässig',
      casualDesc: 'Sunset-Hoodie mit türkisen Akzenten.',
      formal: 'Formell',
      formalDesc: 'Anthrazit-Blazer mit goldenen Details.',
      accessoriesTitle: 'Zubehör',
      accessoriesDescription: 'Schalte Handgelenkkonsole oder Holo-Drohne um.',
      wrist: 'Handgelenkkonsole',
      wristDesc: 'Telemetrie-Manschette mit HUD-Diagnosen.',
      drone: 'Holografische Drohne',
      droneDesc: 'Scout-Drohne mit sanftem Orbitglanz.',
      avatarSelected: 'Avatar {label} ausgewählt.',
      enabled: '{label} aktiviert.',
      disabled: '{label} deaktiviert.',
    },
    hu: {
      heading: 'Testreszabás',
      description: 'Hangold a bábu stílusát és társait.',
      variantsTitle: 'Avatarstílus',
      variantsDescription: 'Válts az explorer öltözetei között.',
      portfolio: 'Portfólió',
      portfolioDesc: 'Alkonyi öltöny neon napellenzővel.',
      casual: 'Laza',
      casualDesc: 'Naplemente kapucnis türkiz részletekkel.',
      formal: 'Formális',
      formalDesc: 'Szénszürke zakó arany díszítéssel.',
      accessoriesTitle: 'Kiegészítők',
      accessoriesDescription:
        'Kapcsold a csuklókonzolt vagy holografikus drónt.',
      wrist: 'Csuklókonzol',
      wristDesc: 'Telemetria mandzsetta HUD diagnosztikával.',
      drone: 'Holografikus drón',
      droneDesc: 'Felderítő drón lágy keringő fénnyel.',
      avatarSelected: '{label} avatar kiválasztva.',
      enabled: '{label} bekapcsolva.',
      disabled: '{label} kikapcsolva.',
    },
  }[locale];
  return {
    graphicsQuality: {
      title: copy.graphicsTitle,
      description: copy.graphicsDescription,
      options: {
        cinematic: { label: copy.cinematic, description: copy.cinematicDesc },
        balanced: { label: copy.balanced, description: copy.balancedDesc },
        performance: {
          label: copy.performance,
          description: copy.performanceDesc,
        },
      },
      selectedAnnouncementTemplate: copy.selected,
    },
    accessibilityPresets: {
      title: copy.accessibilityTitle,
      description: copy.accessibilityDescription,
      options: {
        standard: { label: copy.standard, description: copy.standardDesc },
        calm: { label: copy.calm, description: copy.calmDesc },
        'high-contrast': {
          label: copy.highContrast,
          description: copy.highContrastDesc,
        },
        photosensitive: {
          label: copy.photosensitive,
          description: copy.photosensitiveDesc,
        },
      },
      selectedAnnouncementTemplate: copy.selected,
    },
    motionBlur: {
      heading: copy.motionBlurHeading,
      description: copy.motionBlurDescription,
      groupAriaLabel: copy.motionBlurGroup,
      sliderAnnouncement: copy.motionBlurAnnouncement,
      values: {
        off: copy.motionBlurOff,
        lowTemplate: copy.motionBlurLow,
        mediumTemplate: copy.motionBlurMedium,
        highTemplate: copy.motionBlurHigh,
      },
    },
    customization: {
      heading: customizationCopy.heading,
      description: customizationCopy.description,
      variants: {
        title: customizationCopy.variantsTitle,
        description: customizationCopy.variantsDescription,
        options: {
          portfolio: {
            label: customizationCopy.portfolio,
            description: customizationCopy.portfolioDesc,
          },
          casual: {
            label: customizationCopy.casual,
            description: customizationCopy.casualDesc,
          },
          formal: {
            label: customizationCopy.formal,
            description: customizationCopy.formalDesc,
          },
        },
        selectedAnnouncementTemplate: customizationCopy.avatarSelected,
      },
      accessories: {
        title: customizationCopy.accessoriesTitle,
        description: customizationCopy.accessoriesDescription,
        options: {
          'wrist-console': {
            label: customizationCopy.wrist,
            description: customizationCopy.wristDesc,
          },
          'holo-drone': {
            label: customizationCopy.drone,
            description: customizationCopy.droneDesc,
          },
        },
        enabledAnnouncementTemplate: customizationCopy.enabled,
        disabledAnnouncementTemplate: customizationCopy.disabled,
      },
    },
  };
}

function buildLatinHelpSections(
  locale: LatinLocale
): readonly HelpModalSectionStrings[] {
  const copy = {
    es: {
      accessibilityTitle: 'Accesibilidad y respaldo',
      lowPerformance:
        'La escena cambia automáticamente al modo texto por debajo de 30 FPS.',
      manualToggle:
        'Usa el botón Modo texto en pantalla o pulsa T en cualquier momento.',
      motionBlur:
        'Ajusta la intensidad de estelas con Ajustes → Desenfoque de movimiento.',
      ambientAudio: 'Alterna con el botón Audio o pulsa M.',
    },
    pt: {
      accessibilityTitle: 'Acessibilidade e fallback',
      lowPerformance:
        'A cena muda automaticamente para o modo texto abaixo de 30 FPS.',
      manualToggle:
        'Use o botão Modo texto na tela ou pressione T a qualquer momento.',
      motionBlur:
        'Ajuste a força dos rastros em Configurações → Desfoque de movimento.',
      ambientAudio: 'Alterne com o botão Áudio ou pressione M.',
    },
    de: {
      accessibilityTitle: 'Barrierefreiheit & Fallback',
      lowPerformance:
        'Die Szene wechselt unter 30 FPS automatisch in den Textmodus.',
      manualToggle: 'Nutze die Schaltfläche Textmodus oder drücke jederzeit T.',
      motionBlur:
        'Passe die Spur-Stärke unter Einstellungen → Bewegungsunschärfe an.',
      ambientAudio: 'Schalte mit der Audio-Schaltfläche um oder drücke M.',
    },
    hu: {
      accessibilityTitle: 'Akadálymentesség és tartalék',
      lowPerformance:
        'A jelenet 30 FPS alatt automatikusan szöveges módra vált.',
      manualToggle:
        'Használd a képernyőn látható Szöveges mód gombot, vagy nyomj T-t.',
      motionBlur:
        'Állítsd a csóvák erősségét a Beállítások → Mozgáselmosás vezérlővel.',
      ambientAudio: 'Kapcsold az Audio gombbal, vagy nyomj M-et.',
    },
  }[locale];

  return [
    {
      id: 'accessibility',
      title: copy.accessibilityTitle,
      items: [
        { label: 'Low performance', description: copy.lowPerformance },
        { label: 'Manual toggle', description: copy.manualToggle },
        {
          id: 'motion-blur',
          label: 'Motion blur slider',
          description: copy.motionBlur,
        },
        { label: 'Ambient audio', description: copy.ambientAudio },
      ],
    },
  ];
}

export function buildLatinLocaleOverrides(
  copy: LatinLocaleCopy
): LocaleOverrides {
  const { strings: s } = copy;
  const templates = localizedTemplates[copy.locale];
  const githubStars = {
    label: s.stars,
    value: s.syncing,
    template: templates.githubStarsTemplate,
    fallback: s.syncing,
  };

  return {
    locale: copy.locale,
    site: {
      name: copy.siteName,
      structuredData: {
        description: copy.siteName,
        listNameTemplate: templates.listNameTemplate,
        textCollectionNameTemplate: templates.textCollectionNameTemplate,
        textCollectionDescription: s.textIntro,
        immersiveActionName: s.tryImmersive,
        properties: {
          labels: {
            category: templates.categoryLabel,
            outcome: s.outcome,
            status: templates.statusLabel,
          },
          categories: {
            project: templates.projectCategory,
            environment: templates.environmentCategory,
          },
          statuses: { prototype: s.prototype, live: s.live },
        },
        publisher: { name: 'Daniel Smith' },
        author: { name: 'Daniel Smith' },
      },
      textFallback: {
        heading: s.textHeading,
        intro: s.textIntro,
        roomHeadingTemplate: templates.roomHeadingTemplate,
        metricsHeading: s.metrics,
        linksHeading: s.links,
        about: {
          heading: 'Daniel Smith',
          summary:
            copy.locale === 'es'
              ? 'Ingeniero de confiabilidad de sitios con seis años en YouTube, centrado en automatización, observabilidad y lanzamientos estables.'
              : copy.locale === 'pt'
                ? 'Engenheiro de confiabilidade de sites com seis anos no YouTube, focado em automação, observabilidade e lançamentos estáveis.'
                : copy.locale === 'de'
                  ? 'Site-Reliability-Engineer mit sechs Jahren bei YouTube, mit Fokus auf Automatisierung, Observability und stabile Releases.'
                  : 'Site Reliability Engineer hat év YouTube-tapasztalattal, automatizálásra, megfigyelhetőségre és stabil kiadásokra fókuszálva.',
          highlights: [
            copy.locale === 'es'
              ? 'Crea plataformas para desarrolladores y herramientas agentic para enviar con seguridad.'
              : copy.locale === 'pt'
                ? 'Cria plataformas de desenvolvimento e ferramentas agentic para entregar com segurança.'
                : copy.locale === 'de'
                  ? 'Baut Entwicklerplattformen und agentic Tools, damit Teams sicher schneller liefern.'
                  : 'Fejlesztői platformokat és agentic eszközöket épít a biztonságosabb szállításhoz.',
            copy.locale === 'es'
              ? 'Acompaña equipos en SLO, respuesta a incidentes y revisiones de confiabilidad.'
              : copy.locale === 'pt'
                ? 'Orienta equipes em SLOs, resposta a incidentes e revisões de confiabilidade.'
                : copy.locale === 'de'
                  ? 'Unterstützt Teams bei SLOs, Incident Response und Reliability Reviews.'
                  : 'SLO-kban, incidenskezelésben és megbízhatósági felülvizsgálatokban mentorál csapatokat.',
            copy.locale === 'es'
              ? 'Explora narrativas WebGL inmersivas con respaldo de texto accesible.'
              : copy.locale === 'pt'
                ? 'Explora narrativas WebGL imersivas com fallback de texto acessível.'
                : copy.locale === 'de'
                  ? 'Erprobt immersive WebGL-Erzählungen mit barrierefreiem Text-Fallback.'
                  : 'Akadálymentes szöveges tartalékra épülő immerzív WebGL-történeteket kutat.',
          ],
        },
        recoveryCta: {
          title: s.recoveryTitle,
          description: s.recoveryDescription,
          actionLabel: s.recoveryAction,
          ariaLabel: s.recoveryAria,
        },
        reasonHeadings: {
          manual: s.textHeading,
          'webgl-unsupported': s.textHeading,
          'low-memory': s.textHeading,
          'low-end-device': s.textHeading,
          'low-performance': s.textHeading,
          'immersive-init-error': s.textHeading,
          'automated-client': s.textHeading,
          'data-saver': s.textHeading,
          'console-error': s.textHeading,
        },
        reasonDescriptions: {
          manual: s.textIntro,
          'webgl-unsupported': s.textIntro,
          'low-memory': s.textIntro,
          'low-end-device': s.textIntro,
          'low-performance': s.textIntro,
          'immersive-init-error': s.textIntro,
          'automated-client': s.textIntro,
          'data-saver': s.textIntro,
          'console-error': s.textIntro,
        },
        actions: {
          immersiveLink: s.tryImmersive,
          debugImmersiveLink:
            copy.locale === 'es'
              ? 'Depurar: forzar modo inmersivo'
              : copy.locale === 'pt'
                ? 'Depurar: forçar modo imersivo'
                : copy.locale === 'de'
                  ? 'Debug: immersiven Modus erzwingen'
                  : 'Hibakeresés: immerzív mód kényszerítése',
          clearPreferenceButton:
            copy.locale === 'es'
              ? 'Borrar preferencia de modo guardada'
              : copy.locale === 'pt'
                ? 'Limpar preferência de modo salva'
                : copy.locale === 'de'
                  ? 'Gespeicherte Modusauswahl löschen'
                  : 'Mentett módbeállítás törlése',
          clearPreferenceSuccess:
            copy.locale === 'es'
              ? 'Preferencia de modo borrada'
              : copy.locale === 'pt'
                ? 'Preferência de modo limpa'
                : copy.locale === 'de'
                  ? 'Gespeicherte Modusauswahl gelöscht'
                  : 'Mentett módbeállítás törölve',
          resumeLink:
            copy.locale === 'es'
              ? 'Descargar el CV más reciente'
              : copy.locale === 'pt'
                ? 'Baixar o currículo mais recente'
                : copy.locale === 'de'
                  ? 'Aktuellen Lebenslauf herunterladen'
                  : 'Legfrissebb önéletrajz letöltése',
          githubLink: 'GitHub',
        },
      },
    },
    hud: {
      ...buildSettingsHud(copy.locale, settingsCopies[copy.locale]),
      controlOverlay: {
        heading: s.controls,
        items: {
          keyboardMove: {
            description: templates.keyboardMove,
          },
          pointerDrag: {
            description: templates.pointerDrag,
          },
          pointerZoom: { description: 'Zoom' },
          keyboardZoom: {
            keys: 'Shift + = / Shift + -',
            description: templates.keyboardZoom,
          },
          touchDrag: {
            description: templates.touchDrag,
          },
          touchPinch: { description: 'Zoom' },
          cyclePoi: {
            description: templates.cyclePoi,
          },
          toggleTextMode: { description: s.textMode },
          lightingDebug: { description: templates.lightingDebug },
        },
        interact: {
          defaultLabel: templates.interactDefault,
          description: templates.interactDescription,
          promptTemplates: {
            default: templates.interactDefaultPrompt,
            inspect: templates.interactInspectPrompt,
            activate: templates.interactActivatePrompt,
          },
        },
        helpButton: {
          labelTemplate: templates.helpButtonLabelTemplate,
          announcementTemplate: templates.helpButtonAnnouncementTemplate,
        },
        menu: {
          controls: {
            label: s.controls,
            title: templates.controlsTitle,
          },
          text: {
            label:
              copy.locale === 'de'
                ? 'Text'
                : copy.locale === 'hu'
                  ? 'Szöveg'
                  : 'Texto',
            title: s.textMode,
          },
          settings: { label: s.settingsHelp, title: s.settingsHelp },
        },
      },
      audioSubtitles: {
        labels: {
          ambient: s.audioSubtitleAmbientLabel,
          poi: s.audioSubtitlePoiLabel,
        },
        dismissLabels: {
          ambient: s.audioSubtitleDismissAmbient,
          poi: s.audioSubtitleDismissPoi,
        },
      },
      audioControl: {
        groupLabel: templates.audioGroupLabel,
        toggle: {
          onLabelTemplate: `${s.audioOn} · {keyHint}`,
          offLabelTemplate: `${s.audioOff} · {keyHint}`,
          titleTemplate: templates.audioTitleTemplate,
          announcementOnTemplate: `${s.audioOn}. {keyHint}`,
          announcementOffTemplate: `${s.audioOff}. {keyHint}`,
          pendingAnnouncementTemplate: templates.audioPendingAnnouncement,
        },
        slider: {
          label: templates.audioSliderLabel,
          ariaLabel: templates.audioSliderAriaLabel,
          hudLabel: templates.audioSliderHudLabel,
          valueAnnouncementTemplate: templates.audioValueAnnouncementTemplate,
          mutedAnnouncementTemplate: templates.audioMutedAnnouncementTemplate,
          mutedValueTemplate: templates.audioMutedValueTemplate,
          mutedAriaValueTemplate: templates.audioMutedAriaValueTemplate,
        },
      },
      localeToggle: {
        title: s.language,
        description: s.languageDescription,
        options: optionLabels,
        switchingAnnouncementTemplate: s.switching,
        selectedAnnouncementTemplate: s.selected,
        failureAnnouncementTemplate: s.failure,
      },
      debugCoordinates: {
        labelEnabled: s.debugCoordinatesLabelEnabled,
        labelDisabled: s.debugCoordinatesLabelDisabled,
        descriptionEnabled: s.debugCoordinatesDescriptionEnabled,
        descriptionDisabled: s.debugCoordinatesDescriptionDisabled,
        overlayLabel: s.debugCoordinatesOverlayLabel,
        labels: {
          position: s.debugCoordinatesPosition,
          activeFloor: s.debugCoordinatesActiveFloor,
          predictedFloor: s.debugCoordinatesPredictedFloor,
          cameraZoom: s.debugCoordinatesCameraZoom,
          stairWidth: s.debugCoordinatesStairWidth,
          landing: s.debugCoordinatesLanding,
          stairNav: s.debugCoordinatesStairNav,
          stairZone: s.debugCoordinatesStairZone,
          room: s.debugCoordinatesRoom,
        },
        values: {
          yes: s.debugCoordinatesYes,
          no: s.debugCoordinatesNo,
          none: s.debugCoordinatesNone,
        },
      },
      debugColliders: {
        labelEnabled: s.debugCollidersLabelEnabled,
        labelDisabled: s.debugCollidersLabelDisabled,
        descriptionEnabled: s.debugCollidersDescriptionEnabled,
        descriptionDisabled: s.debugCollidersDescriptionDisabled,
        idsLabelEnabled: s.debugCollidersIdsLabelEnabled ?? 'Collider IDs on',
        idsLabelDisabled:
          s.debugCollidersIdsLabelDisabled ?? 'Collider IDs off',
        idsDescriptionEnabled:
          s.debugCollidersIdsDescriptionEnabled ??
          'Shows collider ID labels while the collider overlay is on.',
        idsDescriptionDisabled:
          s.debugCollidersIdsDescriptionDisabled ??
          'Hides collider ID labels while keeping collider wireframes available.',
        solidIdsLabelEnabled:
          s.debugCollidersSolidIdsLabelEnabled ?? 'Solid IDs on',
        solidIdsLabelDisabled:
          s.debugCollidersSolidIdsLabelDisabled ?? 'Solid IDs off',
        solidIdsDescriptionEnabled:
          s.debugCollidersSolidIdsDescriptionEnabled ??
          'Shows stable IDs and wireframes for visible scene solids.',
        solidIdsDescriptionDisabled:
          s.debugCollidersSolidIdsDescriptionDisabled ??
          'Stable solid IDs and wireframes stay hidden.',
        fpsLabelEnabled: s.debugCollidersFpsLabelEnabled ?? 'FPS counter on',
        fpsLabelDisabled: s.debugCollidersFpsLabelDisabled ?? 'FPS counter off',
        fpsDescriptionEnabled:
          s.debugCollidersFpsDescriptionEnabled ??
          'Shows a non-interactive stats.js FPS panel for immersive diagnostics.',
        fpsDescriptionDisabled:
          s.debugCollidersFpsDescriptionDisabled ??
          'Hides the stats.js FPS panel while keeping diagnostics available.',
      },
      modeToggle: {
        idleLabelTemplate: `${s.textMode} · {keyHint}`,
        idleDescriptionTemplate: s.textMode,
        idleAnnouncementTemplate: `${s.textMode}. {keyHint}`,
        idleTitleTemplate: `${s.textMode} ({keyHint})`,
        pendingLabelTemplate: s.textMode,
        pendingAnnouncementTemplate: s.textMode,
        activeLabelTemplate: `${s.tryImmersive} · {keyHint}`,
        activeDescriptionTemplate: s.tryImmersive,
        activeAnnouncementTemplate: `${s.tryImmersive}. {keyHint}`,
        errorLabelTemplate: `${s.textMode} · {keyHint}`,
        errorDescriptionTemplate: s.textMode,
        errorAnnouncementTemplate: `${s.textMode}. {keyHint}`,
        errorTitleTemplate: `${s.textMode}. {keyHint}`,
      },
      poiOverlay: {
        visited:
          copy.locale === 'de'
            ? 'Besucht'
            : copy.locale === 'hu'
              ? 'Megnézve'
              : copy.locale === 'pt'
                ? 'Visitado'
                : 'Visitado',
        prototype: s.prototype,
        live: s.live,
        closeDetails: s.closePoi,
        relatedCaseStudies: s.related,
        outcomeFallbackLabel: s.outcome,
        discoveryAnnouncementTemplate: s.discovered,
        debugDetailsLabel: 'Debug details',
        debugPoiAnchor: 'POI anchor',
        debugModelTriangles: 'Model triangles',
      },
      helpModal: {
        heading: s.settingsHelp,
        description:
          copy.locale === 'de'
            ? 'Passe Barrierefreiheit, Grafik, Audio und Tastenkürzel an.'
            : copy.locale === 'hu'
              ? 'Állítsd az akadálymentességet, grafikát, hangot és gyorsbillentyűket.'
              : copy.locale === 'pt'
                ? 'Ajuste acessibilidade, gráficos, áudio e atalhos.'
                : 'Ajusta accesibilidad, gráficos, audio y atajos.',
        closeLabel:
          copy.locale === 'de'
            ? 'Schließen'
            : copy.locale === 'hu'
              ? 'Bezárás'
              : copy.locale === 'pt'
                ? 'Fechar'
                : 'Cerrar',
        closeAriaLabel:
          copy.locale === 'de'
            ? 'Hilfe schließen'
            : copy.locale === 'hu'
              ? 'Súgó bezárása'
              : copy.locale === 'pt'
                ? 'Fechar ajuda'
                : 'Cerrar ayuda',
        settings: {
          heading: s.settingsHelp,
          description: s.languageDescription,
        },
        sections: buildLatinHelpSections(copy.locale),
        announcements: {
          open:
            copy.locale === 'de'
              ? 'Hilfemenü geöffnet.'
              : copy.locale === 'hu'
                ? 'Súgómenü megnyitva.'
                : copy.locale === 'pt'
                  ? 'Menu de ajuda aberto.'
                  : 'Menú de ayuda abierto.',
          close:
            copy.locale === 'de'
              ? 'Hilfemenü geschlossen.'
              : copy.locale === 'hu'
                ? 'Súgómenü bezárva.'
                : copy.locale === 'pt'
                  ? 'Menu de ajuda fechado.'
                  : 'Menú de ayuda cerrado.',
        },
      },
      softwareRendererWarning: {
        fallbackRendererLabel: templates.fallbackRendererLabel,
        title: templates.softwareRendererTitle,
        descriptionTemplate: templates.softwareRendererDescriptionTemplate,
        recommendation: templates.softwareRendererRecommendation,
        continueSafeLabel: templates.continueSafeLabel,
        continuousLabel: templates.continuousLabel,
        textModeLabel: s.textMode,
        reloadSafeLabel: templates.reloadSafeLabel,
      },
    },
    poi: buildPoi(copy, githubStars),
  };
}

function buildPoi(
  copy: LatinLocaleCopy,
  githubStars: {
    label: string;
    value: string;
    template: string;
    fallback: string;
  }
): LocaleOverrides['poi'] {
  const starSource = (
    repo: string,
    visibility?: 'public' | 'private',
    owner = 'futuroptimist'
  ) => ({
    type: 'githubStars' as const,
    owner,
    repo,
    ...(visibility ? { visibility } : {}),
    format: 'compact' as const,
    template: githubStars.template,
    fallback: githubStars.fallback,
  });
  const poi = copy.poi;
  return {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist',
      summary: poi.futuroptimist.summary,
      outcome: {
        label: copy.strings.outcome,
        value: poi.futuroptimist.outcome,
      },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('danielsmith.io'),
        },
        {
          label: poi.futuroptimist.metrics[0],
          value: poi.futuroptimist.metrics[1],
        },
        {
          label: poi.futuroptimist.metrics[2],
          value: poi.futuroptimist.metrics[3],
        },
      ],
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary: poi.tokenplace.summary,
      outcome: { label: copy.strings.outcome, value: poi.tokenplace.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('token.place'),
        },
        { label: poi.tokenplace.metrics[0], value: poi.tokenplace.metrics[1] },
        { label: poi.tokenplace.metrics[2], value: poi.tokenplace.metrics[3] },
      ],
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary: poi.gabriel.summary,
      outcome: { label: copy.strings.outcome, value: poi.gabriel.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('gabriel'),
        },
        { label: poi.gabriel.metrics[0], value: poi.gabriel.metrics[1] },
        { label: poi.gabriel.metrics[2], value: poi.gabriel.metrics[3] },
      ],
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary: poi.flywheel.summary,
      outcome: { label: copy.strings.outcome, value: poi.flywheel.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('flywheel'),
        },
        { label: poi.flywheel.metrics[0], value: poi.flywheel.metrics[1] },
        { label: poi.flywheel.metrics[2], value: poi.flywheel.metrics[3] },
      ],
      interactionPrompt:
        localizedTemplates[copy.locale].flywheelInteractionPrompt,
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000',
      summary: poi.jobbot.summary,
      outcome: { label: copy.strings.outcome, value: poi.jobbot.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('jobbot3000'),
        },
        { label: poi.jobbot.metrics[0], value: poi.jobbot.metrics[1] },
        { label: poi.jobbot.metrics[2], value: poi.jobbot.metrics[3] },
        { label: poi.jobbot.metrics[4], value: poi.jobbot.metrics[5] },
      ],
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary: poi.axel.summary,
      outcome: { label: copy.strings.outcome, value: poi.axel.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('axel'),
        },
        { label: poi.axel.metrics[0], value: poi.axel.metrics[1] },
        { label: poi.axel.metrics[2], value: poi.axel.metrics[3] },
        { label: poi.axel.metrics[4], value: poi.axel.metrics[5] },
      ],
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves',
      summary: poi.gitshelves.summary,
      outcome: { label: copy.strings.outcome, value: poi.gitshelves.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('gitshelves'),
        },
        { label: poi.gitshelves.metrics[0], value: poi.gitshelves.metrics[1] },
        { label: poi.gitshelves.metrics[2], value: poi.gitshelves.metrics[3] },
      ],
    },
    'danielsmith-portfolio-table': {
      title: 'danielsmith.io',
      summary: poi.portfolio.summary,
      outcome: { label: copy.strings.outcome, value: poi.portfolio.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('danielsmith.io'),
        },
        { label: poi.portfolio.metrics[0], value: poi.portfolio.metrics[1] },
        { label: poi.portfolio.metrics[2], value: poi.portfolio.metrics[3] },
      ],
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary: poi.f2clipboard.summary,
      outcome: { label: copy.strings.outcome, value: poi.f2clipboard.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('f2clipboard'),
        },
        {
          label: poi.f2clipboard.metrics[0],
          value: poi.f2clipboard.metrics[1],
        },
        {
          label: poi.f2clipboard.metrics[2],
          value: poi.f2clipboard.metrics[3],
        },
      ],
    },
    'sigma-kitchen-workbench': {
      title: 'Sigma',
      summary: poi.sigma.summary,
      outcome: { label: copy.strings.outcome, value: poi.sigma.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('sigma'),
        },
        { label: poi.sigma.metrics[0], value: poi.sigma.metrics[1] },
        { label: poi.sigma.metrics[2], value: poi.sigma.metrics[3] },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary: poi.wove.summary,
      outcome: { label: copy.strings.outcome, value: poi.wove.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('wove'),
        },
        { label: poi.wove.metrics[0], value: poi.wove.metrics[1] },
        { label: poi.wove.metrics[2], value: poi.wove.metrics[3] },
      ],
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary: poi.dspace.summary,
      outcome: { label: copy.strings.outcome, value: poi.dspace.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('dspace', 'public', 'democratizedspace'),
        },
        { label: poi.dspace.metrics[0], value: poi.dspace.metrics[1] },
        { label: poi.dspace.metrics[2], value: poi.dspace.metrics[3] },
      ],
      interactionPrompt:
        localizedTemplates[copy.locale].dspaceInteractionPrompt,
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary: poi.prReaper.summary,
      outcome: { label: copy.strings.outcome, value: poi.prReaper.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('pr-reaper'),
        },
        { label: poi.prReaper.metrics[0], value: poi.prReaper.metrics[1] },
        { label: poi.prReaper.metrics[2], value: poi.prReaper.metrics[3] },
      ],
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube',
      summary: poi.sugarkube.summary,
      outcome: { label: copy.strings.outcome, value: poi.sugarkube.outcome },
      metrics: [
        {
          label: githubStars.label,
          value: githubStars.value,
          source: starSource('sugarkube'),
        },
        { label: poi.sugarkube.metrics[0], value: poi.sugarkube.metrics[1] },
        { label: poi.sugarkube.metrics[2], value: poi.sugarkube.metrics[3] },
        { label: poi.sugarkube.metrics[4], value: poi.sugarkube.metrics[5] },
      ],
    },
  };
}
