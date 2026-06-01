import { describe, expect, it, vi } from 'vitest';

import { createHudPanelCoordinator } from '../ui/hud/hudPanelCoordinator';

const createPanel = () => {
  let open = false;
  return {
    open: vi.fn(() => {
      open = true;
    }),
    close: vi.fn(() => {
      open = false;
    }),
    toggle: vi.fn((force?: boolean) => {
      open = force ?? !open;
    }),
    isOpen: vi.fn(() => open),
  };
};

describe('createHudPanelCoordinator', () => {
  it('closes Controls before opening Settings', () => {
    const controls = createPanel();
    const settings = createPanel();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextAction: vi.fn(),
    });

    coordinator.openControls();
    expect(coordinator.getActivePanel()).toBe('controls');

    coordinator.openSettings();

    expect(controls.close).toHaveBeenCalledTimes(1);
    expect(settings.open).toHaveBeenCalledTimes(1);
    expect(controls.isOpen()).toBe(false);
    expect(settings.isOpen()).toBe(true);
    expect(coordinator.getActivePanel()).toBe('settings');
  });

  it('closes Settings before opening Controls', () => {
    const controls = createPanel();
    const settings = createPanel();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextAction: vi.fn(),
    });

    coordinator.openSettings();
    expect(coordinator.getActivePanel()).toBe('settings');

    coordinator.openControls();

    expect(settings.close).toHaveBeenCalledTimes(1);
    expect(controls.open).toHaveBeenCalledTimes(1);
    expect(settings.isOpen()).toBe(false);
    expect(controls.isOpen()).toBe(true);
    expect(coordinator.getActivePanel()).toBe('controls');
  });

  it('closes panels before triggering text mode', () => {
    const controls = createPanel();
    const settings = createPanel();
    const onTextAction = vi.fn();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextAction,
    });

    coordinator.openControls();
    coordinator.activateText();

    expect(controls.close).toHaveBeenCalled();
    expect(settings.close).toHaveBeenCalled();
    expect(onTextAction).toHaveBeenCalledTimes(1);
    expect(coordinator.getActivePanel()).toBeNull();
  });

  it('mirrors direct controller open notifications for mutual exclusion', () => {
    const controls = createPanel();
    const settings = createPanel();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextAction: vi.fn(),
    });

    settings.open();
    coordinator.noteSettingsOpen();
    controls.open();
    coordinator.noteControlsOpen();

    expect(settings.close).toHaveBeenCalledTimes(1);
    expect(coordinator.getActivePanel()).toBe('controls');
  });
});
