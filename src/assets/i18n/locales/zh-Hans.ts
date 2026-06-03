import type { LocaleOverrides } from '../types';

export const ZH_HANS_OVERRIDES: LocaleOverrides = {
  locale: 'zh-Hans',
  site: {
    name: 'Daniel Smith 沉浸式作品集',
    structuredData: {
      description:
        '在 Daniel Smith 的沉浸式作品集中探索交互式项目展品、成果和叙事。',
      listNameTemplate: '{siteName} 展品',
      textCollectionNameTemplate: '{siteName} 文字作品集',
      textCollectionDescription:
        '为无障碍阅读和搜索爬虫优化的快速摘要，覆盖每个沉浸式展品。',
      immersiveActionName: '启动沉浸模式',
      properties: {
        labels: {
          category: '类别',
          outcome: '成果',
          status: '状态',
        },
        categories: {
          project: '项目',
          environment: '环境',
        },
        statuses: {
          prototype: '原型',
          live: '已上线',
        },
      },
      publisher: { name: 'Daniel Smith' },
      author: { name: 'Daniel Smith' },
    },
    textFallback: {
      heading: '浏览亮点',
      intro:
        '当沉浸模式不可用时，文字作品集会以简短摘要、成果和指标保持每个展品可访问。',
      roomHeadingTemplate: '{roomName}展品',
      metricsHeading: '关键指标',
      linksHeading: '延伸阅读',
      about: {
        heading: '关于 Daniel',
        summary:
          '曾在 YouTube 担任六年网站可靠性工程师，专注自动化、可观测性和稳定发布。',
        highlights: [
          '构建开发者平台和智能代理工具，让团队更快且更安全地交付。',
          '辅导团队开展 SLO、事故响应和可靠性评审。',
          '探索沉浸式 WebGL 叙事，并始终提供可访问的文字备用体验。',
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
              'SRE（SLO、事故响应、容量）、可观测性、CI/CD、测试、提示词文档与代理式编码',
          },
        ],
      },
      timeline: {
        heading: '工作时间线',
        entries: [
          {
            period: '2018年9月 — 2025年5月',
            location: '加州圣布鲁诺',
            role: '网站可靠性工程师 (L4)',
            org: 'YouTube (Google)',
            summary:
              '负责多个产品面的值班，使用 Python/Go/SQL/C++ 自动化监控，并推动面向领导层的可靠性评审。',
          },
          {
            period: '2017年1月 — 2018年9月',
            location: '密西西比州斯坦尼斯航天中心',
            role: '软件工程师',
            org: 'Naval Research Laboratory',
            summary: '在 Scrum 节奏中交付 C++/Qt 数据处理应用和远程演示。',
          },
          {
            period: '2014年3月 — 2016年12月',
            location: '密西西比州哈蒂斯堡',
            role: '软件开发者',
            org: '南密西西比大学',
            summary: '为大学 iOS 应用构建 Objective-C 实时内容投放框架。',
          },
        ],
      },
      contact: {
        heading: '联系方式',
        emailLabel: '邮箱',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: '简历 (PDF)',
        resumeUrl: 'docs/resume/2025-09/resume.pdf',
      },
      recoveryCta: {
        title: '准备进入完整房间了吗？',
        description: '清除已保存的文字偏好，并从这里重新启动沉浸式作品集。',
        actionLabel: '再次尝试沉浸模式',
        ariaLabel: '再次尝试沉浸模式并清除已保存的文字模式偏好',
      },
      actions: {
        immersiveLink: '再次尝试沉浸模式',
        debugImmersiveLink: '调试：强制沉浸模式',
        clearPreferenceButton: '清除已保存的模式偏好',
        clearPreferenceSuccess: '已清除保存的模式偏好',
        resumeLink: '下载最新版简历',
        githubLink: '在 GitHub 上浏览项目',
      },
      reasonHeadings: {
        manual: '已启用纯文字模式',
        'webgl-unsupported': '此设备无法使用沉浸模式',
        'low-memory': '检测到低内存设备',
        'low-end-device': '检测到轻量设备',
        'low-performance': '性能备用模式已启用',
        'immersive-init-error': '沉浸式场景遇到错误',
        'automated-client': '检测到自动化客户端',
        'data-saver': '已启用省流量模式',
        'console-error': '检测到运行时错误',
      },
      reasonDescriptions: {
        manual: '你请求了轻量作品集视图。沉浸式场景仍可一键返回。',
        'webgl-unsupported':
          '你的浏览器或设备无法启动 WebGL 渲染器。请先使用快速文字概览。',
        'low-memory':
          '设备报告内存有限，因此我们启动了轻量文字导览以保持流畅。',
        'low-end-device':
          '我们检测到轻量设备配置，因此加载快速文字导览以保持导航响应。',
        'low-performance':
          '我们检测到持续低帧率，因此切换到响应更快的文字导览。',
        'immersive-init-error':
          '启动沉浸式场景时出现问题，因此先为你显示文字概览。',
        'automated-client':
          '检测到自动化客户端，因此展示快速加载的文字作品集以便预览和爬虫访问。',
        'console-error':
          '检测到运行时错误，已切换到稳健的文字导览，同时沉浸式场景恢复。',
        'data-saver':
          '浏览器请求省流量体验，因此我们启动轻量文字导览以减少带宽并保留重点内容。',
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
        touchDrag: {
          keys: '触摸',
          description: '拖动左半屏移动，拖动右半屏平移',
        },
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
          '打开设置和帮助。按 {shortcut} 查看控制方式和无障碍提示。',
        shortcutFallback: 'H',
      },
      menu: {
        controls: { label: '控制', keyHint: 'C', title: '打开控制 (C)' },
        text: { label: '文字', keyHint: 'T', title: '切换到文字模式 (T)' },
        settings: { label: '设置', keyHint: 'H', title: '打开设置和帮助 (H)' },
      },
      mobileToggle: {
        expandLabel: '显示全部控制',
        collapseLabel: '隐藏额外控制',
        expandAnnouncement: '正在显示移动端玩家的完整控制列表。',
        collapseAnnouncement: '正在隐藏额外控制，使列表保持紧凑。',
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
        pointer: '{label}以{prompt}',
        touch: '{label}以{prompt}',
        gamepad: '按 {label} {prompt}',
      },
    },
    customization: {
      heading: '自定义',
      description: '调整当前任务中的角色样式和随身装备。',
      variants: {
        title: '角色样式',
        description: '切换人体模型探索者的装束。',
      },
      accessories: {
        title: '配件',
        description: '切换腕部控制台或全息无人机伙伴。',
      },
    },
    guidedTour: {
      heading: '引导游览',
      description: '空闲时显示推荐展品。',
      toggleLabelOn: '引导游览高亮：开启',
      toggleLabelOff: '引导游览高亮：关闭',
      toggleTitleOn: '关闭引导游览高亮',
      toggleTitleOff: '开启引导游览高亮',
      toggleAnnouncementOn: '引导游览高亮已开启。激活可关闭推荐。',
      toggleAnnouncementOff: '引导游览高亮已关闭。激活可开启推荐。',
      resetLabel: '重新开始引导游览',
      resetDescription: '清除已访问的兴趣点并重新播放精选路线。',
      resetEmptyLabel: '引导游览已准备好',
      resetEmptyDescription: '探索展品以解锁引导游览重置。',
      resetPendingLabel: '正在重置游览…',
      resetPendingDescription: '正在重置引导游览…',
      resetShortcutTemplate: '按 {key} 重新开始。',
    },
    softwareRendererWarning: {
      title: '检测到软件渲染',
      rendererFallbackLabel: '软件 WebGL 渲染器',
      descriptionTemplate:
        'Chrome 正在使用 {renderer}，而不是硬件加速。Basic Render Driver、SwiftShader、WARP 和 llvmpipe 在连续 WebGL 动画中可能崩溃。',
      recommendation:
        '请启用浏览器硬件加速以获得流畅的沉浸式作品集。安全沉浸模式会限制帧率，同时保留截图和调试能力。',
      continueSafeLabel: '继续使用安全沉浸模式',
      continuousLabel: '仍然启用连续沉浸模式',
      textModeLabel: '使用文字模式',
      safeUrlLabel: '重新加载此安全沉浸 URL',
    },
    audioControl: {
      keyHint: 'M',
      groupLabel: '环境音频控制',
      toggle: {
        onLabelTemplate: '音频：开 · 按 {keyHint} 静音',
        offLabelTemplate: '音频：关 · 按 {keyHint} 取消静音',
        titleTemplate: '切换环境音频 ({keyHint})',
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
        mutedAriaValueTemplate: '已静音 ({volume})',
      },
    },
    localeToggle: {
      title: '语言',
      description: '切换 HUD 语言和方向。',
      switchingAnnouncementTemplate: '正在切换到 {target} 语言…',
      selectedAnnouncementTemplate: '已选择 {label} 语言。',
      failureAnnouncementTemplate:
        '无法切换到 {target}。继续使用 {current} 语言。',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: '文字模式 · 按 {keyHint}',
      idleDescriptionTemplate: '切换到纯文字作品集',
      idleAnnouncementTemplate: '切换到纯文字作品集。按 {keyHint} 激活。',
      idleTitleTemplate: '切换到纯文字作品集 ({keyHint})',
      pendingLabelTemplate: '正在切换到文字模式…',
      pendingAnnouncementTemplate: '切换到纯文字作品集。正在切换到文字模式…',
      activeLabelTemplate: '再次尝试沉浸模式 · 按 {keyHint}',
      activeDescriptionTemplate: '返回沉浸式作品集。',
      activeAnnouncementTemplate:
        '文字模式已激活。按 {keyHint} 再次尝试沉浸模式。',
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
      discoveryAnnouncementTemplate: '发现 {title}。{summary}',
    },
    narrativeLog: {
      heading: '创作者故事日志',
      visitedHeading: '已访问展品',
      empty: '访问展品即可解锁记录创作者展示的叙事条目。',
      defaultVisitedLabel: '已访问',
      visitedLabelTemplate: '访问时间 {time}',
      liveAnnouncementTemplate: '{title} 已加入创作者故事日志。',
      journey: {
        heading: '旅程节点',
        empty: '探索新展品以编织旅程叙事。',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          '在{room}的{descriptor}中，故事从 {fromPoi} 转向 {toPoi}。',
        crossRoomTemplate:
          '离开{fromRoom}的{fromDescriptor}，旅程进入{toRoom}的{toDescriptor}，突出 {toPoi}。',
        crossSectionTemplate:
          '向{direction}穿过门槛，路径流入{toRoom}的{toDescriptor}并抵达 {toPoi}。',
        fallbackTemplate: '叙事流向 {toPoi}。',
        announcementTemplate: '旅程更新 — {label}：{story}',
        directions: { indoors: '回到室内', outdoors: '走向户外' },
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
          descriptor: '烹饪机器人区',
          zone: 'interior',
        },
        backyard: {
          label: '后院观测台',
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
          '调整音频、视频和无障碍偏好。即使通过键盘快捷键关闭菜单，这些控制仍可使用。',
      },
      sections: [
        {
          id: 'movement',
          title: '移动与相机',
          items: [
            { label: 'WASD / 方向键', description: '在房间中移动探索者。' },
            { label: '鼠标拖动', description: '平移等距相机。' },
            { label: '滚轮', description: '调整缩放级别。' },
            {
              label: '触摸摇杆',
              description: '拖动左侧触控板移动，拖动右侧触控板平移。',
            },
            { label: '双指捏合', description: '在触摸设备上缩放。' },
          ],
        },
        {
          id: 'interactions',
          title: '互动',
          items: [
            {
              label: '靠近发光兴趣点',
              description:
                '按互动键（Enter/Space/F）、轻点或点击以打开展品覆盖层。',
            },
            {
              label: 'Q / E 或 ← / →',
              description: '用键盘在兴趣点之间循环焦点。',
            },
            { label: 'T', description: '在沉浸模式和文字备用模式之间切换。' },
            { label: 'Shift + L', description: '比较电影灯光和调试渲染通道。' },
          ],
        },
        {
          id: 'accessibility',
          title: '无障碍与故障切换',
          items: [
            {
              label: '低性能',
              description: '当场景低于 30 FPS 时会自动切换到文字模式。',
            },
            {
              label: '手动切换',
              description: '可随时使用屏幕上的文字模式按钮或按 T。',
            },
            {
              label: '运动模糊滑块',
              description: '在“设置 → 运动模糊”中调整拖尾强度。',
            },
            { label: '环境音频', description: '使用音频按钮或按 M 切换。' },
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
      summary: '自动化视频脚本工作台，将研究、提纲和可旁白草稿串联成新视频。',
      outcome: {
        label: '成果',
        value: '让每周亮点脚本持续从自动化流水线产出，无需手动格式化。',
      },
      metrics: [
        { label: '星标', value: '1,280+' },
        { label: '工作流', value: 'Resolve 风格剪辑台 · 三屏显示' },
        { label: '重点', value: 'Futuroptimist 生态短片制作中' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist' },
        { label: '文档', href: 'https://futuroptimist.dev' },
      ],
      narration: { caption: 'Futuroptimist 媒体墙在客厅中投射高光视频。' },
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary:
        '运行在 Raspberry Pi 阵列上的安全点对点生成式 AI 平台，带加密中继和服务器节点。',
      outcome: {
        label: '成果',
        value: '快速启动脚本可在本地拉起中继、服务器和模拟 LLM 栈用于测试。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '集群', value: '12 个 Pi 5 节点置于模块化舱位' },
        { label: '网络', value: '临时令牌 · 加密突发传输' },
      ],
      links: [
        { label: '网站', href: 'https://token.place' },
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/token.place',
        },
      ],
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary:
        '隐私优先的“守护天使”LLM，提供本地安全指导，并可接入 token.place 或离线推理。',
      outcome: {
        label: '成果',
        value: '摄取、分析、通知和 UI 栈通过类型化接口保持一致。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '重点', value: '360° 激光雷达扫描 + 本地启发式' },
        { label: '节奏', value: '红色警报每 1.0 秒闪烁' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/gabriel' },
      ],
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary:
        'GitHub 模板和自动化中枢，打包 lint、测试、文档和 Codex 提示以快速启动仓库。',
      outcome: {
        label: '成果',
        value: '交付可重复 CI 和提示库，让新仓库从一开始保持健康。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '自动化', value: 'CI 脚手架 · 类型化提示 · QA 循环' },
        { label: '文档 CTA', value: 'flywheel.futuroptimist.dev →' },
      ],
      links: [
        {
          label: 'Flywheel 仓库',
          href: 'https://github.com/futuroptimist/flywheel',
        },
        { label: '文档', href: 'https://flywheel.futuroptimist.dev' },
      ],
      narration: { caption: 'Flywheel 动能枢纽启动，聚焦自动化提示和工具。' },
      interactionPrompt: '启动 {title} 系统',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000',
      summary:
        '自托管求职副驾驶，带 CLI 和实验性 Web UI，用于摄取外联并跟踪申请。',
      outcome: {
        label: '成果',
        value: '端到端流程与文档和测试保持一致，覆盖招聘外联流。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '状态', value: '本地优先 CLI，带预览 Web UI' },
        { label: '技术栈', value: 'Node.js 20+ · npm 脚本 · Playwright 预览' },
        { label: '流程', value: '招聘外联摄取和生命周期跟踪' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/jobbot3000',
        },
        { label: '自动化日志', href: 'https://futuroptimist.dev/automation' },
      ],
      narration: { caption: 'Jobbot 全息终端以闪烁覆盖层流式展示自动化遥测。' },
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary:
        '目标和任务追踪器，使用代理式 LLM、分析助手和 pipx 友好 CLI 组织仓库。',
      outcome: {
        label: '成果',
        value: 'Alpha 发布让 README、FAQ 和威胁模型与 pytest 套件同步。',
      },
      metrics: [
        { label: '状态', value: 'Alpha · pipx install axel' },
        { label: '仓库分析', value: '根据仓库列表和扫描进行任务规划' },
        { label: '文档', value: 'FAQ · 已知问题 · 威胁模型随测试维护' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/axel' },
      ],
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves',
      summary:
        'CLI 将 GitHub 贡献数据转换为 OpenSCAD 和 STL 模型，用于 3D 打印 Gridfinity 书架。',
      outcome: {
        label: '成果',
        value: '导出带元数据的 SCAD/STL 对，让打印书架映射贡献时间线。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '输出', value: 'OpenSCAD · STL · GitHub 贡献元数据' },
        { label: '形态', value: 'Gridfinity 兼容展示架' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/gitshelves',
        },
      ],
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary:
        '开发者工具，可把失败日志、命令和上下文快速复制成可分享的 Markdown。',
      outcome: {
        label: '成果',
        value: '让调试片段更容易粘贴到 PR、issue 和代理提示中。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '速度', value: '3 秒内复制失败日志' },
        { label: '格式', value: 'CLI + 剪贴板 + Markdown 输出' },
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
        'ESP32 “AI pin”，将按键通话音频流式发送到 Whisper，并在 3D 打印 OpenSCAD 外壳中返回 TTS。',
      outcome: {
        label: '成果',
        value: '包含固件、外壳 CAD、STL 导出和由 CI 保持更新的装配文档。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '硬件', value: 'ESP32 · OpenSCAD 外壳' },
        { label: '模式', value: '按键通话 · Whisper + TTS 中继' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/sigma' },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary:
        '开源工具包，用于学习针织和钩针，并逐步构建带 OpenSCAD 硬件的机器人织机。',
      outcome: {
        label: '成果',
        value: '文档覆盖密度计算器、计划导出和跨纱线重量的张力配置。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '手工艺', value: '织机根据 CAD 针脚图校准' },
        { label: '路线图', value: '迈向机器人编织实验室' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/wove' },
      ],
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary:
        '私人 DSPACE 火箭项目的后院发射架，带遥测倒计时提示和公开任务日志。',
      outcome: {
        label: '成果',
        value:
          '在仓库仍为私有时，维护倒计时编排说明以及 GitHub 和任务日志链接。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '倒计时', value: '自主 T-0 编排' },
        { label: '技术栈', value: 'Three.js 特效 · 空间音频' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/dspace' },
        {
          label: '任务日志',
          href: 'https://futuroptimist.dev/projects/dspace',
        },
      ],
      narration: {
        caption: 'dSpace 发射台在后院小径旁迸发倒计时能量。',
        durationMs: 6000,
      },
      interactionPrompt: '启动 {title} 倒计时',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'GitHub Actions 工作流，可批量关闭陈旧 PR，支持 dry-run 预览和可选分支清理。',
      outcome: {
        label: '成果',
        value: '一键工作流在 README 中记录输入、安全模型和审计输出。',
      },
      metrics: [
        { label: '星标', value: '正在从 GitHub 同步…' },
        { label: '清扫', value: '用预览模式批量关闭陈旧 PR' },
        { label: '节奏', value: 'Cron 触发 + 手动 dry-run' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/pr-reaper' },
      ],
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube',
      summary:
        'Raspberry Pi 上的 k3s 平台，配套离网太阳能方块装置，并以 CAD、Pi 镜像和现场指南记录。',
      outcome: {
        label: '成果',
        value:
          '分步文档覆盖太阳能硬件、Pi 配置和用于韧性 homelab 的 Kubernetes 助手。',
      },
      metrics: [
        {
          label: '平台',
          value: 'k3s、Kubernetes 助手、Cloudflare 隧道和太阳能倾角/灌溉笔记',
        },
        { label: '硬件', value: '太阳能方块 CAD、Pi 托板、电子文档' },
        { label: '指南', value: 'Pi 镜像和无头配置现场指南' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/sugarkube' },
        {
          label: '温室日志',
          href: 'https://futuroptimist.dev/projects/sugarkube',
        },
      ],
      narration: {
        caption: 'Sugarkube 温室柔和生长灯与锦鲤池氛围同步循环。',
        durationMs: 6500,
      },
    },
  },
};
