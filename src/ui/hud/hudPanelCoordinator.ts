export type HudPanel = 'controls' | 'settings';

export interface HudPanelCoordinatorHandle {
  getActivePanel(): HudPanel | null;
  openControls(): void;
  closeControls(): void;
  toggleControls(): void;
  openSettings(): void;
  closeSettings(): void;
  toggleSettings(force?: boolean): void;
  activateText(): void;
  noteControlsOpen(): void;
  noteControlsClosed(): void;
  noteSettingsOpen(): void;
  noteSettingsClosed(): void;
  closeActivePanel(): boolean;
}

export interface HudPanelCoordinatorOptions {
  controls: {
    open(): void;
    close(): void;
    isOpen(): boolean;
  };
  settings: {
    open(): void;
    close(): void;
    toggle(force?: boolean): void;
    isOpen(): boolean;
  };
  onTextAction(): void;
}

export function createHudPanelCoordinator({
  controls,
  settings,
  onTextAction,
}: HudPanelCoordinatorOptions): HudPanelCoordinatorHandle {
  let activePanel: HudPanel | null = null;

  const refreshActivePanel = () => {
    if (settings.isOpen()) {
      activePanel = 'settings';
      return activePanel;
    }
    if (controls.isOpen()) {
      activePanel = 'controls';
      return activePanel;
    }
    activePanel = null;
    return activePanel;
  };

  const closeControls = () => {
    controls.close();
    if (activePanel === 'controls' && !controls.isOpen()) {
      activePanel = null;
    }
  };

  const closeSettings = () => {
    settings.close();
    if (activePanel === 'settings' && !settings.isOpen()) {
      activePanel = null;
    }
  };

  const openControls = () => {
    if (settings.isOpen()) {
      settings.close();
    }
    controls.open();
    activePanel = controls.isOpen() ? 'controls' : null;
  };

  const openSettings = () => {
    if (controls.isOpen()) {
      controls.close();
    }
    settings.open();
    activePanel = settings.isOpen() ? 'settings' : null;
  };

  return {
    getActivePanel() {
      return refreshActivePanel();
    },
    openControls,
    closeControls,
    toggleControls() {
      if (controls.isOpen()) {
        closeControls();
        return;
      }
      openControls();
    },
    openSettings,
    closeSettings,
    toggleSettings(force?: boolean) {
      const targetOpen = force ?? !settings.isOpen();
      if (targetOpen) {
        openSettings();
        return;
      }
      closeSettings();
    },
    activateText() {
      closeControls();
      closeSettings();
      activePanel = null;
      onTextAction();
    },
    noteControlsOpen() {
      if (settings.isOpen()) {
        settings.close();
      }
      activePanel = controls.isOpen() ? 'controls' : null;
    },
    noteControlsClosed() {
      if (activePanel === 'controls') {
        activePanel = settings.isOpen() ? 'settings' : null;
      }
    },
    noteSettingsOpen() {
      if (controls.isOpen()) {
        controls.close();
      }
      activePanel = settings.isOpen() ? 'settings' : null;
    },
    noteSettingsClosed() {
      if (activePanel === 'settings') {
        activePanel = controls.isOpen() ? 'controls' : null;
      }
    },
    closeActivePanel() {
      const panel = refreshActivePanel();
      if (panel === 'controls') {
        closeControls();
        return true;
      }
      if (panel === 'settings') {
        closeSettings();
        return true;
      }
      return false;
    },
  };
}
