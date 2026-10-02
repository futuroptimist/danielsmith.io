import type { CareerId } from '../../scene/poi/types';

import type { CareerCopy, Locale } from './types';

type CareerCatalog = Record<CareerId, CareerCopy>;

/** Public, reviewed career copy. No employer branding or internal metrics are used. */
const english: CareerCatalog = {
  'southern-mississippi': {
    title: 'Southern Mississippi',
    organization: 'The University of Southern Mississippi',
    role: 'Software Developer',
    period: 'March 2014–December 2016',
    location: 'Hattiesburg, MS',
    summary:
      'Developed Objective-C content delivery and networking for university iOS applications.',
    illustrationNote:
      'Original generic mobile-development devices and phone simulator.',
    sourceLabel: 'Reviewed résumé source',
  },
  'naval-research': {
    title: 'Naval Research Laboratory',
    organization: 'Naval Research Laboratory',
    role: 'Computer Scientist',
    period: 'January 2017–September 2018',
    location: 'Stennis Space Center, MS',
    summary:
      'Developed C++/Qt research data-processing applications, with releases, demos, and documentation.',
    illustrationNote:
      'Illustrative aquarium with an inert decorative prop; it does not depict a specific assignment, weapon design, capability, deployment, or achievement.',
    sourceLabel: 'Reviewed résumé source',
  },
  youtube: {
    title: 'YouTube',
    organization: 'YouTube (Google)',
    role: 'Site Reliability Engineer',
    period: 'September 2018–May 2025',
    location: 'San Bruno, CA',
    summary:
      'Worked on product-health metrics, automation, on-call, incident response, and mentoring.',
    illustrationNote:
      'Original illustrative reliability display; it contains no internal dashboard or performance statistics.',
    sourceLabel: 'Reviewed résumé source',
  },
  'muon-space': {
    title: 'Muon Space',
    organization: 'Muon Space',
    role: 'Senior Software Engineer',
    team: 'Mission Planning Platform team',
    period: 'September 2026–present',
    summary:
      'Contributing to cloud-based mission planning and control software on the Mission Planning Platform team.',
    illustrationNote:
      'Original generic CubeSat and mission-planning motif; not a replica of a Muon spacecraft or an internal interface.',
    disclaimer:
      'This is my personal portfolio. The views and content here are my own and do not represent Muon Space.',
    sourceLabel: 'Public role description',
  },
};

const spanish: CareerCatalog = {
  'southern-mississippi': {
    title: 'Southern Mississippi',
    organization: 'The University of Southern Mississippi',
    role: 'Desarrollador de software',
    period: 'Marzo de 2014–diciembre de 2016',
    location: 'Hattiesburg, Misisipi',
    summary:
      'Desarrollé funciones de entrega de contenido y redes en Objective-C para aplicaciones iOS de la universidad.',
    illustrationNote:
      'Dispositivos genéricos originales de desarrollo móvil y simulador de teléfono.',
    sourceLabel: 'Fuente del currículum revisada',
  },
  'naval-research': {
    title: 'Naval Research Laboratory',
    organization: 'Naval Research Laboratory',
    role: 'Científico informático',
    period: 'Enero de 2017–septiembre de 2018',
    location: 'Centro Espacial Stennis, Misisipi',
    summary:
      'Desarrollé aplicaciones de procesamiento de datos de investigación en C++/Qt, con versiones, demostraciones y documentación.',
    illustrationNote:
      'Acuario ilustrativo con un objeto decorativo inerte; no representa una tarea, diseño de armas, capacidad, despliegue ni logro específicos.',
    sourceLabel: 'Fuente del currículum revisada',
  },
  youtube: {
    title: 'YouTube',
    organization: 'YouTube (Google)',
    role: 'Ingeniero de fiabilidad de sitios',
    period: 'Septiembre de 2018–mayo de 2025',
    location: 'San Bruno, California',
    summary:
      'Trabajé en métricas de salud del producto, automatización, guardias, respuesta a incidentes y mentoría.',
    illustrationNote:
      'Visualización original e ilustrativa de fiabilidad; no contiene paneles internos ni estadísticas de rendimiento.',
    sourceLabel: 'Fuente del currículum revisada',
  },
  'muon-space': {
    title: 'Muon Space',
    organization: 'Muon Space',
    role: 'Ingeniero de software sénior',
    team: 'Equipo Mission Planning Platform',
    period: 'Septiembre de 2026–actualidad',
    summary:
      'Contribuyo al software en la nube de planificación y control de misiones en el equipo Mission Planning Platform.',
    illustrationNote:
      'CubeSat genérico y motivo de planificación de misiones originales; no son una réplica de una nave de Muon ni una interfaz interna.',
    disclaimer:
      'Este es mi portafolio personal. Las opiniones y el contenido aquí son propios y no representan a Muon Space.',
    sourceLabel: 'Descripción pública del puesto',
  },
};

