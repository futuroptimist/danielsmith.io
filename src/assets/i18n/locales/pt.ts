import { buildLatinLocaleOverrides } from './latinLocaleOverrides';

export const PT_OVERRIDES = buildLatinLocaleOverrides({
  locale: 'pt',
  siteName: 'Portfólio imersivo de Daniel Smith',
  nativeLabel: 'Português',
  strings: {
    controls: 'Controles',
    settingsHelp: 'Configurações e ajuda',
    language: 'Idioma',
    languageDescription: 'Alterne o idioma e a direção do HUD.',
    switching: 'Mudando para {target}…',
    selected: '{label} selecionado.',
    failure: 'Não foi possível mudar para {target}. Mantendo {current}.',
    textHeading: 'Explore os destaques',
    textIntro:
      'O portfólio em texto mantém cada exibição acessível com resumos, resultados e métricas enquanto o modo imersivo está indisponível.',
    recoveryTitle: 'Pronto para a sala completa?',
    recoveryDescription:
      'Limpe a preferência de texto salva e relance o portfólio imersivo daqui.',
    recoveryAction: 'Tentar imersivo novamente',
    recoveryAria:
      'Tentar o modo imersivo novamente e limpar a preferência salva de modo texto',
    metrics: 'Métricas-chave',
    links: 'Leitura adicional',
    outcome: 'Resultado',
    stars: 'Estrelas',
    syncing: 'Sincronizando do GitHub…',
    discovered: '{title} descoberto. {summary}',
    closePoi: 'Fechar detalhes do POI',
    nextHighlight: 'Próximo destaque',
    related: 'Estudos de caso relacionados',
    prototype: 'Protótipo',
    live: 'Ao vivo',
    textMode: 'Mudar para modo texto',
    tryImmersive: 'Tentar imersivo novamente',
    guidedTour: 'Visita guiada',
    guidedTourOn: 'Visita guiada ativada',
    guidedTourOff: 'Visita guiada desativada',
    audioOn: 'Áudio: ligado',
    audioOff: 'Áudio: desligado',
    audioSubtitleAmbientLabel: 'Áudio ambiente',
    audioSubtitlePoiLabel: 'Narração',
    audioSubtitleDismissAmbient: 'Dispensar legenda',
    audioSubtitleDismissPoi: 'Dispensar narração',
    narrationToggleLabelEnabled: 'Narração ativada',
    narrationToggleLabelDisabled: 'Narração desativada',
    narrationToggleDescriptionEnabled:
      'Pop-ups e legendas de narração aparecem em futuros momentos da exibição.',
    narrationToggleDescriptionDisabled:
      'Pop-ups e legendas de narração ficam ocultos até você ativá-los.',
  },
  poi: {
    futuroptimist: {
      summary:
        'Mesa automatizada de roteiros da Futuroptimist que une pesquisa, esboços e rascunhos prontos para narração.',
      outcome:
        'Mantém roteiros semanais fluindo da automação sem formatação manual.',
      metrics: [
        'Fluxo',
        'Suíte de edição estilo Resolve · três telas',
        'Foco',
        'Reels do ecossistema Futuroptimist em andamento',
      ],
    },
    tokenplace: {
      summary:
        'Plataforma segura de IA generativa peer-to-peer em uma malha Raspberry Pi com relay criptografado e nós de servidor.',
      outcome:
        'Scripts de início sobem localmente o relay, o servidor e a pilha de LLM simulado para testes.',
      metrics: [
        'Cluster',
        'Entrypoints Python relay.py e server.py',
        'Rede',
        'Linha de base API v1 com E2EE cega ao relay',
      ],
    },
    gabriel: {
      summary:
        'LLM “anjo da guarda” com privacidade em primeiro lugar para orientação local de segurança e integração com token.place ou inferência offline.',
      outcome:
        'Pilhas de ingestão, análise, notificação e UI permanecem alinhadas por interfaces tipadas.',
      metrics: [
        'Foco',
        'Coaching de segurança digital com privacidade primeiro',
        'Cadência',
        'FAQ e docs no repositório',
      ],
    },
    flywheel: {
      summary:
        'Template GitHub e hub de automação com lint, testes, docs e prompts Codex para iniciar repos rapidamente.',
      outcome:
        'Entrega CI repetível e bibliotecas de prompts para novos repos começarem saudáveis.',
      metrics: [
        'Automação',
        'Scaffolds CI · prompts tipados · ciclos QA',
        'CTA docs',
        'Suporte, eixo, adaptador e docs de física',
      ],
    },
    jobbot: {
      summary:
        'Copiloto de busca de emprego auto-hospedado com CLI e UI web experimental para ingerir contatos e acompanhar candidaturas.',
      outcome:
        'Fluxos ponta a ponta espelham docs e testes para cobrir contato com recrutadores.',
      metrics: [
        'Estado',
        'CLI local-first com UI web preview',
        'Stack',
        'Node.js 20+ · scripts npm · preview Playwright',
        'Fluxos',
        'Ingestão de contatos e acompanhamento de ciclo',
      ],
    },
    axel: {
      summary:
        'Rastreador de metas e quests que organiza repos com LLMs agentic, analytics e CLI amigável ao pipx.',
      outcome:
        'Releases alfa mantêm README, FAQ e modelo de ameaças sincronizados com pytest.',
      metrics: [
        'Estado',
        'Alfa · pipx install axel',
        'Analytics',
        'Planejamento de quests a partir de listas de repos',
        'Docs',
        'FAQ · problemas conhecidos · modelo de ameaças com testes',
      ],
    },
    gitshelves: {
      summary:
        'CLI que transforma contribuições do GitHub em modelos OpenSCAD e STL para prateleiras Gridfinity impressas em 3D.',
      outcome:
        'Exporta pares SCAD/STL com metadados para refletir linhas do tempo de contribuição.',
      metrics: [
        'Material',
        'Blocos compatíveis Gridfinity de 42 mm',
        'Sincronia',
        'Gerado de linhas do tempo do GitHub',
      ],
    },
    portfolio: {
      summary:
        'Portfólio ortográfico Three.js/WebGL com navegação por teclado e fallback resiliente de texto para acessibilidade.',
      outcome: 'Mantém deploys imersivos e em texto alinhados em cada release.',
      metrics: [
        'Stack',
        'Vite · Three.js · HUD acessível',
        'Deploy',
        'CI smoke + docs + gates lint',
      ],
    },
    f2clipboard: {
      summary:
        'CLI que ingere páginas de tarefas Codex e logs GitHub, redige segredos e emite resumos Markdown prontos para colar.',
      outcome:
        'Automatiza coleta e resumo de logs CI para handoff rápido de depuração.',
      metrics: [
        'Velocidade',
        'Codex task → checks de PR GitHub → Markdown',
        'Formatos',
        'CLI + área de transferência + Markdown',
      ],
    },
    sigma: {
      summary:
        'Pin de IA ESP32 que envia áudio push-to-talk ao Whisper e retorna TTS em caixa OpenSCAD impressa em 3D.',
      outcome:
        'Inclui firmware, CAD da caixa, exportações STL e docs de montagem atualizados por CI.',
      metrics: [
        'Hardware',
        'ESP32 · caixa OpenSCAD',
        'Modos',
        'Push-to-talk · relay Whisper + TTS',
      ],
    },
    wove: {
      summary:
        'Toolkit open source para aprender tricô e crochê enquanto avança rumo a um tear robótico com hardware OpenSCAD.',
      outcome:
        'Docs cobrem calculadoras de amostra, exportações de planner e perfis de tensão por fios.',
      metrics: [
        'Artesanato',
        'Tear calibra a partir de mapas CAD de pontos',
        'Roteiro',
        'Caminho para laboratórios de tecelagem robótica',
      ],
    },
    dspace: {
      summary:
        'Exposição DSPACE para o jogo idle web Democratized Space, com recursos, missões, exploração e lançamentos orbitais.',
      outcome:
        'Aponta para o repositório público democratizedspace/dspace e a documentação oficial do jogo, sem logs não verificados.',
      metrics: [
        'Jogo',
        'Gestão de recursos · missões · exploração',
        'Docs',
        'Docs públicos e guia de desenvolvimento',
      ],
    },
    prReaper: {
      summary:
        'Workflow GitHub Actions que fecha PRs obsoletos em lote com previews dry-run e limpeza opcional de branches.',
      outcome:
        'Workflow de um botão documenta entradas, modelo de segurança e saídas de auditoria no README.',
      metrics: [
        'Varredura',
        'Fecha PRs obsoletos em lote com modo preview',
        'Cadência',
        'Cron + dry-runs manuais',
      ],
    },
    sugarkube: {
      summary:
        'Plataforma k3s em Raspberry Pi com cubo solar off-grid documentada com CAD, imagens Pi e guias de campo.',
      outcome:
        'Docs passo a passo cobrem hardware solar, provisionamento Pi e helpers Kubernetes.',
      metrics: [
        'Plataforma',
        'k3s, helpers Kubernetes, túneis Cloudflare e notas solares',
        'Hardware',
        'CAD do cubo solar, placas Pi e eletrônica',
        'Guias',
        'Imagens Pi e provisionamento headless',
      ],
    },
  },
});
