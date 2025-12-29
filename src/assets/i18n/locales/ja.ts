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
        resumeUrl: 'docs/resume/2025-09/resume.pdf',
      },
      actions: {
        immersiveLink: '没入モードを起動',
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
        title: 'アバタースタイル',
        description: 'マネキン探索者の装いを切り替えます。',
      },
      accessories: {
        title: 'アクセサリー',
        description:
          'リストコンソールやホログラフィックドローンを切り替えます。',
      },
    },
    narrativeLog: {
      heading: 'クリエイターストーリーログ',
      visitedHeading: '訪問した展示',
      empty: '展示を訪問するとショーケースの記録がアンロックされます。',
      defaultVisitedLabel: '訪問済み',
      visitedLabelTemplate: '{time} に訪問',
      liveAnnouncementTemplate:
        '{title} をクリエイターストーリーログに追加しました。',
      journey: {
        heading: '旅のハイライト',
        empty: '新しい展示を巡ると旅の語りが生成されます。',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          '{room}{descriptor}の中で物語は{fromPoi}から{toPoi}へ滑らかに移り変わります。',
        crossRoomTemplate:
          '{fromRoom}{fromDescriptor}を後にして、{toRoom}{toDescriptor}へ進み{toPoi}をクローズアップします。',
        crossSectionTemplate:
          '閾値を{direction}にくぐり、{toRoom}{toDescriptor}へ向かって{toPoi}に到達します。',
        fallbackTemplate: '物語は{toPoi}へ向かって進みます。',
        announcementTemplate: '旅の更新 — {label}: {story}',
        directions: {
          indoors: '屋内へ',
          outdoors: '屋外へ',
        },
      },
      rooms: {
        livingRoom: {
          label: 'リビング',
          descriptor: 'のシネマラウンジ',
          zone: 'interior',
        },
        studio: {
          label: 'スタジオ',
          descriptor: 'のオートメーションラボ',
          zone: 'interior',
        },
        kitchen: {
          label: 'キッチンラボ',
          descriptor: 'のフードロボティクスウィング',
          zone: 'interior',
        },
        backyard: {
          label: 'バックヤード',
          descriptor: 'の黄昏ガーデン',
          zone: 'exterior',
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
          id: 'movement',
          title: '移動とカメラ',
          items: [
            {
              label: 'WASD / 矢印キー',
              description: 'ホーム内を移動します。',
            },
            {
              label: 'マウスドラッグ',
              description: 'アイソメ視点をパンします。',
            },
            { label: 'ホイール', description: 'ズームレベルを調整します。' },
            {
              label: 'タッチジョイスティック',
              description: '左パッドで移動し、右パッドで視点をパンします。',
            },
            { label: 'ピンチ', description: 'タッチデバイスでズームします。' },
          ],
        },
        {
          id: 'interactions',
          title: 'インタラクション',
          items: [
            {
              label: '光る POI に近づく',
              description:
                'インタラクトキー (既定 Enter・スペース・F)、タップ、またはクリックで展示を開きます。',
            },
            {
              label: 'Q / E または ← / →',
              description: 'キーボードで POI のフォーカスを切り替えます。',
            },
            {
              label: 'T',
              description: '没入モードとテキストモードを切り替えます。',
            },
            {
              label: 'Shift + L',
              description: 'シネマティック照明とデバッグパスを比較します。',
            },
          ],
        },
        {
          id: 'accessibility',
          title: 'アクセシビリティとフェイルオーバー',
          items: [
            {
              label: '低パフォーマンス',
              description:
                'FPS が 30 を下回ると自動的にテキストモードへ切り替わります。',
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