const portuguese: CareerCatalog = {
  'southern-mississippi': {
    title: 'Southern Mississippi',
    organization: 'The University of Southern Mississippi',
    role: 'Desenvolvedor de software',
    period: 'Março de 2014–dezembro de 2016',
    location: 'Hattiesburg, Mississippi',
    summary:
      'Desenvolvi recursos de entrega de conteúdo e rede em Objective-C para aplicativos iOS da universidade.',
    illustrationNote:
      'Dispositivos genéricos originais de desenvolvimento móvel e simulador de telefone.',
    sourceLabel: 'Fonte revisada do currículo',
  },
  'naval-research': {
    title: 'Naval Research Laboratory',
    organization: 'Naval Research Laboratory',
    role: 'Cientista da computação',
    period: 'Janeiro de 2017–setembro de 2018',
    location: 'Centro Espacial Stennis, Mississippi',
    summary:
      'Desenvolvi aplicativos de processamento de dados de pesquisa em C++/Qt, com lançamentos, demonstrações e documentação.',
    illustrationNote:
      'Aquário ilustrativo com um objeto decorativo inerte; não representa uma tarefa, projeto de arma, capacidade, implantação ou conquista específica.',
    sourceLabel: 'Fonte revisada do currículo',
  },
  youtube: {
    title: 'YouTube',
    organization: 'YouTube (Google)',
    role: 'Engenheiro de confiabilidade de sites',
    period: 'Setembro de 2018–maio de 2025',
    location: 'San Bruno, Califórnia',
    summary:
      'Trabalhei com métricas de saúde do produto, automação, plantões, resposta a incidentes e mentoria.',
    illustrationNote:
      'Visualização original e ilustrativa de confiabilidade; sem painéis internos ou estatísticas de desempenho.',
    sourceLabel: 'Fonte revisada do currículo',
  },
  'muon-space': {
    title: 'Muon Space',
    organization: 'Muon Space',
    role: 'Engenheiro de software sênior',
    team: 'Equipe Mission Planning Platform',
    period: 'Setembro de 2026–presente',
    summary:
      'Contribuo para o software em nuvem de planejamento e controle de missões na equipe Mission Planning Platform.',
    illustrationNote:
      'CubeSat genérico e motivo de planejamento de missões originais; não são réplica de uma espaçonave da Muon nem uma interface interna.',
    disclaimer:
      'Este é meu portfólio pessoal. As opiniões e o conteúdo aqui são meus e não representam a Muon Space.',
    sourceLabel: 'Descrição pública do cargo',
  },
};

