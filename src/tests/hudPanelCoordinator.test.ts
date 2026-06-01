import { describe, expect, it, vi } from 'vitest';

import {
  createHudPanelCoordinator,
  type HudPanelHandle,
} from '../ui/hud/hudPanelCoordinator';

function createPanelHandle(): HudPanelHandle & {
  openMock: ReturnType<typeof vi.fn>;
  closeMock: ReturnType<typeof vi.fn>;
} {
  let open = false;
  const openMock = vi.fn(() => {
    open = true;
  });
  const closeMock = vi.fn(() => {
    open = false;
  });
  return {
    open: openMock,
    close: closeMock,
    toggle: vi.fn(() => {
      open = !open;
    }),
    isOpen: () => open,
    openMock,
    closeMock,
  };
}

describe('createHudPanelCoordinator', () => {
  it('closes Controls before opening Settings', () => {
    const controls = createPanelHandle();
    const settings = createPanelHandle();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextAction: vi.fn(),
    });

    coordinator.openControls();
    coordinator.openSettings();

    expect(controls.closeMock).toHaveBeenCalledTimes(1);
    expect(settings.openMock).toHaveBeenCalledTimes(1);
    expect(coordinator.getActivePanel()).toBe('settings');
  });

  it('closes Settings before opening Controls', () => {
    const controls = createPanelHandle();
    const settings = createPanelHandle();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextAction: vi.fn(),
    });

    coordinator.openSettings();
    coordinator.openControls();

    expect(settings.closeMock).toHaveBeenCalled();
    expect(controls.openMock).toHaveBeenCalledTimes(1);
    expect(coordinator.getActivePanel()).toBe('controls');
  });

  it('closes open panels before triggering the Text action', () => {
    const controls = createPanelHandle();
    const settings = createPanelHandle();
    const onTextAction = vi.fn();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextAction,
    });

    coordinator.openControls();
    coordinator.activateTextAction();

    expect(controls.closeMock).toHaveBeenCalledTimes(1);
    expect(settings.closeMock).toHaveBeenCalled();
    expect(onTextAction).toHaveBeenCalledTimes(1);
    expect(coordinator.getActivePanel()).toBeNull();
  });
});
