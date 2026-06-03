import type { LocaleOverrides } from '../types';

export const PT_OVERRIDES: LocaleOverrides = {
  locale: 'pt',
  site: {
    name: 'Portfólio imersivo de Daniel Smith',
    structuredData: {
      description:
        'Interactive exibe dentro da experiência imersiva do portfólio Daniel Smith.',
      listNameTemplate: '{siteName}\nPortfólio de texto',
      textCollectionNameTemplate: '{siteName}',
      textCollectionDescription:
        'Resumos de carregamento rápido de cada exposição envolvente, ajustados para uma leitura acessível e fácil de rastrear.\nGuias de campo',
      immersiveActionName: 'Lança modo imersivo',
      properties: {
        labels: {
          category: 'Categoria',
          outcome: 'Resultado',
          status: 'Status',
        },
        categories: {
          project: 'Projeto',
          environment: 'Ambiente',
        },
        statuses: {
          prototype: 'Protótipo',
          live: 'Ao vivo',
        },
      },
      publisher: {
        name: 'Portfólio imersivo de Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
        logoUrl: 'https://danielsmith.io/favicon.ico',
      },
      author: {
        name: 'Portfólio imersivo de Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
      },
    },
    textFallback: {
      heading: 'Explore os destaques',
      intro:
        'O portfólio de texto mantém todas as exposições acessíveis com resumos rápidos, resultados e métricas enquanto o modo imersivo está indisponível.',
      roomHeadingTemplate: '{roomName} exibe\nExposições',
      metricsHeading: 'Métricas principais',
      linksHeading: 'Leitura adicional',
      about: {
        heading: 'Sobre Daniel\nAcessibilidade e failover',
        summary:
          'com seis anos na YouTube focado em automação, observabilidade e lançamentos constantes.\nVisão geral das habilidades',
        highlights: [
          'Construiu plataformas de desenvolvedor e ferramentas de agente para acelerar o envio com segurança.',
          'orienta equipes em SLOs, resposta a incidentes e análises de confiabilidade.\nRegistro da missão',
          'Explora a narrativa envolvente do WebGL que sempre recorre a um texto acessível.',
        ],
      },
      skills: {
        heading: 'Desenvolvedor de software',
        items: [
          {
            label: 'Tradução em revisão',
            value:
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C',
          },
          {
            label: 'Infraestrutura e ferramentas',
            value:
              'Kubernetes, Docker, Nuvem Google (BigQuery), Ações GitHub, WebGL/Three.js, React/Next.js, Astro\nIdioma',
          },
          {
            label: 'Tradução em revisão',
            value:
              'SRE (SLOs, resposta a incidentes, capacidade), observabilidade, CI/CD, testes, documentação imediata e codificação de agente',
          },
        ],
      },
      timeline: {
        heading: 'Fluxo de trabalho',
        entries: [
          {
            period: 'setembro de 2018 - maio de 2025\nConfigurações',
            location: 'São Bruno, CA',
            role: '(L4)',
            org: 'YouTube (Google)',
            summary:
              'Operou de plantão em várias superfícies, monitoramento automatizado em Python/Go/SQL/C++ e orientou análises de confiabilidade para liderança.',
          },
          {
            period:
              'janeiro de 2017 - setembro de 2018\nO terminal holográfico Jobbot',
            location: ', MS',
            role: 'Renderização de software',
            org: 'Rede',
            summary:
              'Fornecido aplicativos de processamento de dados C++/Qt e demonstrações remotas dentro de sprints Scrum.',
          },
          {
            period: 'março de 2014 - dezembro de 2016\nMaterial',
            location: 'Hattiesburg, MS',
            role: 'Engenheiro de Software',
            org: 'Universidade do Sul do Mississippi',
            summary:
              'Construiu estruturas Objective-C para entrega de conteúdo ao vivo em aplicativos iOS universitários.',
          },
        ],
      },
      contact: {
        heading: 'Tradução em revisão',
        emailLabel: 'Tradução em revisão',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: '(PDF)',
        resumeUrl: 'docs/resume/2025-09/resume.pdf',
      },
      recoveryCta: {
        title: 'Pronto para a sala completa?',
        description:
          'Limpe a preferência de texto salva e reinicie o portfólio imersivo aqui.',
        actionLabel: 'Tente imersivo novamente',
        ariaLabel:
          'Tente o modo imersivo novamente e limpe a preferência do modo de texto salvo',
      },
      actions: {
        immersiveLink: 'Tente imersivo novamente',
        debugImmersiveLink: ': forçar modo imersivo\nImplantação',
        clearPreferenceButton: 'Limpar preferência de modo salvo',
        clearPreferenceSuccess:
          'Preferência de modo salvo desmarcada\nRoda de rolagem',
        resumeLink: 'Baixe o currículo mais recente',
        githubLink: 'Explore projetos no GitHub',
      },
      reasonHeadings: {
        manual: 'Modo somente texto ativado',
        'webgl-unsupported':
          'Modo imersivo indisponível neste dispositivo\nA cena imersiva',
        'low-memory': 'Dispositivo com pouca memória detectado',
        'low-end-device': 'detectado',
        'low-performance': 'Fallback de desempenho ativo\nPitada',
        'immersive-init-error': 'encontrou um erro',
        'automated-client': 'detectado',
        'data-saver': 'Modo de economia de dados ativado\nDepuração',
        'console-error': 'detectados\nCurrículo',
      },
      reasonDescriptions: {
        manual:
          'Você solicitou a visão de portfólio leve. A cena envolvente fica a apenas um clique de distância.',
        'webgl-unsupported':
          'Seu navegador ou dispositivo não pôde iniciar o renderizador WebGL. Aproveite a rápida visão geral do texto enquanto mantemos a luz da cena envolvente.',
        'low-memory':
          'Seu dispositivo relatou memória limitada, então lançamos o tour de texto leve para manter tudo tranquilo.\nZoom',
        'low-end-device':
          'Detectamos um perfil de dispositivo leve, então carregamos o tour de texto rápido para manter a navegação responsiva.',
        'low-performance':
          'Detectamos taxas de quadros baixas sustentadas, então mudamos para o tour de texto responsivo para manter a experiência rápida.',
        'immersive-init-error':
          'Algo deu errado ao iniciar a cena imersiva, então trouxemos para vocês a visão geral do texto.\nVelocidade',
        'automated-client':
          'Detectamos um cliente automatizado, então apresentamos o portfólio de texto de carregamento rápido para visualizações e rastreadores confiáveis.',
        'console-error':
          'Detectamos um erro de tempo de execução e mudamos para o tour de texto resiliente enquanto a cena imersiva se recupera.',
        'data-saver':
          'Seu navegador solicitou uma experiência de economia de dados, por isso lançamos o tour de texto leve para minimizar a largura de banda e, ao mesmo tempo, manter os destaques acessíveis.',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Controles',
      items: {
        keyboardMove: {
          keys: 'WASD / teclas de seta',
          description: 'Movimento e câmera',
        },
        pointerDrag: {
          keys: 'Botão esquerdo do mouse\nDispositivo leve',
          description: 'Arraste para deslocar',
        },
        pointerZoom: {
          keys: 'Tradução em revisão',
          description: 'Tradução em revisão',
        },
        touchDrag: {
          keys: 'Manche de toque',
          description:
            'Arraste a metade esquerda para mover e a metade direita para deslocar',
        },
        touchPinch: {
          keys: 'Tradução em revisão',
          description: 'Tradução em revisão',
        },
        cyclePoi: {
          keys: 'Q/E',
          description: 'Tradução em revisão',
        },
        toggleTextMode: {
          keys: 'T\nTorneira',
          description: 'Mudar para modo de texto',
        },
      },
      interact: {
        defaultLabel: 'Entrar\nAmbiente',
        description: 'Interagir',
        promptTemplates: {
          default: 'Interage com {title}\nInterações',
          inspect: 'Inspecione {title}',
          activate: 'Ativar {title}',
        },
      },
      helpButton: {
        labelTemplate: 'Abrir menu · Pressione {shortcut}',
        announcementTemplate:
          'Abra configurações e ajuda. Pressione {shortcut} para revisar os controles e dicas de acessibilidade.',
        shortcutFallback: 'H',
      },
      menu: {
        controls: {
          label: 'Tradução em revisão',
          keyHint: 'C',
          title: 'Controles abertos (C)',
        },
        text: {
          label: 'Tradução em revisão',
          keyHint: 'T',
          title: 'Mudar para modo de texto (T)',
        },
        settings: {
          label: 'Configurações e ajuda do',
          keyHint: 'H',
          title: 'Abra configurações e ajuda (H)',
        },
      },
      mobileToggle: {
        expandLabel: 'Mostrar todos os controles',
        collapseLabel: 'Ocultar controles extras',
        expandAnnouncement:
          'Mostrando a lista completa de controles para jogadores móveis.',
        collapseAnnouncement:
          'Ocultando controles extras para manter a lista compacta.',
      },
    },
    movementLegend: {
      defaultDescription: 'Interagir',
      labels: {
        keyboard: 'Entrar\nAmbiente',
        pointer: 'Clique',
        touch: 'Texto',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: 'Pressione {label} para {prompt}',
        pointer: '{label} a {prompt}',
        touch: '{label} a {prompt}',
        gamepad: 'Pressione {label} para {prompt}',
      },
    },
    customization: {
      heading: 'Personalização',
      description:
        'Ajuste o estilo do manequim e o equipamento complementar para a missão atual.',
      variants: {
        title: 'Estilo do avatar',
        description: 'Trocar roupas para o manequim explorador.',
      },
      accessories: {
        title: 'Tradução em revisão',
        description:
          'Alterna o console de pulso ou os companheiros holográficos do drone.',
      },
    },
    audioControl: {
      keyHint: 'M',
      groupLabel: 'Tradução em revisão',
      toggle: {
        onLabelTemplate: ': Ligado · Pressione {keyHint} para silenciar',
        offLabelTemplate: ': Desligado · Pressione {keyHint} para ativar o som',
        titleTemplate: 'Alternar áudio ambiente ({keyHint})',
        announcementOnTemplate:
          'Áudio ambiente ativado. Pressione {keyHint} para alternar.',
        announcementOffTemplate:
          'Áudio ambiente desligado. Pressione {keyHint} para alternar.',
        pendingAnnouncementTemplate:
          'Alternando o estado do áudio ambiente. Por favor, espere…',
      },
      slider: {
        label: 'Volume ambiente',
        ariaLabel: 'Volume de áudio ambiente',
        hudLabel: 'Controle deslizante de volume de áudio ambiente.',
        valueAnnouncementTemplate: 'Volume de áudio ambiente {volume}.',
        mutedAnnouncementTemplate:
          'Áudio ambiente silenciado. Volume definido como {volume}.',
        mutedValueTemplate:
          'silenciado · {volume}\nLaboratório de Pesquisa Naval',
        mutedAriaValueTemplate: 'silenciado ({volume})',
      },
    },
    localeToggle: {
      title: 'Idioma',
      description: 'Muda o idioma e a direção do HUD.',
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
        'Mudando para localidade {target}…\nSincronização',
      selectedAnnouncementTemplate: '{label} selecionada.',
      failureAnnouncementTemplate:
        'Não é possível mudar para {target}. Permanecendo na localidade {current}.',
    },
    tourGuideToggle: {
      labelEnabled: 'Visita guiada em\nVisita guiada',
      labelDisabled: 'Visita guiada off',
      descriptionEnabled:
        'destaca a próxima exposição recomendada no tour imersivo.',
      descriptionDisabled:
        'Os destaques do tour guiado ficam ocultos até que você os ative novamente.',
    },
    tourReset: {
      heading: 'Tradução em revisão',
      resetKey: 'g',
      label: 'Reiniciar visita guiada',
      description: 'Clear visitou POIs e reproduz o caminho selecionado.',
      emptyLabel: 'pronta\nGuias',
      emptyDescription:
        'Explore exposições para desbloquear a redefinição da visita guiada.',
      pendingLabel: 'Redefinindo tour…\nSuíte de edição estilo Resolve',
      pendingDescription: 'Reiniciando a visita guiada…',
      restartPromptTemplate: 'Pressione {key} para reiniciar.',
      guidedTourDescription: 'Mostrar exibições recomendadas quando ocioso.',
      guidedTourLabelOn: ': Ligado',
      guidedTourLabelOff: ': Desativado',
      toggleAnnouncementOn:
        'Destaques da visita guiada ativados. Ative para desativar recomendações.\nDestaques da visita guiada',
      toggleAnnouncementOff:
        'Destaques da visita guiada desativados. Ative para ativar recomendações.',
      toggleTitleOn: 'Desativar destaques da visita guiada',
      toggleTitleOff: 'Habilitar destaques da visita guiada',
    },
    softwareRendererWarning: {
      fallbackRendererLabel: 'Estúdio',
      title: 'detectada',
      descriptionTemplate:
        'Chrome está usando {renderer} em vez de aceleração de hardware. Basic Render Driver, SwiftShader, WARP e llvmpipe podem travar sob animação WebGL contínua.',
      recommendation:
        'Habilite a aceleração de hardware do navegador para um portfólio envolvente e suave. O modo imersivo seguro mantém as capturas de tela e a depuração disponíveis em uma taxa de quadros limitada.',
      continueSafeLabel: 'Continue em imersão segura\nControles',
      continuousLabel: 'Habilite imersão contínua de qualquer maneira',
      textModeLabel: 'Usar modo texto',
      reloadSafeLabel:
        'Recarregue este URL imersivo seguro\nAnálise do repositório',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: 'Modo texto · Pressione {keyHint}',
      idleDescriptionTemplate: 'Mudar para o portfólio somente texto',
      idleAnnouncementTemplate:
        'Mude para o portfólio somente texto. Pressione {keyHint} para ativar.',
      idleTitleTemplate: 'Mudar para portfólio somente texto ({keyHint})',
      pendingLabelTemplate: 'Mudando para modo de texto…',
      pendingAnnouncementTemplate:
        'Mude para o portfólio somente texto. Mudando para o modo de texto…',
      activeLabelTemplate: 'Tente imersivo novamente · Pressione {keyHint}',
      activeDescriptionTemplate: 'Retorno ao portfólio imersivo.\nRoteiro',
      activeAnnouncementTemplate:
        'Modo texto ativo. Pressione {keyHint} para tentar a imersão novamente.\nFalha na alternância do modo de texto',
      errorLabelTemplate:
        'Tente novamente o modo de texto · Pressione {keyHint}',
      errorDescriptionTemplate:
        'Falha na alternância do modo de texto. Tente novamente ou use o link imersivo.',
      errorAnnouncementTemplate:
        'Falha na alternância do modo de texto. Pressione {keyHint} para tentar novamente.',
      errorTitleTemplate:
        '. Pressione {keyHint} para tentar novamente o modo de texto.',
    },
    poiOverlay: {
      visited: 'visitou',
      nextHighlight: 'Próximo destaque',
      prototype: 'Protótipo',
      live: 'Ao vivo',
      closeDetails: 'Fechar detalhes do POI',
      relatedCaseStudies: 'Estudos de caso relacionados',
      outcomeFallbackLabel: 'Tradução em revisão',
      discoveryAnnouncementTemplate: '{title} descoberto. {summary}\nEstrelas',
    },
    narrativeLog: {
      heading: 'Gatilhos Cron',
      visitedHeading: 'Exposições visitadas',
      empty:
        'Visite exposições para desbloquear entradas narrativas que narram a vitrine do criador.',
      defaultVisitedLabel: 'visitou',
      visitedLabelTemplate: 'visitado em {time}',
      liveAnnouncementTemplate:
        '{title} adicionado ao registro da história do criador.',
      journey: {
        heading: 'Tradução em revisão',
        empty: 'Explore novas exposições para tecer a narração da viagem.',
        entryLabelTemplate: '{from} → {to}\nLocalidade',
        sameRoomTemplate:
          'Dentro do {room} {descriptor}, a história muda de {fromPoi} para {toPoi}.\nCronograma de trabalho',
        crossRoomTemplate:
          'Saindo do {fromRoom} {fromDescriptor}, a jornada segue para o {toRoom} {toDescriptor} para destacar o {toPoi}.',
        crossSectionTemplate:
          'Passando {direction} através do limite, o caminho flui para {toRoom} {toDescriptor} para alcançar {toPoi}.',
        fallbackTemplate: 'A narrativa flui em direção a {toPoi}.',
        announcementTemplate: '– {label}: {story}',
        directions: {
          indoors: 'de volta para dentro\nObservatório de quintal',
          outdoors: 'ao ar livre\nRenderizador WebGL do software',
        },
      },
      rooms: {
        livingRoom: {
          label: 'Tradução em revisão',
          descriptor: 'Ala de robótica culinária',
          zone: 'interior',
        },
        studio: {
          label: 'Tradução em revisão',
          descriptor: 'Tradução em revisão',
          zone: 'interior',
        },
        kitchen: {
          label: 'Sala de estar',
          descriptor: 'Tradução em revisão',
          zone: 'interior',
        },
        backyard: {
          label: 'Salão cinematográfico',
          descriptor: 'jardim iluminado ao entardecer',
          zone: 'exterior',
        },
      },
    },
    helpModal: {
      heading: 'Tradução em revisão',
      description:
        'Ajuste predefinições de acessibilidade, qualidade gráfica, áudio e atalhos de revisão. Use o atalho de ajuda (padrão H ou?) para alternar este painel.',
      closeLabel: 'Fechar',
      closeAriaLabel: 'Fechar ajuda\nCluster',
      settings: {
        heading: 'Tradução em revisão',
        description:
          'Ajuste as preferências de áudio, vídeo e acessibilidade. Esses controles permanecem disponíveis mesmo quando o menu é fechado por meio de atalhos de teclado.',
      },
      sections: [
        {
          id: 'movement',
          title: 'Tradução em revisão',
          items: [
            {
              label: 'WASD / teclas de seta',
              description:
                'Role o explorador pela casa.\nErros de tempo de execução',
            },
            {
              label: 'Arrastar o mouse\nMovimento',
              description: 'Panorâmica da câmera isométrica.',
            },
            {
              label: 'Tradução em revisão',
              description: 'Ajusta o nível de zoom.\nAs versões',
            },
            {
              label: 'Tradução em revisão',
              description:
                'Arraste o pad esquerdo para mover e o pad direito para deslocar.',
            },
            {
              label: 'Tradução em revisão',
              description:
                'Zoom em dispositivos de toque.\nLaboratório de automação',
            },
          ],
        },
        {
          id: 'interactions',
          title: 'Tradução em revisão',
          items: [
            {
              label: 'Abordagem POIs brilhantes\nÁudio',
              description:
                'Pressione a tecla de interação (Enter/Espaço/F), toque ou clique para abrir a sobreposição da exposição.',
            },
            {
              label: 'Q/E ou ←/→\nPlanejamento de missões',
              description:
                'Alterne o foco entre pontos de interesse com o teclado.',
            },
            {
              label: 'T\nTorneira',
              description:
                'Alterna entre o modo imersivo e o substituto de texto.',
            },
            {
              label: 'Shift + L',
              description:
                'Compare a iluminação cinematográfica com a passagem de depuração.\nContato',
            },
          ],
        },
        {
          id: 'accessibility',
          title: 'Acessórios',
          items: [
            {
              label: 'Baixo desempenho',
              description:
                'A cena muda automaticamente para o modo de texto abaixo de 30 FPS.',
            },
            {
              label: 'Alternador manual',
              description:
                'Use o botão do modo de texto na tela ou pressione T a qualquer momento.',
            },
            {
              label: 'Tradução em revisão',
              description:
                'Ajuste a intensidade do rastro em Configurações → Controle de desfoque de movimento.',
            },
            {
              label: 'Áudio ambiente\nControles de áudio ambiente',
              description: 'Alterne com o botão Áudio ou pressione M.\nToque',
            },
          ],
        },
      ],
      announcements: {
        open: 'aberto. Revise os controles e configurações.',
        close: 'Menu Ajuda fechado.\nMenu Ajuda',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist\nBobinas do ecossistema',
      summary:
        'Mesa de script Futuroptimist automatizada que reúne pesquisas, esboços e rascunhos prontos para narração para novos vídeos.\nCliente automatizado',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Mantém scripts de destaque semanais fluindo do pipeline de automação sem formatação manual.\nPrincipais métricas',
      },
      metrics: [
        {
          label: 'Status',
          value: '1.280+\nNós',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value}',
            fallback: '1.280+\nNós',
          },
        },
        {
          label: 'Tradução em revisão',
          value: '· display triplo',
        },
        {
          label: 'Formatos',
          value: 'Futuroptimist em andamento\nA parede de mídia',
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
          'Futuroptimist irradia rolos de destaque por toda a sala de estar.',
      },
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary:
        'Plataforma segura de IA generativa ponto a ponto executada em uma rede Raspberry Pi com retransmissão criptografada e nós de servidor.',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'trazem o relé, o servidor e a pilha LLM simulada localmente para teste.',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'token.place',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Tradução em revisão',
          value: '12 × Pi 5 em compartimentos modulares\nVarredura lidar',
        },
        {
          label: 'Tradução em revisão',
          value: '· rajadas criptografadas',
        },
      ],
      links: [
        {
          label: 'Engenheiro de confiabilidade do local',
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
        'LLM de "anjo da guarda" de privacidade que oferece treinamento de segurança local e se integra com token.place ou inferência offline.\nProjeto',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'As pilhas modulares de ingestão, análise, notificação e UI permanecem alinhadas por meio de interfaces digitadas.\nControle deslizante de desfoque de movimento',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gabriel',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Formatos',
          value: '360° + heurística local\nBlocos compatíveis com Gridfinity',
        },
        {
          label: 'Categoria',
          value: 'Alerta vermelho pisca a cada 1,0 s',
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
      title: 'Flywheel\nRepositório',
      summary:
        'GitHub e hub de automação que agrupa linting, testes, documentos e prompts Codex para inicialização rápida de repositório.',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Envia CI repetível (lint, testes, documentos) e bibliotecas de prompt para que novos repositórios comecem íntegros.',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'flywheel',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Registro de automação',
          value: '· prompts digitados · loops de controle de qualidade',
        },
        {
          label: 'Os documentos',
          value: 'volante.futuroptimist.dev →',
        },
      ],
      links: [
        {
          label: 'Flywheel\nO hub cinético',
          href: 'https://github.com/futuroptimist/flywheel',
        },
        {
          label: 'Docs',
          href: 'https://flywheel.futuroptimist.dev',
        },
      ],
      narration: {
        caption:
          'Flywheel zumbe vivo, destacando prompts de automação e ferramentas.\nFoco',
      },
      interactionPrompt: 'Engajar sistemas {title}',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000\nBatidas da jornada',
      summary:
        'Copiloto de busca de emprego auto-hospedado com CLI e interface de usuário da web experimental para ingestão de aplicativos de divulgação e rastreamento.',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Os fluxos de trabalho completos refletem documentos e testes para que os fluxos de divulgação do recrutador permaneçam cobertos.',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'jobbot3000',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Centro Espacial Stennis',
          value:
            'CLI local primeiro com interface de usuário da web de visualização',
        },
        {
          label: 'Estrelas',
          value: 'Node.js 20+ · scripts npm · Visualização do dramaturgo',
        },
        {
          label: 'Tradução em revisão',
          value:
            'Ingestão de divulgação do Recruiter e rastreamento do ciclo de vida',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/jobbot3000',
        },
        {
          label: 'Sequenciamento autônomo T-0',
          href: 'https://futuroptimist.dev/automation',
        },
      ],
      narration: {
        caption:
          'transmite telemetria de automação em sobreposições brilhantes.',
      },
    },
    'axel-studio-tracker': {
      title: 'Axel\nPórtico de lançamento de quintal',
      summary:
        'Goal e rastreador de missões que organiza repositórios com LLMs de agente, auxiliares de análise e uma CLI compatível com pipx.\nRegistro de estufa',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Alpha mantêm o README, as perguntas frequentes e a cobertura do modelo de ameaças sincronizadas com o pacote pytest.',
      },
      metrics: [
        {
          label: 'Centro Espacial Stennis',
          value: 'Alpha · eixo de instalação pipx',
        },
        {
          label: 'Tradução em revisão',
          value:
            'a partir de listas de repositórios e varreduras\nOs scripts de início rápido',
        },
        {
          label: 'Docs',
          value: '· problemas conhecidos · modelo de ameaça mantido com testes',
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
      title: 'Gitshelves',
      summary:
        'que transforma dados de contribuição GitHub em modelos OpenSCAD e STL para prateleiras Gridfinity impressas em 3D.\nCadência',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Exporta pares SCAD/STL com metadados para que as prateleiras impressas espelhem os cronogramas de contribuição.',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gitshelves',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Tradução em revisão',
          value: 'de 42 mm',
        },
        {
          label: 'Sincronização',
          value: 'Auto gerado a partir de cronogramas GitHub',
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
      title: 'danielsmith.io',
      summary:
        'Portfólio ortográfico Three.js/WebGL com navegação por teclado e um substituto de texto resiliente para acessibilidade.\nResultado',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Mantém implantações imersivas e de texto alinhadas em cada versão.',
      },
      metrics: [
        {
          label: 'Status',
          value: '1.280+\nNós',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value}',
            fallback: '1.280+\nNós',
          },
        },
        {
          label: 'Estrelas',
          value: 'Vite · Three.js · HUD de acessibilidade',
        },
        {
          label: 'Tradução em revisão',
          value: 'CI fumaça + documentos + portões de fiapos',
        },
      ],
      links: [
        {
          label: 'Tradução em revisão',
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
        'que ingere páginas de tarefas Codex e logs GitHub, redige segredos e emite resumos Markdown prontos para colar.\nCLI',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Automatiza a coleta e o resumo de logs de CI para transferência rápida de depuração.\nAutomação',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'f2clipboard',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Pilha',
          value: 'Copiar logs com falha em menos de 3 s\nContagem regressiva',
        },
        {
          label: 'Tradução em revisão',
          value: 'CLI + área de transferência + saída Markdown\nCLI',
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
      title: 'Sigma\nSite',
      summary:
        'ESP32 "AI pin" que transmite áudio push-to-talk para o Whisper e retorna TTS em um gabinete OpenSCAD impresso em 3D.',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Inclui firmware, CAD de gabinete, exportações STL e documentos de montagem mantidos atualizados pela CI.',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sigma',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Tradução em revisão',
          value: 'ESP32 · Gabinete OpenSCAD\nE-mail',
        },
        {
          label: 'Tradução em revisão',
          value: 'Push-to-talk · Sussurro + relé TTS',
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
        'Kit de ferramentas de código aberto para aprender tricô e crochê enquanto constrói um tear robótico com hardware OpenSCAD.',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'cobrem calculadoras de medidores, exportações de planejador e perfis de tensão em pesos de fio.',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'wove',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Registro de história do criador',
          value: 'Loom calibra a partir de mapas de pontos CAD',
        },
        {
          label: 'Tradução em revisão',
          value: 'Caminho para laboratórios de tecelagem robótica',
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
        'para o projeto privado do foguete DSPACE com sinais de contagem regressiva guiados por telemetria e um registro de missão público.',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Mantém notas de sequenciamento de contagem regressiva ao lado do GitHub e links de registro de missão enquanto o repositório permanece privado.',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'dspace',
            visibility: 'private',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Artesanato',
          value: 'Estilo Avatar',
        },
        {
          label: 'Estrelas',
          value: 'Three.js FX · Áudio espacial',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/dspace',
        },
        {
          label: 'Tradução em revisão',
          href: 'https://futuroptimist.dev/projects/dspace',
        },
      ],
      narration: {
        caption:
          'A plataforma de lançamento do dSpace estala com energia de contagem regressiva ao lado do caminho do quintal.',
        durationMs: 6000,
      },
      interactionPrompt: 'lança contagem regressiva {title}',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'GitHub Fluxo de trabalho de ações que fecha em massa solicitações pull obsoletas com visualizações de simulação e limpeza de ramificação opcional.\nModelo',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'O fluxo de trabalho de um botão documenta entradas, modelo de segurança e saídas de auditoria no README.',
      },
      metrics: [
        {
          label: 'Status',
          value: 'de GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'pr-reaper',
            format: 'compact',
            template: '{value}',
            fallback: 'de GitHub…',
          },
        },
        {
          label: 'Tradução em revisão',
          value:
            'PRs obsoletos de fechamento em massa com modo de visualização\nAndaimes de CI',
        },
        {
          label: 'Categoria',
          value: '+ simulações manuais\nPersonalização',
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
        'k3s-on-Raspberry-Pi emparelhada com uma instalação de cubo solar fora da rede documentada com CAD, imagens Pi e guias de campo.\nLaboratório de cozinha',
      outcome: {
        label: 'Tradução em revisão',
        value:
          'Os documentos passo a passo cobrem hardware solar, provisionamento Pi e auxiliares Kubernetes para homelabs resilientes.',
      },
      metrics: [
        {
          label: 'Tradução em revisão',
          value:
            'k3s, ajudantes Kubernetes, túneis Cloudflare e notas de inclinação/irrigação solar\nPlataforma',
        },
        {
          label: 'Tradução em revisão',
          value: 'Cubo solar CAD, placas de suporte Pi, documentos eletrônicos',
        },
        {
          label: 'Hardware',
          value: 'para imagens Pi e provisionamento headless\nFluxos',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/sugarkube',
        },
        {
          label: 'Visita guiada',
          href: 'https://futuroptimist.dev/projects/sugarkube',
        },
      ],
      narration: {
        caption:
          'Sugarkube ciclos de estufa com luzes suaves de cultivo e ambiente de lago de carpas em sincronia.\nVarredura',
        durationMs: 6500,
      },
    },
  },
};
