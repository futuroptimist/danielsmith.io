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
    nextHighlight: string;
    related: string;
    prototype: string;
    live: string;
    textMode: string;
    tryImmersive: string;
    guidedTour: string;
    guidedTourOn: string;
    guidedTourOff: string;
    audioOn: string;
    audioOff: string;
    audioSubtitleAmbientLabel: string;
    audioSubtitlePoiLabel: string;
    audioSubtitleDismissAmbient: string;
    audioSubtitleDismissPoi: string;
    narrationToggleLabelEnabled: string;
    narrationToggleLabelDisabled: string;
    narrationToggleDescriptionEnabled: string;
    narrationToggleDescriptionDisabled: string;
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
    tourResetLabel: string;
    tourResetDescription: string;
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
    tourResetLabel: 'Reiniciar visita guiada',
    tourResetDescription: 'Borra los POI visitados y repite la ruta curada.',
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
    tourResetLabel: 'Reiniciar visita guiada',
    tourResetDescription:
      'Limpe os POIs visitados e repita o caminho selecionado.',
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
    tourResetLabel: 'Geführte Tour neu starten',
    tourResetDescription:
      'Besuchte POIs löschen und den kuratierten Pfad wiederholen.',
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
    tourResetLabel: 'Vezetett túra újraindítása',
    tourResetDescription:
      'Látogatott POI-k törlése és a kijelölt útvonal újrajátszása.',
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

