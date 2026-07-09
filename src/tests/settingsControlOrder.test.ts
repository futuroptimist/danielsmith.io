import { describe, expect, it } from 'vitest';

import {
  createSettingsControlSlots,
  resolveSettingsControlOrder,
} from '../ui/hud/settingsControlOrder';

describe('settings control order', () => {
  it('keeps Graphics Quality first and Customization last', () => {
    const order = resolveSettingsControlOrder();

    expect(order[0]).toBe('graphics-quality');
    expect(order.at(-1)).toBe('customization');
  });

  it('creates DOM slots in the resolved order', () => {
    const container = document.createElement('div');
    const slots = createSettingsControlSlots(container);
    const slotIds = Array.from(container.children).map(
      (child) => (child as HTMLElement).dataset.settingsSlot
    );

    expect(slotIds).toEqual([...resolveSettingsControlOrder()]);
    expect(container.firstElementChild).toBe(slots['graphics-quality']);
    expect(container.lastElementChild).toBe(slots.customization);
  });
});
