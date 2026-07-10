import type { LocaleOverrides } from '../types';

export const JA_OVERRIDES: LocaleOverrides = {
  locale: 'ja',
  site: {
    name: 'Daniel Smith 没入型ポートフォリオ',
    structuredData: {
      description:
        'Daniel Smith の没入型ポートフォリオ体験で、3D 展示とナラティブを探索できます。',
      listNameTemplate: '{siteName} 展示',
      textCollectionNameTemplate: '{siteName} テキストポートフォリオ',
      textCollectionDescription:
        '没入型展示の内容を高速に読めるよう最適化した要約を提供します。',
      immersiveActionName: '没入モードを起動',
      properties: {
        labels: {
          category: 'カテゴリー',
          outcome: '成果',
          status: 'ステータス',
        },
        categories: {
          project: 'プロジェクト',
          environment: '環境',
        },
        statuses: {
          prototype: 'プロトタイプ',
          live: '公開中',
        },
      },
      publisher: {
        name: 'Daniel Smith',
      },
      author: {
        name: 'Daniel Smith',
      },
    },
    textFallback: {
      heading: 'ハイライトをテキストで確認',
      intro:
        '没入モードが利用できない場合でも、すべての展示を短い概要・成果・主要指標で素早く確認できます。',
      roomHeadingTemplate: '{roomName}の展示',
      metricsHeading: '主要指標',
      linksHeading: '関連リンク',
      about: {
        heading: 'Daniel について',
        summary:
          'YouTube で 6 年間 SRE を務め、自動化、可観測性、安定したリリースに注力しています。',
        highlights: [
          '開発者向けプラットフォームとエージェントツールで安全なリリースを加速。',
          'SLO、インシデント対応、信頼性レビューをチームに指導。',
          'アクセス可能なテキストを常に備えた没入型 WebGL 体験を探求。',
        ],
      },
      skills: {
        heading: 'スキル概要',
        items: [
          {
            label: '言語',
            value:
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C',
          },
          {
            label: 'インフラ・ツール',
            value:
              'Kubernetes, Docker, Google Cloud (BigQuery), GitHub Actions, WebGL/Three.js, React/Next.js, Astro',
          },
          {
            label: 'プラクティス',
            value:
              'SRE（SLO、インシデント対応、キャパシティ）、可観測性、CI/CD、テスト、プロンプトドキュメントとエージェント開発',
          },
        ],
      },
      timeline: {
        heading: '職務経歴',
        entries: [
          {
            period: '2018年9月 — 2025年5月',
            location: 'カリフォルニア州サンブルーノ',
            role: 'サイトリライアビリティエンジニア (L4)',
            org: 'YouTube (Google)',
            summary:
              '複数面のオンコールを担当し、Python/Go/SQL/C++ で監視を自動化し、リーダー向けの信頼性レビューをリード。',
          },
          {
            period: '2017年1月 — 2018年9月',
            location: 'ミシシッピ州ステニス宇宙センター',
            role: 'ソフトウェアエンジニア',
            org: '海軍研究所',
            summary:
              'Scrum サイクルで C++/Qt データ処理アプリとリモートデモを提供。',
          },
          {
            period: '2014年3月 — 2016年12月',
            location: 'ミシシッピ州ハティスバーグ',
            role: 'ソフトウェアデベロッパー',
            org: 'サザンミシシッピ大学',
            summary:
              '大学向け iOS アプリのライブ配信のため Objective-C フレームワークを構築。',
          },
        ],
      },
      contact: {
        heading: '連絡先',
        emailLabel: 'メール',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: '履歴書 (PDF)',
        resumeUrl: '/resume.pdf',
      },
      recoveryCta: {
        title: 'フルルームに戻りますか？',
        description:
          '保存されたテキスト設定を消去して、ここから没入ポートフォリオを再起動します。',
        actionLabel: '没入モードをもう一度試す',
        ariaLabel:
          '没入モードをもう一度試して、保存されたテキストモード設定を消去',
      },
      actions: {
        immersiveLink: '没入モードをもう一度試す',
        debugImmersiveLink: 'デバッグ: 没入モードを強制',
        clearPreferenceButton: '保存したモード設定を消去',
        clearPreferenceSuccess: '保存したモード設定を消去しました',
        resumeLink: '最新の履歴書をダウンロード',
        githubLink: 'GitHubでプロジェクトを見る',
      },
      reasonHeadings: {
        manual: 'テキストモードを表示中',
        'webgl-unsupported': 'このデバイスでは没入モードを利用できません',
        'low-memory': '低メモリ環境を検出',
        'low-end-device': '軽量デバイスを検出',
        'low-performance': 'パフォーマンス低下のためテキストに切替',
        'immersive-init-error': '没入シーンの起動でエラーが発生しました',
        'automated-client': '自動クライアントを検出しました',
        'console-error': '実行時エラーを検出しました',
        'data-saver': 'データセーバーが有効です',
      },
      reasonDescriptions: {
        manual:
          'テキストビューをリクエストしました。没入シーンはワンクリックで戻せます。',
        'webgl-unsupported':
          'ブラウザまたはデバイスで WebGL を起動できなかったため、軽量なテキスト概要を表示します。',
        'low-memory':
          'デバイスのメモリが限られているため、滑らかさを保つテキストツアーを開始しました。',
        'low-end-device':
          '軽量なデバイスプロファイルを検出したため、レスポンスを保つために高速なテキストツアーを読み込みました。',
        'low-performance':
          'フレームレートの低下を検知したため、応答性を維持するテキストツアーに切り替えました。',
        'immersive-init-error':
          '没入シーンの起動で問題が発生したため、代わりにテキスト概要を表示します。',
        'automated-client':
          '自動化クライアントを検出したため、プレビューしやすい軽量なテキストポートフォリオを表示します。',
        'console-error':
          '実行時エラーを検出したため、シーン復旧中は堅牢なテキストツアーに切り替えました。',
        'data-saver':
          'ブラウザがデータセーバーを要求したため、帯域を抑えるテキストツアーを有効にしました。',
      },
    },
  },
  hud: {
    graphicsQuality: {
      title: 'グラフィック品質',
      description: 'デバイス性能に合わせてプリセットを選びます。',
      options: {
        cinematic: {
          label: 'シネマティック',
          description:
            'ポスト処理、最高詳細の3Dモデル、シネマ風ブルームと照明を有効にします。',
        },
        balanced: {
          label: 'バランス',
          description:
            '控えめなブルーム、低めの解像度、中詳細モデルでノートPC向けにします。',
        },
        performance: {
          label: 'パフォーマンス',
          description:
            'ブルームを無効化し解像度とモデル負荷を下げてFPSを優先します。',
        },
      },
      selectedAnnouncementTemplate: '{label} プリセットを選択しました。',
    },
    accessibilityPresets: {
      title: 'アクセシビリティプリセット',
      description: 'モーション補助とHUDコントラストを調整します。',
      options: {
        standard: {
          label: '標準',
          description: '既定のビジュアルと音声バランスです。',
        },
        calm: {
          label: 'カーム',
          description: 'ブルーム、LED発光、環境音をやわらげます。',
        },
        'high-contrast': {
          label: '高コントラスト',
          description:
            'モーション手掛かりを保ちながらHUDの読みやすさを高めます。',
        },
        photosensitive: {
          label: '光過敏セーフ',
          description:
            'ブルームを無効化し発光を抑えHUDコントラストを高めます。',
        },
      },
      selectedAnnouncementTemplate: '{label} プリセットを選択しました。',
    },
    motionBlur: {
      heading: 'モーションブラー強度',
      description: 'カメラやアバターが速く動くときの残像効果を調整します。',
      groupAriaLabel: 'モーションブラー操作',
      sliderAnnouncement: 'モーションブラー強度を変更しました。',
      values: {
        off: 'オフ',
        lowTemplate: '{percent}% · 低い残像',
        mediumTemplate: '{percent}% · 中程度の残像',
        highTemplate: '{percent}% · 高い残像',
      },
    },

    controlOverlay: {
      heading: '操作',
      items: {
        keyboardMove: {
          keys: 'WASD / 矢印キー',
          description: '移動',
        },
        pointerDrag: {
          keys: '左クリック',
          description: 'ドラッグして視点移動',
        },
        pointerZoom: {
          keys: 'ホイール',
          description: 'ズーム',
        },
        keyboardZoom: {
          keys: 'Shift + = / Shift + -',
          description: 'キーボードでズームイン／アウト',
        },
        touchDrag: {
          keys: 'タッチ',
          description: '左側で移動・右側で視点をドラッグ',
        },
        touchPinch: {
          keys: 'ピンチ',
          description: 'ズーム',
        },
        cyclePoi: {
          keys: 'Q / E',
          description: 'POI を切り替え',
        },
        toggleTextMode: {
          keys: 'T',
          description: 'テキストモードに切り替え',
        },
        lightingDebug: {
          keys: 'Shift + L',
          description: 'ライティングデバッグ表示を切り替え',
        },
      },
      interact: {
        defaultLabel: 'Enter',
        description: 'インタラクト',
      },
      helpButton: {
        labelTemplate: 'メニューを開く · {shortcut} キー',
        announcementTemplate:
          '設定とヘルプを開きます。ショートカット {shortcut} で操作方法とアクセシビリティのヒントを確認できます。',
        shortcutFallback: 'H',
      },
      menu: {
        controls: {
          label: '操作',
          keyHint: 'C',
          title: '操作を開く (C)',
        },
        tutorial: {
          label: 'チュートリアル',
          keyHint: 'R',
          title: 'チュートリアルを開く (R)',
        },
        text: {
          label: 'テキスト',
          keyHint: 'T',
          title: 'テキストモードに切り替え (T)',
        },
        settings: {
          label: '設定',
          keyHint: 'H',
          title: '設定とヘルプを開く (H)',
        },
      },
      mobileToggle: {
        expandLabel: 'すべての操作を表示',
        collapseLabel: '追加の操作を隠す',
        expandAnnouncement: 'モバイル向けの操作一覧を表示します。',
        collapseAnnouncement:
          '一覧をコンパクトに保つため追加の操作を隠します。',
      },
    },
    movementLegend: {
      defaultDescription: 'インタラクト',
      labels: {
        keyboard: 'Enter',
        pointer: 'クリック',
        touch: 'タップ',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: '{label} キーで {prompt}',
        pointer: '{label}で {prompt}',
        touch: '{label}で {prompt}',
        gamepad: '{label} ボタンで {prompt}',
      },
    },
    customization: {
      heading: 'カスタマイズ',
      description: 'アバターのスタイルと相棒ギアを調整します。',
      variants: {
        options: {
          portfolio: {
            label: 'ポートフォリオ',
            description: 'ネオンバイザーが光る夕暮れスーツ。',
          },
          casual: {
            label: 'カジュアル',
            description: 'ティールの差し色が入った夕焼けフーディー。',
          },
          formal: {
            label: 'フォーマル',
            description: '金色の縁取りがあるチャコールブレザー。',
          },
        },
        selectedAnnouncementTemplate: '{label} アバターを選択しました。',
        title: 'アバタースタイル',
        description: 'マネキン探索者の装いを切り替えます。',
      },
      accessories: {
        options: {
          'wrist-console': {
            label: 'リストコンソール',
            description: 'HUD診断を映すウェアラブルテレメトリカフ。',
          },
          'holo-drone': {
            label: 'ホログラフィックドローン',
            description: '穏やかに周回発光する肩乗り偵察ドローン。',
          },
        },
        enabledAnnouncementTemplate: '{label} を有効にしました。',
        disabledAnnouncementTemplate: '{label} を無効にしました。',
        title: 'アクセサリー',
        description:
          'リストコンソールやホログラフィックドローンを切り替えます。',
      },
    },
    audioSubtitles: {
      labels: {
        ambient: '環境音',
        poi: '優先キャプション',
      },
      dismissLabels: {
        ambient: '字幕を閉じる',
        poi: '優先キャプションを閉じる',
      },
    },
    debugCoordinates: {
      labelEnabled: 'デバッグ座標オン',
      labelDisabled: 'デバッグ座標オフ',
      descriptionEnabled:
        'XYZ、階、カメラ、階段のデバッグオーバーレイを表示します。',
      descriptionDisabled: 'オンにするまでデバッグ座標は非表示です。',
      overlayLabel: 'デバッグ座標',
      labels: {
        position: 'XYZ',
        activeFloor: '現在の階',
        predictedFloor: '階段の予測階',
        cameraZoom: 'カメラズーム',
        stairWidth: '階段幅',
        landing: '踊り場',
        stairNav: '階段ナビ領域',
        stairZone: '階段ゾーン',
        room: '部屋',
      },
      values: {
        yes: 'はい',
        no: 'いいえ',
        none: 'なし',
      },
    },
    debugColliders: {
      labelEnabled: 'コライダーオーバーレイオン',
      labelDisabled: 'コライダーオーバーレイオフ',
      descriptionEnabled: '現在の階の見えない壁と衝突矩形を表示します。',
      descriptionDisabled: '見えない壁と衝突矩形はオンにするまで非表示です。',

      idsLabelEnabled: 'Collider ID オン',
      idsLabelDisabled: 'Collider ID オフ',
      idsDescriptionEnabled:
        'コライダーオーバーレイがオンのときに ID ラベルを表示します。',
      idsDescriptionDisabled:
        'コライダーのワイヤーフレームを残したまま ID ラベルを隠します。',
      solidIdsLabelEnabled: 'Solid ID オン',
      solidIdsLabelDisabled: 'Solid ID オフ',
      solidIdsDescriptionEnabled:
        '表示中のシーンソリッドに安定 ID とワイヤーフレームを表示します。',
      solidIdsDescriptionDisabled:
        '安定したソリッド ID とワイヤーフレームを隠します。',
      fpsLabelEnabled: 'FPSカウンターオン',
      fpsLabelDisabled: 'FPSカウンターオフ',
      fpsDescriptionEnabled:
        '没入モード診断用の非対話型stats.js FPSパネルを表示します。',
      fpsDescriptionDisabled:
        '診断機能を残したままstats.js FPSパネルを非表示にします。',
    },
    poiOverlay: {
      visited: '訪問済み',
      prototype: 'プロトタイプ',
      live: '公開中',
      closeDetails: 'POI の詳細を閉じる',
      relatedCaseStudies: '関連ケーススタディ',
      outcomeFallbackLabel: '成果',
      debugDetailsLabel: 'Debug details',
      debugPoiAnchor: 'POI anchor',
      debugModelTriangles: 'Model triangles',
      discoveryAnnouncementTemplate: '{title} を発見しました。{summary}',
    },
    lowFpsRecovery: {
      title: '低いフレームレートを検出しました',
      body: '没入モードの動作が遅くなっています。グラフィックを下げるか、非没入モードに切り替えられます。',
      dismissLabel: '閉じる',
      downgradeBalancedLabel: 'Balanced に切り替える',
      downgradePerformanceLabel: 'Performance に切り替える',
      textModeLabel: '非没入モードを使う',
      announcement:
        '低いフレームレートを検出しました。復旧アクションを選べます。',
    },
    tutorialPanel: {
      heading: 'チュートリアル',
      sidebarLabel: 'チュートリアル手順',
      collapseLabel: '手順を折りたたむ',
      expandLabel: '手順を展開',
      previousLabel: '前へ',
      nextLabel: '次へ',
      showOnStartupLabel: '起動時に表示',
      showOnStartupTitle: '没入モードの開始時にチュートリアルを表示',
      dismissLabel: '閉じる',
      dismissTitle: '今はチュートリアルを閉じる',
      lockedStepLabel: 'ロック中',
      completedStepLabel: '完了',
      incompleteStepLabel: '未完了',
      unlockedStepLabel: '解除済み',
      activeStepLabel: '現在のステップ',
      pages: {
        welcomeMovement: {
          title: 'ようこそ',
          body: 'チュートリアルの進行はまもなく追加されます。最初のステップではポートフォリオ内の移動を紹介します。',
        },
        zoom: {
          title: 'ズーム',
          body: 'このプレースホルダーは、シーンを操作できるままズーム操作を説明します。',
        },
        visitPois: {
          title: 'POI を訪問',
          body: 'このプレースホルダーは、3 つのプロジェクト POI への訪問を追跡します。',
        },
        findGitshelves: {
          title: 'Gitshelves を探す',
          body: 'このプレースホルダーは、Gitshelves の展示へ案内します。',
        },
      },
    },
    helpModal: {
      heading: '設定とヘルプ',
      description:
        'アクセシビリティ、グラフィックス、オーディオ、ショートカットをここで調整できます。',
      closeLabel: '閉じる',
      closeAriaLabel: 'ヘルプを閉じる',
      settings: {
        heading: '体験の設定',
        description:
          'オーディオや映像、支援機能を調整します。ショートカットからいつでもアクセスできます。',
      },
      sections: [
        {
          id: 'accessibility',
          title: 'アクセシビリティとフェイルオーバー',
          items: [
            {
              label: '低パフォーマンス',
              description:
                '平均 FPS が 10 秒間 5 を下回ると復旧アクションを提案します。',
            },
            {
              label: '手動トグル',
              description:
                'テキストモードボタンや T キーでいつでも切り替え可能です。',
            },
            {
              label: 'モーションブラー',
              description: '設定メニューのモーションブラーで軌跡を調整します。',
            },
            {
              label: '環境音',
              description: 'オーディオボタンまたは M キーで切り替えます。',
            },
          ],
        },
      ],
      announcements: {
        open: 'ヘルプメニューを開きました。操作方法と設定を確認できます。',
        close: 'ヘルプメニューを閉じました。',
      },
    },
  },
};
