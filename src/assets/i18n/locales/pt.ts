import { buildLatinLocale } from './latinLocaleFactory';

export const PT_OVERRIDES = buildLatinLocale({
  locale: 'pt',
  siteName: 'Portfólio imersivo de Daniel Smith',
  textHeading: 'Explore os destaques',
  textIntro:
    'O portfólio em texto mantém cada exposição acessível com resumos, resultados e métricas rápidas quando o modo imersivo não está disponível.',
  roomHeadingTemplate: 'Exposições de {roomName}',
  metricsHeading: 'Métricas-chave',
  linksHeading: 'Leituras relacionadas',
  aboutHeading: 'Sobre Daniel',
  aboutSummary:
    'Engenheiro de confiabilidade com seis anos no YouTube, focado em automação, observabilidade e lançamentos estáveis.',
  skillsHeading: 'Habilidades em resumo',
  timelineHeading: 'Linha do tempo profissional',
  contactHeading: 'Contato',
  recoveryTitle: 'Pronto para a sala completa?',
  recoveryDescription:
    'Limpe a preferência de texto salva e reabra o portfólio imersivo a partir daqui.',
  recoveryAction: 'Tentar o modo imersivo novamente',
  languageTitle: 'Idioma',
  languageDescription: 'Altere o idioma e a direção do HUD.',
  switchingTemplate: 'Mudando para {target}…',
  selectedTemplate: 'Idioma {label} selecionado.',
  failureTemplate: 'Não foi possível mudar para {target}. Mantendo {current}.',
  settingsHeading: 'Configurações e ajuda',
  settingsDescription:
    'Ajuste acessibilidade, gráficos, áudio e atalhos da experiência.',
  controlsHeading: 'Controles',
  interact: 'Interagir com',
  textMode: 'Alternar para modo texto',
  audioOn: 'Áudio ligado',
  audioOff: 'Áudio desligado',
  guidedOn: 'Tour guiado ligado',
  guidedOff: 'Tour guiado desligado',
  tourHeading: 'Tour guiado',
  tourReset: 'Reiniciar tour guiado',
  poiVisited: 'Visitado',
  poiNext: 'Próximo destaque',
  poiPrototype: 'Protótipo',
  poiLive: 'Ao vivo',
  closeDetails: 'Fechar detalhes',
  relatedCaseStudies: 'Casos relacionados',
  outcomeLabel: 'Resultado',
  discoveredTemplate: '{title} descoberto. {summary}',
  storyLog: 'Registro da história',
  visitedHeading: 'Exposições visitadas',
  journeyHeading: 'Momentos da jornada',
  softwareTitle: 'Renderização por software detectada',
  softwareRecommendation:
    'Ative a aceleração de hardware para um portfólio imersivo mais fluido.',
  move: 'Mover',
  pan: 'Deslocar câmera',
  zoom: 'Zoom',
  cyclePoi: 'Alternar POI',
  languageOptions: {
    es: 'Español',
    pt: 'Português',
    de: 'Deutsch',
    hu: 'Magyar',
  },
  poiSummaries: {
    'futuroptimist-living-room-tv':
      'Mesa de roteiros Futuroptimist que reúne pesquisa, esboços e rascunhos prontos para narração.',
    'tokenplace-studio-cluster':
      'Plataforma de IA generativa peer-to-peer com relés criptografados e nós locais.',
    'gabriel-studio-sentry':
      'LLM guardião com privacidade em primeiro lugar para orientação de segurança local.',
    'flywheel-studio-flywheel':
      'Sistema de automação que transforma ideias, testes e revisões em entregas confiáveis.',
    'jobbot-studio-terminal':
      'Terminal de busca de emprego que organiza candidaturas, sinais e acompanhamento.',
    'axel-studio-tracker':
      'Rastreador de hábitos e energia para manter prioridades visíveis.',
    'gitshelves-living-room-installation':
      'Biblioteca visual que transforma repositórios do GitHub em prateleiras exploráveis.',
    'danielsmith-portfolio-table':
      'Mesa central do danielsmith.io conectando trajetória profissional e projetos.',
    'f2clipboard-kitchen-console':
      'Console leve para sincronizar área de transferência e fluxos rápidos entre dispositivos.',
    'sigma-kitchen-workbench':
      'Bancada para experimentos de agentes, avaliação e automação.',
    'wove-kitchen-loom':
      'Tear de produto que une notas, protótipos e decisões em uma narrativa clara.',
    'dspace-backyard-rocket':
      'Foguete DSPACE com simulações, missões e visualizações espaciais.',
    'pr-reaper-backyard-console':
      'Console que remove pull requests obsoletos e mantém filas de revisão saudáveis.',
    'sugarkube-backyard-greenhouse':
      'Estufa Sugarkube para laboratórios Kubernetes pequenos, solares e reproduzíveis.',
  },
});
