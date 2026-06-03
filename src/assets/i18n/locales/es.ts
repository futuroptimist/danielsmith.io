import type { LocaleOverrides } from '../types';

export const ES_OVERRIDES: LocaleOverrides = {
  locale: 'es',
  site: {
    name: 'Portafolio inmersivo de Daniel Smith',
    structuredData: {
      description:
        'Exhibiciones interactivas dentro de la experiencia de portafolio inmersivo de Daniel Smith.',
      listNameTemplate: 'Exhibiciones de {siteName}',
      textCollectionNameTemplate: 'Portafolio en texto de {siteName}',
      textCollectionDescription:
        'Resúmenes rápidos de cada exhibición inmersiva, optimizados para lectura accesible y rastreadores.',
      immersiveActionName: 'Abrir modo inmersivo',
      properties: {
        labels: {
          category: 'Categoría',
          outcome: 'Resultado',
          status: 'Estado',
        },
        categories: { project: 'Proyecto', environment: 'Entorno' },
        statuses: { prototype: 'Prototipo', live: 'En vivo' },
      },
    },
    textFallback: {
      heading: 'Explora los destacados',
      intro:
        'El portafolio en texto mantiene cada exhibición accesible con resúmenes, resultados y métricas mientras el modo inmersivo no está disponible.',
      roomHeadingTemplate: 'Exhibiciones de {roomName}',
      metricsHeading: 'Métricas clave',
      linksHeading: 'Lecturas relacionadas',
      about: {
        heading: 'Acerca de Daniel',
        summary:
          'Ingeniero de confiabilidad de sitios con seis años en YouTube, enfocado en automatización, observabilidad y lanzamientos estables.',
        highlights: [
          'Construyó plataformas para desarrolladores y herramientas agénticas para acelerar entregas seguras.',
          'Mentor de equipos en SLO, respuesta a incidentes y revisiones de confiabilidad.',
          'Explora narrativa inmersiva con WebGL que siempre conserva una alternativa de texto accesible.',
        ],
      },
      skills: {
        heading: 'Habilidades de un vistazo',
        items: [
          {
            label: 'Lenguajes',
            value:
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C',
          },
          {
            label: 'Infraestructura y herramientas',
            value:
              'Kubernetes, Docker, Google Cloud (BigQuery), GitHub Actions, WebGL/Three.js, React/Next.js, Astro',
          },
          {
            label: 'Prácticas',
            value:
              'SRE (SLO, respuesta a incidentes, capacidad), observabilidad, CI/CD, pruebas, documentación de prompts y programación agéntica',
          },
        ],
      },
      timeline: {
        heading: 'Trayectoria laboral',
        entries: [
          {
            period: 'sep. 2018 — may. 2025',
            location: 'San Bruno, California',
            role: 'Site Reliability Engineer (L4)',
            org: 'YouTube (Google)',
            summary:
              'Cubrió guardias en varias superficies, automatizó monitoreo en Python/Go/SQL/C++ y guió revisiones de confiabilidad para liderazgo.',
          },
          {
            period: 'ene. 2017 — sep. 2018',
            location: 'Stennis Space Center, Misisipi',
            role: 'Ingeniero de software',
            org: 'Naval Research Laboratory',
            summary:
              'Entregó aplicaciones C++/Qt de procesamiento de datos y demostraciones remotas dentro de sprints Scrum.',
          },
          {
            period: 'mar. 2014 — dic. 2016',
            location: 'Hattiesburg, Misisipi',
            role: 'Desarrollador de software',
            org: 'The University of Southern Mississippi',
            summary:
              'Construyó frameworks Objective-C para contenido en vivo en apps iOS universitarias.',
          },
        ],
      },
      contact: {
        heading: 'Contacto',
        emailLabel: 'Email',
        resumeLabel: 'Currículum (PDF)',
      },
      recoveryCta: {
        title: '¿Listo para la sala completa?',
        description:
          'Borra la preferencia de texto guardada y vuelve a abrir el portafolio inmersivo desde aquí.',
        actionLabel: 'Probar el modo inmersivo otra vez',
        ariaLabel:
          'Probar el modo inmersivo otra vez y borrar la preferencia guardada de modo texto',
      },
      actions: {
        immersiveLink: 'Probar el modo inmersivo otra vez',
        debugImmersiveLink: 'Depuración: forzar modo inmersivo',
        clearPreferenceButton: 'Borrar preferencia de modo guardada',
        clearPreferenceSuccess: 'Preferencia de modo guardada borrada',
        resumeLink: 'Descargar el currículum más reciente',
        githubLink: 'Explorar proyectos en GitHub',
      },
      reasonHeadings: {
        manual: 'Modo solo texto activado',
        'webgl-unsupported':
          'El modo inmersivo no está disponible en este dispositivo',
        'low-memory': 'Dispositivo con poca memoria detectado',
        'low-end-device': 'Dispositivo ligero detectado',
        'low-performance': 'Alternativa por rendimiento activa',
        'immersive-init-error': 'La escena inmersiva encontró un error',
        'automated-client': 'Cliente automatizado detectado',
        'data-saver': 'Modo de ahorro de datos activado',
        'console-error': 'Errores de ejecución detectados',
      },
      reasonDescriptions: {
        manual:
          'Solicitaste la vista ligera del portafolio. La escena inmersiva queda a un clic.',
        'webgl-unsupported':
          'Tu navegador o dispositivo no pudo iniciar el renderizador WebGL. Disfruta el resumen rápido en texto mientras mantenemos ligera la escena inmersiva.',
        'low-memory':
          'Tu dispositivo informó memoria limitada, así que abrimos el recorrido ligero en texto para mantener todo fluido.',
        'low-end-device':
          'Detectamos un perfil de dispositivo ligero, así que cargamos el recorrido rápido en texto para mantener la navegación responsiva.',
        'low-performance':
          'Detectamos tasas de cuadros bajas sostenidas, así que cambiamos al recorrido en texto para mantener la experiencia ágil.',
        'immersive-init-error':
          'Algo falló al iniciar la escena inmersiva, así que te mostramos el resumen en texto.',
        'automated-client':
          'Detectamos un cliente automatizado, así que mostramos el portafolio de texto de carga rápida para vistas previas y rastreadores.',
        'console-error':
          'Detectamos un error de ejecución y cambiamos al recorrido en texto resiliente mientras la escena inmersiva se recupera.',
        'data-saver':
          'Tu navegador pidió una experiencia de ahorro de datos, así que abrimos el recorrido ligero en texto para reducir ancho de banda y mantener los destacados accesibles.',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Controles',
      items: {
        keyboardMove: { keys: 'WASD / flechas', description: 'Mover' },
        pointerDrag: {
          keys: 'Botón izquierdo del mouse',
          description: 'Arrastrar para desplazar',
        },
        pointerZoom: { keys: 'Rueda del mouse', description: 'Zoom' },
        touchDrag: {
          keys: 'Tocar',
          description:
            'Arrastra la mitad izquierda para moverte y la derecha para desplazar',
        },
        touchPinch: { keys: 'Pellizcar', description: 'Zoom' },
        cyclePoi: { keys: 'Q / E', description: 'Cambiar POI' },
        toggleTextMode: { keys: 'T', description: 'Cambiar a modo texto' },
      },
      interact: {
        defaultLabel: 'Entrar',
        description: 'Interactuar',
        promptTemplates: {
          default: 'Interactuar con {title}',
          inspect: 'Inspeccionar {title}',
          activate: 'Activar {title}',
        },
      },
      helpButton: {
        labelTemplate: 'Abrir menú · Pulsa {shortcut}',
        announcementTemplate:
          'Abrir ajustes y ayuda. Pulsa {shortcut} para revisar controles y consejos de accesibilidad.',
        shortcutFallback: 'H',
      },
      menu: {
        controls: {
          label: 'Controles',
          keyHint: 'C',
          title: 'Abrir controles (C)',
        },
        text: {
          label: 'Texto',
          keyHint: 'T',
          title: 'Cambiar a modo texto (T)',
        },
        settings: {
          label: 'Ajustes',
          keyHint: 'H',
          title: 'Abrir ajustes y ayuda (H)',
        },
      },
      mobileToggle: {
        expandLabel: 'Mostrar todos los controles',
        collapseLabel: 'Ocultar controles extra',
        expandAnnouncement:
          'Mostrando la lista completa de controles para jugadores móviles.',
        collapseAnnouncement:
          'Ocultando controles extra para mantener la lista compacta.',
      },
    },
    movementLegend: {
      defaultDescription: 'Interactuar',
      labels: {
        keyboard: 'Entrar',
        pointer: 'Clic',
        touch: 'Toque',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: 'Pulsa {label} para {prompt}',
        pointer: '{label} para {prompt}',
        touch: '{label} para {prompt}',
        gamepad: 'Pulsa {label} para {prompt}',
      },
    },
    customization: {
      heading: 'Personalización',
      description:
        'Ajusta el estilo del maniquí y el equipo acompañante para la misión actual.',
      variants: {
        title: 'Estilo del avatar',
        description: 'Cambia los atuendos del explorador maniquí.',
      },
      accessories: {
        title: 'Accesorios',
        description:
          'Activa la consola de muñeca o los drones holográficos acompañantes.',
      },
    },
    audioControl: {
      groupLabel: 'Controles de audio ambiental',
      toggle: {
        onLabelTemplate: 'Audio: activado · Pulsa {keyHint} para silenciar',
        offLabelTemplate:
          'Audio: desactivado · Pulsa {keyHint} para activar sonido',
        titleTemplate: 'Alternar audio ambiental ({keyHint})',
        announcementOnTemplate:
          'Audio ambiental activado. Pulsa {keyHint} para alternar.',
        announcementOffTemplate:
          'Audio ambiental desactivado. Pulsa {keyHint} para alternar.',
        pendingAnnouncementTemplate:
          'Cambiando el estado del audio ambiental. Espera…',
      },
      slider: {
        label: 'Volumen ambiental',
        ariaLabel: 'Volumen del audio ambiental',
        hudLabel: 'Control de volumen del audio ambiental.',
        valueAnnouncementTemplate: 'Volumen del audio ambiental {volume}.',
        mutedAnnouncementTemplate:
          'Audio ambiental silenciado. Volumen establecido en {volume}.',
        mutedValueTemplate: 'Silenciado · {volume}',
        mutedAriaValueTemplate: 'Silenciado ({volume})',
      },
    },
    localeToggle: {
      title: 'Idioma',
      description: 'Cambia el idioma y la dirección del HUD.',
      switchingAnnouncementTemplate: 'Cambiando al idioma {target}…',
      selectedAnnouncementTemplate: 'Idioma {label} seleccionado.',
      failureAnnouncementTemplate:
        'No se pudo cambiar a {target}. Se mantiene {current}.',
    },
    tourGuideToggle: {
      labelEnabled: 'Recorrido guiado activado',
      labelDisabled: 'Recorrido guiado desactivado',
      descriptionEnabled:
        'Resalta la siguiente exhibición recomendada del recorrido inmersivo.',
      descriptionDisabled:
        'Los destacados del recorrido guiado quedan ocultos hasta que los vuelvas a activar.',
    },
    tourReset: {
      heading: 'Recorrido guiado',
      label: 'Reiniciar recorrido guiado',
      description: 'Borra los POI visitados y repite la ruta curada.',
      emptyLabel: 'Recorrido guiado listo',
      emptyDescription:
        'Explora exhibiciones para desbloquear el reinicio del recorrido guiado.',
      pendingLabel: 'Reiniciando recorrido…',
      pendingDescription: 'Reiniciando el recorrido guiado…',
      restartPromptTemplate: 'Pulsa {key} para reiniciar.',
      guidedTourDescription:
        'Muestra exhibiciones recomendadas cuando estás inactivo.',
      guidedTourLabelOn: 'Destacados del recorrido guiado: activados',
      guidedTourLabelOff: 'Destacados del recorrido guiado: desactivados',
      toggleAnnouncementOn:
        'Destacados del recorrido guiado activados. Activa para desactivar recomendaciones.',
      toggleAnnouncementOff:
        'Destacados del recorrido guiado desactivados. Activa para activar recomendaciones.',
      toggleTitleOn: 'Desactivar destacados del recorrido guiado',
      toggleTitleOff: 'Activar destacados del recorrido guiado',
    },
    softwareRendererWarning: {
      fallbackRendererLabel: 'renderizador WebGL por software',
      title: 'Renderizado por software detectado',
      descriptionTemplate:
        'Chrome está usando {renderer} en lugar de aceleración por hardware. Basic Render Driver, SwiftShader, WARP y llvmpipe pueden fallar con animación WebGL continua.',
      recommendation:
        'Activa la aceleración por hardware del navegador para el portafolio inmersivo fluido. El modo inmersivo seguro mantiene capturas y depuración disponibles con una tasa de cuadros limitada.',
      continueSafeLabel: 'Continuar en modo inmersivo seguro',
      continuousLabel: 'Activar modo inmersivo continuo de todos modos',
      textModeLabel: 'Usar modo texto',
      reloadSafeLabel: 'Recargar esta URL inmersiva segura',
    },
    modeToggle: {
      idleLabelTemplate: 'Modo texto · Pulsa {keyHint}',
      idleDescriptionTemplate: 'Cambiar al portafolio solo texto',
      idleAnnouncementTemplate:
        'Cambiar al portafolio solo texto. Pulsa {keyHint} para activar.',
      idleTitleTemplate: 'Cambiar al portafolio solo texto ({keyHint})',
      pendingLabelTemplate: 'Cambiando a modo texto…',
      pendingAnnouncementTemplate:
        'Cambiar al portafolio solo texto. Cambiando a modo texto…',
      activeLabelTemplate: 'Probar inmersivo otra vez · Pulsa {keyHint}',
      activeDescriptionTemplate: 'Volver al portafolio inmersivo.',
      activeAnnouncementTemplate:
        'Modo texto activo. Pulsa {keyHint} para probar el modo inmersivo otra vez.',
      errorLabelTemplate: 'Reintentar modo texto · Pulsa {keyHint}',
      errorDescriptionTemplate:
        'Falló el cambio de modo texto. Inténtalo otra vez o usa el enlace inmersivo.',
      errorAnnouncementTemplate:
        'Falló el cambio de modo texto. Pulsa {keyHint} para reintentar.',
      errorTitleTemplate:
        'Falló el cambio de modo texto. Pulsa {keyHint} para reintentar el modo texto.',
    },
    poiOverlay: {
      visited: 'Visitado',
      nextHighlight: 'Siguiente destacado',
      prototype: 'Prototipo',
      live: 'En vivo',
      closeDetails: 'Cerrar detalles del POI',
      relatedCaseStudies: 'Casos relacionados',
      outcomeFallbackLabel: 'Resultado',
      discoveryAnnouncementTemplate: '{title} descubierto. {summary}',
    },
    narrativeLog: {
      heading: 'Registro de historia del creador',
      visitedHeading: 'Exhibiciones visitadas',
      empty:
        'Visita exhibiciones para desbloquear entradas narrativas sobre la muestra del creador.',
      defaultVisitedLabel: 'Visitado',
      visitedLabelTemplate: 'Visitado a las {time}',
      liveAnnouncementTemplate:
        '{title} se añadió al registro de historia del creador.',
      journey: {
        heading: 'Momentos del recorrido',
        empty:
          'Explora nuevas exhibiciones para tejer la narración del recorrido.',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          'Dentro de {room}, en {descriptor}, la historia pasa de {fromPoi} hacia {toPoi}.',
        crossRoomTemplate:
          'Al salir de {fromRoom}, {fromDescriptor}, el recorrido entra en {toRoom}, {toDescriptor}, para destacar {toPoi}.',
        crossSectionTemplate:
          'Al cruzar el umbral {direction}, el camino fluye hacia {toRoom}, {toDescriptor}, para llegar a {toPoi}.',
        fallbackTemplate: 'La narrativa avanza hacia {toPoi}.',
        announcementTemplate: 'Actualización del recorrido — {label}: {story}',
        directions: { indoors: 'de vuelta adentro', outdoors: 'hacia afuera' },
      },
      rooms: {
        livingRoom: { label: 'sala', descriptor: 'salón cinematográfico' },
        studio: {
          label: 'estudio',
          descriptor: 'laboratorio de automatización',
        },
        kitchen: {
          label: 'laboratorio de cocina',
          descriptor: 'ala de robótica culinaria',
        },
        backyard: {
          label: 'observatorio del patio',
          descriptor: 'jardín al atardecer',
        },
      },
    },
    helpModal: {
      heading: 'Ajustes y ayuda',
      description:
        'Ajusta preajustes de accesibilidad, calidad gráfica, audio y revisa atajos. Usa el atajo de ayuda (H o ? por defecto) para alternar este panel.',
      closeLabel: 'Cerrar',
      closeAriaLabel: 'Cerrar ayuda',
      settings: {
        heading: 'Ajustes de experiencia',
        description:
          'Ajusta preferencias de audio, video y accesibilidad. Estos controles siguen disponibles incluso cuando el menú se cierra con atajos de teclado.',
      },
      sections: [
        {
          id: 'movement',
          title: 'Movimiento y cámara',
          items: [
            {
              label: 'WASD / flechas',
              description: 'Mueve el explorador por la casa.',
            },
            {
              label: 'Arrastrar mouse',
              description: 'Desplaza la cámara isométrica.',
            },
            { label: 'Rueda', description: 'Ajusta el zoom.' },
            {
              label: 'Joysticks táctiles',
              description:
                'Arrastra el pad izquierdo para moverte y el derecho para desplazar.',
            },
            {
              label: 'Pellizcar',
              description: 'Haz zoom en dispositivos táctiles.',
            },
          ],
        },
        {
          id: 'interactions',
          title: 'Interacciones',
          items: [
            {
              label: 'Acércate a POI brillantes',
              description:
                'Pulsa tu tecla de interacción (Enter/Space/F), toca o haz clic para abrir la superposición de exhibición.',
            },
            {
              label: 'Q / E o ← / →',
              description:
                'Cambia el foco entre puntos de interés con el teclado.',
            },
            {
              label: 'T',
              description:
                'Alterna entre modo inmersivo y alternativa en texto.',
            },
            {
              label: 'Shift + L',
              description:
                'Compara la iluminación cinematográfica con el pase de depuración.',
            },
          ],
        },
        {
          id: 'accessibility',
          title: 'Accesibilidad y recuperación',
          items: [
            {
              label: 'Bajo rendimiento',
              description:
                'La escena cambia automáticamente a modo texto por debajo de 30 FPS.',
            },
            {
              label: 'Cambio manual',
              description:
                'Usa el botón Modo texto en pantalla o pulsa T en cualquier momento.',
            },
            {
              label: 'Deslizador de desenfoque de movimiento',
              description:
                'Ajusta la fuerza de las estelas en Ajustes → Desenfoque de movimiento.',
            },
            {
              label: 'Audio ambiental',
              description: 'Alterna con el botón Audio o pulsa M.',
            },
          ],
        },
      ],
      announcements: {
        open: 'Menú de ayuda abierto. Revisa controles y ajustes.',
        close: 'Menú de ayuda cerrado.',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist',
      summary:
        'Mesa automatizada de guiones de Futuroptimist que une investigación, esquemas y borradores listos para narración para nuevos videos.',
      outcome: {
        label: 'Resultado',
        value:
          'Convierte investigación creativa en un flujo reutilizable de guiones.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: '1,280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} estrellas',
            fallback: '1,280+',
          },
        },
        {
          label: 'Flujo',
          value: 'Suite de edición estilo Resolve · pantalla triple',
        },
        {
          label: 'Enfoque',
          value: 'Reels del ecosistema Futuroptimist en progreso',
        },
      ],
      narration: {
        caption:
          'La TV de la sala ilumina la línea de tiempo de guiones de Futuroptimist.',
      },
      interactionPrompt: 'Inspeccionar {title}',
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary:
        'Intercambio de tokens con cifrado de extremo a extremo y relay ciego para compartir textos sensibles de forma segura.',
      outcome: {
        label: 'Resultado',
        value:
          'Mantiene el relay limitado a texto cifrado y metadatos de enrutamiento seguros.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'token.place',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        { label: 'Seguridad', value: 'E2EE con relay ciego' },
        {
          label: 'Interfaz',
          value: 'Tokens de un solo uso · expiración rápida',
        },
      ],
      interactionPrompt: 'Abrir {title}',
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary:
        'Centinela de trabajo local que observa cambios en el repositorio, ejecuta comprobaciones y mantiene a los agentes alineados.',
      outcome: {
        label: 'Resultado',
        value:
          'Reduce la deriva de automatización con guardas de estado y comandos repetibles.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'Gabriel',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        { label: 'Guardas', value: 'Revisiones de git, pruebas y secretos' },
        {
          label: 'Bucle',
          value: 'Avisos para cambios locales y tareas pendientes',
        },
      ],
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary:
        'Suite operativa estilo Flywheel para convertir tickets, prompts y pruebas en ciclos de entrega más seguros.',
      outcome: {
        label: 'Resultado',
        value:
          'Estandariza flujos de trabajo de agentes con documentación, comprobaciones y paquetes de revisión.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'flywheel',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        { label: 'Sistema', value: 'Prompts → parches → verificación' },
        {
          label: 'Salida',
          value: 'Runbooks y artefactos listos para revisión',
        },
      ],
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000',
      summary:
        'Terminal de búsqueda laboral que adapta currículums, rastrea solicitudes y prepara material de entrevista.',
      outcome: {
        label: 'Resultado',
        value:
          'Reúne investigación, cartas y seguimiento en un flujo reproducible.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'jobbot3000',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        { label: 'Pipeline', value: 'Leads → ajuste → seguimiento' },
        {
          label: 'Formato',
          value: 'Docs de prompts y exportaciones de currículum',
        },
      ],
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary:
        'Tracker liviano para mantener hábitos, tareas y señales personales visibles sin ceremonias pesadas.',
      outcome: {
        label: 'Resultado',
        value: 'Convierte pequeñas comprobaciones en un tablero accionable.',
      },
      metrics: [
        { label: 'Ritmo', value: 'Registros rápidos y revisión diaria' },
        { label: 'Superficie', value: 'CLI y vistas web mínimas' },
        { label: 'Meta', value: 'Menos fricción, más continuidad' },
      ],
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves',
      summary:
        'Biblioteca visual de repositorios que organiza proyectos como estantes navegables con contexto y enlaces.',
      outcome: {
        label: 'Resultado',
        value:
          'Hace que una cartera de repositorios grande sea más fácil de explorar.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gitshelves',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Metáfora',
          value: 'Estantes de proyectos con fichas de contexto',
        },
        { label: 'Uso', value: 'Exploración y revisión de portafolio' },
      ],
    },
    'danielsmith-portfolio-table': {
      title: 'danielsmith.io',
      summary:
        'Este portafolio inmersivo en Three.js con alternativa de texto accesible, datos estructurados y controles reactivos al idioma.',
      outcome: {
        label: 'Resultado',
        value:
          'Equilibra narrativa WebGL con accesibilidad, SEO y recuperación robusta.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        { label: 'Stack', value: 'Vite · Three.js · TypeScript' },
        {
          label: 'Accesibilidad',
          value: 'Alternativa de texto, teclado y datos estructurados',
        },
      ],
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary:
        'Herramienta CLI que copia registros fallidos y contexto de pruebas al portapapeles con salida Markdown limpia.',
      outcome: {
        label: 'Resultado',
        value: 'Acelera informes de fallos y bucles de depuración.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'f2clipboard',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        { label: 'Velocidad', value: 'Copiar logs fallidos en menos de 3 s' },
        { label: 'Formatos', value: 'CLI + portapapeles + salida Markdown' },
      ],
    },
    'sigma-kitchen-workbench': {
      title: 'Sigma',
      summary:
        '“Pin de IA” ESP32 que transmite audio push-to-talk a Whisper y devuelve TTS en una carcasa OpenSCAD impresa en 3D.',
      outcome: {
        label: 'Resultado',
        value:
          'Incluye firmware, CAD de carcasa, exportaciones STL y docs de montaje actualizados por CI.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sigma',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        { label: 'Hardware', value: 'ESP32 · carcasa OpenSCAD' },
        { label: 'Modos', value: 'Push-to-talk · relay Whisper + TTS' },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary:
        'Kit open source para aprender punto y crochet mientras avanza hacia un telar robótico con hardware OpenSCAD.',
      outcome: {
        label: 'Resultado',
        value:
          'La documentación cubre calculadoras de muestra, exportaciones de plan y perfiles de tensión.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'wove',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Artesanía',
          value: 'El telar calibra desde mapas CAD de puntadas',
        },
        {
          label: 'Hoja de ruta',
          value: 'Camino hacia laboratorios de tejido robótico',
        },
      ],
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary:
        'Pórtico de lanzamiento de patio para el proyecto privado de cohete DSPACE, con cuenta regresiva guiada por telemetría y bitácora pública.',
      outcome: {
        label: 'Resultado',
        value:
          'Mantiene notas de secuencia de cuenta regresiva junto a enlaces de GitHub y bitácora mientras el repo permanece privado.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'dspace',
            visibility: 'private',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        { label: 'Cuenta regresiva', value: 'Secuencia autónoma T-0' },
        { label: 'Stack', value: 'FX Three.js · audio espacial' },
      ],
      narration: {
        caption:
          'La plataforma DSPACE crepita con energía de cuenta regresiva junto al sendero del patio.',
      },
      interactionPrompt: 'Iniciar cuenta regresiva de {title}',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'Workflow de GitHub Actions que cierra pull requests obsoletas en lote con previsualizaciones dry-run y limpieza opcional de ramas.',
      outcome: {
        label: 'Resultado',
        value:
          'Un workflow de un botón documenta entradas, modelo de seguridad y salidas de auditoría en el README.',
      },
      metrics: [
        {
          label: 'Estrellas',
          value: 'Sincronizando desde GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'pr-reaper',
            format: 'compact',
            template: '{value} estrellas',
            fallback: 'Sincronizando desde GitHub…',
          },
        },
        {
          label: 'Barrido',
          value: 'Cierre masivo de PR obsoletas con modo de vista previa',
        },
        { label: 'Cadencia', value: 'Cron + dry-runs manuales' },
      ],
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube',
      summary:
        'Plataforma k3s en Raspberry Pi combinada con un cubo solar off-grid, documentada con CAD, imágenes Pi y guías de campo.',
      outcome: {
        label: 'Resultado',
        value:
          'Docs paso a paso cubren hardware solar, provisión de Pi y helpers de Kubernetes para homelabs resilientes.',
      },
      metrics: [
        {
          label: 'Plataforma',
          value:
            'k3s, helpers de Kubernetes, túneles Cloudflare y notas de inclinación/riego solar',
        },
        {
          label: 'Hardware',
          value: 'CAD del cubo solar, placas portadoras Pi y docs electrónicos',
        },
        {
          label: 'Guías',
          value: 'Guías de campo para imágenes Pi y provisión headless',
        },
      ],
      narration: {
        caption:
          'El invernadero Sugarkube sincroniza luces suaves de cultivo y ambiente de estanque koi.',
      },
    },
  },
};
