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

export interface ControlHelpRow {
  label: string;
  description: string;
}

const pseudoWrapIfNeeded = (strings: ControlOverlayStrings, value: string) =>
  strings.heading.startsWith('⟦') && strings.heading.endsWith('⟧')
    ? `⟦${value}⟧`
    : value;

export function getControlHelpRows(
  strings: ControlOverlayStrings
): readonly ControlHelpRow[] {
  return [
    ...getControlItemRows(strings).map(({ keys, description }) => ({
      label: keys,
      description,
    })),
    {
      label: strings.interact.defaultLabel,
      description: strings.interact.description,
    },
    {
      label: 'Shift + L',
      description: pseudoWrapIfNeeded(strings, 'Toggle lighting debug view'),
    },
  ];
}
