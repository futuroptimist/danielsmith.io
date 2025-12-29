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
      about: {
        heading: 'عن دانيال',
        summary:
          'مهندس موثوقية مواقع بخبرة ست سنوات في YouTube يركز على الأتمتة والرصد وإطلاقات مستقرة.',
        highlights: [
          'يبني منصات مطورين وأدوات معتمدة على العوامل لتسريع الشحن بأمان.',
          'يدرب الفرق على اتفاقيات مستوى الخدمة، الاستجابة للحوادث، ومراجعات الموثوقية.',
          'يستكشف سرد WebGL غامر مع دعم نصي يمكن الوصول إليه دائماً.',
        ],
      },
      skills: {
        heading: 'المهارات باختصار',
        items: [
          {
            label: 'اللغات',
            value:
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C',
          },
          {
            label: 'البنية والأدوات',
            value:
              'Kubernetes, Docker, Google Cloud (BigQuery), GitHub Actions, WebGL/Three.js, React/Next.js, Astro',
          },
          {
            label: 'الممارسات',
            value:
              'SRE (اتفاقيات مستوى الخدمة، الاستجابة للحوادث، السعة), الرصد، CI/CD، الاختبارات، وثائق المحفزات والبرمجة المعتمدة على العوامل',
          },
        ],
      },
      timeline: {
        heading: 'الجدول الزمني للعمل',
        entries: [
          {
            period: 'سبتمبر 2018 — مايو 2025',
            location: 'سان برونو، كاليفورنيا',
            role: 'مهندس موثوقية مواقع (L4)',
            org: 'YouTube (Google)',
            summary:
              'إشراف على النوبات، أتمتة المراقبة باستخدام Python/Go/SQL/C++، وتوجيه مراجعات الموثوقية للقيادة.',
          },
          {
            period: 'يناير 2017 — سبتمبر 2018',
            location: 'مركز ستينيس الفضائي، مسيسيبي',
            role: 'مهندس برمجيات',
            org: 'مختبر الأبحاث البحرية',
            summary:
              'شحن تطبيقات معالجة بيانات C++/Qt وعروض عن بُعد ضمن دورات Scrum.',
          },
          {
            period: 'مارس 2014 — ديسمبر 2016',
            location: 'هاتيسبيرغ، مسيسيبي',
            role: 'مطوّر برمجيات',
            org: 'جامعة جنوب مسيسيبي',
            summary:
              'بناء أطر Objective-C لتسليم المحتوى المباشر في تطبيقات iOS الجامعية.',
          },
        ],
      },
      contact: {
        heading: 'التواصل',
        emailLabel: 'البريد الإلكتروني',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: 'السيرة الذاتية (PDF)',
        resumeUrl: 'docs/resume/2025-09/resume.pdf',
      },
      actions: {
        immersiveLink: 'تشغيل الوضع الغامر',
        resumeLink: 'تحميل أحدث سيرة ذاتية',
        githubLink: 'استكشاف المشاريع على GitHub',
      },
      reasonHeadings: {
        manual: 'تم تفعيل الوضع النصي',
        'webgl-unsupported': 'الوضع الغامر غير متاح على هذا الجهاز',
        'low-memory': 'تم الكشف عن جهاز بذاكرة منخفضة',
        'low-end-device': 'تم التعرف على جهاز خفيف',
        'low-performance': 'تفعيل وضع الأداء المنخفض',
        'immersive-init-error': 'حدث خطأ في تشغيل الوضع الغامر',
        'automated-client': 'تم اكتشاف عميل مؤتمت',
        'console-error': 'تم رصد أخطاء وقت التشغيل',
        'data-saver': 'تم تفعيل توفير البيانات',
      },
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
        defaultLabel: 'Enter',
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
        keyboard: 'Enter',
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
    customization: {
      heading: 'التخصيص',
      description: 'اضبط نمط الشخصية ومرافقيها حسب المهمة الحالية.',
      variants: {
        title: 'أسلوب الشخصية',
        description: 'بدّل بين أنماط مستكشف المعرض.',
      },
      accessories: {
        title: 'الإكسسوارات',
        description: 'فعّل سوار المعصم أو الطائرة الهولوغرافية.',
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
              description:
                'اضغط Enter/Space/F للتفاعل، أو المس/انقر لفتح بطاقة المعرض.',
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
