import type { LocaleOverrides } from '../types';

export const HU_OVERRIDES: LocaleOverrides = {
  locale: 'hu',
  site: {
    name: 'Daniel Smith magával ragadó portfólió',
    structuredData: {
      description:
        'Interaktív kiállítások a Daniel Smith magával ragadó portfólióélményen belül.',
      listNameTemplate: '{siteName} Kiállítások',
      textCollectionNameTemplate: '{siteName} szöveges portfólió',
      textCollectionDescription:
        'Gyorsan betölthető összefoglalók minden magával ragadó tárlatról, amely hozzáférhető és feltérképezőbarát olvasáshoz hangolt.',
      immersiveActionName: 'Indítsa el a magával ragadó módot',
      properties: {
        labels: {
          category: 'kategória\nAz',
          outcome: 'Eredmény',
          status: 'állapot',
        },
        categories: {
          project: 'projekt',
          environment: 'Környezet',
        },
        statuses: {
          prototype: 'prototípus',
          live: 'élőben',
        },
      },
      publisher: {
        name: 'Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
        logoUrl: 'https://danielsmith.io/favicon.ico',
      },
      author: {
        name: 'Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
      },
    },
    textFallback: {
      heading: 'Fedezd fel a kiemelt részeket',
      intro:
        'A szöveges portfólió minden tárlatot elérhetővé tesz gyors összefoglalókkal, eredményekkel és mérőszámokkal, miközben a magával ragadó mód nem érhető el.',
      roomHeadingTemplate: '{roomName} kiállítások',
      metricsHeading: 'Főbb mutatók',
      linksHeading: 'További olvasnivalók',
      about: {
        heading: 'Danielről',
        summary:
          'Site Reliability Engineer hat éve a YouTube-nél az automatizálásra, a megfigyelhetőségre és a folyamatos kiadásokra összpontosított.',
        highlights: [
          'Beépített fejlesztői platformok és ügynöki eszközök a biztonságos szállítás felgyorsítására.',
          'mentorok csapatai a SLOs-n, az incidensek reagálásán és a megbízhatóság felülvizsgálatán.',
          'Fedezze fel a magával ragadó WebGL történetmesélést, amely mindig a hozzáférhető szövegre nyúlik vissza.\nAz',
        ],
      },
      skills: {
        heading: 'Készségek egy pillantással',
        items: [
          {
            label: 'Nyelvek',
            value:
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C',
          },
          {
            label: 'Infra és eszközök',
            value:
              'Kubernetes, Docker, Google Cloud (BigQuery), GitHub Actions, WebGL/Three.js, React/Next.js, Astro',
          },
          {
            label: 'gyakorlatok',
            value:
              'SRE (SLOs, eseményreakció, kapacitás), megfigyelhetőség, CI/CD, tesztelés, azonnali dokumentumok és ügynöki kódolás',
          },
        ],
      },
      timeline: {
        heading: 'Munkaidővonal',
        entries: [
          {
            period: '2018. szeptember – 2025. május',
            location: 'San Bruno, CA',
            role: 'Site Reliability Engineer (L4)',
            org: 'YouTube (Google)',
            summary:
              'Több felületen is futott az ügyeletben, automatizált felügyelet a Python/Go/SQL/C++ típusokban, és irányított megbízhatósági felülvizsgálatok a vezetők számára.',
          },
          {
            period: '2017. január – 2018. szept\nAz',
            location: 'Stennis Space Center, MS',
            role: 'szoftvermérnök',
            org: 'Tengerészeti Kutatólaboratórium',
            summary:
              'C++/Qt adatfeldolgozó alkalmazásokat és távoli demókat szállítottak a Scrum sprinteken belül.',
          },
          {
            period: '2014. március – 2016. dec',
            location: 'Hattiesburg, MS',
            role: 'szoftverfejlesztő',
            org: 'A Dél-Mississippi Egyetem',
            summary:
              'Beépített Objective-C keretrendszerek élő tartalomszolgáltatáshoz egyetemi iOS-alkalmazásokban.',
          },
        ],
      },
      contact: {
        heading: 'Kapcsolat',
        emailLabel: 'E-mail',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: 'önéletrajz (PDF)',
        resumeUrl: 'docs/resume/2025-09/resume.pdf',
      },
      recoveryCta: {
        title: 'Készen állsz a teljes szobára?',
        description:
          'Törölje a mentett szöveges beállításokat, és innen indítsa újra a magával ragadó portfóliót.',
        actionLabel: 'Próbálja újra magával ragadni',
        ariaLabel:
          'Próbálja újra az immerzív módot, és törölje a mentett szövegmód beállítását',
      },
      actions: {
        immersiveLink: 'Próbálja újra magával ragadni',
        debugImmersiveLink: 'Debug: kényszerített magával ragadó mód',
        clearPreferenceButton: 'Mentett mód preferenciák törlése',
        clearPreferenceSuccess: 'Mentett mód beállítása törölve',
        resumeLink: 'Töltse le a legfrissebb önéletrajzot',
        githubLink: 'Fedezze fel a GitHub projektjeit',
      },
      reasonHeadings: {
        manual: 'Csak szöveges mód engedélyezve',
        'webgl-unsupported': 'Az immerzív mód nem érhető el ezen az eszközön',
        'low-memory': 'Alacsony memóriájú eszköz észlelve',
        'low-end-device': 'Könnyű eszköz észlelve',
        'low-performance': 'Teljesítmény-tartalék aktív',
        'immersive-init-error': 'A magával ragadó jelenet hibát észlelt',
        'automated-client': 'Automatikus kliens észlelve',
        'data-saver': 'Adattakarékos mód engedélyezve',
        'console-error': 'Futásidejű hibák észlelve',
      },
      reasonDescriptions: {
        manual:
          'Ön a könnyű portfólió nézetet kérte. A magával ragadó jelenet csak egy kattintásnyira van.',
        'webgl-unsupported':
          'A böngészője vagy az eszköze nem tudta elindítani a WebGL renderelőt. Élvezze a gyors szöveges áttekintést, miközben megőrizzük a magával ragadó jelenet fényét.',
        'low-memory':
          'Eszköze korlátozott memóriát jelentett, ezért elindítottuk a könnyű szöveges bemutatót, hogy a dolgok gördülékenyek legyenek.',
        'low-end-device':
          'Könnyű eszközprofilt észleltünk, ezért betöltöttük a gyors szöveges körutazást, hogy a navigáció reagálni tudjon.',
        'low-performance':
          'Tartósan alacsony képkockasebességet észleltünk, ezért átváltottunk a reszponzív szöveges körutazásra, hogy megőrizzük a látványos élményt.',
        'immersive-init-error':
          'Hiba történt a magával ragadó jelenet elindításakor, ezért inkább a szöveges áttekintést hoztuk neked.',
        'automated-client':
          'Automatizált klienst észleltünk, ezért a megbízható előnézetek és feltérképezések érdekében a gyorsan betöltődő szöveges portfóliót hoztuk létre.',
        'console-error':
          'Futásidejű hibát észleltünk, és átváltottunk a rugalmas szöveges körutazásra, amíg a magával ragadó jelenet helyreáll.',
        'data-saver':
          'Az Ön böngészője adatkímélő élményt kért, ezért elindítottuk a könnyű szöveges bemutatót, hogy minimalizáljuk a sávszélességet, miközben a kiemelések elérhetőek maradnak.',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Vezérlés',
      items: {
        keyboardMove: {
          keys: 'WASD / nyílbillentyűk',
          description: 'Mozgás',
        },
        pointerDrag: {
          keys: 'Bal egérgomb',
          description: 'Húzza a pásztázáshoz',
        },
        pointerZoom: {
          keys: 'Görgetőkerék',
          description: 'Zoom',
        },
        touchDrag: {
          keys: 'Touch',
          description:
            'Húzza a bal felét a mozgatáshoz, a jobb felét pedig a pásztázáshoz',
        },
        touchPinch: {
          keys: 'csipetnyi',
          description: 'Zoom',
        },
        cyclePoi: {
          keys: 'Q / E',
          description: 'Ciklus POI-k',
        },
        toggleTextMode: {
          keys: 'T',
          description: 'Váltás szöveges módba',
        },
      },
      interact: {
        defaultLabel: 'B Enter',
        description: 'Interact',
        promptTemplates: {
          default: 'Interakció a {title}-vel',
          inspect: 'Vizsgálja meg a {title}-t',
          activate: 'Aktiválja a {title}-t',
        },
      },
      helpButton: {
        labelTemplate: 'Menü megnyitása · Nyomja meg a {shortcut} gombot',
        announcementTemplate:
          'Nyissa meg a beállításokat és a súgót. Nyomja meg a {shortcut} gombot a vezérlők és a kisegítő lehetőségek megtekintéséhez.',
        shortcutFallback: 'H',
      },
      menu: {
        controls: {
          label: 'vezérlők',
          keyHint: 'C',
          title: 'Nyitott vezérlők (C)',
        },
        text: {
          label: 'Szöveg',
          keyHint: 'T',
          title: 'Váltás szöveges módba (T)',
        },
        settings: {
          label: 'beállítások',
          keyHint: 'H',
          title: 'Nyissa meg a beállításokat és a súgót (H)',
        },
      },
      mobileToggle: {
        expandLabel: 'Az összes vezérlő megjelenítése',
        collapseLabel: 'Extra vezérlők elrejtése',
        expandAnnouncement: 'A mobillejátszók teljes vezérlőlistáját mutatja.',
        collapseAnnouncement:
          'Extra vezérlőelemek elrejtése, hogy a lista kompakt legyen.',
      },
    },
    movementLegend: {
      defaultDescription: 'Interact',
      labels: {
        keyboard: 'B Enter',
        pointer: 'Kattintson',
        touch: 'Csap',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: 'Nyomja meg a {label}-t a {prompt}-hez',
        pointer: '{label} - {prompt}',
        touch: '{label} - {prompt}',
        gamepad: 'Nyomja meg a {label}-t a {prompt}-hez',
      },
    },
    customization: {
      heading: 'testreszabás',
      description:
        'Hangolja be a manöken stílust és a társfelszerelést az aktuális küldetéshez.',
      variants: {
        title: 'Avatar stílus',
        description: 'Switch ruhák a manöken felfedező számára.',
      },
      accessories: {
        title: 'Tartozékok',
        description:
          'Kapcsolja be a csuklókonzolt vagy a holografikus dróntársakat.',
      },
    },
    audioControl: {
      keyHint: 'M',
      groupLabel: 'Ambient audio vezérlők',
      toggle: {
        onLabelTemplate:
          'Hang: Be · Nyomja meg a {keyHint} gombot a némításhoz',
        offLabelTemplate:
          'Hang: Ki · Nyomja meg a {keyHint} gombot a némítás feloldásához',
        titleTemplate: 'Környezeti hang váltása ({keyHint})',
        announcementOnTemplate:
          'Ambient audio bekapcsolva. Nyomja meg a {keyHint} gombot a váltáshoz.',
        announcementOffTemplate:
          'Ambient audio kikapcsolva. Nyomja meg a {keyHint} gombot a váltáshoz.',
        pendingAnnouncementTemplate:
          'A környezeti hang állapotának váltása. Kérjük, várjon…',
      },
      slider: {
        label: 'Környezeti hangerő',
        ariaLabel: 'Ambient hangerő',
        hudLabel: 'Ambient audio hangerő csúszkája.',
        valueAnnouncementTemplate: 'Környezeti hangerő {volume}.',
        mutedAnnouncementTemplate:
          'Ambient audio némítva. A hangerő {volume}-re van állítva.',
        mutedValueTemplate: 'Némítva · {volume}',
        mutedAriaValueTemplate: 'némítva ({volume})',
      },
    },
    localeToggle: {
      title: 'Nyelv',
      description: 'A HUD nyelvének és irányának váltása.',
      options: {
        en: {
          label: 'English',
          direction: 'ltr',
        },
        ja: {
          label: '日本語',
          direction: 'ltr',
        },
        ar: {
          label: 'العربية',
          direction: 'rtl',
        },
        'zh-Hans': {
          label: '中文（简体）',
          direction: 'ltr',
        },
        es: {
          label: 'Español',
          direction: 'ltr',
        },
        pt: {
          label: 'Português',
          direction: 'ltr',
        },
        de: {
          label: 'Deutsch',
          direction: 'ltr',
        },
        hu: {
          label: 'Magyar',
          direction: 'ltr',
        },
        'en-x-pseudo': {
          label: 'Pseudo',
          direction: 'ltr',
        },
      },
      switchingAnnouncementTemplate: 'Váltás {target} területi beállításra…',
      selectedAnnouncementTemplate: '{label} területi beállítás kiválasztva.',
      failureAnnouncementTemplate:
        'Nem lehet váltani a {target}-re. Maradva a {current} nyelven.',
    },
    tourGuideToggle: {
      labelEnabled: 'Tárlatvezetés indul',
      labelDisabled: 'Tárlatvezetés kikapcsolva',
      descriptionEnabled:
        'Kiemeli a következő ajánlott kiállítást a magával ragadó körút során.',
      descriptionDisabled:
        'A vezetett túra kiemelt részei mindaddig rejtve maradnak, amíg vissza nem kapcsolja őket.',
    },
    tourReset: {
      heading: 'Tárlatvezetés',
      resetKey: 'g',
      label: 'Tárlatvezetés újraindítása',
      description:
        'Törölje a meglátogatott POI-kat, és játssza le újra a kiválasztott útvonalat.',
      emptyLabel: 'Tárlatvezetés készen áll',
      emptyDescription:
        'Fedezze fel a kiállításokat, hogy feloldja a tárlatvezetés visszaállítását.',
      pendingLabel: 'Túra visszaállítása…',
      pendingDescription: 'A tárlatvezetés visszaállítása…',
      restartPromptTemplate: 'Nyomja meg a {key} gombot az újraindításhoz.',
      guidedTourDescription:
        'Az ajánlott kiállítások megjelenítése üresjáratban.',
      guidedTourLabelOn: 'A tárlatvezetés legfontosabb elemei: Be',
      guidedTourLabelOff: 'A tárlatvezetés legfontosabb elemei: Ki',
      toggleAnnouncementOn:
        'A vezetett túra kiemelései engedélyezve. Aktiválja az ajánlások letiltásához.',
      toggleAnnouncementOff:
        'A vezetett túra kiemelései letiltva. Aktiválja az ajánlások engedélyezéséhez.',
      toggleTitleOn: 'A vezetett túra kiemelt pontjainak letiltása',
      toggleTitleOff: 'Vezetett túra kiemelésének engedélyezése',
    },
    softwareRendererWarning: {
      fallbackRendererLabel: 'szoftveres WebGL renderer',
      title: 'Szoftver-megjelenítés észlelve',
      descriptionTemplate:
        'Chrome a {renderer}-t használja hardveres gyorsítás helyett. A Basic Render Driver, a SwiftShader, a WARP és az llvmpipe összeomolhat folyamatos WebGL animáció alatt.',
      recommendation:
        'Engedélyezze a böngésző hardveres gyorsítását a zökkenőmentesen magával ragadó portfólió érdekében. A biztonságos magával ragadó mód lehetővé teszi a képernyőképeket és a hibakeresést korlátozott képkockasebességgel.',
      continueSafeLabel: 'Folytassa a biztonságos elmerülésben',
      continuousLabel:
        'Mindenképpen engedélyezze a folyamatos magával ragadó élményt',
      textModeLabel: 'Szöveg mód használata',
      reloadSafeLabel: 'Töltse be újra ezt a biztonságos, magával ragadó URL-t',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: 'Szöveg mód · Nyomja meg a {keyHint} gombot',
      idleDescriptionTemplate: 'Váltson csak szöveges portfólióra',
      idleAnnouncementTemplate:
        'Váltson csak szöveges portfólióra. Nyomja meg a {keyHint} gombot az aktiváláshoz.',
      idleTitleTemplate: 'Váltás a csak szöveges portfólióra ({keyHint})',
      pendingLabelTemplate: 'Váltás szöveges módra…',
      pendingAnnouncementTemplate:
        'Váltson csak szöveges portfólióra. Váltás szöveges módra…',
      activeLabelTemplate:
        'Próbálja újra magával ragadni · Nyomja meg a {keyHint} gombot',
      activeDescriptionTemplate: 'Térjen vissza a magával ragadó portfólióhoz.',
      activeAnnouncementTemplate:
        'Szöveg mód aktív. Nyomja meg a {keyHint} gombot, és próbálja újra az immerziót.',
      errorLabelTemplate:
        'Szöveges mód újrapróbálása · Nyomja meg a {keyHint} gombot',
      errorDescriptionTemplate:
        'Szöveg mód kapcsoló nem sikerült. Próbálja újra, vagy használja a magával ragadó linket.',
      errorAnnouncementTemplate:
        'Szöveg mód kapcsoló nem sikerült. Nyomja meg a {keyHint} gombot az újbóli próbálkozáshoz.',
      errorTitleTemplate:
        'Szöveg mód váltása nem sikerült. Nyomja meg a {keyHint} gombot a szöveges mód újrapróbálásához.',
    },
    poiOverlay: {
      visited: 'Látogatott',
      nextHighlight: 'Következő kiemelés',
      prototype: 'prototípus',
      live: 'élőben',
      closeDetails: 'POI részletek bezárása',
      relatedCaseStudies: 'Kapcsolódó esettanulmányok',
      outcomeFallbackLabel: 'Eredmény',
      discoveryAnnouncementTemplate: '{title} felfedezése. {summary}',
    },
    narrativeLog: {
      heading: 'Alkotói történetnapló',
      visitedHeading: 'Meglátogatott kiállítások',
      empty:
        'Látogassa meg a kiállításokat, hogy feltárja az alkotói kirakatot bemutató narratív bejegyzéseket.',
      defaultVisitedLabel: 'Látogatott',
      visitedLabelTemplate: 'Meglátogatta a {time}-t',
      liveAnnouncementTemplate:
        '{title} hozzáadva az alkotói történetnaplóhoz.\nAz',
      journey: {
        heading: 'Journey üt',
        empty: 'Fedezzen fel új kiállításokat az utazási narráció szövéséhez.',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          'A {room} {descriptor}-n belül a történet a {fromPoi}-ről a {toPoi} irányába tolódik el.',
        crossRoomTemplate:
          'A {fromRoom} {fromDescriptor} elhagyásával az utazás a {toRoom} {toDescriptor}-ba sodródik, hogy a {toPoi} reflektorfénybe kerüljön.',
        crossSectionTemplate:
          'A {direction}-t a küszöbön átlépve az útvonal a {toRoom} {toDescriptor}-be folyik, hogy elérje a {toPoi}-t.',
        fallbackTemplate: 'A narratíva a {toPoi} felé folyik.',
        announcementTemplate: 'Utazás frissítése — {label}: {story}',
        directions: {
          indoors: 'hátul belül',
          outdoors: 'szabadban',
        },
      },
      rooms: {
        livingRoom: {
          label: 'nappali',
          descriptor: 'filmes társalgó',
          zone: 'interior',
        },
        studio: {
          label: 'stúdió',
          descriptor: 'automatizálási labor',
          zone: 'interior',
        },
        kitchen: {
          label: 'konyhai labor',
          descriptor: 'kulináris robotika szárny',
          zone: 'interior',
        },
        backyard: {
          label: 'hátsó udvari obszervatórium',
          descriptor: 'alkonyattal megvilágított kert',
          zone: 'exterior',
        },
      },
    },
    helpModal: {
      heading: 'B Beállítások és súgó',
      description:
        'Módosíthatja a kisegítő lehetőségek előre beállított beállításait, a grafika minőségét, a hangot és az áttekintési parancsikonokat. Használja a súgó parancsikont (alapértelmezett H vagy?) a panel váltásához.',
      closeLabel: 'Bezárás',
      closeAriaLabel: 'Súgó bezárása',
      settings: {
        heading: 'Élménybeállítások',
        description:
          'Hang-, videó- és kisegítő lehetőségek beállítása. Ezek a vezérlők akkor is elérhetők maradnak, ha a menüt billentyűparancsokkal bezárják.',
      },
      sections: [
        {
          id: 'movement',
          title: 'Mozgás és kamera',
          items: [
            {
              label: 'WASD / nyílbillentyűk',
              description: 'Tekerd körbe a felfedezőt otthon.',
            },
            {
              label: 'Egérhúzás',
              description: 'Pásztázza az izometrikus kamerát.',
            },
            {
              label: 'Görgetőkerék',
              description: 'Állítsa be a zoom szintjét.\nAz',
            },
            {
              label: 'Touch joystickok',
              description:
                'Húzza a bal oldali padot a mozgatáshoz, a jobb oldalt pedig a pásztázáshoz.',
            },
            {
              label: 'csipetnyi',
              description: 'Zoom érintőképernyős eszközökön.',
            },
          ],
        },
        {
          id: 'interactions',
          title: 'interakciók',
          items: [
            {
              label: 'Közelítse meg a ragyogó POI-kat',
              description:
                'Nyomja meg az interact billentyűt (Enter/Szóköz/F), koppintson vagy kattintson a tárlatfedő megnyitásához.',
            },
            {
              label: 'Q / E vagy ← / →',
              description:
                'Fókuszálás az érdekes pontok között a billentyűzet segítségével.',
            },
            {
              label: 'T',
              description:
                'Váltás a magával ragadó mód és a szöveges visszaállítás között.',
            },
            {
              label: 'Shift + L',
              description:
                'Hasonlítsa össze a moziszerű világítást a hibakeresővel.',
            },
          ],
        },
        {
          id: 'accessibility',
          title: 'Kisegítő lehetőségek és feladatátvétel',
          items: [
            {
              label: 'Alacsony teljesítmény',
              description:
                'A jelenet automatikusan átvált szöveges módba 30 FPS alatt.',
            },
            {
              label: 'Manuális kapcsoló',
              description:
                'Bármikor használja a képernyőn megjelenő Szöveg mód gombot, vagy nyomja meg a T gombot.',
            },
            {
              label: 'Mozgásos elmosódás csúszka',
              description:
                'Állítsa be a nyomvonal erősségét a Beállítások → Mozgásos elmosódás vezérlésével.',
            },
            {
              label: 'Ambient audio',
              description:
                'Váltson az Audio gombbal, vagy nyomja meg az M gombot.',
            },
          ],
        },
      ],
      announcements: {
        open: 'Súgó menü megnyílt. Tekintse át a vezérlőket és a beállításokat.',
        close: 'Súgó menü bezárva.',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist\nAz',
      summary:
        'Automatizált Futuroptimist szkriptíróasztal, amely kutatásokat, vázlatokat és narrációra kész piszkozatokat fűz össze új videókhoz.',
      outcome: {
        label: 'Eredmény',
        value:
          'Megtartja a heti kiemelt szkripteket az automatizálási folyamatból kézi formázás nélkül.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: '1280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} csillagok',
            fallback: '1280+',
          },
        },
        {
          label: 'munkafolyamat',
          value: 'Resolve-stílusú szerkesztőcsomag · hármas kijelző',
        },
        {
          label: 'Fókusz',
          value: 'Futuroptimist ökoszisztéma tekercselése folyamatban van\nAz',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist',
        },
        {
          label: 'Docs',
          href: 'https://futuroptimist.dev',
        },
      ],
      narration: {
        caption: 'Futuroptimist médiafal kiemeléseket sugároz a nappaliban.',
      },
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary:
        'Biztonságos peer-to-peer generatív AI platform, amely Raspberry Pi rácson fut, titkosított közvetítő- és szervercsomópontokkal.',
      outcome: {
        label: 'Eredmény',
        value:
          'Quickstart parancsfájlok helyileg hozzák létre a közvetítőt, a kiszolgálót és az LLM-veremet tesztelés céljából.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'token.place',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'klaszter',
          value: '12× Pi 5 csomópontok moduláris rekeszekben',
        },
        {
          label: 'hálózat',
          value: 'Efemer tokenek · titkosított sorozatok',
        },
      ],
      links: [
        {
          label: 'webhely',
          href: 'https://token.place',
        },
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/token.place',
        },
      ],
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary:
        'Az adatvédelem első számú „őrangyala” LLM, amely helyi biztonsági tanácsadást nyújt, és integrálódik a token.place-val vagy offline következtetésekkel.',
      outcome: {
        label: 'Eredmény',
        value:
          'A moduláris feldolgozás, elemzés, értesítés és UI-veremek egymáshoz igazodnak a beírt felületeken keresztül.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gabriel',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'Fókusz',
          value: '360°-os lidar sweep + helyi heurisztika',
        },
        {
          label: 'ütem',
          value: 'Piros figyelmeztető villanás 1,0 másodpercenként',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/gabriel',
        },
      ],
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary:
        'GitHub sablon és automatizálási központ, amely kötegeli a lintinget, a teszteket, a dokumentumokat és a Codex kéréseket a gyors repo rendszerindításhoz.',
      outcome: {
        label: 'Eredmény',
        value:
          'Megismételhető CI-t (szöszök, tesztek, dokumentumok) és gyors könyvtárakat szállít, hogy az új repók egészségesen induljanak el.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'flywheel',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'automatizálás',
          value: 'CI állványok · gépelt utasítások · Minőségbiztosítási hurkok',
        },
        {
          label: 'Docs CTA\nAz',
          value: 'lendkerék.futuroptimist.dev →',
        },
      ],
      links: [
        {
          label: 'Flywheel Repo',
          href: 'https://github.com/futuroptimist/flywheel',
        },
        {
          label: 'Docs',
          href: 'https://flywheel.futuroptimist.dev',
        },
      ],
      narration: {
        caption:
          'Flywheel kinetikus agy pörög, reflektorfénybe állítva az automatizálási utasításokat és a szerszámokat.',
      },
      interactionPrompt: '{title} rendszerek bekapcsolása',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000',
      summary:
        'Saját üzemeltetésű álláskereső másodpilóta CLI-vel és kísérleti webes felhasználói felülettel az elérési és nyomon követési alkalmazások befogadásához.',
      outcome: {
        label: 'Eredmény',
        value:
          'A végpontok közötti munkafolyamatok tükrözik a dokumentumokat és a teszteket, így a toborzói munkafolyamatok lefedve maradnak.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'jobbot3000',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'állapot',
          value: 'Helyi-első CLI előnézeti webes felhasználói felülettel\nAz',
        },
        {
          label: 'Stack',
          value: 'Node.js 20+ · npm szkriptek · Színjátékíró előnézet',
        },
        {
          label: 'Flows',
          value: 'Toborzói kapcsolatfelvétel és életciklus-követés',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/jobbot3000',
        },
        {
          label: 'automatizálási napló',
          href: 'https://futuroptimist.dev/automation',
        },
      ],
      narration: {
        caption:
          'A Jobbot holografikus terminál az automatizálási telemetriát csillogó átfedésekben továbbítja.',
      },
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary:
        'Goal és küldetéskövető, amely repókat szervez ügynöki LLM-ekkel, elemző segítőkkel és pipx-barát CLI-vel.',
      outcome: {
        label: 'Eredmény',
        value:
          'Alpha kiadások szinkronban tartják a README, a GYIK és a fenyegetési modellek lefedettségét a pytest programcsomaggal.',
      },
      metrics: [
        {
          label: 'állapot',
          value: 'Alpha · pipx install axel',
        },
        {
          label: 'Repo-analitika',
          value: 'Küldetéstervezés repólistákból és szkennelésekből\nAz',
        },
        {
          label: 'Docs',
          value:
            'GYIK · Ismert problémák · Tesztekkel megtartott fenyegetési modell',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/axel',
        },
      ],
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves',
      summary:
        'CLI, amely a GitHub hozzájárulási adatait OpenSCAD és STL modellekké alakítja a 3D-nyomtatott Gridfinity polcokhoz.',
      outcome: {
        label: 'Eredmény',
        value:
          'SCAD/STL párokat exportál metaadatokkal, így a nyomtatott polcok tükrözik a hozzájárulás idővonalait.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gitshelves',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'anyag\nAz',
          value: '42 mm Gridfinity kompatibilis blokkok',
        },
        {
          label: 'szinkron',
          value: 'Auto generált a GitHub idővonalakból',
        },
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
        'Ortografikus Three.js/WebGL portfólió billentyűzet-navigációval és rugalmas szöveges tartalékkal a hozzáférhetőség érdekében.',
      outcome: {
        label: 'Eredmény',
        value:
          'A magával ragadó és a szöveges telepítéseket minden kiadásban összehangolja.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: '1280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} csillagok',
            fallback: '1280+',
          },
        },
        {
          label: 'Stack',
          value: 'Vite · Three.js · Kisegítő lehetőségek HUD',
        },
        {
          label: 'telepítés',
          value: 'CI füst + dok + szöszkapuk',
        },
      ],
      links: [
        {
          label: 'élő webhely',
          href: 'https://danielsmith.io',
        },
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/danielsmith.io',
        },
      ],
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary:
        'CLI, amely feldolgozza a Codex feladatoldalait és a GitHub naplókat, törli a titkokat, és beillesztésre kész Markdown összefoglalókat bocsát ki.',
      outcome: {
        label: 'Eredmény',
        value:
          'Automatizálja a CI naplógyűjtést és összegzést a gyors hibakeresési átadás érdekében.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'f2clipboard',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'Sebesség',
          value: 'Hibás bejelentkezések másolása 3 másodperc alatt',
        },
        {
          label: 'formátumok',
          value: 'CLI + vágólap + Markdown kimenet',
        },
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
        'ESP32 „AI pin”, amely push-to-talk hangot továbbít a Whisperre, és visszaadja a TTS-t egy 3D-nyomtatott OpenSCAD házban.',
      outcome: {
        label: 'Eredmény',
        value:
          'Tartalmazza a firmware-t, a ház CAD-jét, az STL-exportokat és a CI által frissen tartott összeszerelési dokumentumokat.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sigma',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'hardver',
          value: 'ESP32 · OpenSCAD ház',
        },
        {
          label: 'módok',
          value: 'Push-to-talk · Suttogás + TTS relé',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/sigma',
        },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary:
        'Nyílt forráskódú eszközkészlet a kötés és horgolás megtanulásához, miközben egy OpenSCAD hardverrel rendelkező robotszövőszék felé építkezik.',
      outcome: {
        label: 'Eredmény',
        value:
          'Dokumentumok mérőszám-kalkulátorokat, tervező-exportokat és feszítési profilokat tartalmaznak a fonalsúlyok között.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'wove',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'kézműves',
          value: 'Loom CAD öltéstérképekből kalibrál',
        },
        {
          label: 'ütemterv',
          value: 'Út a robotszövő laborok felé',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/wove',
        },
      ],
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary:
        'Backyard kilövőportál a privát DSPACE rakétaprojekthez telemetriával vezérelt visszaszámláló jelzésekkel és nyilvános küldetésnaplóval.',
      outcome: {
        label: 'Eredmény',
        value:
          'Fenntartja a visszaszámlálási sorrendet a GitHub és a küldetésnapló hivatkozásai mellett, miközben a repo privát marad.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'dspace',
            visibility: 'private',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'Visszaszámlálás',
          value: 'Autonóm T-0 szekvenálás',
        },
        {
          label: 'Stack',
          value: 'Three.js FX · Térbeli hang',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/dspace',
        },
        {
          label: 'küldetésnapló',
          href: 'https://futuroptimist.dev/projects/dspace',
        },
      ],
      narration: {
        caption:
          'dSpace kilövőállás visszaszámlálási energiával recseg a hátsó udvari ösvény mellett.',
        durationMs: 6000,
      },
      interactionPrompt: 'Indítsa el a {title} visszaszámlálást',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'GitHub Műveletek munkafolyamat, amely tömegesen zárja le az elavult lekérési kérelmeket szárazon futtatott előnézetekkel és opcionális ágtisztítással.',
      outcome: {
        label: 'Eredmény',
        value:
          'Az egygombos munkafolyamat a bemeneteket, a biztonsági modellt és az audit kimeneteket dokumentálja a README-ben.',
      },
      metrics: [
        {
          label: 'csillagok',
          value: 'Szinkronizálás a GitHub-ről…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'pr-reaper',
            format: 'compact',
            template: '{value} csillagok',
            fallback: 'Szinkronizálás a GitHub-ről…',
          },
        },
        {
          label: 'Sweep',
          value: 'Elavult PR-ok tömeges bezárása előnézeti móddal',
        },
        {
          label: 'ütem',
          value: 'Cron triggerek + kézi szárazonfutás',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/pr-reaper',
        },
      ],
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube\nAz',
      summary:
        'k3s-on-Raspberry-Pi platform párosítva egy hálózaton kívüli napelem-kocka telepítéssel, amely CAD-, Pi-képekkel és terepi útmutatókkal dokumentált.',
      outcome: {
        label: 'Eredmény',
        value:
          'A lépésről lépésre bemutatott dokumentumok napelemes hardvereket, Pi-kiépítést és Kubernetes segédeszközöket tartalmaznak a rugalmas otthoni laborokhoz.',
      },
      metrics: [
        {
          label: 'platform',
          value:
            'k3s, Kubernetes segítők, Cloudflare alagutak és napelemes dőlés/öntözés jegyzetek',
        },
        {
          label: 'hardver',
          value: 'Szolár kocka CAD, Pi hordozólapok, elektronikai dok',
        },
        {
          label: 'útmutatók',
          value: 'Helyi útmutatók Pi-képekhez és fej nélküli kiépítéshez',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/sugarkube',
        },
        {
          label: 'üvegházi rönk',
          href: 'https://futuroptimist.dev/projects/sugarkube',
        },
      ],
      narration: {
        caption:
          'Sugarkube üvegházhatást okozó fények és a koi tó hangulata szinkronban.',
        durationMs: 6500,
      },
    },
  },
};
