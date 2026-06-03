import type { LocaleOverrides } from '../types';

export const ES_OVERRIDES: LocaleOverrides = {
  locale: 'es',
  site: {
    name: 'Portafolio inmersivo Daniel Smith',
    structuredData: {
      description:
        'Exposiciones interactivas dentro de la experiencia inmersiva del portafolio Daniel Smith.',
      listNameTemplate: 'Exposiciones {siteName}',
      textCollectionNameTemplate: 'Portafolio de texto {siteName}',
      textCollectionDescription:
        'Resúmenes de carga rápida de cada exhibición inmersiva optimizados para una lectura accesible y fácil de rastrear.',
      immersiveActionName: 'Iniciar el modo inmersivo',
      properties: {
        labels: {
          category: 'Categoría',
          outcome: 'Resultado',
          status: 'Estado',
        },
        categories: {
          project: 'Proyecto',
          environment: 'Ambiente',
        },
        statuses: {
          prototype: 'Prototipo',
          live: 'En vivo',
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
      heading: 'Explora los aspectos destacados',
      intro:
        'El portafolio de texto mantiene todas las exhibiciones accesibles con resúmenes rápidos, resultados y métricas mientras el modo inmersivo no está disponible.',
      roomHeadingTemplate: 'Exposiciones {roomName}',
      metricsHeading: 'Métricas clave',
      linksHeading: 'Lectura adicional',
      about: {
        heading: 'Acerca de Daniel',
        summary:
          'Ingeniero de Confiabilidad del Sitio con seis años en YouTube enfocado en automatización, observabilidad y lanzamientos constantes.',
        highlights: [
          'Plataformas de desarrollador creadas y herramientas de agente para acelerar el envío de forma segura.',
          'Asesora a los equipos sobre SLOs, respuesta a incidentes y revisiones de confiabilidad.',
          'Explora la narración inmersiva de WebGL que siempre recurre a texto accesible.',
        ],
      },
      skills: {
        heading: 'Habilidades de un vistazo',
        items: [
          {
            label: 'Idiomas',
            value:
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C',
          },
          {
            label: 'Infraestructura y herramientas',
            value:
              'Kubernetes, Docker, Google Nube (BigQuery), GitHub Acciones, WebGL/Three.js, React/Next.js, Astro',
          },
          {
            label: 'Prácticas',
            value:
              'SRE (SLOs, respuesta a incidentes, capacidad), observabilidad, CI/CD, pruebas, documentos rápidos y codificación agente',
          },
        ],
      },
      timeline: {
        heading: 'Cronograma de trabajo',
        entries: [
          {
            period: 'Septiembre de 2018 — Mayo de 2025',
            location: 'San Bruno, California, EE.UU.',
            role: 'Ingeniero de Confiabilidad del Sitio (N4)',
            org: 'YouTube (Google)',
            summary:
              'Ejecutó guardias en múltiples superficies, monitoreo automatizado en Python/Go/SQL/C++ y revisiones de confiabilidad guiadas para el liderazgo.',
          },
          {
            period: 'enero de 2017 — septiembre de 2018',
            location: 'Centro espacial Stennis, MS',
            role: 'Ingeniero de software',
            org: 'Laboratorio de Investigaciones Navales',
            summary:
              'Se enviaron aplicaciones de procesamiento de datos C++/Qt y demostraciones remotas dentro de los sprints de Scrum.',
          },
          {
            period: 'marzo de 2014 — diciembre de 2016',
            location: 'Hattiesburg, Misisipi, EE.UU.',
            role: 'Desarrollador de software',
            org: 'La Universidad del Sur de Mississippi',
            summary:
              'Construyó marcos Objective-C para la entrega de contenido en vivo en aplicaciones iOS universitarias.',
          },
        ],
      },
      contact: {
        heading: 'Contacto',
        emailLabel: 'Correo electrónico',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: 'Currículum (PDF)',
        resumeUrl: 'docs/resume/2025-09/resume.pdf',
      },
      recoveryCta: {
        title: '¿Listo para la sala completa?',
        description:
          'Borre la preferencia de texto guardado y reinicie el portafolio inmersivo desde aquí.',
        actionLabel: 'Prueba la inmersión de nuevo',
        ariaLabel:
          'Pruebe el modo inmersivo nuevamente y borre la preferencia del modo de texto guardado',
      },
      actions: {
        immersiveLink: 'Prueba la inmersión de nuevo',
        debugImmersiveLink: 'Depuración: forzar el modo inmersivo',
        clearPreferenceButton: 'Borrar preferencia de modo guardado',
        clearPreferenceSuccess: 'Preferencia de modo guardado borrada',
        resumeLink: 'Descargue el currículum más reciente',
        githubLink: 'Explora proyectos en GitHub',
      },
      reasonHeadings: {
        manual: 'Modo de solo texto habilitado',
        'webgl-unsupported':
          'El modo inmersivo no está disponible en este dispositivo',
        'low-memory': 'Dispositivo con poca memoria detectado',
        'low-end-device': 'Dispositivo ligero detectado',
        'low-performance': 'Recuperación de rendimiento activa',
        'immersive-init-error': 'La escena inmersiva encontró un error',
        'automated-client': 'Cliente automatizado detectado',
        'data-saver': 'Modo de ahorro de datos habilitado',
        'console-error': 'Errores de tiempo de ejecución detectados',
      },
      reasonDescriptions: {
        manual:
          'Solicitó la vista de cartera liviana. La escena inmersiva permanece a solo un clic de distancia.',
        'webgl-unsupported':
          'Su navegador o dispositivo no pudo iniciar el renderizador WebGL. Disfrute de la descripción general rápida del texto mientras mantenemos la luz de la escena inmersiva.',
        'low-memory':
          'Su dispositivo informó memoria limitada, por lo que lanzamos el recorrido de texto liviano para que todo funcione sin problemas.',
        'low-end-device':
          'Detectamos un perfil de dispositivo liviano, por lo que cargamos el recorrido de texto rápido para mantener la navegación receptiva.',
        'low-performance':
          'Detectamos velocidades de fotogramas bajas y sostenidas, por lo que cambiamos al recorrido de texto responsivo para mantener la experiencia ágil.',
        'immersive-init-error':
          'Algo salió mal al iniciar la escena inmersiva, por lo que te traemos la descripción general del texto.',
        'automated-client':
          'Detectamos un cliente automatizado, por lo que mostramos el portafolio de texto de carga rápida para obtener vistas previas y rastreadores confiables.',
        'console-error':
          'Detectamos un error de tiempo de ejecución y cambiamos al recorrido de texto resistente mientras se recupera la escena inmersiva.',
        'data-saver':
          'Su navegador solicitó una experiencia de ahorro de datos, por lo que lanzamos el recorrido de texto liviano para minimizar el ancho de banda y mantener accesibles los aspectos más destacados.',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Controles',
      items: {
        keyboardMove: {
          keys: 'WASD/teclas de flecha',
          description: 'Mover',
        },
        pointerDrag: {
          keys: 'Botón izquierdo del ratón',
          description: 'Arrastrar para desplazarse',
        },
        pointerZoom: {
          keys: 'rueda de desplazamiento',
          description: 'Zoom',
        },
        touchDrag: {
          keys: 'Tocar',
          description:
            'Arrastre la mitad izquierda para mover y la mitad derecha para desplazarse',
        },
        touchPinch: {
          keys: 'Pellizco',
          description: 'Zoom',
        },
        cyclePoi: {
          keys: 'P/E',
          description: 'Ciclo de puntos de interés',
        },
        toggleTextMode: {
          keys: 't',
          description: 'Cambiar al modo texto',
        },
      },
      interact: {
        defaultLabel: 'Ingresar',
        description: 'Interactuar',
        promptTemplates: {
          default: 'Interactuar con {title}',
          inspect: 'Inspeccionar {title}',
          activate: 'Activar {title}',
        },
      },
      helpButton: {
        labelTemplate: 'Abrir menú · Pulsar {shortcut}',
        announcementTemplate:
          'Abra configuración y ayuda. Presione {shortcut} para revisar los controles y consejos de accesibilidad.',
        shortcutFallback: 'H',
      },
      menu: {
        controls: {
          label: 'Controles',
          keyHint: 'C',
          title: 'Controles abiertos (C)',
        },
        text: {
          label: 'Texto',
          keyHint: 'T',
          title: 'Cambiar al modo texto (T)',
        },
        settings: {
          label: 'Ajustes',
          keyHint: 'H',
          title: 'Abrir configuración y ayuda (H)',
        },
      },
      mobileToggle: {
        expandLabel: 'Mostrar todos los controles',
        collapseLabel: 'Ocultar controles adicionales',
        expandAnnouncement:
          'Mostrando la lista completa de controles para reproductores móviles.',
        collapseAnnouncement:
          'Ocultar controles adicionales para mantener la lista compacta.',
      },
    },
    movementLegend: {
      defaultDescription: 'Interactuar',
      labels: {
        keyboard: 'Ingresar',
        pointer: 'Hacer clic',
        touch: 'Grifo',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: 'Presione {label} a {prompt}',
        pointer: '{label} a {prompt}',
        touch: '{label} a {prompt}',
        gamepad: 'Presione {label} a {prompt}',
      },
    },
    customization: {
      heading: 'Personalización',
      description:
        'Ajusta el estilo del maniquí y el equipo complementario para la misión actual.',
      variants: {
        title: 'estilo avatar',
        description: 'Cambia de ropa para el explorador maniquí.',
      },
      accessories: {
        title: 'Accesorios',
        description:
          'Alterna la consola de muñeca o los compañeros de drones holográficos.',
      },
    },
    audioControl: {
      keyHint: 'M',
      groupLabel: 'Controles de audio ambiental',
      toggle: {
        onLabelTemplate: 'Audio: activado · Presione {keyHint} para silenciar',
        offLabelTemplate:
          'Audio: Apagado · Presione {keyHint} para activar el sonido',
        titleTemplate: 'Alternar audio ambiental ({keyHint})',
        announcementOnTemplate:
          'Audio ambiental activado. Presione {keyHint} para alternar.',
        announcementOffTemplate:
          'Audio ambiental apagado. Presione {keyHint} para alternar.',
        pendingAnnouncementTemplate:
          'Cambiar el estado del audio ambiental. Espere por favor…',
      },
      slider: {
        label: 'Volumen ambiental',
        ariaLabel: 'Volumen de audio ambiental',
        hudLabel: 'Control deslizante de volumen de audio ambiental.',
        valueAnnouncementTemplate: 'Volumen de audio ambiental {volume}.',
        mutedAnnouncementTemplate:
          'Audio ambiental silenciado. Volumen establecido en {volume}.',
        mutedValueTemplate: 'Silenciado · {volume}',
        mutedAriaValueTemplate: 'Silenciado ({volume})',
      },
    },
    localeToggle: {
      title: 'Idioma',
      description: 'Cambia el idioma y la dirección del HUD.',
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
      switchingAnnouncementTemplate:
        'Cambiando a la configuración regional {target}…',
      selectedAnnouncementTemplate:
        'Configuración regional {label} seleccionada.',
      failureAnnouncementTemplate:
        'No se puede cambiar a {target}. Permaneciendo en la localidad {current}.',
    },
    tourGuideToggle: {
      labelEnabled: 'Visita guiada en',
      labelDisabled: 'Visita guiada fuera',
      descriptionEnabled:
        'Destaca la siguiente exhibición recomendada en el recorrido inmersivo.',
      descriptionDisabled:
        'Los puntos destacados de las visitas guiadas están ocultos hasta que los vuelves a activar.',
    },
    tourReset: {
      heading: 'Visita guiada',
      resetKey: 'g',
      label: 'Reiniciar visita guiada',
      description:
        'Borre los puntos de interés visitados y vuelva a reproducir la ruta seleccionada.',
      emptyLabel: 'Visita guiada lista',
      emptyDescription:
        'Explore exhibiciones para desbloquear el reinicio de la visita guiada.',
      pendingLabel: 'Restableciendo recorrido…',
      pendingDescription: 'Restableciendo la visita guiada…',
      restartPromptTemplate: 'Presione {key} para reiniciar.',
      guidedTourDescription:
        'Muestre las exhibiciones recomendadas cuando esté inactivo.',
      guidedTourLabelOn: 'Lo más destacado de la visita guiada: On',
      guidedTourLabelOff: 'Puntos destacados de la visita guiada: desactivado',
      toggleAnnouncementOn:
        'Lo más destacado de la visita guiada habilitada. Actívelo para desactivar las recomendaciones.',
      toggleAnnouncementOff:
        'Lo más destacado de la visita guiada está desactivado. Actívelo para habilitar las recomendaciones.',
      toggleTitleOn: 'Desactivar lo más destacado de la visita guiada',
      toggleTitleOff: 'Habilitar visitas guiadas destacadas',
    },
    softwareRendererWarning: {
      fallbackRendererLabel: 'software de renderizado WebGL',
      title: 'Representación de software detectada',
      descriptionTemplate:
        'Chrome utiliza {renderer} en lugar de aceleración de hardware. Basic Render Driver, SwiftShader, WARP y llvmpipe pueden fallar bajo una animación WebGL continua.',
      recommendation:
        'Habilite la aceleración del hardware del navegador para disfrutar de una cartera inmersiva fluida. El modo inmersivo seguro mantiene las capturas de pantalla y la depuración disponibles a una velocidad de fotogramas limitada.',
      continueSafeLabel: 'Continuar en inmersión segura',
      continuousLabel: 'Habilite la inmersión continua de todos modos',
      textModeLabel: 'Usar modo texto',
      reloadSafeLabel: 'Vuelva a cargar esta URL inmersiva segura',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: 'Modo texto · Presione {keyHint}',
      idleDescriptionTemplate: 'Cambiar al portafolio de solo texto',
      idleAnnouncementTemplate:
        'Cambie al portafolio de solo texto. Presione {keyHint} para activar.',
      idleTitleTemplate: 'Cambiar al portafolio de solo texto ({keyHint})',
      pendingLabelTemplate: 'Cambiando al modo texto…',
      pendingAnnouncementTemplate:
        'Cambie al portafolio de solo texto. Cambiando al modo texto…',
      activeLabelTemplate: 'Intente sumergirse nuevamente · Presione {keyHint}',
      activeDescriptionTemplate: 'Regrese al portafolio inmersivo.',
      activeAnnouncementTemplate:
        'Modo texto activo. Presione {keyHint} para volver a intentar la inmersión.',
      errorLabelTemplate: 'Reintentar el modo texto · Presione {keyHint}',
      errorDescriptionTemplate:
        'Error al alternar el modo de texto. Inténtalo de nuevo o utiliza el enlace inmersivo.',
      errorAnnouncementTemplate:
        'Error al alternar el modo de texto. Presione {keyHint} para volver a intentarlo.',
      errorTitleTemplate:
        'Error al alternar el modo de texto. Presione {keyHint} para volver a intentar el modo de texto.',
    },
    poiOverlay: {
      visited: 'Visitado',
      nextHighlight: 'Siguiente destaque',
      prototype: 'Prototipo',
      live: 'En vivo',
      closeDetails: 'Cerrar detalles de PDI',
      relatedCaseStudies: 'Estudios de casos relacionados',
      outcomeFallbackLabel: 'Resultado',
      discoveryAnnouncementTemplate: '{title} descubierto. {summary}',
    },
    narrativeLog: {
      heading: 'Registro de la historia del creador',
      visitedHeading: 'exposiciones visitadas',
      empty:
        'Visite exhibiciones para desbloquear entradas narrativas que relatan la exhibición del creador.',
      defaultVisitedLabel: 'Visitado',
      visitedLabelTemplate: 'Visitado en {time}',
      liveAnnouncementTemplate:
        '{title} agregado al registro de la historia del creador.',
      journey: {
        heading: 'Latidos del viaje',
        empty: 'Explora nuevas exhibiciones para tejer la narración del viaje.',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          'Dentro del {room} {descriptor}, la historia cambia del {fromPoi} al {toPoi}.',
        crossRoomTemplate:
          'Dejando el {fromRoom} {fromDescriptor}, el viaje desemboca en el {toRoom} {toDescriptor} para destacar el {toPoi}.',
        crossSectionTemplate:
          'Al pasar por {direction} el umbral, el camino desemboca en {toRoom} {toDescriptor} para llegar a {toPoi}.',
        fallbackTemplate: 'La narrativa fluye hacia {toPoi}.',
        announcementTemplate: 'Actualización del viaje: {label}: {story}',
        directions: {
          indoors: 'de vuelta adentro',
          outdoors: 'al aire libre',
        },
      },
      rooms: {
        livingRoom: {
          label: 'sala de estar',
          descriptor: 'salón cinematográfico',
          zone: 'interior',
        },
        studio: {
          label: 'estudio',
          descriptor: 'laboratorio de automatización',
          zone: 'interior',
        },
        kitchen: {
          label: 'laboratorio de cocina',
          descriptor: 'ala de robótica culinaria',
          zone: 'interior',
        },
        backyard: {
          label: 'observatorio del patio trasero',
          descriptor: 'jardín iluminado por el crepúsculo',
          zone: 'exterior',
        },
      },
    },
    helpModal: {
      heading: 'Configuración y ayuda',
      description:
        'Ajuste los ajustes preestablecidos de accesibilidad, la calidad de los gráficos, el audio y revise los atajos. Utilice el acceso directo de ayuda (¿H o? predeterminado) para alternar este panel.',
      closeLabel: 'Cerca',
      closeAriaLabel: 'Cerrar ayuda',
      settings: {
        heading: 'Configuración de experiencia',
        description:
          'Ajuste las preferencias de audio, vídeo y accesibilidad. Estos controles permanecen disponibles incluso cuando el menú se cierra mediante atajos de teclado.',
      },
      sections: [
        {
          id: 'movement',
          title: 'Movimiento y cámara',
          items: [
            {
              label: 'WASD/teclas de flecha',
              description: 'Haz rodar el explorador por la casa.',
            },
            {
              label: 'Arrastre del mouse',
              description: 'Panorámica de la cámara isométrica.',
            },
            {
              label: 'rueda de desplazamiento',
              description: 'Ajustar el nivel de zoom.',
            },
            {
              label: 'Mandos táctiles',
              description:
                'Arrastre el pad izquierdo para moverse y el pad derecho para realizar una panorámica.',
            },
            {
              label: 'Pellizco',
              description: 'Zoom en dispositivos táctiles.',
            },
          ],
        },
        {
          id: 'interactions',
          title: 'Interacciones',
          items: [
            {
              label: 'Acércate a puntos de interés brillantes',
              description:
                'Presione la tecla de interacción (Entrar/Espacio/F), toque o haga clic para abrir la superposición de la exhibición.',
            },
            {
              label: 'Q/E o ←/→',
              description:
                'Enfoque cíclico entre puntos de interés con el teclado.',
            },
            {
              label: 't',
              description:
                'Alterna entre el modo inmersivo y el respaldo de texto.',
            },
            {
              label: 'Mayús + L',
              description:
                'Compare la iluminación cinematográfica con el pase de depuración.',
            },
          ],
        },
        {
          id: 'accessibility',
          title: 'Accesibilidad y conmutación por error',
          items: [
            {
              label: 'Bajo rendimiento',
              description:
                'La escena cambia automáticamente al modo de texto por debajo de 30 FPS.',
            },
            {
              label: 'Cambio manual',
              description:
                'Utilice el botón de modo Texto en pantalla o presione T en cualquier momento.',
            },
            {
              label: 'Control deslizante de desenfoque de movimiento',
              description:
                'Ajuste la intensidad del rastro con Configuración → Control de desenfoque de movimiento.',
            },
            {
              label: 'Audio ambiental',
              description: 'Cambie con el botón Audio o presione M.',
            },
          ],
        },
      ],
      announcements: {
        open: 'Se abrió el menú de ayuda. Revisar controles y configuraciones.',
        close: 'Menú de ayuda cerrado.',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Person',
      summary:
        'Mesa de secuencias de comandos automatizada Futuroptimist que une investigaciones, esquemas y borradores listos para la narración para nuevos videos.',
      outcome: {
        label: 'Resultado',
        value:
          'Mantiene los guiones destacados semanales fluyendo desde el proceso de automatización sin formato manual.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: '1,280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: '1,280+',
          },
        },
        {
          label: 'Flujo de trabajo',
          value: 'Suite de edición estilo Resolve · triple pantalla',
        },
        {
          label: 'Enfocar',
          value: 'El ecosistema Futuroptimist avanza',
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
        caption:
          'La pared multimedia Futuroptimist irradia carretes destacados a través de la sala de estar.',
      },
    },
    'tokenplace-studio-cluster': {
      title: 'danielsmith.io',
      summary:
        'Plataforma segura de IA generativa de igual a igual que se ejecuta en una red Raspberry Pi con nodos de servidor y retransmisión cifrados.',
      outcome: {
        label: 'Resultado',
        value:
          'Los scripts de inicio rápido muestran localmente la retransmisión, el servidor y la pila simulada de LLM para realizar pruebas.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'token.place',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Grupo',
          value: '12× Pi 5 nodos en bahías modulares',
        },
        {
          label: 'Red',
          value: 'Fichas efímeras · ráfagas cifradas',
        },
      ],
      links: [
        {
          label: 'Sitio',
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
        'LLM "ángel de la guarda" que prioriza la privacidad y brinda capacitación en seguridad local y se integra con token.place o inferencia fuera de línea.',
      outcome: {
        label: 'Resultado',
        value:
          'Las pilas modulares de ingesta, análisis, notificación y UI se mantienen alineadas a través de interfaces escritas.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gabriel',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Enfocar',
          value: 'Barrido lidar de 360° + heurística local',
        },
        {
          label: 'Cadencia',
          value: 'La alerta roja parpadea cada 1,0 s.',
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
        'Plantilla GitHub y centro de automatización que incluye linting, pruebas, documentos y mensajes Codex para un arranque rápido del repositorio.',
      outcome: {
        label: 'Resultado',
        value:
          'Incluye CI repetible (lint, pruebas, documentos) y bibliotecas de avisos para que los nuevos repositorios comiencen de manera saludable.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'flywheel',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Automatización',
          value:
            'Andamios de CI · mensajes escritos · bucles de control de calidad',
        },
        {
          label: 'Documentos CTA',
          value: 'volante.futuroptimist.dev →',
        },
      ],
      links: [
        {
          label: 'Repositorio Flywheel',
          href: 'https://github.com/futuroptimist/flywheel',
        },
        {
          label: 'Docs',
          href: 'https://flywheel.futuroptimist.dev',
        },
      ],
      narration: {
        caption:
          'El centro cinético Flywheel cobra vida y destaca las indicaciones y herramientas de automatización.',
      },
      interactionPrompt: 'Involucrar sistemas {title}',
    },
    'jobbot-studio-terminal': {
      title: 'Sigma',
      summary:
        'Copiloto de búsqueda de empleo autohospedado con CLI y interfaz de usuario web experimental para incorporar aplicaciones de extensión y seguimiento.',
      outcome: {
        label: 'Resultado',
        value:
          'Los flujos de trabajo de un extremo a otro reflejan documentos y pruebas para que los flujos de contacto con los reclutadores permanezcan cubiertos.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'jobbot3000',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Estado',
          value: 'CLI local con interfaz de usuario web de vista previa',
        },
        {
          label: 'Pila',
          value: 'Node.js 20+ · scripts npm · Vista previa del dramaturgo',
        },
        {
          label: 'Flujos',
          value:
            'Ingestión de alcance de reclutadores y seguimiento del ciclo de vida',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/jobbot3000',
        },
        {
          label: 'Registro de automatización',
          href: 'https://futuroptimist.dev/automation',
        },
      ],
      narration: {
        caption:
          'El terminal holográfico Jobbot transmite telemetría de automatización en superposiciones brillantes.',
      },
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary:
        'Goal y rastreador de misiones que organiza repositorios con LLM agentes, ayudas de análisis y una CLI compatible con pipx.',
      outcome: {
        label: 'Resultado',
        value:
          'Las versiones Alpha mantienen el archivo README, las preguntas frecuentes y la cobertura del modelo de amenazas sincronizados con la suite pytest.',
      },
      metrics: [
        {
          label: 'Estado',
          value: 'Alfa · pipx instalar axel',
        },
        {
          label: 'Análisis de repositorios',
          value:
            'Planificación de misiones a partir de listas de repositorios y escaneos',
        },
        {
          label: 'Docs',
          value:
            'Preguntas frecuentes · problemas conocidos · modelo de amenaza mantenido con pruebas',
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
      title: 'Wove',
      summary:
        'CLI que convierte los datos de contribución del GitHub en modelos OpenSCAD y STL para estantes Gridfinity impresos en 3D.',
      outcome: {
        label: 'Resultado',
        value:
          'Exporta pares SCAD/STL con metadatos para que los estantes impresos reflejen los cronogramas de contribución.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gitshelves',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Material',
          value: 'Bloques compatibles con Gridfinity de 42 mm',
        },
        {
          label: 'Sincronizar',
          value: 'Auto generado a partir de líneas de tiempo GitHub',
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
      title: 'DSPACE',
      summary:
        'Portafolio ortográfico Three.js/WebGL con navegación por teclado y un respaldo de texto resistente para accesibilidad.',
      outcome: {
        label: 'Resultado',
        value:
          'Mantiene la inmersión y las implementaciones de texto alineadas en cada versión.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: '1,280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: '1,280+',
          },
        },
        {
          label: 'Pila',
          value: 'Vite · Three.js · HUD de accesibilidad',
        },
        {
          label: 'Desplegar',
          value: 'CI humo + documentos + puertas de pelusa',
        },
      ],
      links: [
        {
          label: 'Sitio en vivo',
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
        'CLI que ingiere páginas de tareas de Codex y registros de GitHub, redacta secretos y emite resúmenes de Markdown listos para pegar.',
      outcome: {
        label: 'Resultado',
        value:
          'Automatiza la recopilación y el resumen de registros de CI para una rápida transferencia de depuración.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'f2clipboard',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Velocidad',
          value: 'Copie los registros defectuosos en menos de 3 s',
        },
        {
          label: 'Formatos',
          value: 'CLI + portapapeles + salida Markdown',
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
        '"PIN AI" ESP32 que transmite audio pulsar para hablar a Whisper y devuelve TTS en un gabinete OpenSCAD impreso en 3D.',
      outcome: {
        label: 'Resultado',
        value:
          'Incluye firmware, gabinete CAD, exportaciones STL y documentos de ensamblaje actualizados por CI.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sigma',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Hardware',
          value: 'ESP32 · Caja OpenSCAD',
        },
        {
          label: 'Modos',
          value: 'Pulsar para hablar · Susurro + relé TTS',
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
        'Kit de herramientas de código abierto para aprender a tejer y crochet mientras se construye un telar robótico con hardware OpenSCAD.',
      outcome: {
        label: 'Resultado',
        value:
          'Los documentos cubren calculadoras de calibre, exportaciones de planificadores y perfiles de tensión en todos los pesos de hilo.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'wove',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Artesanía',
          value: 'El telar se calibra a partir de mapas de puntadas CAD',
        },
        {
          label: 'Hoja de ruta',
          value: 'Camino hacia los laboratorios de tejido robóticos',
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
        'Pórtico de lanzamiento en el patio trasero para el proyecto privado del cohete DSPACE con señales de cuenta regresiva guiadas por telemetría y un registro de misión público.',
      outcome: {
        label: 'Resultado',
        value:
          'Mantiene notas de secuenciación de cuenta regresiva junto con GitHub y enlaces de registro de misiones mientras el repositorio permanece privado.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'dspace',
            visibility: 'private',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Cuenta atrás',
          value: 'Secuenciación autónoma T-0',
        },
        {
          label: 'Pila',
          value: 'Three.js FX · Audio espacial',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/dspace',
        },
        {
          label: 'Registro de misión',
          href: 'https://futuroptimist.dev/projects/dspace',
        },
      ],
      narration: {
        caption:
          'La plataforma de lanzamiento dSpace crepita con energía de cuenta regresiva al lado del sendero del patio trasero.',
        durationMs: 6000,
      },
      interactionPrompt: 'Iniciar cuenta regresiva {title}',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'Flujo de trabajo de acciones GitHub que cierra de forma masiva solicitudes de extracción obsoletas con vistas previas de prueba y limpieza de ramas opcional.',
      outcome: {
        label: 'Resultado',
        value:
          'El flujo de trabajo con un solo botón documenta las entradas, el modelo de seguridad y las salidas de auditoría en el archivo README.',
      },
      metrics: [
        {
          label: 'estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'pr-reaper',
            format: 'compact',
            template: 'Estrellas {value}',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Barrer',
          value:
            'Cierre masivo de relaciones públicas obsoletas con modo de vista previa',
        },
        {
          label: 'Cadencia',
          value: 'Activadores cron + simulacros manuales',
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
      title: 'Sugarkube',
      summary:
        'Plataforma k3s-on-Raspberry-Pi combinada con una instalación de cubo solar fuera de la red documentada con CAD, imágenes Pi y guías de campo.',
      outcome: {
        label: 'Resultado',
        value:
          'Los documentos paso a paso cubren hardware solar, aprovisionamiento de Pi y asistentes Kubernetes para laboratorios domésticos resilientes.',
      },
      metrics: [
        {
          label: 'Plataforma',
          value:
            'k3s, ayudantes Kubernetes, túneles Cloudflare y notas de riego/inclinación solar',
        },
        {
          label: 'Hardware',
          value:
            'Cubo solar CAD, placas portadoras Pi, documentación electrónica',
        },
        {
          label: 'Guías',
          value:
            'Guías de campo para imágenes Pi y aprovisionamiento sin cabeza',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/sugarkube',
        },
        {
          label: 'Registro de invernadero',
          href: 'https://futuroptimist.dev/projects/sugarkube',
        },
      ],
      narration: {
        caption:
          'El invernadero Sugarkube sincroniza las luces de cultivo suaves y el ambiente del estanque koi.',
        durationMs: 6500,
      },
    },
  },
};
