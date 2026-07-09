import type {
  ControlOverlayItemStrings,
  ControlOverlayStrings,
} from '../../assets/i18n/types';

export const CONTROL_ITEM_IDS = [
  'keyboardMove',
  'pointerDrag',
  'pointerZoom',
  'keyboardZoom',
  'touchDrag',
  'touchPinch',
  'cyclePoi',
  'toggleTextMode',
] as const satisfies readonly (keyof ControlOverlayStrings['items'])[];

export type ControlItemId = (typeof CONTROL_ITEM_IDS)[number];

export interface ControlItemRow extends ControlOverlayItemStrings {
  id: ControlItemId;
}

export function getControlItemRows(
  strings: ControlOverlayStrings
): readonly ControlItemRow[] {
  return CONTROL_ITEM_IDS.map((id) => ({ id, ...strings.items[id] }));
}
