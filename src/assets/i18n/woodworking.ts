import type { Locale } from './types';

const english =
  'Woodworking corner: two workbenches, a stationary band saw and drill press, ' +
  'a birdhouse awaiting its roof, a bookshelf with missing shelves, a clamped picture frame, ' +
  'a slatted planter under assembly and a stool awaiting its top. Hand tools hang above the benches.';

export const WORKSHOP_DESCRIPTIONS: Record<Locale, string> = {
  en: english,
  es: 'Rincón de carpintería: dos bancos de trabajo, una sierra de cinta y un taladro de columna inmóviles, una casita de pájaros sin techo, una estantería con baldas pendientes, un marco de fotos sujeto con abrazaderas, una jardinera de listones a medio montar y un taburete sin asiento. Las herramientas manuales cuelgan sobre los bancos.',
  pt: 'Canto de marcenaria: duas bancadas, uma serra de fita e uma furadeira de bancada paradas, uma casinha de pássaros sem telhado, uma estante com prateleiras por colocar, uma moldura presa com grampos, uma jardineira de ripas em montagem e um banco sem assento. Ferramentas manuais ficam penduradas acima das bancadas.',
  de: 'Holzwerkstatt: zwei Werkbänke, eine stillstehende Bandsäge und Standbohrmaschine, ein Vogelhaus ohne Dach, ein Bücherregal mit fehlenden Böden, ein eingespannter Bilderrahmen, ein halbfertiger Pflanzkasten aus Latten und ein Hocker ohne Sitzfläche. Handwerkzeuge hängen über den Werkbänken.',
  hu: 'Asztalossarok: két munkapad, álló szalagfűrész és oszlopos fúrógép, tetőre váró madárház, hiányzó polcú könyvespolc, szorítókkal rögzített képkeret, félig összeállított léces virágláda és ülőlapra váró zsámoly. A kéziszerszámok a munkapadok felett lógnak.',
  ja: '木工コーナー：2台の作業台、停止中のバンドソーとボール盤、屋根を待つ巣箱、棚板が未完成の本棚、クランプで固定した額縁、組み立て途中の木製プランター、座面を待つスツールがあります。作業台の上には手工具が掛けられています。',
  'zh-Hans':
    '木工角：两张工作台、静止的带锯和台钻、等待安装屋顶的鸟屋、尚缺层板的书架、用夹具固定的相框、正在组装的板条花箱，以及等待安装座面的凳子。手工具悬挂在工作台上方。',
  ar: 'ركن النجارة: منضدتا عمل ومنشار شريطي ومثقاب عمودي متوقفان، وبيت طيور ينتظر سقفه، ومكتبة تنقصها رفوف، وإطار صورة مثبت بالمشابك، وحوض زرع من شرائح خشبية قيد التجميع، ومقعد ينتظر سطحه. أدوات يدوية معلقة فوق المنضدتين.',
  'en-x-pseudo': `[${english} !!!]`,
};

export const getWorkshopDescription = (locale: Locale) =>
  WORKSHOP_DESCRIPTIONS[locale];
