import type { LocaleOverrides } from '../types';

export const ZH_HANS_OVERRIDES: LocaleOverrides = {
  locale: 'zh-Hans',
  site: {
    name: 'Daniel Smith 沉浸式作品集',
    structuredData: {
      description: 'Daniel Smith 沉浸式作品集中的互动项目展品。',
      listNameTemplate: '{siteName} 展品',
      textCollectionNameTemplate: '{siteName} 文字作品集',
      textCollectionDescription:
        '快速加载每个沉浸式展品的摘要、成果和指标，便于无障碍阅读和爬虫预览。',
      immersiveActionName: '启动沉浸模式',
      properties: {
        labels: { category: '类别', outcome: '成果', status: '状态' },
        categories: { project: '项目', environment: '环境' },
        statuses: { prototype: '原型', live: '已上线' },
      },
    },
    textFallback: {
      heading: '浏览亮点',
      intro: '当沉浸模式不可用时，文字作品集仍提供每个展品的摘要、成果和指标。',
      roomHeadingTemplate: '{roomName} 展品',
      metricsHeading: '关键指标',
      linksHeading: '继续阅读',
      about: {
        heading: '关于 Daniel',
        summary:
          '网站可靠性工程师，曾在 YouTube 工作六年，专注自动化、可观测性和稳定发布。',
        highlights: [
          '构建开发者平台和智能体工具，让团队更安全、更快速地交付。',
          '指导团队实践 SLO、事故响应和可靠性评审。',
          '探索沉浸式 WebGL 叙事，并始终保留无障碍文字回退。',
        ],
      },
      skills: {
        heading: '技能概览',
        items: [
          {
            label: '语言',
            value:
              'Python、Go、SQL、C++、TypeScript/JavaScript、Ruby、Objective-C',
          },
          {
            label: '基础设施与工具',
            value:
              'Kubernetes、Docker、Google Cloud (BigQuery)、GitHub Actions、WebGL/Three.js、React/Next.js、Astro',
          },
          {
            label: '实践',
            value:
              'SRE（SLO、事故响应、容量）、可观测性、CI/CD、测试、提示文档和智能体编程',
          },
        ],
      },
      timeline: {
        heading: '工作时间线',
        entries: [
          {
            period: '2018 年 9 月 — 2025 年 5 月',
            location: '加州圣布鲁诺',
            role: '网站可靠性工程师（L4）',
            org: 'YouTube (Google)',
            summary:
              '负责多个产品面的值班，用 Python/Go/SQL/C++ 自动化监控，并为领导层推动可靠性评审。',
          },
          {
            period: '2017 年 1 月 — 2018 年 9 月',
            location: '密西西比州斯坦尼斯航天中心',
            role: '软件工程师',
            org: '海军研究实验室',
            summary: '在 Scrum 冲刺中交付 C++/Qt 数据处理应用和远程演示。',
          },
          {
            period: '2014 年 3 月 — 2016 年 12 月',
            location: '密西西比州哈蒂斯堡',
            role: '软件开发者',
            org: '南密西西比大学',
            summary: '为大学 iOS 应用构建实时内容投放的 Objective-C 框架。',
          },
        ],
      },
      contact: {
        heading: '联系',
        emailLabel: '邮箱',
        githubLabel: 'GitHub',
        resumeLabel: '简历（PDF）',
      },
      recoveryCta: {
        title: '准备进入完整房间？',
        description: '清除已保存的文字模式偏好，并从这里重新启动沉浸式作品集。',
        actionLabel: '再次尝试沉浸模式',
        ariaLabel: '再次尝试沉浸模式，并清除已保存的文字模式偏好',
      },
      actions: {
        immersiveLink: '再次尝试沉浸模式',
        debugImmersiveLink: '调试：强制沉浸模式',
        clearPreferenceButton: '清除已保存的模式偏好',
        clearPreferenceSuccess: '已清除保存的模式偏好',
        resumeLink: '下载最新简历',
        githubLink: '在 GitHub 浏览项目',
      },
      reasonHeadings: {
        manual: '已启用纯文字模式',
        'webgl-unsupported': '此设备无法使用沉浸模式',
        'low-memory': '检测到低内存设备',
        'low-end-device': '检测到轻量设备',
        'low-performance': '性能回退已启用',
        'immersive-init-error': '沉浸式场景遇到错误',
        'automated-client': '检测到自动化客户端',
        'data-saver': '已启用省流量模式',
        'console-error': '检测到运行时错误',
      },
      reasonDescriptions: {
        manual: '你选择了轻量作品集视图。沉浸式场景仍可一键返回。',
        'webgl-unsupported':
          '你的浏览器或设备无法启动 WebGL 渲染器。请先阅读快速文字概览。',
        'low-memory': '设备报告内存有限，因此已启动轻量文字导览以保持流畅。',
        'low-end-device': '检测到轻量设备配置，因此已加载快速文字导览。',
        'low-performance': '检测到持续低帧率，因此切换到响应更快的文字导览。',
        'immersive-init-error': '启动沉浸式场景时出错，因此改为显示文字概览。',
        'automated-client':
          '检测到自动化客户端，因此显示便于预览和爬虫读取的文字作品集。',
        'data-saver': '浏览器请求省流量体验，因此加载轻量文字导览以降低带宽。',
        'console-error':
          '检测到运行时错误，已切换到稳定的文字导览等待沉浸场景恢复。',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: '控制',
      items: {
        keyboardMove: { keys: 'WASD / 方向键', description: '移动' },
        pointerDrag: { keys: '鼠标左键', description: '拖动平移' },
        pointerZoom: { keys: '滚轮', description: '缩放' },
        touchDrag: { keys: '触控', description: '左半区移动，右半区平移' },
        touchPinch: { keys: '双指捏合', description: '缩放' },
        cyclePoi: { keys: 'Q / E', description: '切换兴趣点' },
        toggleTextMode: { keys: 'T', description: '切换到文字模式' },
      },
      interact: {
        defaultLabel: 'Enter',
        description: '互动',
        promptTemplates: {
          default: '与 {title} 互动',
          inspect: '查看 {title}',
          activate: '启动 {title}',
        },
      },
      helpButton: {
        labelTemplate: '打开菜单 · 按 {shortcut}',
        announcementTemplate:
          '打开设置和帮助。按 {shortcut} 查看控制和无障碍提示。',
        shortcutFallback: 'H',
      },
      menu: {
        controls: { label: '控制', keyHint: 'C', title: '打开控制（C）' },
        text: { label: '文字', keyHint: 'T', title: '切换到文字模式（T）' },
        settings: { label: '设置', keyHint: 'H', title: '打开设置和帮助（H）' },
      },
      mobileToggle: {
        expandLabel: '显示全部控制',
        collapseLabel: '隐藏额外控制',
        expandAnnouncement: '正在为移动玩家显示完整控制列表。',
        collapseAnnouncement: '正在隐藏额外控制，让列表保持简洁。',
      },
    },
    movementLegend: {
      defaultDescription: '互动',
      labels: {
        keyboard: 'Enter',
        pointer: '点击',
        touch: '轻点',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: '按 {label} {prompt}',
        pointer: '{label}{prompt}',
        touch: '{label}{prompt}',
        gamepad: '按 {label} {prompt}',
      },
    },
    customization: {
      heading: '自定义',
      description: '为当前任务调整人偶风格和伙伴装备。',
      variants: { title: '头像风格', description: '切换探索者人偶的服装。' },
      accessories: {
        title: '配件',
        description: '切换腕部控制台或全息无人机伙伴。',
      },
    },
    audioControl: {
      keyHint: 'M',
      groupLabel: '环境音频控制',
      toggle: {
        onLabelTemplate: '音频：开 · 按 {keyHint} 静音',
        offLabelTemplate: '音频：关 · 按 {keyHint} 取消静音',
        titleTemplate: '切换环境音频（{keyHint}）',
        announcementOnTemplate: '环境音频已开启。按 {keyHint} 切换。',
        announcementOffTemplate: '环境音频已关闭。按 {keyHint} 切换。',
        pendingAnnouncementTemplate: '正在切换环境音频状态，请稍候…',
      },
      slider: {
        label: '环境音量',
        ariaLabel: '环境音频音量',
        hudLabel: '环境音频音量滑块。',
        valueAnnouncementTemplate: '环境音频音量 {volume}。',
        mutedAnnouncementTemplate: '环境音频已静音。音量设为 {volume}。',
        mutedValueTemplate: '已静音 · {volume}',
        mutedAriaValueTemplate: '已静音（{volume}）',
      },
    },
    localeToggle: {
      title: '语言',
      description: '切换 HUD 语言和文字方向。',
      switchingAnnouncementTemplate: '正在切换到 {target} 语言…',
      selectedAnnouncementTemplate: '已选择 {label}。',
      failureAnnouncementTemplate: '无法切换到 {target}。仍停留在 {current}。',
    },
    tourGuideToggle: {
      labelEnabled: '导览已开启',
      labelDisabled: '导览已关闭',
      descriptionEnabled: '在沉浸式导览中高亮下一个推荐展品。',
      descriptionDisabled: '导览高亮已隐藏，直到你重新开启。',
    },
    tourReset: {
      heading: '引导导览',
      resetKey: 'g',
      label: '重新开始引导导览',
      description: '清除已访问的兴趣点并重播精选路径。',
      emptyLabel: '引导导览已就绪',
      emptyDescription: '探索展品后即可解锁导览重置。',
      pendingLabel: '正在重置导览…',
      pendingDescription: '正在重置引导导览…',
      restartPromptTemplate: '按 {key} 重新开始。',
      guidedTourDescription: '空闲时显示推荐展品。',
      guidedTourLabelOn: '导览高亮：开',
      guidedTourLabelOff: '导览高亮：关',
      toggleAnnouncementOn: '导览高亮已启用。激活可关闭推荐。',
      toggleAnnouncementOff: '导览高亮已停用。激活可启用推荐。',
      toggleTitleOn: '关闭导览高亮',
      toggleTitleOff: '开启导览高亮',
    },
    softwareRendererWarning: {
      title: '检测到软件渲染',
      rendererFallbackLabel: '软件 WebGL 渲染器',
      descriptionTemplate:
        'Chrome 正在使用 {renderer}，而不是硬件加速。Basic Render Driver、SwiftShader、WARP 和 llvmpipe 可能会在连续 WebGL 动画下崩溃。',
      recommendation:
        '请启用浏览器硬件加速以获得流畅的沉浸式作品集。安全沉浸模式会限制帧率，同时保留截图和调试能力。',
      continueSafeLabel: '继续使用安全沉浸模式',
      continuousLabel: '仍然启用连续沉浸模式',
      textModeLabel: '使用文字模式',
      safeUrlLabel: '重新加载此安全沉浸链接',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: '文字模式 · 按 {keyHint}',
      idleDescriptionTemplate: '切换到纯文字作品集',
      idleAnnouncementTemplate: '切换到纯文字作品集。按 {keyHint} 激活。',
      idleTitleTemplate: '切换到纯文字作品集（{keyHint}）',
      pendingLabelTemplate: '正在切换到文字模式…',
      pendingAnnouncementTemplate: '切换到纯文字作品集。正在切换到文字模式…',
      activeLabelTemplate: '再次尝试沉浸模式 · 按 {keyHint}',
      activeDescriptionTemplate: '返回沉浸式作品集。',
      activeAnnouncementTemplate:
        '文字模式已启用。按 {keyHint} 再次尝试沉浸模式。',
      errorLabelTemplate: '重试文字模式 · 按 {keyHint}',
      errorDescriptionTemplate: '文字模式切换失败。请重试或使用沉浸链接。',
      errorAnnouncementTemplate: '文字模式切换失败。按 {keyHint} 重试。',
      errorTitleTemplate: '文字模式切换失败。按 {keyHint} 重试文字模式。',
    },
    poiOverlay: {
      visited: '已访问',
      nextHighlight: '下一个亮点',
      prototype: '原型',
      live: '已上线',
      closeDetails: '关闭兴趣点详情',
      relatedCaseStudies: '相关案例研究',
      outcomeFallbackLabel: '成果',
      discoveryAnnouncementTemplate: '已发现 {title}。{summary}',
    },
    narrativeLog: {
      heading: '创作者故事日志',
      visitedHeading: '已访问展品',
      empty: '靠近展品即可把它们加入故事日志。',
      defaultVisitedLabel: '已访问',
      visitedLabelTemplate: '访问时间 {time}',
      liveAnnouncementTemplate: '{title} 已加入创作者故事日志。',
      journey: {
        heading: '旅程提示',
        empty: '探索新的展品来编织旅程叙事。',
        entryLabelTemplate: '{from} 到 {to}',
        sameRoomTemplate: '继续在 {room} 内探索，从 {from} 前往 {to}。',
        crossRoomTemplate: '从 {fromRoom} 的 {from} 前往 {toRoom} 的 {to}。',
        crossSectionTemplate:
          '从{direction}的 {fromRoom} 前往{nextDirection}的 {toRoom}，连接 {from} 和 {to}。',
        fallbackTemplate: '从 {from} 继续前往 {to}。',
        announcementTemplate: '下一段旅程：{summary}',
        directions: { indoors: '室内', outdoors: '室外' },
      },
      rooms: {
        living: { label: '客厅', descriptor: '客厅展区', zone: 'interior' },
        studio: { label: '工作室', descriptor: '工作室展区', zone: 'interior' },
        kitchen: { label: '厨房', descriptor: '厨房展区', zone: 'interior' },
        backyard: { label: '后院', descriptor: '后院展区', zone: 'exterior' },
      },
    },
    helpModal: {
      heading: '帮助与设置',
      description:
        '查看控制、无障碍选项，以及体验从沉浸模式回退到文字模式的方式。',
      closeLabel: '关闭',
      closeAriaLabel: '关闭帮助与设置',
      settings: {
        heading: '设置',
        description: '调整语言、音频、外观和导览控件。',
      },
      announcements: {
        open: '帮助菜单已打开。请查看控制和设置。',
        close: '帮助菜单已关闭。',
      },
      sections: [
        {
          id: 'movement',
          title: '移动与相机',
          items: [
            { label: '移动', description: '使用 WASD 或方向键相对相机移动。' },
            { label: '平移', description: '用鼠标拖动或触控右半区平移相机。' },
            { label: '缩放', description: '使用滚轮或双指捏合缩放视图。' },
          ],
        },
        {
          id: 'interaction',
          title: '互动',
          items: [
            {
              label: '兴趣点',
              description: '靠近发光展品并按 Enter、点击或轻点查看详情。',
            },
            {
              label: '切换展品',
              description: '按 Q 或 E 在可见兴趣点之间切换。',
            },
            { label: '文字模式', description: '按 T 打开可访问的文字作品集。' },
          ],
        },
        {
          id: 'accessibility',
          title: '无障碍与回退',
          items: [
            {
              label: '语言',
              description: '在设置中切换语言；阿拉伯语保持从右到左。',
            },
            {
              label: '性能',
              description: '低性能或省流量环境会自动显示文字导览。',
            },
            { label: '音频', description: '环境音频可静音并调整音量。' },
          ],
        },
      ],
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist',
      summary:
        '自动化 Futuroptimist 脚本工作台，把研究、提纲和可配音草稿串成新视频。',
      outcome: {
        label: '成果',
        value: '把创意流水线、提示文档和发布检查集中到一个可复用系统。',
      },
      interactionPrompt: '查看 {title}',
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary: '端到端加密剪贴板与令牌中继系统，把敏感内容保留在用户设备上。',
      outcome: {
        label: '成果',
        value: '提供加密、盲中继和安全诊断，支持隐私优先的共享流程。',
      },
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary:
        '面向创作者的智能体助手，把研究、写作和任务编排放进可审阅的工作流。',
      outcome: {
        label: '成果',
        value: '将提示、工具和审查清单组织成可重复的自动化体验。',
      },
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary:
        '可靠性和发布节奏工作台，帮助团队把提示、检查和 CI 信号接入同一个循环。',
      outcome: {
        label: '成果',
        value: '把自动化开发、测试和文档检查连接成可持续的交付飞轮。',
      },
      interactionPrompt: '启动 {title} 系统',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000',
      summary: '求职自动化终端，整理机会、申请资料和跟进任务。',
      outcome: {
        label: '成果',
        value: '把求职流水线拆成可追踪、可审阅、可自动化的步骤。',
      },
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary: '自行车与出行实验，把路线、维护和小型硬件记录成可分享项目。',
      outcome: {
        label: '成果',
        value: '把现实世界的骑行数据和维护提醒组织进轻量工具。',
      },
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves',
      summary: 'GitHub 活动书架，把提交节奏和项目历史变成发光的室内陈列。',
      outcome: {
        label: '成果',
        value: '把代码活动可视化成可浏览、可讲故事的空间装置。',
      },
    },
    'danielsmith-portfolio-table': {
      title: 'danielsmith.io',
      summary:
        '本站的沉浸式作品集，将 Three.js 房间、HUD、POI 和文字回退组合在一起。',
      outcome: {
        label: '成果',
        value: '同时服务沉浸访问者、键盘用户、爬虫和低性能设备。',
      },
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary:
        '快速复制失败日志的 CLI/剪贴板工具，便于把调试上下文发给智能体或队友。',
      outcome: {
        label: '成果',
        value: '把失败输出转成可粘贴的 Markdown 和剪贴板内容。',
      },
    },
    'sigma-kitchen-workbench': {
      title: 'Sigma',
      summary:
        'ESP32 “AI pin”，把按键通话音频发往 Whisper，并在 OpenSCAD 外壳中返回 TTS。',
      outcome: {
        label: '成果',
        value: '包含固件、外壳 CAD、STL 导出和由 CI 保持更新的装配文档。',
      },
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary:
        '学习针织和钩针的开源工具包，并朝着带 OpenSCAD 硬件的机器人织机推进。',
      outcome: {
        label: '成果',
        value: '文档覆盖密度计算、规划导出和不同线材重量的张力曲线。',
      },
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary:
        '私人 DSPACE 火箭项目的后院发射架，带遥测倒计时提示和公开任务日志。',
      outcome: {
        label: '成果',
        value: '在仓库保持私有时，维护倒计时编排笔记、GitHub 链接和任务日志。',
      },
      interactionPrompt: '启动 {title} 倒计时',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'GitHub Actions 工作流，可批量关闭陈旧拉取请求，支持预演和可选分支清理。',
      outcome: {
        label: '成果',
        value: 'README 记录一键工作流的输入、安全模型和审计输出。',
      },
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube',
      summary:
        '树莓派 k3s 平台搭配离网太阳能方块装置，配有 CAD、Pi 镜像和现场指南。',
      outcome: {
        label: '成果',
        value:
          '逐步文档覆盖太阳能硬件、Pi 配置和韧性 homelab 的 Kubernetes 辅助工具。',
      },
    },
  },
};
