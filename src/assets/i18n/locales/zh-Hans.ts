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
        '每个沉浸式展品的快速摘要、成果和指标，便于无障碍阅读和搜索索引。',
      immersiveActionName: '启动沉浸模式',
      properties: {
        labels: { category: '类别', outcome: '成果', status: '状态' },
        categories: { project: '项目', environment: '环境' },
        statuses: { prototype: '原型', live: '上线' },
      },
    },
    textFallback: {
      heading: '浏览亮点',
      intro: '当沉浸模式不可用时，文字作品集仍提供每个展品的摘要、成果和指标。',
      roomHeadingTemplate: '{roomName} 展品',
      metricsHeading: '关键指标',
      linksHeading: '延伸阅读',
      about: {
        heading: '关于 Daniel',
        summary:
          '站点可靠性工程师，曾在 YouTube 工作六年，专注自动化、可观测性和稳定发布。',
        highlights: [
          '构建开发者平台和智能体工具，让团队更安全地快速交付。',
          '指导团队实践 SLO、事故响应和可靠性评审。',
          '探索沉浸式 WebGL 叙事，并始终提供可访问的文字回退。',
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
              'SRE、SLO、事故响应、可观测性、CI/CD、测试、提示词文档与智能体编程',
          },
        ],
      },
      contact: {
        heading: '联系',
        emailLabel: '邮箱',
        githubLabel: 'GitHub',
        resumeLabel: '简历 (PDF)',
      },
      recoveryCta: {
        title: '准备进入完整房间了吗？',
        description: '清除保存的文字模式偏好，并从这里重新启动沉浸式作品集。',
        actionLabel: '再次尝试沉浸模式',
        ariaLabel: '再次尝试沉浸模式并清除已保存的文字模式偏好',
      },
      actions: {
        immersiveLink: '再次尝试沉浸模式',
        debugImmersiveLink: '调试：强制沉浸模式',
        clearPreferenceButton: '清除保存的模式偏好',
        clearPreferenceSuccess: '已清除保存的模式偏好',
        resumeLink: '下载最新简历',
        githubLink: '在 GitHub 上浏览项目',
      },
      reasonHeadings: {
        manual: '已启用纯文字模式',
        'webgl-unsupported': '此设备无法使用沉浸模式',
        'low-memory': '检测到低内存设备',
        'low-end-device': '检测到轻量设备',
        'low-performance': '性能回退已启用',
        'immersive-init-error': '沉浸式场景遇到错误',
        'automated-client': '检测到自动化客户端',
        'data-saver': '已启用省流模式',
        'console-error': '检测到运行时错误',
      },
      reasonDescriptions: {
        manual: '你请求了轻量作品集视图。沉浸式场景仍可一键返回。',
        'webgl-unsupported':
          '浏览器或设备无法启动 WebGL 渲染器，因此先展示快速文字概览。',
        'low-memory': '设备报告内存有限，因此启动轻量文字导览以保持流畅。',
        'low-end-device': '我们检测到轻量设备配置，因此优先提供快速文字体验。',
        'low-performance': '持续帧率较低，因此切换到文字模式以保持内容可访问。',
        'immersive-init-error':
          '沉浸式场景启动失败。文字版本保留全部项目内容。',
        'automated-client': '自动化客户端会收到稳定、可索引的文字作品集。',
        'data-saver': '省流模式会跳过较重的实时 3D 场景。',
        'console-error': '检测到运行时错误，因此展示稳定的文字版本。',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: '控制',
      items: {
        keyboardMove: { keys: 'WASD / 方向键', description: '移动探索者' },
        pointerDrag: { keys: '拖动', description: '平移相机' },
        pointerZoom: { keys: '滚轮', description: '缩放视图' },
        touchDrag: { keys: '触控摇杆', description: '移动并平移' },
        touchPinch: { keys: '双指捏合', description: '缩放' },
        cyclePoi: { keys: 'Q / E', description: '切换兴趣点' },
        toggleTextMode: { keys: 'T', description: '切换文字模式' },
      },
      interact: {
        defaultLabel: '互动',
        description: '打开当前展品',
        promptTemplates: {
          inspect: '查看 {title}',
          activate: '启动 {title}',
          default: '探索 {title}',
        },
      },
      helpButton: {
        labelTemplate: '帮助 · 按 {keyHint}',
        announcementTemplate: '打开帮助和设置。按 {keyHint} 切换。',
        shortcutFallback: '帮助',
      },
      menu: {
        controls: { label: '控制', keyHint: 'C', title: '打开控制面板' },
        text: { label: '文字', keyHint: 'T', title: '切换到文字作品集' },
        settings: { label: '设置', keyHint: 'H', title: '打开设置和帮助' },
      },
      mobileToggle: {
        expandLabel: '显示控制',
        collapseLabel: '隐藏控制',
        expandAnnouncement: '控制已展开。',
        collapseAnnouncement: '控制已收起。',
      },
    },
    movementLegend: {
      defaultDescription: '互动',
      labels: {
        keyboard: 'Enter',
        pointer: '点击',
        touch: '轻触',
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
      description: '调整当前任务中的角色风格和随身装备。',
      variants: { title: '角色风格', description: '切换探索者的服装。' },
      accessories: {
        title: '配件',
        description: '切换腕部控制台或全息无人机伙伴。',
      },
    },
    audioControl: {
      keyHint: 'M',
      groupLabel: '环境音控制',
      toggle: {
        onLabelTemplate: '音频：开 · 按 {keyHint} 静音',
        offLabelTemplate: '音频：关 · 按 {keyHint} 取消静音',
        titleTemplate: '切换环境音 ({keyHint})',
        announcementOnTemplate: '环境音已开启。按 {keyHint} 切换。',
        announcementOffTemplate: '环境音已关闭。按 {keyHint} 切换。',
        pendingAnnouncementTemplate: '正在切换环境音，请稍候…',
      },
      slider: {
        label: '环境音量',
        ariaLabel: '环境音音量',
        hudLabel: '环境音音量滑块。',
        valueAnnouncementTemplate: '环境音量 {volume}。',
        mutedAnnouncementTemplate: '环境音已静音。音量设为 {volume}。',
        mutedValueTemplate: '已静音 · {volume}',
        mutedAriaValueTemplate: '已静音 ({volume})',
      },
    },
    localeToggle: {
      title: '语言',
      description: '切换 HUD 语言和文字方向。',
      options: {
        en: 'English',
        ja: '日本語',
        ar: 'العربية',
        'zh-Hans': '简体中文',
        'en-x-pseudo': 'Pseudo',
      },
      switchingAnnouncementTemplate: '正在切换到 {target}…',
      selectedAnnouncementTemplate: '已选择 {label}。',
      failureAnnouncementTemplate: '无法切换到 {target}，继续使用 {current}。',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: '文字模式 · 按 {keyHint}',
      idleDescriptionTemplate: '切换到纯文字作品集',
      idleAnnouncementTemplate: '切换到纯文字作品集。按 {keyHint} 启用。',
      idleTitleTemplate: '切换到纯文字作品集 ({keyHint})',
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
    tourGuideToggle: {
      labelEnabled: '导览已开启',
      labelDisabled: '导览已关闭',
      descriptionEnabled: '在沉浸式导览中高亮下一个推荐展品。',
      descriptionDisabled: '导览高亮已隐藏，直到你再次开启。',
    },
    tourReset: {
      heading: '导览',
      label: '重新开始导览',
      description: '清除已访问的兴趣点并重播精选路线。',
      emptyLabel: '导览已就绪',
      emptyDescription: '浏览展品后即可解锁导览重置。',
      pendingLabel: '正在重置导览…',
      pendingDescription: '正在重置导览…',
      restartPromptTemplate: '按 {key} 重新开始。',
      guidedTourDescription: '空闲时显示推荐展品。',
      guidedTourLabelOn: '导览高亮：开',
      guidedTourLabelOff: '导览高亮：关',
      guidedTourAnnouncementOn: '导览高亮已开启。激活可关闭推荐。',
      guidedTourAnnouncementOff: '导览高亮已关闭。激活可开启推荐。',
      guidedTourTitleOn: '关闭导览高亮',
      guidedTourTitleOff: '开启导览高亮',
    },
    softwareRendererWarning: {
      fallbackRendererLabel: '软件 WebGL 渲染器',
      title: '检测到软件渲染',
      descriptionTemplate:
        'Chrome 正在使用 {renderer} 而不是硬件加速。Basic Render Driver、SwiftShader、WARP 和 llvmpipe 在连续 WebGL 动画下可能崩溃。',
      recommendation:
        '启用浏览器硬件加速可获得流畅的沉浸式作品集。安全沉浸模式会限制帧率，同时保留截图和调试能力。',
      continueSafeLabel: '继续使用安全沉浸模式',
      continuousLabel: '仍然启用连续沉浸模式',
      textModeLabel: '使用文字模式',
      safeUrlLabel: '重新加载此安全沉浸 URL',
    },
    poiOverlay: {
      visited: '已访问',
      nextHighlight: '下一个亮点',
      prototype: '原型',
      live: '上线',
      closeDetails: '关闭兴趣点详情',
      relatedCaseStudies: '相关案例研究',
      outcomeFallbackLabel: '成果',
      discoveryAnnouncementTemplate: '已发现 {title}。{summary}',
    },
    narrativeLog: {
      heading: '创作者故事日志',
      visitedHeading: '已访问展品',
      empty: '访问展品即可解锁记录创作者展示的叙事条目。',
      defaultVisitedLabel: '已访问',
      visitedLabelTemplate: '{time} 访问',
      liveAnnouncementTemplate: '{title} 已添加到创作者故事日志。',
      journey: {
        heading: '旅程节点',
        empty: '探索新展品以编织旅程叙事。',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          '在{room}{descriptor}中，故事从 {fromPoi} 转向 {toPoi}。',
        crossRoomTemplate:
          '离开{fromRoom}{fromDescriptor}，旅程进入{toRoom}{toDescriptor}，聚焦 {toPoi}。',
        crossSectionTemplate:
          '向{direction}穿过门槛，路径流入{toRoom}{toDescriptor}，抵达 {toPoi}。',
        fallbackTemplate: '叙事流向 {toPoi}。',
        announcementTemplate: '旅程更新 — {label}: {story}',
        directions: { indoors: '室内', outdoors: '户外' },
      },
      rooms: {
        livingRoom: {
          label: '客厅',
          descriptor: '电影感休息区',
          zone: 'interior',
        },
        studio: {
          label: '工作室',
          descriptor: '自动化实验室',
          zone: 'interior',
        },
        kitchen: {
          label: '厨房实验室',
          descriptor: '烹饪机器人区域',
          zone: 'interior',
        },
        backyard: {
          label: '后院观测区',
          descriptor: '暮色花园',
          zone: 'exterior',
        },
      },
    },
    helpModal: {
      heading: '设置与帮助',
      description:
        '调整无障碍预设、图形质量、音频，并查看快捷键。使用帮助快捷键（默认 H 或 ?）切换此面板。',
      closeLabel: '关闭',
      closeAriaLabel: '关闭帮助',
      settings: {
        heading: '体验设置',
        description:
          '调整音频、视频和无障碍偏好。即使通过快捷键关闭菜单，这些控件也会保持可用。',
      },
      sections: [
        {
          id: 'movement',
          title: '移动与相机',
          items: [
            { label: 'WASD / 方向键', description: '让探索者在家中移动。' },
            { label: '鼠标拖动', description: '平移等距相机。' },
            { label: '滚轮', description: '调整缩放级别。' },
            { label: '触控摇杆', description: '左侧移动，右侧平移。' },
            { label: '捏合', description: '在触控设备上缩放。' },
          ],
        },
        {
          id: 'interactions',
          title: '互动',
          items: [
            {
              label: '靠近发光兴趣点',
              description: '按互动键、轻触或点击以打开展品浮层。',
            },
            {
              label: 'Q / E 或 ← / →',
              description: '用键盘在兴趣点之间切换焦点。',
            },
            { label: 'T', description: '在沉浸模式和文字回退之间切换。' },
            { label: 'Shift + L', description: '比较电影级灯光和调试通道。' },
          ],
        },
        {
          id: 'accessibility',
          title: '无障碍与回退',
          items: [
            {
              label: '低性能',
              description: '场景低于 30 FPS 时会自动切换到文字模式。',
            },
            {
              label: '手动切换',
              description: '随时使用屏幕上的文字模式按钮或按 T。',
            },
            {
              label: '运动模糊滑块',
              description: '在设置中的运动模糊控件调节拖影强度。',
            },
            { label: '环境音', description: '使用音频按钮或按 M 切换。' },
          ],
        },
      ],
      announcements: {
        open: '帮助菜单已打开。请查看控制和设置。',
        close: '帮助菜单已关闭。',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist',
      summary:
        '自动化 Futuroptimist 脚本工作台，用于整理研究、提纲和可配音的视频草稿。',
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary:
        '安全的点对点生成式 AI 平台，运行在 Raspberry Pi 集群上，配有加密中继和服务器节点。',
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary: '用于监控、告警和可靠性讲解的哨兵式自动化项目。',
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary: '把提示词、检查和发布节奏串联起来的自动化工作流。',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot 3000',
      summary: '面向求职流程的终端助手，整理机会、材料和后续行动。',
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary: '用于跟踪项目状态、反馈和持续改进的轻量工具。',
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves',
      summary: '把 GitHub 仓库整理成可浏览书架的作品集装置。',
    },
    'danielsmith-portfolio-table': {
      title: 'danielsmith.io',
      summary:
        '这个沉浸式作品集本身：将 Three.js 房间、无障碍文字回退和本地化 HUD 组合在一起。',
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary: '把失败日志快速复制成 CLI、剪贴板和 Markdown 输出的开发者工具。',
    },
    'sigma-kitchen-workbench': {
      title: 'Sigma',
      summary:
        'ESP32 “AI pin”，通过按键对讲把音频发送到 Whisper，并在 OpenSCAD 外壳中返回 TTS。',
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary:
        '学习针织和钩编的开源工具包，并逐步走向带 OpenSCAD 硬件的机器人织机。',
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary:
        '私人 DSPACE 火箭项目的后院发射架，包含遥测引导倒计时提示和公开任务日志。',
      interactionPrompt: '启动 {title} 倒计时',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'GitHub Actions 工作流，可批量关闭陈旧 PR，支持 dry-run 预览和可选分支清理。',
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube',
      summary:
        'Raspberry Pi 上的 k3s 平台，结合离网太阳能立方体安装、CAD、Pi 镜像和现场指南。',
    },
  },
};
