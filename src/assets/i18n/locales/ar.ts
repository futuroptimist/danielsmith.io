import type { LocaleOverrides } from '../types';

export const AR_OVERRIDES: LocaleOverrides = {
  locale: 'ar',
  site: {
    name: 'محفظة دانيل سميث الغامرة',
    structuredData: {
      description:
        'جولة تفاعلية في مشاريع دانيل سميث مع معارض ثلاثية الأبعاد وتعليقات صوتية.',
      listNameTemplate: 'معارض {siteName}',
      textCollectionNameTemplate: 'ملخصات نصية لـ {siteName}',
      textCollectionDescription:
        'ملخصات سريعة قابلة للوصول لكل معرض مع الحفاظ على سرعة التصفح.',
      immersiveActionName: 'تشغيل الوضع الغامر',
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
      heading: 'عناصر التحكم',
      items: {
        keyboardMove: {
          keys: 'WASD / الأسهم',
          description: 'التحرك',
        },
        pointerDrag: {
          keys: 'زر الفأرة الأيسر',
          description: 'اسحب لتحريك الكاميرا',
        },
        pointerZoom: {
          keys: 'عجلة التمرير',
          description: 'تكبير أو تصغير',
        },
        touchDrag: {
          keys: 'المس',
          description: 'اسحب اليسار للحركة واليمين للدوران',
        },
        touchPinch: {
          keys: 'قرص',
          description: 'تكبير أو تصغير',
        },
        cyclePoi: {
          keys: 'Q / E',
          description: 'تبديل نقاط الاهتمام',
        },
        toggleTextMode: {
          keys: 'T',
          description: 'التحويل إلى العرض النصي',
        },
      },
      interact: {
        defaultLabel: 'F',
        description: 'تفاعل',
      },
      helpButton: {
        labelTemplate: 'فتح القائمة · اضغط {shortcut}',
        announcementTemplate:
          'افتح الإعدادات والمساعدة. اضغط {shortcut} لمراجعة الاختصارات والنصائح.',
        shortcutFallback: 'H',
      },
    },
    movementLegend: {
      defaultDescription: 'تفاعل',
      labels: {
        keyboard: 'F',
        pointer: 'انقر',
        touch: 'المس',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: 'اضغط {label} لـ {prompt}',
        pointer: 'انقر لـ {prompt}',
        touch: 'المس لـ {prompt}',
        gamepad: 'اضغط {label} لـ {prompt}',
      },
    },
    narrativeLog: {
      heading: 'سجل القصة',
      empty: 'قم بزيارة المعارض لفتح مدخلات جديدة تحكي قصة صانع المحتوى.',
      defaultVisitedLabel: 'تمت الزيارة',
      visitedLabelTemplate: 'تمت الزيارة في {time}',
      liveAnnouncementTemplate: '{title} أضيف إلى سجل القصة.',
    },
    helpModal: {
      heading: 'الإعدادات والمساعدة',
      description:
        'اضبط التسهيلات البصرية والصوتية وراجع الاختصارات باستخدام هذه اللوحة.',
      closeLabel: 'إغلاق',
      closeAriaLabel: 'إغلاق المساعدة',
      settings: {
        heading: 'إعدادات التجربة',
        description:
          'عدّل الصوت والجودة والخيارات المساعدة. تظل هذه الضوابط متاحة عبر لوحة المساعدة.',
      },
      sections: [
        {
          id: 'movement',
          title: 'الحركة والكاميرا',
          items: [
            {
              label: 'WASD / الأسهم',
              description: 'حرك المستكشف في أرجاء المنزل.',
            },
            {
              label: 'سحب الفأرة',
              description: 'قم بتدوير الكاميرا متساوية القياس.',
            },
            { label: 'عجلة التمرير', description: 'اضبط مستوى التكبير.' },
            {
              label: 'عصا اللمس',
              description: 'اسحب اليسار للحركة واليمين للدوران.',
            },
            {
              label: 'القرص',
              description: 'تكبير أو تصغير على الأجهزة اللمسية.',
            },
          ],
        },
        {
          id: 'interactions',
          title: 'التفاعلات',
          items: [
            {
              label: 'اقترب من نقاط الاهتمام المضيئة',
              description: 'اضغط مفتاح التفاعل أو المس/انقر لفتح بطاقة المعرض.',
            },
            {
              label: 'Q / E أو ← / →',
              description: 'بدّل التركيز بين نقاط الاهتمام بلوحة المفاتيح.',
            },
            {
              label: 'T',
              description: 'بدّل بين الوضع الغامر والنسخة النصية.',
            },
            {
              label: 'Shift + L',
              description: 'قارن الإضاءة السينمائية مع وضع التصحيح.',
            },
          ],
        },
        {
          id: 'accessibility',
          title: 'إمكانية الوصول والطوارئ',
          items: [
            {
              label: 'أداء منخفض',
              description:
                'يتم التبديل تلقائيًا إلى العرض النصي إذا انخفضت الإطارات إلى أقل من 30.',
            },
            {
              label: 'تبديل يدوي',
              description: 'استخدم زر وضع النص أو اضغط T في أي وقت.',
            },
            {
              label: 'شريط ضباب الحركة',
              description: 'عدّل شدة الضباب من إعدادات الحركة.',
            },
            {
              label: 'الصوت المحيط',
              description: 'بدّل باستخدام زر الصوت أو اختصار M.',
            },
          ],
        },
      ],
      announcements: {
        open: 'تم فتح قائمة المساعدة. راجع عناصر التحكم والإعدادات.',
        close: 'تم إغلاق قائمة المساعدة.',
      },
    },
  },
};