function buildLatinHelpSections(
  locale: LatinLocale
): readonly HelpModalSectionStrings[] {
  const copy = {
    es: {
      movementTitle: 'Movimiento y cámara',
      move: 'Mueve al explorador por la casa.',
      drag: 'Desplaza la cámara isométrica.',
      wheel: 'Ajusta el nivel de zoom.',
      keyboardZoom: 'Acerca o aleja sin rueda de ratón.',
      touch:
        'Arrastra el pad izquierdo para mover y el derecho para panorámica.',
      pinch: 'Haz zoom en dispositivos táctiles.',
      interactionsTitle: 'Interacciones',
      poi: 'Acércate a los POI luminosos',
      poiDescription:
        'Pulsa la tecla de interacción (Enter/Espacio/F), toca o haz clic para abrir la exhibición.',
      cycle: 'Cambia el foco entre puntos de interés con el teclado.',
      textMode: 'Alterna entre el modo inmersivo y el respaldo de texto.',
      lighting:
        'Compara la iluminación cinematográfica con el pase de depuración.',
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
      movementTitle: 'Movimento e câmera',
      move: 'Mova o explorador pela casa.',
      drag: 'Desloque a câmera isométrica.',
      wheel: 'Ajuste o nível de zoom.',
      keyboardZoom: 'Aproxime ou afaste sem roda do mouse.',
      touch: 'Arraste o pad esquerdo para mover e o direito para panorâmica.',
      pinch: 'Aplique zoom em dispositivos de toque.',
      interactionsTitle: 'Interações',
      poi: 'Aproxime-se dos POIs brilhantes',
      poiDescription:
        'Pressione sua tecla de interação (Enter/Espaço/F), toque ou clique para abrir a exibição.',
      cycle: 'Alterne o foco entre pontos de interesse pelo teclado.',
      textMode: 'Alterne entre o modo imersivo e o fallback em texto.',
      lighting:
        'Compare a iluminação cinematográfica com a passagem de depuração.',
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
      movementTitle: 'Bewegung & Kamera',
      move: 'Bewege den Explorer durch das Zuhause.',
      drag: 'Schwenke die isometrische Kamera.',
      wheel: 'Passe die Zoomstufe an.',
      keyboardZoom: 'Zoome ohne Mausrad hinein oder heraus.',
      touch: 'Ziehe links zum Bewegen und rechts zum Schwenken.',
      pinch: 'Zoome auf Touch-Geräten per Pinch-Geste.',
      interactionsTitle: 'Interaktionen',
      poi: 'Leuchtenden POIs nähern',
      poiDescription:
        'Drücke die Interaktionstaste (Enter/Leertaste/F), tippe oder klicke, um das Exponat zu öffnen.',
      cycle: 'Wechsle den Fokus per Tastatur zwischen Points of Interest.',
      textMode: 'Wechsle zwischen immersivem Modus und Text-Fallback.',
      lighting: 'Vergleiche filmische Beleuchtung mit dem Debug-Pass.',
      accessibilityTitle: 'Barrierefreiheit & Fallback',
      lowPerformance:
        'Die Szene wechselt unter 30 FPS automatisch in den Textmodus.',
      manualToggle: 'Nutze die Schaltfläche Textmodus oder drücke jederzeit T.',
      motionBlur:
        'Passe die Spur-Stärke unter Einstellungen → Bewegungsunschärfe an.',
      ambientAudio: 'Schalte mit der Audio-Schaltfläche um oder drücke M.',
    },
    hu: {
      movementTitle: 'Mozgás és kamera',
      move: 'Mozgasd a felfedezőt az otthonban.',
      drag: 'Pásztázd az izometrikus kamerát.',
      wheel: 'Állítsd a nagyítási szintet.',
      keyboardZoom: 'Nagyíts vagy kicsinyíts egérgörgő nélkül.',
      touch: 'A bal paddal mozogj, a jobb paddal pásztázz.',
      pinch: 'Érintős eszközön csippentéssel nagyíts.',
      interactionsTitle: 'Interakciók',
      poi: 'Közelíts a világító POI-khoz',
      poiDescription:
        'Nyomd meg az interakciós billentyűt (Enter/Szóköz/F), koppints vagy kattints a kiállítás megnyitásához.',
      cycle: 'Billentyűzettel válts fókuszt az érdekes pontok között.',
      textMode: 'Válts az immerzív mód és a szöveges tartalék között.',
      lighting: 'Hasonlítsd össze a filmes világítást a hibakereső nézettel.',
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
      id: 'movement',
      title: copy.movementTitle,
      items: [
        { label: 'WASD / Arrow keys', description: copy.move },
        { label: 'Mouse drag', description: copy.drag },
        { label: 'Scroll wheel', description: copy.wheel },
        {
          label: 'Shift + = / Shift + -',
          description: copy.keyboardZoom,
        },
        { label: 'Touch joysticks', description: copy.touch },
        { label: 'Pinch', description: copy.pinch },
      ],
    },
    {
      id: 'interactions',
      title: copy.interactionsTitle,
      items: [
        { label: copy.poi, description: copy.poiDescription },
        { label: 'Q / E or ← / →', description: copy.cycle },
        { label: 'T', description: copy.textMode },
        { label: 'Shift + L', description: copy.lighting },
      ],
    },
    {
      id: 'accessibility',
      title: copy.accessibilityTitle,
      items: [
        { label: 'Low performance', description: copy.lowPerformance },
        { label: 'Manual toggle', description: copy.manualToggle },
        { label: 'Motion blur slider', description: copy.motionBlur },
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
      tourGuideToggle: {
        labelEnabled: s.guidedTourOn,
        labelDisabled: s.guidedTourOff,
        descriptionEnabled: s.guidedTour,
        descriptionDisabled: s.guidedTour,
      },
      narrationToggle: {
        labelEnabled: s.narrationToggleLabelEnabled,
        labelDisabled: s.narrationToggleLabelDisabled,
        descriptionEnabled: s.narrationToggleDescriptionEnabled,
        descriptionDisabled: s.narrationToggleDescriptionDisabled,
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
      tourReset: {
        heading: s.guidedTour,
        label: templates.tourResetLabel,
        description: templates.tourResetDescription,
        guidedTourDescription: s.guidedTour,
        guidedTourLabelOn: s.guidedTourOn,
        guidedTourLabelOff: s.guidedTourOff,
        toggleAnnouncementOn: s.guidedTourOn,
        toggleAnnouncementOff: s.guidedTourOff,
        toggleTitleOn: s.guidedTourOff,
        toggleTitleOff: s.guidedTourOn,
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
        nextHighlight: s.nextHighlight,
        prototype: s.prototype,
        live: s.live,
        closeDetails: s.closePoi,
        relatedCaseStudies: s.related,
        outcomeFallbackLabel: s.outcome,
        discoveryAnnouncementTemplate: s.discovered,
        debugAnchorLabel: 'POI anchor',
        debugTrianglesLabel: 'Model triangles',
      },
      narrativeLog: {
        heading:
          copy.locale === 'de'
            ? 'Creator-Story-Log'
            : copy.locale === 'hu'
              ? 'Alkotói történetnapló'
              : copy.locale === 'pt'
                ? 'Registro da história do criador'
                : 'Registro de historia del creador',
        visitedHeading:
          copy.locale === 'de'
            ? 'Besuchte Exponate'
            : copy.locale === 'hu'
              ? 'Meglátogatott kiállítások'
              : copy.locale === 'pt'
                ? 'Exibições visitadas'
                : 'Exhibiciones visitadas',
        empty:
          copy.locale === 'de'
            ? 'Besuche Exponate, um Erzähleinträge freizuschalten.'
            : copy.locale === 'hu'
              ? 'Látogass kiállításokat a történetbejegyzések feloldásához.'
              : copy.locale === 'pt'
                ? 'Visite exibições para liberar entradas narrativas.'
                : 'Visita exhibiciones para desbloquear entradas narrativas.',
        defaultVisitedLabel:
          copy.locale === 'de'
            ? 'Besucht'
            : copy.locale === 'hu'
              ? 'Megnézve'
              : 'Visitado',
        visitedLabelTemplate:
          copy.locale === 'de'
            ? 'Besucht um {time}'
            : copy.locale === 'hu'
              ? 'Megnézve ekkor: {time}'
              : copy.locale === 'pt'
                ? 'Visitado às {time}'
                : 'Visitado a las {time}',
        liveAnnouncementTemplate:
          copy.locale === 'de'
            ? '{title} wurde dem Creator-Story-Log hinzugefügt.'
            : copy.locale === 'hu'
              ? '{title} bekerült az alkotói történetnaplóba.'
              : copy.locale === 'pt'
                ? '{title} adicionado ao registro da história do criador.'
                : '{title} añadido al registro de historia del creador.',
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
