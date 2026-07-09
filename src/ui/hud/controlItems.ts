import type {
  ControlOverlayItemStrings,
  ControlOverlayStrings,
} from '../../assets/i18n/types';

import type { HelpModalItem } from './helpModal';

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

export interface CanonicalControlItem extends ControlOverlayItemStrings {
  id: ControlItemId;
}

export function getCanonicalControlItems(
  strings: ControlOverlayStrings
): readonly CanonicalControlItem[] {
  return CONTROL_ITEM_IDS.map((id) => ({ id, ...strings.items[id] }));
}

export function getCanonicalControlHelpItems(
  strings: ControlOverlayStrings
): readonly HelpModalItem[] {
  return getCanonicalControlItems(strings).map(({ keys, description }) => ({
    label: keys,
    description,
  }));
}
