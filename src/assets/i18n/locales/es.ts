import { buildLatinLocale } from './latinLocaleFactory';

export const ES_OVERRIDES = buildLatinLocale({
  locale: 'es',
  siteName: 'Portfolio inmersivo de Daniel Smith',
  textHeading: 'Explora los destacados',
  textIntro:
    'El portfolio de texto mantiene cada exhibición accesible con resúmenes, resultados y métricas rápidas cuando el modo inmersivo no está disponible.',
  roomHeadingTemplate: 'Exhibiciones de {roomName}',
  metricsHeading: 'Métricas clave',
  linksHeading: 'Lecturas relacionadas',
  aboutHeading: 'Sobre Daniel',
  aboutSummary:
    'Ingeniero de confiabilidad con seis años en YouTube, enfocado en automatización, observabilidad y lanzamientos estables.',
  skillsHeading: 'Habilidades de un vistazo',
  timelineHeading: 'Cronología laboral',
  contactHeading: 'Contacto',
  recoveryTitle: '¿Listo para la sala completa?',
  recoveryDescription:
    'Borra la preferencia de texto guardada y vuelve a abrir el portfolio inmersivo desde aquí.',
  recoveryAction: 'Probar el modo inmersivo otra vez',
  languageTitle: 'Idioma',
  languageDescription: 'Cambia el idioma y la dirección del HUD.',
  switchingTemplate: 'Cambiando a {target}…',
  selectedTemplate: 'Idioma {label} seleccionado.',
  failureTemplate: 'No se pudo cambiar a {target}. Se mantiene {current}.',
  settingsHeading: 'Ajustes y ayuda',
  settingsDescription:
    'Ajusta accesibilidad, gráficos, audio y atajos de la experiencia.',
  controlsHeading: 'Controles',
  interact: 'Interactuar con',
  textMode: 'Cambiar al modo texto',
  audioOn: 'Audio activado',
  audioOff: 'Audio desactivado',
  guidedOn: 'Tour guiado activado',
  guidedOff: 'Tour guiado desactivado',
  tourHeading: 'Tour guiado',
  tourReset: 'Reiniciar tour guiado',
  poiVisited: 'Visitado',
  poiNext: 'Siguiente destacado',
  poiPrototype: 'Prototipo',
  poiLive: 'En vivo',
  closeDetails: 'Cerrar detalles',
  relatedCaseStudies: 'Casos relacionados',
  outcomeLabel: 'Resultado',
  discoveredTemplate: '{title} descubierto. {summary}',
  storyLog: 'Registro de la historia',
  visitedHeading: 'Exhibiciones visitadas',
  journeyHeading: 'Momentos del recorrido',
  softwareTitle: 'Renderizado por software detectado',
  softwareRecommendation:
    'Activa la aceleración por hardware para una experiencia inmersiva más fluida.',
  move: 'Moverse',
  pan: 'Desplazar cámara',
  zoom: 'Zoom',
  cyclePoi: 'Cambiar POI',
  languageOptions: {
    es: 'Español',
    pt: 'Português',
    de: 'Deutsch',
    hu: 'Magyar',
  },
  poiSummaries: {
    'futuroptimist-living-room-tv':
      'Mesa de guiones de Futuroptimist que une investigación, esquemas y borradores listos para narración.',
    'tokenplace-studio-cluster':
      'Plataforma de IA generativa peer-to-peer con relés cifrados y nodos locales.',
    'gabriel-studio-sentry':
      'Ángel guardián LLM centrado en privacidad para orientación de seguridad local.',
    'flywheel-studio-flywheel':
      'Sistema de automatización que convierte ideas, pruebas y revisiones en entregas confiables.',
    'jobbot-studio-terminal':
      'Terminal de búsqueda laboral que organiza candidaturas, señales y seguimiento.',
    'axel-studio-tracker':
      'Rastreador de hábitos y energía para mantener prioridades personales visibles.',
    'gitshelves-living-room-installation':
      'Biblioteca visual que convierte repositorios de GitHub en estantes explorables.',
    'danielsmith-portfolio-table':
      'Mesa central del sitio danielsmith.io que conecta historia profesional y proyectos.',
    'f2clipboard-kitchen-console':
      'Consola ligera para sincronizar portapapeles y flujos rápidos entre dispositivos.',
    'sigma-kitchen-workbench':
      'Banco de trabajo para experimentos de agentes, evaluación y automatización.',
    'wove-kitchen-loom':
      'Telar de producto que une notas, prototipos y decisiones en un hilo claro.',
    'dspace-backyard-rocket':
      'Cohete DSPACE que presenta simulaciones, misiones y visualizaciones espaciales.',
    'pr-reaper-backyard-console':
      'Consola que poda pull requests obsoletos y mantiene colas de revisión sanas.',
    'sugarkube-backyard-greenhouse':
      'Invernadero Sugarkube para laboratorios Kubernetes pequeños, solares y reproducibles.',
  },
});
