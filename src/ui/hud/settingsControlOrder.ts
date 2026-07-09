export const SETTINGS_CONTROL_SLOT_ORDER = ['top', 'middle', 'bottom'] as const;

export type SettingsControlSlot = (typeof SETTINGS_CONTROL_SLOT_ORDER)[number];

export interface SettingsControlSlots {
  readonly top: HTMLElement;
  readonly middle: HTMLElement;
  readonly bottom: HTMLElement;
}

export function createSettingsControlSlots(
  container: HTMLElement
): SettingsControlSlots {
  const slots = SETTINGS_CONTROL_SLOT_ORDER.map((slot) => {
    const element = document.createElement('div');
    element.className = 'hud-settings__slot';
    element.dataset.settingsSlot = slot;
    return [slot, element] as const;
  });
  container.append(...slots.map(([, element]) => element));
  return Object.fromEntries(slots) as unknown as SettingsControlSlots;
}
