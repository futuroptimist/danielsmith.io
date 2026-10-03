import type { Locale } from './types';

export interface ExteriorStrings {
  busStop: string;
  comingSoon: string;
  busStopMessage: string;
  frontDoor: string;
  houseDoor: string;
  garageDoor: string;
  open: string;
  close: string;
  closed: string;
  opening: string;
  opened: string;
  closing: string;
  occupied: string;
  status: string;
}
const english: ExteriorStrings = {
  busStop: 'Bus stop',
  comingSoon: 'Coming Soon',
  busStopMessage:
    'Travel from this stop is coming soon. No bus service or fast travel is available yet.',
  frontDoor: 'Front door',
  houseDoor: 'House–garage door',
  garageDoor: 'Garage door',
  open: 'Open {door}',
  close: 'Close {door}',
  closed: 'Closed',
  opening: 'Opening',
  opened: 'Open',
  closing: 'Closing',
  occupied: 'Doorway occupied. Holding the door open.',
  status: '{door}: {state}',
};
export const EXTERIOR_LOCALE_COPY: Record<Locale, ExteriorStrings> = {
  en: english,
  es: {
    busStop: 'Parada de autobús',
    comingSoon: 'Próximamente',
    busStopMessage:
      'Los viajes desde esta parada estarán disponibles más adelante. ' +
      'Aún no hay servicio de autobús ni viaje rápido.',
    frontDoor: 'Puerta principal',
    houseDoor: 'Puerta de la casa al garaje',
    garageDoor: 'Puerta del garaje',
    open: 'Abrir {door}',
    close: 'Cerrar {door}',
    closed: 'Cerrada',
    opening: 'Abriendo',
    opened: 'Abierta',
    closing: 'Cerrando',
    occupied: 'Entrada ocupada. La puerta permanece abierta.',
    status: '{door}: {state}',
  },
  pt: {
    busStop: 'Ponto de ônibus',
    comingSoon: 'Em breve',
    busStopMessage:
      'As viagens a partir deste ponto estarão disponíveis no futuro. ' +
      'Ainda não há serviço de ônibus nem viagem rápida.',
    frontDoor: 'Porta da frente',
    houseDoor: 'Porta entre a casa e a garagem',
    garageDoor: 'Porta da garagem',
    open: 'Abrir {door}',
    close: 'Fechar {door}',
    closed: 'Fechada',
    opening: 'Abrindo',
    opened: 'Aberta',
    closing: 'Fechando',
    occupied: 'Entrada ocupada. A porta permanece aberta.',
    status: '{door}: {state}',
  },
  de: {
    busStop: 'Bushaltestelle',
    comingSoon: 'Demnächst',
    busStopMessage:
      'Reisen ab dieser Haltestelle sind für später geplant. Es gibt ' +
      'noch keinen Busverkehr und keine Schnellreise.',
    frontDoor: 'Haustür',
    houseDoor: 'Tür zwischen Haus und Garage',
    garageDoor: 'Garagentor',
    open: '{door} öffnen',
    close: '{door} schließen',
    closed: 'Geschlossen',
    opening: 'Öffnet',
    opened: 'Offen',
    closing: 'Schließt',
    occupied: 'Durchgang belegt. Die Tür bleibt offen.',
    status: '{door}: {state}',
  },
  hu: {
    busStop: 'Buszmegálló',
    comingSoon: 'Hamarosan',
    busStopMessage:
      'Az utazás erről a megállóról később lesz elérhető. Egyelőre ' +
      'nincs buszjárat vagy gyorsutazás.',
    frontDoor: 'Bejárati ajtó',
    houseDoor: 'Ház és garázs közötti ajtó',
    garageDoor: 'Garázskapu',
    open: '{door} kinyitása',
    close: '{door} bezárása',
    closed: 'Zárva',
    opening: 'Nyílik',
    opened: 'Nyitva',
    closing: 'Záródik',
    occupied: 'Az átjáró foglalt. Az ajtó nyitva marad.',
    status: '{door}: {state}',
  },
  ja: {
    busStop: 'バス停',
    comingSoon: '近日公開',
    busStopMessage:
      'このバス停からの移動は今後公開予定です。現在、バスの運行やファストトラベルは利用できません。',
    frontDoor: '玄関ドア',
    houseDoor: '家とガレージのドア',
    garageDoor: 'ガレージドア',
    open: '{door}を開く',
    close: '{door}を閉じる',
    closed: '閉まっています',
    opening: '開いています',
    opened: '開放中',
    closing: '閉じています',
    occupied: '出入口に人がいます。ドアを開いたままにします。',
    status: '{door}：{state}',
  },
  'zh-Hans': {
    busStop: '公交站',
    comingSoon: '即将推出',
    busStopMessage:
      '此站点的出行功能将在未来开放。目前没有公交服务或快速旅行功能。',
    frontDoor: '前门',
    houseDoor: '房屋与车库之间的门',
    garageDoor: '车库门',
    open: '打开{door}',
    close: '关闭{door}',
    closed: '已关闭',
    opening: '正在打开',
    opened: '已打开',
    closing: '正在关闭',
    occupied: '门口有人。保持门开启。',
    status: '{door}：{state}',
  },
  ar: {
    busStop: 'موقف الحافلات',
    comingSoon: 'قريبًا',
    busStopMessage:
      'سيُتاح السفر من هذا الموقف لاحقًا. لا تتوفر خدمة حافلات أو انتقال سريع حاليًا.',
    frontDoor: 'الباب الأمامي',
    houseDoor: 'باب المنزل والمرآب',
    garageDoor: 'باب المرآب',
    open: 'فتح {door}',
    close: 'إغلاق {door}',
    closed: 'مغلق',
    opening: 'جارٍ الفتح',
    opened: 'مفتوح',
    closing: 'جارٍ الإغلاق',
    occupied: 'المدخل مشغول. سيبقى الباب مفتوحًا.',
    status: '{door}: {state}',
  },
  'en-x-pseudo': Object.fromEntries(
    Object.entries(english).map(([key, value]) => [key, `［${value} ···］`])
  ) as unknown as ExteriorStrings,
};
export const getExteriorStrings = (locale: Locale): ExteriorStrings =>
  EXTERIOR_LOCALE_COPY[locale];
