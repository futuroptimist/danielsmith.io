import { buildLatinLocaleOverrides } from './latinLocaleOverrides';

export const ES_OVERRIDES = buildLatinLocaleOverrides({
  locale: 'es',
  siteName: 'Portafolio inmersivo de Daniel Smith',
  nativeLabel: 'Español',
  strings: {
    controls: 'Controles',
    settingsHelp: 'Ajustes y ayuda',
    language: 'Idioma',
    languageDescription: 'Cambia el idioma y la dirección del HUD.',
    switching: 'Cambiando a {target}…',
    selected: '{label} seleccionado.',
    failure: 'No se pudo cambiar a {target}. Se mantiene {current}.',
    textHeading: 'Explora los destacados',
    textIntro:
      'El portafolio de texto mantiene cada exhibición accesible con resúmenes, resultados y métricas mientras el modo inmersivo no está disponible.',
    recoveryTitle: '¿Listo para la sala completa?',
    recoveryDescription:
      'Borra la preferencia de texto guardada y relanza el portafolio inmersivo desde aquí.',
    recoveryAction: 'Probar inmersivo otra vez',
    recoveryAria:
      'Probar el modo inmersivo otra vez y borrar la preferencia de modo texto guardada',
    metrics: 'Métricas clave',
    links: 'Lecturas relacionadas',
    outcome: 'Resultado',
    stars: 'Estrellas',
    syncing: 'Sincronizando desde GitHub…',
    discovered: '{title} descubierto. {summary}',
    closePoi: 'Cerrar detalles del POI',
    nextHighlight: 'Siguiente destacado',
    related: 'Casos relacionados',
    prototype: 'Prototipo',
    live: 'En vivo',
    textMode: 'Cambiar a modo texto',
    tryImmersive: 'Probar inmersivo otra vez',
    guidedTour: 'Visita guiada',
    guidedTourOn: 'Visita guiada activada',
    guidedTourOff: 'Visita guiada desactivada',
    narrationOn: 'Narración: activada',
    narrationOff: 'Narración: desactivada',
    narrationDescriptionOn:
      'Se muestran ventanas y subtítulos de narración. Activa para ocultarlos.',
    narrationDescriptionOff:
      'Las ventanas y subtítulos de narración están ocultos hasta que los actives.',
    captionLabel: 'Subtítulo',
    narrationLabel: 'Narración',
    dismissCaption: 'Cerrar subtítulo',
    dismissNarration: 'Cerrar narración',
    audioOn: 'Audio: activado',
    audioOff: 'Audio: desactivado',
  },
  poi: {
    futuroptimist: {
      summary:
        'Mesa automatizada de guiones de Futuroptimist que une investigación, esquemas y borradores listos para narración.',
      outcome:
        'Mantiene fluyendo los guiones semanales desde la canalización de automatización sin formato manual.',
      metrics: [
        'Flujo',
        'Suite de edición estilo Resolve · triple pantalla',
        'Enfoque',
        'Reels del ecosistema Futuroptimist en progreso',
      ],
    },
    tokenplace: {
      summary:
        'Plataforma segura de IA generativa peer-to-peer con rutas de relay y nodo de cómputo para compartir capacidad ociosa como bien público.',
      outcome:
        'La guía rápida cubre relay Python, servidor de cómputo, Docker Compose, pruebas y guardas E2EE de API v1.',
      metrics: [
        'Clúster',
        'Entrypoints Python relay.py y server.py',
        'Red',
        'Línea base API v1 con E2EE ciego al relay',
      ],
    },
    gabriel: {
      summary:
        'LLM “ángel guardián” open source centrado en consejos de seguridad privados, locales y monitoreo asistido opcional.',
      outcome:
        'El README enfatiza consentimiento, inferencia local, conocimiento del entorno personal y coaching accionable.',
      metrics: [
        'Enfoque',
        'Coaching de seguridad digital con privacidad primero',
        'Cadencia',
        'FAQ y documentación en el repositorio',
      ],
    },
    flywheel: {
      summary:
        'Boilerplate y CLI opinados para CI reproducible, calidad de código, docs, prompts y auditorías de repos.',
      outcome:
        'Ofrece comandos init/update, checks, docs de prompts de Codex, auditorías y sugerencias dry-run.',
      metrics: [
        'Automatización',
        'CLI init/update · checks · docs de prompts',
        'CAD',
        'Soporte, eje, adaptador y docs de física',
      ],
    },
    jobbot: {
      summary:
        'Copiloto open source autoalojado de búsqueda laboral con interfaz web local experimental y setup documentado.',
      outcome:
        'El README advierte que la UI web es solo local mientras las docs cubren setup, arquitectura, configuración y pruebas.',
      metrics: [
        'Estado',
        'Copiloto autoalojado con vista web local',
        'Stack',
        'Node.js 20+ · scripts npm',
        'Flujos',
        'Advertencia local sobre secretos y PII',
      ],
    },
    axel: {
      summary:
        'Rastreador de metas y quests que organiza repos con LLMs agentic, analítica y una CLI amigable con pipx.',
      outcome:
        'Las versiones alfa mantienen README, FAQ y modelo de amenazas sincronizados con pytest.',
      metrics: [
        'Estado',
        'Alfa · pipx install axel',
        'Analítica',
        'Planificación de quests desde listas de repos',
        'Docs',
        'FAQ · problemas conocidos · modelo de amenazas con pruebas',
      ],
    },
    gitshelves: {
      summary:
        'CLI que convierte contribuciones de GitHub en modelos OpenSCAD y STL para estantes Gridfinity impresos en 3D.',
      outcome:
        'Exporta pares SCAD/STL con metadatos para que los estantes reflejen líneas de tiempo de contribuciones.',
      metrics: [
        'Material',
        'Bloques compatibles con Gridfinity de 42 mm',
        'Sincronía',
        'Generado desde líneas de tiempo de GitHub',
      ],
    },
    portfolio: {
      summary:
        'Portafolio ortográfico Three.js/WebGL con navegación por teclado y fallback de texto resistente para accesibilidad.',
      outcome:
        'Mantiene alineados los despliegues inmersivo y de texto en cada release.',
      metrics: [
        'Stack',
        'Vite · Three.js · HUD accesible',
        'Despliegue',
        'CI smoke + docs + puertas lint',
      ],
    },
    f2clipboard: {
      summary:
        'CLI que ingesta páginas de tareas Codex y logs de GitHub, redacta secretos y emite resúmenes Markdown listos para pegar.',
      outcome:
        'Automatiza la recolección y síntesis de logs CI para traspasos de depuración rápidos.',
      metrics: [
        'Velocidad',
        'Codex task → checks de PR GitHub → Markdown',
        'Formatos',
        'Redacción de secretos antes de resumir o emitir',
      ],
    },
    sigma: {
      summary:
        'Pin de IA ESP32 que transmite audio push-to-talk a Whisper y devuelve TTS en una carcasa OpenSCAD impresa en 3D.',
      outcome:
        'Incluye firmware, CAD de carcasa, exportaciones STL y docs de montaje mantenidos por CI.',
      metrics: [
        'Hardware',
        'ESP32 · carcasa OpenSCAD',
        'Modos',
        'Push-to-talk · relay Whisper + TTS',
      ],
    },
    wove: {
      summary:
        'Toolkit open source para aprender punto y crochet mientras avanza hacia un telar robótico con hardware OpenSCAD.',
      outcome:
        'Las docs cubren calculadoras de muestra, exportaciones de planificador y perfiles de tensión por peso de hilo.',
      metrics: [
        'Oficio',
        'El telar calibra desde mapas de puntadas CAD',
        'Ruta',
        'Camino hacia laboratorios de tejido robótico',
      ],
    },
    dspace: {
      summary:
        'Exhibición DSPACE para el juego web idle Democratized Space, enfocada en recursos, quests, exploración y lanzamientos a órbita.',
      outcome:
        'Enlaza el repositorio público democratizedspace/dspace y la documentación oficial, sin bitácoras no verificadas.',
      metrics: [
        'Juego',
        'Gestión de recursos · quests · exploración',
        'Docs',
        'Docs públicos y guía de desarrollo',
      ],
    },
    prReaper: {
      summary:
        'Workflow de GitHub Actions que cierra PR obsoletos en lote con previsualizaciones dry-run y limpieza opcional de ramas.',
      outcome:
        'El workflow de un botón documenta entradas, modelo de seguridad y salidas de auditoría en el README.',
      metrics: [
        'Barrido',
        'Cierre masivo de PR obsoletos con modo previo',
        'Cadencia',
        'Cron + dry-runs manuales',
      ],
    },
    sugarkube: {
      summary:
        'Plataforma k3s en Raspberry Pi con cubo solar off-grid documentada con CAD, imágenes Pi y guías de campo.',
      outcome:
        'Docs paso a paso cubren hardware solar, provisión Pi y helpers Kubernetes para homelabs resistentes.',
      metrics: [
        'Plataforma',
        'k3s, helpers Kubernetes, túneles Cloudflare y notas solares',
        'Hardware',
        'CAD del cubo solar, placas Pi y electrónica',
        'Guías',
        'Imágenes Pi y provisión sin monitor',
      ],
    },
  },
});
