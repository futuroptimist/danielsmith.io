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
    textFallback: {
      heading: 'أبرز المعارض',
      intro:
        'يبقي هذا العرض النصي جميع المعارض متاحة مع ملخصات سريعة ونتائج ومؤشرات أساسية عندما يتعذر تشغيل الوضع الغامر.',
      roomHeadingTemplate: 'معارض {roomName}',
      metricsHeading: 'مؤشرات أساسية',
      linksHeading: 'روابط إضافية',
      reasonDescriptions: {
        manual:
          'طلبت العرض النصي الخفيف. يمكنك العودة إلى المشهد الغامر بنقرة واحدة.',
        'webgl-unsupported':
          'تعذر تشغيل WebGL على المتصفح أو الجهاز، لذا نعرض لك جولة نصية سريعة مع إبقاء المشهد خفيفًا.',
        'low-memory':
          'أبلغ جهازك عن ذاكرة محدودة، لذلك شغّلنا الجولة النصية الخفيفة للحفاظ على السلاسة.',
        'low-end-device':
          'رصدنا ملف جهاز خفيف، فقمنا بتحميل الجولة النصية السريعة للحفاظ على سرعة التنقل.',
        'low-performance':
          'لاحظنا انخفاضًا مستمرًا في معدل الإطارات، فانتقلنا إلى الجولة النصية السريعة لضمان الاستجابة.',
        'immersive-init-error':
          'حدث خطأ أثناء بدء الوضع الغامر، لذا نوفر لك نظرة عامة نصية بديلة.',
        'automated-client':
          'تم اكتشاف عميل آلي، لذلك نقدّم المحفظة النصية الخفيفة لتسهيل المعاينة والزحف.',
        'console-error':
          'رصدنا خطأ في وقت التشغيل وانتقلنا إلى الجولة النصية الموثوقة أثناء استرداد المشهد.',
        'data-saver':
          'المتصفح طلب تجربة موفّرة للبيانات، لذا فعّلنا الجولة النصية لتقليل الاستهلاك مع إبراز المحتوى.',
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
      mobileToggle: {
        expandLabel: 'إظهار كل عناصر التحكم',
        collapseLabel: 'إخفاء عناصر التحكم الإضافية',
        expandAnnouncement:
          'يتم عرض قائمة عناصر التحكم الكاملة للأجهزة المحمولة.',
        collapseAnnouncement:
          'يتم إخفاء عناصر التحكم الإضافية للحفاظ على القائمة مضغوطة.',
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
      visitedHeading: 'المعارض التي تمت زيارتها',
      empty: 'قم بزيارة المعارض لفتح مدخلات جديدة تحكي قصة صانع المحتوى.',
      defaultVisitedLabel: 'تمت الزيارة',
      visitedLabelTemplate: 'تمت الزيارة في {time}',
      liveAnnouncementTemplate: '{title} أضيف إلى سجل القصة.',
      journey: {
        heading: 'محطات الرحلة',
        empty: 'استكشف معارض جديدة لنسج سرد الرحلة.',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          'داخل {room} {descriptor}، ينتقل السرد من {fromPoi} نحو {toPoi}.',
        crossRoomTemplate:
          'مغادرًا {fromRoom} {fromDescriptor}، تنساب الرحلة إلى {toRoom} {toDescriptor} لإبراز {toPoi}.',
        crossSectionTemplate:
          'عند العبور {direction} عبر العتبة، يتجه المسار إلى {toRoom} {toDescriptor} للوصول إلى {toPoi}.',
        fallbackTemplate: 'يتجه السرد نحو {toPoi}.',
        announcementTemplate: 'تحديث الرحلة — {label}: {story}',
        directions: {
          indoors: 'إلى الداخل',
          outdoors: 'إلى الخارج',
        },
      },
      rooms: {
        livingRoom: {
          label: 'غرفة المعيشة',
          descriptor: 'صالة سينمائية',
          zone: 'interior',
        },
        studio: {
          label: 'الاستوديو',
          descriptor: 'مختبر الأتمتة',
          zone: 'interior',
        },
        kitchen: {
          label: 'مختبر المطبخ',
          descriptor: 'جناح الروبوتات الطهوية',
          zone: 'interior',
        },
        backyard: {
          label: 'الفناء الخلفي',
          descriptor: 'حديقة مضاءة عند الغسق',
          zone: 'exterior',
        },
      },
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
