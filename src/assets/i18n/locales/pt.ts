import type { LocaleOverrides } from '../types';

export const PT_OVERRIDES: LocaleOverrides = {
  locale: 'pt',
  site: {
    name: 'Portfólio imersivo de Daniel Smith',
    structuredData: {
      description:
        'Exposições interativas dentro da experiência de portfólio imersivo de Daniel Smith.',
      immersiveActionName: 'Abrir modo imersivo',
      properties: {
        labels: {
          category: 'Categoria',
          outcome: 'Resultado',
          status: 'Status',
        },
        categories: { project: 'Projeto', environment: 'Ambiente' },
        statuses: { prototype: 'Protótipo', live: 'Ao vivo' },
      },
    },
    textFallback: {
      heading: 'Explore os destaques',
      intro:
        'O portfólio em texto mantém cada exposição acessível com resumos, resultados e métricas enquanto o modo imersivo está indisponível.',
      roomHeadingTemplate: 'Exposições de {roomName}',
      metricsHeading: 'Métricas principais',
      linksHeading: 'Leituras relacionadas',
      recoveryCta: {
        title: 'Pronto para a sala completa?',
        description:
          'Limpe a preferência de texto salva e reabra o portfólio imersivo daqui.',
        actionLabel: 'Tentar o modo imersivo novamente',
        ariaLabel:
          'Tentar o modo imersivo novamente e limpar a preferência salva de modo texto',
      },
      actions: {
        immersiveLink: 'Tentar o modo imersivo novamente',
        debugImmersiveLink: 'Depuração: forçar modo imersivo',
        clearPreferenceButton: 'Limpar preferência de modo salva',
        clearPreferenceSuccess: 'Preferência de modo salva limpa',
        resumeLink: 'Baixar o currículo mais recente',
        githubLink: 'Explorar projetos no GitHub',
      },
      reasonHeadings: {
        manual: 'Modo somente texto ativado',
        'webgl-unsupported': 'Modo imersivo indisponível neste dispositivo',
        'low-memory': 'Dispositivo com pouca memória detectado',
        'low-end-device': 'Dispositivo leve detectado',
        'low-performance': 'Alternativa de desempenho ativa',
        'immersive-init-error': 'A cena imersiva encontrou um erro',
        'automated-client': 'Cliente automatizado detectado',
        'data-saver': 'Modo de economia de dados ativado',
        'console-error': 'Erros de execução detectados',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Controles',
      interact: {
        description: 'Interagir',
        promptTemplates: {
          default: 'Interagir com {title}',
          inspect: 'Inspecionar {title}',
          activate: 'Ativar {title}',
        },
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
          title: 'Mudar para modo texto (T)',
        },
        settings: {
          label: 'Configurações',
          keyHint: 'H',
          title: 'Abrir configurações e ajuda (H)',
        },
      },
    },
    localeToggle: {
      title: 'Idioma',
      description: 'Altere o idioma e a direção do HUD.',
      switchingAnnouncementTemplate: 'Mudando para o idioma {target}…',
      selectedAnnouncementTemplate: 'Idioma {label} selecionado.',
      failureAnnouncementTemplate:
        'Não foi possível mudar para {target}. Mantendo {current}.',
    },
    modeToggle: {
      idleLabelTemplate: 'Modo texto · Pressione {keyHint}',
      idleDescriptionTemplate: 'Mudar para o portfólio somente texto',
      idleAnnouncementTemplate:
        'Mudar para o portfólio somente texto. Pressione {keyHint} para ativar.',
      idleTitleTemplate: 'Mudar para o portfólio somente texto ({keyHint})',
      pendingLabelTemplate: 'Mudando para modo texto…',
      pendingAnnouncementTemplate:
        'Mudar para o portfólio somente texto. Mudando para modo texto…',
      activeLabelTemplate: 'Tentar imersivo novamente · Pressione {keyHint}',
      activeDescriptionTemplate: 'Voltar ao portfólio imersivo.',
      activeAnnouncementTemplate:
        'Modo texto ativo. Pressione {keyHint} para tentar o modo imersivo novamente.',
    },
    poiOverlay: {
      visited: 'Visitado',
      nextHighlight: 'Próximo destaque',
      prototype: 'Protótipo',
      live: 'Ao vivo',
      closeDetails: 'Fechar detalhes do POI',
      relatedCaseStudies: 'Estudos de caso relacionados',
      outcomeFallbackLabel: 'Resultado',
      discoveryAnnouncementTemplate: '{title} descoberto. {summary}',
    },
    helpModal: {
      heading: 'Configurações e ajuda',
      description: 'Ajuste acessibilidade, qualidade gráfica, áudio e atalhos.',
      closeLabel: 'Fechar',
      closeAriaLabel: 'Fechar ajuda',
      settings: {
        heading: 'Configurações da experiência',
        description: 'Ajuste preferências de áudio, vídeo e acessibilidade.',
      },
      announcements: {
        open: 'Menu de ajuda aberto. Revise controles e configurações.',
        close: 'Menu de ajuda fechado.',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist',
      summary:
        'Mesa automatizada de roteiros da Futuroptimist que une pesquisa, esboços e rascunhos prontos para narração para novos vídeos.',
      outcome: {
        label: 'Resultado',
        value:
          'Transforma pesquisa criativa em um fluxo reutilizável de roteiros.',
      },
      metrics: [
        {
          label: 'Estrelas',
          value: '1.280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} estrelas',
            fallback: '1.280+',
          },
        },
        {
          label: 'Fluxo',
          value: 'Suíte de edição estilo Resolve · três telas',
        },
        {
          label: 'Foco',
          value: 'Reels do ecossistema Futuroptimist em andamento',
        },
      ],
      interactionPrompt: 'Inspecionar {title}',
    },
  },
};
