import { describe, expect, it, vi } from 'vitest';

import { createHudPanelCoordinator } from '../ui/hud/hudPanelCoordinator';

const createFixture = () => {
  let controlsOpen = false;
  let settingsOpen = false;
  const calls: string[] = [];

  const coordinator = createHudPanelCoordinator({
    isControlsOpen: () => controlsOpen,
    openControls: vi.fn(() => {
      calls.push('openControls');
      controlsOpen = true;
    }),
    closeControls: vi.fn(() => {
      calls.push('closeControls');
      controlsOpen = false;
    }),
    isSettingsOpen: () => settingsOpen,
    openSettings: vi.fn(() => {
      calls.push('openSettings');
      settingsOpen = true;
    }),
    closeSettings: vi.fn(() => {
      calls.push('closeSettings');
      settingsOpen = false;
    }),
    activateTextMode: vi.fn(() => {
      calls.push('activateTextMode');
    }),
  });

  return {
    coordinator,
    calls,
    get controlsOpen() {
      return controlsOpen;
    },
    get settingsOpen() {
      return settingsOpen;
    },
  };
};

describe('createHudPanelCoordinator', () => {
  it('closes Controls before opening Settings', () => {
    const fixture = createFixture();

    fixture.coordinator.openControls();
    fixture.coordinator.openSettings();

    expect(fixture.controlsOpen).toBe(false);
    expect(fixture.settingsOpen).toBe(true);
    expect(fixture.coordinator.getActivePanel()).toBe('settings');
    expect(fixture.calls).toEqual([
      'openControls',
      'closeControls',
      'openSettings',
    ]);
  });

  it('closes Settings before opening Controls', () => {
    const fixture = createFixture();

    fixture.coordinator.openSettings();
    fixture.coordinator.openControls();

    expect(fixture.controlsOpen).toBe(true);
    expect(fixture.settingsOpen).toBe(false);
    expect(fixture.coordinator.getActivePanel()).toBe('controls');
    expect(fixture.calls).toEqual([
      'openSettings',
      'closeSettings',
      'openControls',
    ]);
  });

  it('closes panels before activating text mode', () => {
    const fixture = createFixture();

    fixture.coordinator.openControls();
    fixture.coordinator.activateTextMode();

    expect(fixture.controlsOpen).toBe(false);
    expect(fixture.settingsOpen).toBe(false);
    expect(fixture.coordinator.getActivePanel()).toBeNull();
    expect(fixture.calls).toEqual([
      'openControls',
      'closeControls',
      'activateTextMode',
    ]);
  });
});
