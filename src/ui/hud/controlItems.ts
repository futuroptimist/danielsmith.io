import type {
  ControlOverlayItemStrings,
  ControlOverlayStrings,
} from '../../assets/i18n';

export const CONTROL_ITEM_IDS = Object.freeze([
  'keyboardMove',
  'pointerDrag',
  'pointerZoom',
  'keyboardZoom',
  'touchDrag',
  'touchPinch',
  'cyclePoi',
  'toggleTextMode',
] as const);

export type ControlItemId = (typeof CONTROL_ITEM_IDS)[number];

export interface ControlItemRow {
  id: ControlItemId | 'interact';
  keys: string;
  description: string;
}

export function getControlItemRows(
  strings: ControlOverlayStrings,
  options: { includeInteract?: boolean } = {}
): ControlItemRow[] {
  const rows: ControlItemRow[] = CONTROL_ITEM_IDS.map((id) => ({
    id,
    ...strings.items[id],
  }));

  if (options.includeInteract) {
    rows.push({
      id: 'interact',
      keys: strings.interact.defaultLabel,
      description: strings.interact.description,
    });
  }

  return rows;
}

export function getControlItemStrings(
  strings: ControlOverlayStrings,
  id: ControlItemId
): ControlOverlayItemStrings {
  return strings.items[id];
}
