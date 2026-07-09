import type { ControlOverlayItemStrings, ControlOverlayStrings } from './types';

export const CONTROL_ITEM_IDS = [
  'keyboardMove',
  'pointerDrag',
  'pointerZoom',
  'keyboardZoom',
  'touchDrag',
  'touchPinch',
  'cyclePoi',
  'toggleTextMode',
  'interact',
  'lightingDebug',
] as const;

export type ControlItemId = (typeof CONTROL_ITEM_IDS)[number];

export interface ControlItemRow extends ControlOverlayItemStrings {
  id: ControlItemId;
}

export function getControlItemRows(
  strings: ControlOverlayStrings
): readonly ControlItemRow[] {
  return CONTROL_ITEM_IDS.map((id) => {
    if (id === 'interact') {
      return {
        id,
        keys: strings.interact.defaultLabel,
        description: strings.interact.description,
      };
    }
    return { id, ...strings.items[id] };
  });
}

export interface ControlHelpRow {
  label: string;
  description: string;
}

export function getControlHelpRows(
  strings: ControlOverlayStrings
): readonly ControlHelpRow[] {
  return getControlItemRows(strings).map(({ keys, description }) => ({
    label: keys,
    description,
  }));
}