const german: CareerCatalog = {
  'southern-mississippi': {
    title: 'Southern Mississippi',
    organization: 'The University of Southern Mississippi',
    role: 'Softwareentwickler',
    period: 'März 2014–Dezember 2016',
    location: 'Hattiesburg, Mississippi',
    summary:
      'Entwicklung von Inhaltsbereitstellung und Netzwerkfunktionen in Objective-C für iOS-Anwendungen der Universität.',
    illustrationNote:
      'Eigene generische Geräte für mobile Entwicklung mit Telefonsimulator.',
    sourceLabel: 'Geprüfte Lebenslaufquelle',
  },
  'naval-research': {
    title: 'Naval Research Laboratory',
    organization: 'Naval Research Laboratory',
    role: 'Informatiker',
    period: 'Januar 2017–September 2018',
    location: 'Stennis Space Center, Mississippi',
    summary:
      'Entwicklung von C++/Qt-Anwendungen zur Verarbeitung von Forschungsdaten, einschließlich Releases, Demos und Dokumentation.',
    illustrationNote:
      'Illustratives Aquarium mit einer inerten Dekoration; keine Darstellung eines bestimmten Auftrags, Waffendesigns, einer Fähigkeit, eines Einsatzes oder einer Leistung.',
    sourceLabel: 'Geprüfte Lebenslaufquelle',
  },
  youtube: {
    title: 'YouTube',
    organization: 'YouTube (Google)',
    role: 'Site Reliability Engineer',
    period: 'September 2018–Mai 2025',
    location: 'San Bruno, Kalifornien',
    summary:
      'Arbeit an Kennzahlen zum Produktzustand, Automatisierung, Bereitschaftsdienst, Vorfallbehandlung und Mentoring.',
    illustrationNote:
      'Eigene illustrative Zuverlässigkeitsanzeige ohne interne Dashboards oder Leistungsstatistiken.',
    sourceLabel: 'Geprüfte Lebenslaufquelle',
  },
  'muon-space': {
    title: 'Muon Space',
    organization: 'Muon Space',
    role: 'Senior-Softwareentwickler',
    team: 'Mission Planning Platform Team',
    period: 'September 2026–heute',
    summary:
      'Mitarbeit an cloudbasierter Missionsplanungs- und Steuerungssoftware im Mission Planning Platform Team.',
    illustrationNote:
      'Eigener generischer CubeSat und Missionsplanungsmotiv; keine Nachbildung eines Muon-Raumfahrzeugs oder einer internen Oberfläche.',
    disclaimer:
      'Dies ist mein persönliches Portfolio. Die hier geäußerten Ansichten und Inhalte sind meine eigenen und repräsentieren nicht Muon Space.',
    sourceLabel: 'Öffentliche Stellenbeschreibung',
  },
};

const hungarian: CareerCatalog = {
  'southern-mississippi': {
    title: 'Southern Mississippi',
    organization: 'The University of Southern Mississippi',
    role: 'Szoftverfejlesztő',
    period: '2014. március–2016. december',
    location: 'Hattiesburg, Mississippi',
    summary:
      'Objective-C tartalomszolgáltatási és hálózati funkciókat fejlesztettem az egyetem iOS-alkalmazásaihoz.',
    illustrationNote:
      'Saját készítésű, általános mobilfejlesztési eszközök és telefonszimulátor.',
    sourceLabel: 'Ellenőrzött önéletrajzforrás',
  },
  'naval-research': {
    title: 'Naval Research Laboratory',
    organization: 'Naval Research Laboratory',
    role: 'Informatikus',
    period: '2017. január–2018. szeptember',
    location: 'Stennis Űrközpont, Mississippi',
    summary:
      'C++/Qt kutatási adatfeldolgozó alkalmazásokat fejlesztettem, kiadásokkal, bemutatókkal és dokumentációval.',
    illustrationNote:
      'Szemléltető akvárium inert dísztárggyal; nem ábrázol konkrét feladatot, fegyvertervet, képességet, bevetést vagy eredményt.',
    sourceLabel: 'Ellenőrzött önéletrajzforrás',
  },
  youtube: {
    title: 'YouTube',
    organization: 'YouTube (Google)',
    role: 'Site Reliability Engineer',
    period: '2018. szeptember–2025. május',
    location: 'San Bruno, Kalifornia',
    summary:
      'Termékállapot-mérőszámokkal, automatizálással, ügyelettel, incidenskezeléssel és mentorálással foglalkoztam.',
    illustrationNote:
      'Saját szemléltető megbízhatósági kijelző; belső irányítópult és teljesítménystatisztikák nélkül.',
    sourceLabel: 'Ellenőrzött önéletrajzforrás',
  },
  'muon-space': {
    title: 'Muon Space',
    organization: 'Muon Space',
    role: 'Szenior szoftvermérnök',
    team: 'Mission Planning Platform csapat',
    period: '2026. szeptember–jelenleg',
    summary:
      'A Mission Planning Platform csapatban felhőalapú küldetéstervező és -irányító szoftver fejlesztésében veszek részt.',
    illustrationNote:
      'Saját általános CubeSat és küldetéstervezési motívum; nem Muon-űreszköz vagy belső kezelőfelület másolata.',
    disclaimer:
      'Ez a személyes portfólióm. Az itt szereplő nézetek és tartalmak a sajátjaim, és nem képviselik a Muon Space álláspontját.',
    sourceLabel: 'Nyilvános munkaköri leírás',
  },
};

