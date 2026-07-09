import type { ControlOverlayStrings } from '../../assets/i18n/types';

export type ControlItemId = keyof ControlOverlayStrings['items'] | 'interact';

export interface ControlItemDefinition {
  readonly id: ControlItemId;
  readonly inputMethods?: readonly string[];
  readonly dynamic?: boolean;
}

export interface ResolvedControlItem {
  readonly id: ControlItemId;
  readonly label: string;
  readonly description: string;
}

export const CONTROL_ITEM_ORDER: readonly ControlItemDefinition[] = [
  { id: 'keyboardMove', inputMethods: ['keyboard'] },
  { id: 'pointerDrag', inputMethods: ['pointer'] },
  { id: 'pointerZoom', inputMethods: ['pointer'] },
  { id: 'keyboardZoom', inputMethods: ['keyboard'] },
  { id: 'touchDrag', inputMethods: ['touch'] },
  { id: 'touchPinch', inputMethods: ['touch'] },
  { id: 'cyclePoi', inputMethods: ['keyboard'] },
  { id: 'toggleTextMode', inputMethods: ['keyboard'] },
  {
    id: 'interact',
    inputMethods: ['keyboard', 'pointer', 'touch'],
    dynamic: true,
  },
] as const;

export function getResolvedControlItems(
  strings: ControlOverlayStrings
): readonly ResolvedControlItem[] {
  return CONTROL_ITEM_ORDER.map(({ id }) => {
    if (id === 'interact') {
      return {
        id,
        label: strings.interact.defaultLabel,
        description: strings.interact.description,
      };
    }
    const item = strings.items[id];
    return { id, label: item.keys, description: item.description };
  });
}
