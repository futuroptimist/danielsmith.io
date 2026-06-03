import type { Locale, LocaleOverrides } from '../types';

interface LatinLocaleCopy {
  locale: Locale;
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

export function buildLatinLocaleOverrides(
  copy: LatinLocaleCopy
): LocaleOverrides {
  const { strings: s } = copy;
  const githubStars = {
    label: s.stars,
    value: s.syncing,
    template: `{value} ${s.stars.toLowerCase()}`,
    fallback: s.syncing,
  };

  return {
    locale: copy.locale,
    site: {
      name: copy.siteName,
      structuredData: {
        description: copy.siteName,
        listNameTemplate: '{siteName} exhibits',
        textCollectionNameTemplate: '{siteName} text portfolio',
        textCollectionDescription: s.textIntro,
        immersiveActionName: s.tryImmersive,
        properties: {
          labels: {
            category: 'Category',
            outcome: s.outcome,
            status: 'Status',
          },
          categories: { project: 'Project', environment: 'Environment' },
          statuses: { prototype: s.prototype, live: s.live },
        },
        publisher: { name: 'Daniel Smith' },
        author: { name: 'Daniel Smith' },
      },
      textFallback: {
        heading: s.textHeading,
        intro: s.textIntro,
        roomHeadingTemplate: '{roomName} exhibits',
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
            description:
              copy.locale === 'de'
                ? 'Bewegen'
                : copy.locale === 'hu'
                  ? 'Mozgás'
                  : 'Mover',
          },
          pointerDrag: {
            description:
              copy.locale === 'de'
                ? 'Ziehen zum Schwenken'
                : copy.locale === 'hu'
                  ? 'Húzás a pásztázáshoz'
                  : 'Arrastrar para panorámica',
          },
          pointerZoom: { description: 'Zoom' },
          touchDrag: {
            description:
              copy.locale === 'de'
                ? 'Links bewegen, rechts schwenken'
                : copy.locale === 'hu'
                  ? 'Bal oldalon mozgás, jobb oldalon pásztázás'
                  : 'Arrastra a la izquierda para mover y a la derecha para panorámica',
          },
          touchPinch: { description: 'Zoom' },
          cyclePoi: {
            description:
              copy.locale === 'de'
                ? 'POIs wechseln'
                : copy.locale === 'hu'
                  ? 'POI-k váltása'
                  : 'Recorrer POI',
          },
          toggleTextMode: { description: s.textMode },
        },
        interact: {
          defaultLabel:
            copy.locale === 'de'
              ? 'Öffnen'
              : copy.locale === 'hu'
                ? 'Megnyitás'
                : 'Entrar',
          description:
            copy.locale === 'de'
              ? 'Interagieren'
              : copy.locale === 'hu'
                ? 'Interakció'
                : 'Interactuar',
          promptTemplates: {
            default:
              copy.locale === 'de'
                ? 'Mit {title} interagieren'
                : copy.locale === 'hu'
                  ? 'Interakció: {title}'
                  : 'Interactuar con {title}',
            inspect:
              copy.locale === 'de'
                ? '{title} ansehen'
                : copy.locale === 'hu'
                  ? '{title} megtekintése'
                  : 'Inspeccionar {title}',
            activate:
              copy.locale === 'de'
                ? '{title} aktivieren'
                : copy.locale === 'hu'
                  ? '{title} aktiválása'
                  : 'Activar {title}',
          },
        },
        helpButton: {
          labelTemplate:
            copy.locale === 'de'
              ? 'Menü öffnen · {shortcut} drücken'
              : copy.locale === 'hu'
                ? 'Menü megnyitása · {shortcut}'
                : 'Abrir menú · Pulsa {shortcut}',
          announcementTemplate:
            copy.locale === 'de'
              ? 'Einstellungen und Hilfe öffnen. Drücke {shortcut}, um Steuerelemente und Barrierefreiheit zu prüfen.'
              : copy.locale === 'hu'
                ? 'Beállítások és súgó megnyitása. Nyomd meg: {shortcut}.'
                : 'Abrir ajustes y ayuda. Pulsa {shortcut} para revisar controles y accesibilidad.',
        },
        menu: {
          controls: {
            label: s.controls,
            title:
              copy.locale === 'de'
                ? 'Steuerung öffnen (C)'
                : copy.locale === 'hu'
                  ? 'Vezérlés megnyitása (C)'
                  : 'Abrir controles (C)',
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
      audioControl: {
        groupLabel:
          copy.locale === 'de'
            ? 'Ambient-Audio-Steuerung'
            : copy.locale === 'hu'
              ? 'Környezeti hang vezérlése'
              : 'Controles de audio ambiental',
        toggle: {
          onLabelTemplate: `${s.audioOn} · {keyHint}`,
          offLabelTemplate: `${s.audioOff} · {keyHint}`,
          titleTemplate:
            copy.locale === 'de'
              ? 'Ambient-Audio umschalten ({keyHint})'
              : copy.locale === 'hu'
                ? 'Környezeti hang váltása ({keyHint})'
                : 'Alternar audio ambiental ({keyHint})',
          announcementOnTemplate: `${s.audioOn}. {keyHint}`,
          announcementOffTemplate: `${s.audioOff}. {keyHint}`,
          pendingAnnouncementTemplate:
            copy.locale === 'de'
              ? 'Audio wird umgeschaltet…'
              : copy.locale === 'hu'
                ? 'Hangállapot váltása…'
                : 'Cambiando estado de audio…',
        },
        slider: {
          label:
            copy.locale === 'de'
              ? 'Ambient-Lautstärke'
              : copy.locale === 'hu'
                ? 'Környezeti hangerő'
                : 'Volumen ambiental',
          ariaLabel:
            copy.locale === 'de'
              ? 'Ambient-Audio-Lautstärke'
              : copy.locale === 'hu'
                ? 'Környezeti hang hangereje'
                : 'Volumen del audio ambiental',
          hudLabel:
            copy.locale === 'de'
              ? 'Regler für Ambient-Audio.'
              : copy.locale === 'hu'
                ? 'Környezeti hangerő csúszka.'
                : 'Control de volumen ambiental.',
          valueAnnouncementTemplate:
            copy.locale === 'de'
              ? 'Ambient-Lautstärke {volume}.'
              : copy.locale === 'hu'
                ? 'Környezeti hangerő {volume}.'
                : 'Volumen ambiental {volume}.',
          mutedAnnouncementTemplate:
            copy.locale === 'de'
              ? 'Ambient-Audio stumm. Lautstärke {volume}.'
              : copy.locale === 'hu'
                ? 'Környezeti hang némítva. Hangerő {volume}.'
                : 'Audio ambiental silenciado. Volumen {volume}.',
          mutedValueTemplate:
            copy.locale === 'de'
              ? 'Stumm · {volume}'
              : copy.locale === 'hu'
                ? 'Némítva · {volume}'
                : 'Silenciado · {volume}',
          mutedAriaValueTemplate:
            copy.locale === 'de'
              ? 'Stumm ({volume})'
              : copy.locale === 'hu'
                ? 'Némítva ({volume})'
                : 'Silenciado ({volume})',
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
      tourReset: {
        heading: s.guidedTour,
        label:
          copy.locale === 'de'
            ? 'Geführte Tour neu starten'
            : copy.locale === 'hu'
              ? 'Vezetett túra újraindítása'
              : 'Reiniciar visita guiada',
        description:
          copy.locale === 'de'
            ? 'Besuchte POIs löschen und den kuratierten Pfad wiederholen.'
            : copy.locale === 'hu'
              ? 'Látogatott POI-k törlése és a kijelölt útvonal újrajátszása.'
              : 'Borra los POI visitados y repite la ruta curada.',
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
        fallbackRendererLabel:
          copy.locale === 'de'
            ? 'Software-WebGL-Renderer'
            : copy.locale === 'hu'
              ? 'szoftveres WebGL renderer'
              : 'renderizador WebGL por software',
        title:
          copy.locale === 'de'
            ? 'Software-Rendering erkannt'
            : copy.locale === 'hu'
              ? 'Szoftveres renderelés észlelve'
              : copy.locale === 'pt'
                ? 'Renderização por software detectada'
                : 'Renderizado por software detectado',
        descriptionTemplate:
          copy.locale === 'de'
            ? 'Chrome verwendet {renderer} statt Hardwarebeschleunigung.'
            : copy.locale === 'hu'
              ? 'A Chrome {renderer} használ hardveres gyorsítás helyett.'
              : 'Chrome está usando {renderer} en lugar de aceleración por hardware.',
        recommendation: s.tryImmersive,
        continueSafeLabel: s.tryImmersive,
        continuousLabel: s.tryImmersive,
        textModeLabel: s.textMode,
        reloadSafeLabel: s.tryImmersive,
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
  const starSource = (repo: string, visibility?: 'private') => ({
    type: 'githubStars' as const,
    owner: 'futuroptimist',
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
          value: '1,280+',
          source: { ...starSource('danielsmith.io'), fallback: '1,280+' },
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
        copy.locale === 'de'
          ? '{title}-Systeme starten'
          : copy.locale === 'hu'
            ? '{title} rendszerek indítása'
            : 'Activar sistemas {title}',
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
          value: '1,280+',
          source: { ...starSource('danielsmith.io'), fallback: '1,280+' },
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
          source: starSource('dspace', 'private'),
        },
        { label: poi.dspace.metrics[0], value: poi.dspace.metrics[1] },
        { label: poi.dspace.metrics[2], value: poi.dspace.metrics[3] },
      ],
      interactionPrompt:
        copy.locale === 'de'
          ? '{title}-Countdown starten'
          : copy.locale === 'hu'
            ? '{title} visszaszámlálás indítása'
            : 'Lanzar cuenta atrás de {title}',
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
        { label: poi.sugarkube.metrics[0], value: poi.sugarkube.metrics[1] },
        { label: poi.sugarkube.metrics[2], value: poi.sugarkube.metrics[3] },
        { label: poi.sugarkube.metrics[4], value: poi.sugarkube.metrics[5] },
      ],
    },
  };
}