const japanese: CareerCatalog = {
  'southern-mississippi': {
    title: 'Southern Mississippi',
    organization: 'The University of Southern Mississippi',
    role: 'ソフトウェア開発者',
    period: '2014年3月～2016年12月',
    location: 'ミシシッピ州ハティスバーグ',
    summary:
      '大学のiOSアプリ向けに、Objective-Cによるコンテンツ配信とネットワーク機能を開発しました。',
    illustrationNote:
      '独自制作の汎用モバイル開発機器と電話シミュレーターです。',
    sourceLabel: '確認済みの履歴書資料',
  },
  'naval-research': {
    title: 'Naval Research Laboratory',
    organization: 'Naval Research Laboratory',
    role: 'コンピューター科学者',
    period: '2017年1月～2018年9月',
    location: 'ミシシッピ州ステニス宇宙センター',
    summary:
      'C++/Qtの研究データ処理アプリケーションを開発し、リリース、デモ、文書作成に携わりました。',
    illustrationNote:
      '作動しない装飾品を収めた説明用の水槽です。特定の任務、兵器設計、能力、配備、実績を示すものではありません。',
    sourceLabel: '確認済みの履歴書資料',
  },
  youtube: {
    title: 'YouTube',
    organization: 'YouTube (Google)',
    role: 'サイト信頼性エンジニア',
    period: '2018年9月～2025年5月',
    location: 'カリフォルニア州サンブルーノ',
    summary:
      '製品の健全性指標、自動化、オンコール、インシデント対応、メンタリングに携わりました。',
    illustrationNote:
      '独自制作の説明用信頼性表示です。社内ダッシュボードや性能統計は含みません。',
    sourceLabel: '確認済みの履歴書資料',
  },
  'muon-space': {
    title: 'Muon Space',
    organization: 'Muon Space',
    role: 'シニアソフトウェアエンジニア',
    team: 'Mission Planning Platformチーム',
    period: '2026年9月～現在',
    summary:
      'Mission Planning Platformチームで、クラウドベースのミッション計画・制御ソフトウェアの開発に貢献しています。',
    illustrationNote:
      '独自制作の汎用CubeSatとミッション計画のモチーフです。Muonの宇宙機や社内インターフェースの複製ではありません。',
    disclaimer:
      'これは私個人のポートフォリオです。ここに記載された見解および内容は私個人のものであり、Muon Spaceを代表するものではありません。',
    sourceLabel: '公開された職務内容',
  },
};

const chinese: CareerCatalog = {
  'southern-mississippi': {
    title: 'Southern Mississippi',
    organization: 'The University of Southern Mississippi',
    role: '软件开发工程师',
    period: '2014年3月–2016年12月',
    location: '密西西比州哈蒂斯堡',
    summary: '使用 Objective-C 为大学的 iOS 应用开发内容分发和网络功能。',
    illustrationNote: '原创通用移动开发设备和手机模拟器。',
    sourceLabel: '已审核的简历来源',
  },
  'naval-research': {
    title: 'Naval Research Laboratory',
    organization: 'Naval Research Laboratory',
    role: '计算机科学家',
    period: '2017年1月–2018年9月',
    location: '密西西比州斯坦尼斯航天中心',
    summary: '开发 C++/Qt 科研数据处理应用，并参与版本发布、演示和文档编写。',
    illustrationNote:
      '展示性水族箱内含无功能的装饰道具，不代表具体任务、武器设计、能力、部署或成果。',
    sourceLabel: '已审核的简历来源',
  },
  youtube: {
    title: 'YouTube',
    organization: 'YouTube (Google)',
    role: '网站可靠性工程师',
    period: '2018年9月–2025年5月',
    location: '加利福尼亚州圣布鲁诺',
    summary: '参与产品健康指标、自动化、值班、事件响应和指导工作。',
    illustrationNote: '原创示意性可靠性显示，不含内部仪表盘或性能统计数据。',
    sourceLabel: '已审核的简历来源',
  },
  'muon-space': {
    title: 'Muon Space',
    organization: 'Muon Space',
    role: '高级软件工程师',
    team: 'Mission Planning Platform 团队',
    period: '2026年9月–至今',
    summary:
      '在 Mission Planning Platform 团队参与基于云的任务规划与控制软件开发。',
    illustrationNote:
      '原创通用 CubeSat 和任务规划主题图案，并非 Muon 航天器或内部界面的复制品。',
    disclaimer:
      '这是我的个人作品集。此处的观点和内容均属于我个人，并不代表 Muon Space。',
    sourceLabel: '公开职位说明',
  },
};

