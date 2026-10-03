import type { Locale } from './types';

export interface ExteriorStrings {
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
