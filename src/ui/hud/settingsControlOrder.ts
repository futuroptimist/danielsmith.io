export const SETTINGS_CONTROL_SLOT_IDS = [
  'graphics-quality',
  'accessibility-presets',
  'language',
  'motion-blur',
  'audio',
  'manual-mode',
  'narration',
  'guided-tour',
  'tour-reset',
  'debug',
  'customization',
] as const;

export type SettingsControlSlotId = (typeof SETTINGS_CONTROL_SLOT_IDS)[number];

export function resolveSettingsControlOrder(): readonly SettingsControlSlotId[] {
  return SETTINGS_CONTROL_SLOT_IDS;
}

export function createSettingsControlSlots(
  container: HTMLElement
): Record<SettingsControlSlotId, HTMLElement> {
  return SETTINGS_CONTROL_SLOT_IDS.reduce(
    (slots, slotId) => {
      const slot = document.createElement('div');
      slot.className = 'hud-settings__slot';
      slot.dataset.settingsSlot = slotId;
      container.appendChild(slot);
      slots[slotId] = slot;
      return slots;
    },
    {} as Record<SettingsControlSlotId, HTMLElement>
  );
}