const arabic: CareerCatalog = {
  'southern-mississippi': {
    title: 'Southern Mississippi',
    organization: 'The University of Southern Mississippi',
    role: 'مطوّر برمجيات',
    period: 'مارس 2014–ديسمبر 2016',
    location: 'هاتيسبرغ، ميسيسيبي',
    summary:
      'طوّرت وظائف توصيل المحتوى والشبكات بلغة Objective-C لتطبيقات الجامعة على iOS.',
    illustrationNote: 'أجهزة عامة أصلية لتطوير تطبيقات الهاتف مع محاكي هاتف.',
    sourceLabel: 'مصدر السيرة الذاتية المُراجع',
  },
  'naval-research': {
    title: 'Naval Research Laboratory',
    organization: 'Naval Research Laboratory',
    role: 'عالم حاسوب',
    period: 'يناير 2017–سبتمبر 2018',
    location: 'مركز ستينيس الفضائي، ميسيسيبي',
    summary:
      'طوّرت تطبيقات لمعالجة بيانات البحث باستخدام C++/Qt، مع إصدارات وعروض توضيحية ووثائق.',
    illustrationNote:
      'حوض أسماك توضيحي يحتوي على مجسّم زخرفي خامل؛ لا يصوّر مهمة أو تصميم سلاح أو قدرة أو انتشارًا أو إنجازًا محددًا.',
    sourceLabel: 'مصدر السيرة الذاتية المُراجع',
  },
  youtube: {
    title: 'YouTube',
    organization: 'YouTube (Google)',
    role: 'مهندس موثوقية المواقع',
    period: 'سبتمبر 2018–مايو 2025',
    location: 'سان برونو، كاليفورنيا',
    summary:
      'عملت على مقاييس سلامة المنتج والأتمتة والمناوبات والاستجابة للحوادث والإرشاد.',
    illustrationNote:
      'عرض أصلي توضيحي للموثوقية؛ لا يتضمن لوحات داخلية أو إحصاءات أداء.',
    sourceLabel: 'مصدر السيرة الذاتية المُراجع',
  },
  'muon-space': {
    title: 'Muon Space',
    organization: 'Muon Space',
    role: 'مهندس برمجيات أول',
    team: 'فريق Mission Planning Platform',
    period: 'سبتمبر 2026–الآن',
    summary:
      'أساهم في برمجيات سحابية لتخطيط المهام والتحكم بها ضمن فريق Mission Planning Platform.',
    illustrationNote:
      'نموذج CubeSat عام أصلي وزخرفة لتخطيط المهام؛ ليسا نسخة من مركبة Muon الفضائية أو واجهة داخلية.',
    disclaimer:
      'هذا ملف أعمالي الشخصي. الآراء والمحتوى الواردان هنا خاصان بي ولا يمثلان شركة Muon Space.',
    sourceLabel: 'الوصف الوظيفي المنشور للعامة',
  },
};

const pseudo = Object.fromEntries(
  Object.entries(english).map(([id, copy]) => [
    id,
    Object.fromEntries(
      Object.entries(copy).map(([key, value]) => [
        key,
        value ? `⟦${value}⟧` : '',
      ])
    ),
  ])
) as unknown as CareerCatalog;

export const CAREER_LOCALE_COPY: Readonly<Record<Locale, CareerCatalog>> = {
  en: english,
  'en-x-pseudo': pseudo,
  ar: arabic,
  ja: japanese,
  'zh-Hans': chinese,
  es: spanish,
  pt: portuguese,
  de: german,
  hu: hungarian,
};
