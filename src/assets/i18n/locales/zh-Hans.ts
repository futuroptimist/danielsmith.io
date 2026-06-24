import type { LocaleOverrides } from '../types';

export const ZH_HANS_OVERRIDES: LocaleOverrides = {
  locale: 'zh-Hans',
  site: {
    name: 'Daniel Smith 沉浸式作品集',
    structuredData: {
      description:
        'Daniel Smith 的沉浸式作品集体验，包含交互式 3D 展品和叙事导览。',
      listNameTemplate: '{siteName} 展品',
      textCollectionNameTemplate: '{siteName} 文本作品集',
      textCollectionDescription:
        '为快速阅读而优化的沉浸式展品摘要、成果和关键指标。',
      immersiveActionName: '启动沉浸模式',
      properties: {
        labels: { category: '类别', outcome: '成果', status: '状态' },
        categories: { project: '项目', environment: '环境' },
        statuses: { prototype: '原型', live: '已上线' },
      },
      publisher: { name: 'Daniel Smith' },
      author: { name: 'Daniel Smith' },
    },
    textFallback: {
      heading: '以文本浏览亮点',
      intro:
        '即使无法使用沉浸模式，也可以通过简短摘要、成果和关键指标快速浏览所有展品。',
      roomHeadingTemplate: '{roomName}展品',
      metricsHeading: '关键指标',
      linksHeading: '相关链接',
      about: {
        heading: '关于 Daniel',
        summary: '曾在 YouTube 担任 6 年 SRE，专注自动化、可观测性和可靠发布。',
        highlights: [
          '通过开发者平台和代理工具加速安全发布。',
          '指导团队实施 SLO、事故响应和可靠性评审。',
          '探索始终带有可访问文本备用方案的沉浸式 WebGL 体验。',
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
              'SRE（SLO、事故响应、容量）、可观测性、CI/CD、测试、提示文档与代理开发',
          },
        ],
      },
      timeline: {
        heading: '工作经历',
        entries: [
          {
            period: '2018 年 9 月 — 2025 年 5 月',
            location: '加利福尼亚州圣布鲁诺',
            role: '网站可靠性工程师 (L4)',
            org: 'YouTube (Google)',
            summary:
              '覆盖多个 on-call 场景，用 Python/Go/SQL/C++ 自动化监控，并主导面向领导层的可靠性评审。',
          },
          {
            period: '2017 年 1 月 — 2018 年 9 月',
            location: '密西西比州斯坦尼斯航天中心',
            role: '软件工程师',
            org: '海军研究实验室',
            summary: '在 Scrum 迭代中交付 C++/Qt 数据处理应用和远程演示。',
          },
          {
            period: '2014 年 3 月 — 2016 年 12 月',
            location: '密西西比州哈蒂斯堡',
            role: '软件开发者',
            org: '南密西西比大学',
            summary: '构建 Objective-C 框架，为大学 iOS 应用提供实时内容。',
          },
        ],
      },
      contact: {
        heading: '联系',
        emailLabel: '邮箱',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: '简历 (PDF)',
        resumeUrl: '/resume.pdf',
      },
      recoveryCta: {
        title: '准备进入完整房间了吗？',
        description: '清除已保存的文本偏好，并从这里重新启动沉浸式作品集。',
        actionLabel: '再次尝试沉浸模式',
        ariaLabel: '再次尝试沉浸模式并清除已保存的文本模式偏好',
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
        manual: '已启用纯文本模式',
        'webgl-unsupported': '此设备无法使用沉浸模式',
        'low-memory': '检测到低内存设备',
        'low-end-device': '检测到轻量设备',
        'low-performance': '性能备用方案已启用',
        'immersive-init-error': '沉浸式场景遇到错误',
        'automated-client': '检测到自动化客户端',
        'data-saver': '已启用省流量模式',
        'console-error': '检测到运行时错误',
      },
      reasonDescriptions: {
        manual: '你选择了轻量作品集视图。沉浸式场景仍可一键返回。',
        'webgl-unsupported':
          '你的浏览器或设备无法启动 WebGL 渲染器。请先浏览快速文本概览。',
        'low-memory': '设备报告内存有限，因此我们启动轻量文本导览以保持流畅。',
        'low-end-device':
          '我们检测到轻量设备配置，因此加载快速文本导览以保持导航响应。',
        'low-performance':
          '我们检测到持续低帧率，因此切换到响应迅速的文本导览。',
        'immersive-init-error':
          '启动沉浸式场景时出现问题，因此改为展示文本概览。',
        'automated-client':
          '我们检测到自动化客户端，因此显示快速加载的文本作品集，便于预览和抓取。',
        'console-error':
          '检测到运行时错误，沉浸式场景恢复期间已切换到稳健的文本导览。',
        'data-saver':
          '浏览器请求省流量体验，因此启动轻量文本导览以减少带宽并保留重点内容。',
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
        keyboardZoom: {
          keys: 'Shift + = / Shift + -',
          description: '用键盘放大或缩小',
        },
        touchDrag: {
          keys: '触控',
          description: '左半屏拖动移动，右半屏拖动平移',
        },
        touchPinch: { keys: '捏合', description: '缩放' },
        cyclePoi: { keys: 'Q / E', description: '切换 POI' },
        toggleTextMode: { keys: 'T', description: '切换到文本模式' },
      },
      interact: {
        defaultLabel: '回车',
        description: '交互',
        promptTemplates: {
          default: '与 {title} 交互',
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
        controls: { label: '控制', keyHint: 'C', title: '打开控制 (C)' },
        text: { label: '文本', keyHint: 'T', title: '切换到文本模式 (T)' },
        settings: { label: '设置', keyHint: 'H', title: '打开设置和帮助 (H)' },
      },
      mobileToggle: {
        expandLabel: '显示全部控制',
        collapseLabel: '隐藏额外控制',
        expandAnnouncement: '正在显示移动端玩家的完整控制列表。',
        collapseAnnouncement: '正在隐藏额外控制以保持列表简洁。',
      },
    },
    movementLegend: {
      defaultDescription: '交互',
      labels: {
        keyboard: '回车',
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
      description: '调整当前任务中的人偶风格和伙伴装备。',
      variants: { title: '头像风格', description: '为探索者人偶切换服装。' },
      accessories: {
        title: '配件',
        description: '切换腕部控制台或全息无人机伙伴。',
      },
    },
    audioSubtitles: {
      labels: {
        ambient: '环境音频',
        poi: '旁白',
      },
      dismissLabels: {
        ambient: '关闭字幕',
        poi: '关闭旁白',
      },
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
      description: '切换 HUD 语言和文字方向。',
      options: {
        en: { label: 'English', direction: 'ltr' },
        ja: { label: '日本語', direction: 'ltr' },
        ar: { label: 'العربية', direction: 'rtl' },
        'zh-Hans': { label: '中文（简体）', direction: 'ltr' },
        'en-x-pseudo': { label: 'Pseudo', direction: 'ltr' },
      },
      switchingAnnouncementTemplate: '正在切换到 {target} 语言…',
      selectedAnnouncementTemplate: '已选择 {label}。',
      failureAnnouncementTemplate: '无法切换到 {target}。保持 {current}。',
    },
    tourGuideToggle: {
      labelEnabled: '导览已开启',
      labelDisabled: '导览已关闭',
      descriptionEnabled: '高亮沉浸式导览中下一个推荐展品。',
      descriptionDisabled: '导览高亮已隐藏，直到你重新开启。',
    },
    narrationToggle: {
      labelEnabled: '旁白已开启',
      labelDisabled: '旁白已关闭',
      descriptionEnabled: '未来展品时刻会显示旁白弹窗和字幕。',
      descriptionDisabled: '旁白弹窗和字幕保持隐藏，直到你开启。',
    },
    debugCoordinates: {
      labelEnabled: '调试坐标已开启',
      labelDisabled: '调试坐标已关闭',
      descriptionEnabled: '显示 XYZ、楼层、相机和楼梯调试浮层。',
      descriptionDisabled: '调试坐标会保持隐藏，直到你开启。',
      overlayLabel: '调试坐标',
      labels: {
        position: 'XYZ',
        activeFloor: '当前楼层',
        predictedFloor: '楼梯预测楼层',
        cameraZoom: '相机缩放',
        stairWidth: '楼梯宽度',
        landing: '平台',
        stairNav: '楼梯导航区域',
        stairZone: '楼梯区域',
        room: '房间',
      },
      values: {
        yes: '是',
        no: '否',
        none: '无',
      },
    },
    debugColliders: {
      labelEnabled: '碰撞体叠加层已开启',
      labelDisabled: '碰撞体叠加层已关闭',
      descriptionEnabled: '显示当前楼层的不可见墙和碰撞矩形。',
      descriptionDisabled: '不可见墙和碰撞矩形会保持隐藏，直到你开启。',

      idsLabelEnabled: '碰撞体 ID 开',
      idsLabelDisabled: '碰撞体 ID 关',
      idsDescriptionEnabled: '在碰撞体叠层开启时显示碰撞体 ID 标签。',
      idsDescriptionDisabled: '隐藏碰撞体 ID 标签，但保留碰撞体线框。',
      solidIdsLabelEnabled: '实体 ID 开',
      solidIdsLabelDisabled: '实体 ID 关',
      solidIdsDescriptionEnabled: '为可见场景实体显示稳定 ID 和线框。',
      solidIdsDescriptionDisabled: '隐藏稳定实体 ID 和线框。',
      fpsLabelEnabled: 'FPS 计数器已开启',
      fpsLabelDisabled: 'FPS 计数器已关闭',
      fpsDescriptionEnabled: '显示用于沉浸式诊断的非交互 stats.js FPS 面板。',
      fpsDescriptionDisabled: '隐藏 stats.js FPS 面板，同时保留诊断功能。',
    },
    tourReset: {
      heading: '导览',
      resetKey: 'g',
      label: '重新开始导览',
      description: '清除已访问的 POI，并重放精选路径。',
      emptyLabel: '导览已就绪',
      emptyDescription: '探索展品后即可解锁导览重置。',
      pendingLabel: '正在重置导览…',
      pendingDescription: '正在重置导览…',
      restartPromptTemplate: '按 {key} 重新开始。',
      guidedTourDescription: '空闲时显示推荐展品。',
      guidedTourLabelOn: '导览高亮：开',
      guidedTourLabelOff: '导览高亮：关',
      toggleAnnouncementOn: '导览高亮已开启。激活可关闭推荐。',
      toggleAnnouncementOff: '导览高亮已关闭。激活可开启推荐。',
      toggleTitleOn: '关闭导览高亮',
      toggleTitleOff: '开启导览高亮',
    },
    softwareRendererWarning: {
      fallbackRendererLabel: '软件 WebGL 渲染器',
      title: '检测到软件渲染',
      descriptionTemplate:
        'Chrome 正在使用 {renderer}，而不是硬件加速。Basic Render Driver、SwiftShader、WARP 和 llvmpipe 在连续 WebGL 动画下可能崩溃。',
      recommendation:
        '请启用浏览器硬件加速以获得流畅的沉浸式作品集。安全沉浸模式会限制帧率，同时保留截图和调试能力。',
      continueSafeLabel: '继续安全沉浸模式',
      continuousLabel: '仍然启用连续沉浸模式',
      textModeLabel: '使用文本模式',
      reloadSafeLabel: '重新加载此安全沉浸 URL',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: '文本模式 · 按 {keyHint}',
      idleDescriptionTemplate: '切换到纯文本作品集',
      idleAnnouncementTemplate: '切换到纯文本作品集。按 {keyHint} 激活。',
      idleTitleTemplate: '切换到纯文本作品集 ({keyHint})',
      pendingLabelTemplate: '正在切换到文本模式…',
      pendingAnnouncementTemplate: '切换到纯文本作品集。正在切换到文本模式…',
      activeLabelTemplate: '再次尝试沉浸模式 · 按 {keyHint}',
      activeDescriptionTemplate: '返回沉浸式作品集。',
      activeAnnouncementTemplate:
        '文本模式已启用。按 {keyHint} 再次尝试沉浸模式。',
      errorLabelTemplate: '重试文本模式 · 按 {keyHint}',
      errorDescriptionTemplate: '文本模式切换失败。请重试或使用沉浸链接。',
      errorAnnouncementTemplate: '文本模式切换失败。按 {keyHint} 重试。',
      errorTitleTemplate: '文本模式切换失败。按 {keyHint} 重试文本模式。',
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
      debugAnchorLabel: 'POI anchor',
      debugTrianglesLabel: 'Model triangles',
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
          '离开{fromRoom}的{fromDescriptor}后，旅程进入{toRoom}的{toDescriptor}，聚焦 {toPoi}。',
        crossSectionTemplate:
          '穿过门槛{direction}，路径进入{toRoom}的{toDescriptor}，抵达 {toPoi}。',
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
          descriptor: '烹饪机器人翼区',
          zone: 'interior',
        },
        backyard: {
          label: '后院观测台',
          descriptor: '暮光花园',
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
          '调整音频、视频和无障碍偏好。这些控制即使在通过快捷键关闭菜单后也保持可用。',
      },
      sections: [
        {
          id: 'movement',
          title: '移动与相机',
          items: [
            { label: 'WASD / 方向键', description: '在家中移动探索者。' },
            { label: '鼠标拖动', description: '平移等距相机。' },
            { label: '滚轮', description: '调整缩放级别。' },
            {
              label: 'Shift + = / Shift + -',
              description: '无需鼠标滚轮即可放大或缩小。',
            },
            { label: '触控摇杆', description: '拖动左垫移动，拖动右垫平移。' },
            { label: '捏合', description: '在触控设备上缩放。' },
          ],
        },
        {
          id: 'interactions',
          title: '交互',
          items: [
            {
              label: '靠近发光 POI',
              description:
                '按交互键（Enter/Space/F）、轻点或点击以打开展品覆盖层。',
            },
            {
              label: 'Q / E 或 ← / →',
              description: '用键盘在兴趣点之间切换焦点。',
            },
            { label: 'T', description: '在沉浸模式和文本备用视图之间切换。' },
            {
              label: 'Shift + L',
              description: '将电影感照明与调试通道进行比较。',
            },
          ],
        },
        {
          id: 'accessibility',
          title: '无障碍与备用方案',
          items: [
            {
              label: '低性能',
              description: '场景低于 30 FPS 时会自动切换到文本模式。',
            },
            {
              label: '手动切换',
              description: '随时使用屏幕上的文本模式按钮或按 T。',
            },
            {
              label: '运动模糊滑块',
              description: '在设置 → 运动模糊中调整拖影强度。',
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
      summary:
        '自动化的 Futuroptimist 脚本工作台，将研究、提纲和可配音草稿串联起来，服务新视频制作。',
      outcome: { label: '成果', value: '把创作研究转化为可复用的脚本流水线。' },
      metrics: [
        { label: '状态', value: '自动化内容工作流' },
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '节奏', value: '研究 → 提纲 → 旁白草稿' },
        { label: '重点', value: '创作者工具与可靠性故事' },
      ],
      links: [
        { label: 'YouTube', href: 'https://www.youtube.com/@futuroptimist' },
      ],
      narration: { caption: '客厅电视点亮 Futuroptimist 的脚本时间线。' },
      interactionPrompt: '查看 {title}',
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary: '中继盲的端到端加密令牌中转站，用于安全共享敏感短文本。',
      outcome: { label: '成果', value: '保持中继只看到密文和安全路由元数据。' },
      metrics: [
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'token.place',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '安全', value: '中继盲 E2EE · API v1' },
        { label: '范围', value: '非流式、密文优先的共享工作流' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/token.place',
        },
      ],
      narration: { caption: '令牌集群脉冲显示密文路由，没有泄露明文。' },
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary: '用于追踪个人自动化、提醒和代理任务的哨兵系统。',
      outcome: {
        label: '成果',
        value: '把提示、提醒和验证循环汇入一个可审计控制台。',
      },
      metrics: [
        { label: '状态', value: '自动化哨兵' },
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gabriel',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '重点', value: '提醒 · 任务 · 验证' },
        { label: '模式', value: '可审计代理循环' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/gabriel' },
      ],
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary:
        'GitHub 模板和自动化中枢，打包 lint、测试、文档与 Codex 提示，便于快速启动仓库。',
      outcome: {
        label: '成果',
        value: '交付可重复 CI 和提示库，让新仓库从一开始就健康。',
      },
      metrics: [
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'flywheel',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '自动化', value: 'init/update CLI · 检查 · 提示文档' },
        { label: 'CAD', value: '飞轮支架、轴、适配器和物理文档' },
      ],
      links: [
        {
          label: 'Flywheel 仓库',
          href: 'https://github.com/futuroptimist/flywheel',
        },
      ],
      narration: { caption: 'Flywheel 动能中枢启动，聚焦自动化提示和工具链。' },
      interactionPrompt: '启动 {title} 系统',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000',
      summary:
        '自托管求职协作助手，带 CLI 和实验性 Web UI，用于摄取外联并追踪申请。',
      outcome: {
        label: '成果',
        value: '端到端流程与文档和测试保持一致，覆盖招聘外联。',
      },
      metrics: [
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'jobbot3000',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '状态', value: '本地优先 CLI 与预览 Web UI' },
        { label: '技术栈', value: 'Node.js 20+ · npm 脚本 · Playwright 预览' },
        { label: '流程', value: '招聘外联摄取和生命周期追踪' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/jobbot3000',
        },
      ],
      narration: { caption: 'Jobbot 全息终端以闪烁覆盖层流式展示自动化遥测。' },
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary:
        '目标和任务追踪器，用代理式 LLM、分析辅助工具和 pipx 友好的 CLI 组织仓库。',
      outcome: {
        label: '成果',
        value: 'Alpha 版本让 README、FAQ 和威胁模型随 pytest 套件保持同步。',
      },
      metrics: [
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'axel',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
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
        '将 GitHub 贡献数据转换为 OpenSCAD 和 STL 模型的 CLI，用于 3D 打印 Gridfinity 架。',
      outcome: {
        label: '成果',
        value: '导出带元数据的 SCAD/STL，使打印架反映贡献时间线。',
      },
      metrics: [
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gitshelves',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '材料', value: '42 mm Gridfinity 兼容模块' },
        { label: '同步', value: '由 GitHub 时间线自动生成' },
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
        '正交 Three.js/WebGL 作品集，带键盘导航和可靠的无障碍文本备用方案。',
      outcome: {
        label: '成果',
        value: '每次发布都让沉浸式和文本部署保持一致。',
      },
      metrics: [
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '技术栈', value: 'Vite · Three.js · 无障碍 HUD' },
        { label: '部署', value: 'CI smoke + docs + lint 门禁' },
      ],
      links: [
        { label: '网站', href: 'https://danielsmith.io' },
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/danielsmith.io',
        },
      ],
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary:
        '摄取 Codex 任务页和 GitHub 日志、脱敏秘密，并输出可直接粘贴的 Markdown 摘要的 CLI。',
      outcome: {
        label: '成果',
        value: '自动收集和总结 CI 日志，便于快速调试交接。',
      },
      metrics: [
        { label: '状态', value: 'CLI 自动化' },
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'f2clipboard',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '安全', value: '秘密扫描与脱敏' },
        { label: '输出', value: '可粘贴的 Markdown 报告' },
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
      summary: '小型工具仓库，用于实验自动化、剪贴板和代码生成工作流。',
      outcome: {
        label: '成果',
        value: '把实验性辅助工具保持在可测试、可复用的形态。',
      },
      metrics: [
        { label: '状态', value: '实用工具实验室' },
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sigma',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '重点', value: '自动化助手和开发者工作流' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/sigma' },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary: '用于编排内容、任务和自动化线索的织机式工作台。',
      outcome: { label: '成果', value: '将松散想法编织成可执行的项目线索。' },
      metrics: [
        { label: '状态', value: '规划与编排原型' },
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'wove',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '模式', value: '内容线索 · 任务上下文 · 自动化提示' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/wove' },
      ],
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary:
        'DSPACE 展示 Democratized Space 网页放置游戏，聚焦资源管理、任务、探索和发射入轨进程。',
      outcome: {
        label: '成果',
        value:
          '将私有的 democratizedspace/dspace 仓库指标保持为不可用，同时链接官方游戏文档，避免未经验证的任务日志。',
      },
      metrics: [
        { label: '游戏', value: '资源管理 · 任务 · 探索' },
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'democratizedspace',
            repo: 'dspace',
            visibility: 'public',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '文档', value: '公开文档和开发者指南' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/democratizedspace/dspace',
        },
        { label: '文档', href: 'https://democratized.space/docs' },
      ],
      narration: { caption: '后院火箭投射 DSPACE 探索路线。' },
    },
    'pr-reaper-backyard-console': {
      title: 'pr-reaper',
      summary: '用于审查、归类和清理 GitHub 拉取请求积压的自动化控制台。',
      outcome: {
        label: '成果',
        value: '把冲突、可完成缺口和后续范围分开，帮助维护者安全合并。',
      },
      metrics: [
        { label: '状态', value: 'PR 分诊自动化' },
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'pr-reaper',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '重点', value: '冲突检测 · 范围锁定 · 后续评论' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/pr-reaper' },
      ],
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube',
      summary: '面向硬件、k3s 和太阳能工作流的干跑安全自动化温室。',
      outcome: {
        label: '成果',
        value: '在涉及磁盘、集群或硬件之前保持工作流可预演和有护栏。',
      },
      metrics: [
        {
          label: '星标',
          value: '正在从 GitHub 同步…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sugarkube',
            format: 'compact',
            template: '{value} 个星标',
            fallback: '正在从 GitHub 同步…',
          },
        },
        { label: '状态', value: '硬件/集群自动化' },
        { label: '安全', value: '干跑优先 · 受保护的破坏性命令' },
        { label: '范围', value: 'k3s · 太阳能 · 设备编排' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/sugarkube' },
      ],
    },
  },
};
