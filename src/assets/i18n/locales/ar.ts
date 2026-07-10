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
      properties: {
        labels: {
          category: 'الفئة',
          outcome: 'النتيجة',
          status: 'الحالة',
        },
        categories: {
          project: 'مشروع',
          environment: 'بيئة',
        },
        statuses: {
          prototype: 'نموذج أولي',
          live: 'مباشر',
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
        resumeUrl: '/resume.pdf',
      },
      recoveryCta: {
        title: 'هل أنت جاهز للغرفة الكاملة؟',
        description:
          'امسح تفضيل النص المحفوظ وأعد تشغيل المحفظة الغامرة من هنا.',
        actionLabel: 'جرّب الوضع الغامر مرة أخرى',
        ariaLabel: 'جرّب الوضع الغامر مرة أخرى وامسح تفضيل وضع النص المحفوظ',
      },
      actions: {
        immersiveLink: 'جرّب الوضع الغامر مجددًا',
        debugImmersiveLink: 'تصحيح: فرض الوضع الغامر',
        clearPreferenceButton: 'مسح تفضيل الوضع المحفوظ',
        clearPreferenceSuccess: 'تم مسح تفضيل الوضع المحفوظ',
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
    graphicsQuality: {
      title: 'جودة الرسوميات',
      description: 'اختر إعدادًا يناسب أداء جهازك.',
      options: {
        cinematic: {
          label: 'سينمائي',
          description:
            'معالجة كاملة ونماذج ثلاثية الأبعاد عالية التفصيل وإضاءة سينمائية.',
        },
        balanced: {
          label: 'متوازن',
          description:
            'توهج متوسط ودقة أقل ونماذج متوسطة التفاصيل للحواسيب المحمولة.',
        },
        performance: {
          label: 'أداء',
          description:
            'يعطّل التوهج ويخفض الدقة ويستخدم نماذج خفيفة لإعطاء الأولوية للإطارات.',
        },
      },
      selectedAnnouncementTemplate: 'تم اختيار إعداد {label}.',
    },
    accessibilityPresets: {
      title: 'إعدادات إمكانية الوصول',
      description: 'اضبط مساعدات الحركة وتباين الواجهة.',
      options: {
        standard: {
          label: 'قياسي',
          description: 'مرئيات وصوت بالتوازن الافتراضي.',
        },
        calm: {
          label: 'هادئ',
          description: 'يخفف التوهج وبريق LED والصوت المحيط.',
        },
        'high-contrast': {
          label: 'تباين عالٍ',
          description: 'يعزز قراءة الواجهة مع إبقاء إشارات الحركة نشطة.',
        },
        photosensitive: {
          label: 'آمن للحساسية الضوئية',
          description: 'يعطّل التوهج ويخفض الانبعاثات ويزيد تباين الواجهة.',
        },
      },
      selectedAnnouncementTemplate: 'تم اختيار إعداد {label}.',
    },
    motionBlur: {
      heading: 'شدة ضبابية الحركة',
      description: 'اضبط أثر المسارات أثناء حركة الكاميرا أو الشخصية بسرعة.',
      groupAriaLabel: 'عناصر ضبابية الحركة',
      sliderAnnouncement: 'تغيّرت شدة ضبابية الحركة.',
      values: {
        off: 'إيقاف',
        lowTemplate: '{percent}% · مسارات منخفضة',
        mediumTemplate: '{percent}% · مسارات متوسطة',
        highTemplate: '{percent}% · مسارات عالية',
      },
    },

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
        keyboardZoom: {
          keys: 'Shift + = / Shift + -',
          description: 'تكبير أو تصغير بلوحة المفاتيح',
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
        lightingDebug: {
          keys: 'Shift + L',
          description: 'تبديل عرض تصحيح الإضاءة',
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
      menu: {
        controls: {
          label: 'التحكم',
          keyHint: 'C',
          title: 'فتح عناصر التحكم (C)',
        },
        tutorial: { label: 'الدليل', keyHint: 'R', title: 'فتح الدليل (R)' },
        text: {
          label: 'النص',
          keyHint: 'T',
          title: 'التحويل إلى العرض النصي (T)',
        },
        settings: {
          label: 'الإعدادات',
          keyHint: 'H',
          title: 'فتح الإعدادات والمساعدة (H)',
        },
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
        options: {
          portfolio: {
            label: 'الحافظة',
            description: 'بدلة الغسق مع إبرازات حاجب نيون.',
          },
          casual: {
            label: 'غير رسمي',
            description: 'سترة غروب مع لمسات فيروزية.',
          },
          formal: { label: 'رسمي', description: 'سترة فحمية بحواف ذهبية.' },
        },
        selectedAnnouncementTemplate: 'تم اختيار شخصية {label}.',
        title: 'أسلوب الشخصية',
        description: 'بدّل بين أنماط مستكشف المعرض.',
      },
      accessories: {
        options: {
          'wrist-console': {
            label: 'سوار التحكم',
            description: 'سوار قياس يعكس تشخيصات الواجهة.',
          },
          'holo-drone': {
            label: 'طائرة هولوغرافية',
            description: 'طائرة كشافة بوهج مدار لطيف.',
          },
        },
        enabledAnnouncementTemplate: 'تم تفعيل {label}.',
        disabledAnnouncementTemplate: 'تم تعطيل {label}.',
        title: 'الإكسسوارات',
        description: 'فعّل سوار المعصم أو الطائرة الهولوغرافية.',
      },
    },
    audioSubtitles: {
      labels: {
        ambient: 'الصوت المحيط',
        poi: 'تسمية توضيحية ذات أولوية',
      },
      dismissLabels: {
        ambient: 'إغلاق التسمية التوضيحية',
        poi: 'إغلاق التسمية التوضيحية ذات الأولوية',
      },
    },
    debugCoordinates: {
      labelEnabled: 'إحداثيات التصحيح مفعّلة',
      labelDisabled: 'إحداثيات التصحيح معطّلة',
      descriptionEnabled: 'يعرض طبقة XYZ والطابق والكاميرا والسلالم للتصحيح.',
      descriptionDisabled: 'تبقى إحداثيات التصحيح مخفية حتى تفعّلها.',
      overlayLabel: 'إحداثيات التصحيح',
      labels: {
        position: 'XYZ',
        activeFloor: 'الطابق النشط',
        predictedFloor: 'طابق السلم المتوقع',
        cameraZoom: 'تكبير الكاميرا',
        stairWidth: 'عرض السلم',
        landing: 'بسطة السلم',
        stairNav: 'منطقة تنقل السلم',
        stairZone: 'نطاق السلم',
        room: 'الغرفة',
      },
      values: {
        yes: 'نعم',
        no: 'لا',
        none: 'لا شيء',
      },
    },
    debugColliders: {
      labelEnabled: 'تراكب المصادمات مفعّل',
      labelDisabled: 'تراكب المصادمات معطّل',
      descriptionEnabled:
        'يعرض الجدران غير المرئية ومستطيلات التصادم للطابق النشط.',
      descriptionDisabled:
        'تبقى الجدران غير المرئية ومستطيلات التصادم مخفية حتى تفعّلها.',

      idsLabelEnabled: 'معرّفات المصادمات مفعّلة',
      idsLabelDisabled: 'معرّفات المصادمات معطّلة',
      idsDescriptionEnabled:
        'يعرض تسميات معرّفات المصادمات عندما يكون تراكب المصادمات مفعّلًا.',
      idsDescriptionDisabled:
        'يخفي تسميات معرّفات المصادمات مع إبقاء إطارات المصادمات متاحة.',
      solidIdsLabelEnabled: 'معرّفات المجسمات مفعّلة',
      solidIdsLabelDisabled: 'معرّفات المجسمات معطّلة',
      solidIdsDescriptionEnabled:
        'يعرض معرّفات ثابتة وإطارات للمجسمات المرئية في المشهد.',
      solidIdsDescriptionDisabled:
        'تبقى معرّفات المجسمات الثابتة وإطاراتها مخفية.',
      fpsLabelEnabled: 'عداد FPS مفعّل',
      fpsLabelDisabled: 'عداد FPS معطّل',
      fpsDescriptionEnabled:
        'يعرض لوحة stats.js غير تفاعلية لتشخيص أداء المشهد الغامر.',
      fpsDescriptionDisabled:
        'يخفي لوحة stats.js مع إبقاء أدوات التشخيص متاحة.',
    },
    poiOverlay: {
      visited: 'تمت الزيارة',
      prototype: 'نموذج أولي',
      live: 'مباشر',
      closeDetails: 'إغلاق تفاصيل نقطة الاهتمام',
      relatedCaseStudies: 'دراسات حالة ذات صلة',
      outcomeFallbackLabel: 'النتيجة',
      debugDetailsLabel: 'Debug details',
      debugPoiAnchor: 'POI anchor',
      debugModelTriangles: 'Model triangles',
      discoveryAnnouncementTemplate: 'تم اكتشاف {title}. {summary}',
    },
    tutorialPanel: {
      heading: 'الدليل',
      sidebarLabel: 'خطوات الدليل',
      collapseLabel: 'طي خطوات الدليل',
      expandLabel: 'توسيع خطوات الدليل',
      previousLabel: 'السابق',
      nextLabel: 'التالي',
      showOnStartupLabel: 'إظهار عند البدء',
      showOnStartupTitle: 'إظهار الدليل عند بدء الوضع الغامر',
      dismissLabel: 'إغلاق',
      dismissTitle: 'إغلاق الدليل الآن',
      lockedStepLabel: 'مقفل',
      unlockedStepLabel: 'مفتوح',
      activeStepLabel: 'الخطوة الحالية',
      completedStepLabel: 'مكتمل',
      incompleteStepLabel: 'غير مكتمل',
      pages: {
        welcomeMovement: {
          title: 'مرحبًا',
          body: 'سيصل تقدم الدليل قريبًا. ستعرّف الخطوة الأولى الحركة داخل المعرض.',
        },
        zoom: {
          title: 'التكبير',
          body: 'سيشرح هذا الموضع المؤقت عناصر التكبير مع إبقاء المشهد قابلًا للعب.',
        },
        visitPois: {
          title: 'زيارة نقاط الاهتمام',
          body: 'سيتتبع هذا الموضع المؤقت زيارة ثلاث نقاط اهتمام للمشاريع.',
        },
        findGitshelves: {
          title: 'العثور على Gitshelves',
          body: 'سيرشد هذا الموضع المؤقت الزوار إلى معرض Gitshelves.',
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
