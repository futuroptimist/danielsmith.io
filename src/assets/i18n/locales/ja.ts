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
        defaultLabel: 'F',
        description: 'インタラクト',
      },
      helpButton: {
        labelTemplate: 'メニューを開く · {shortcut} キー',
        announcementTemplate:
          '設定とヘルプを開きます。ショートカット {shortcut} で操作方法とアクセシビリティのヒントを確認できます。',
        shortcutFallback: 'H',
      },
    },
    movementLegend: {
      defaultDescription: 'インタラクト',
      labels: {
        keyboard: 'F',
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
                'インタラクトキー (既定 F)、タップ、またはクリックで展示を開きます。',
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
