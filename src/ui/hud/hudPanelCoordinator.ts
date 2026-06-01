export type HudPanel = 'controls' | 'settings';

export interface HudPanelCoordinatorOptions {
  isControlsOpen: () => boolean;
  openControls: () => void;
  closeControls: () => void;
  isSettingsOpen: () => boolean;
  openSettings: () => void;
  closeSettings: () => void;
  activateTextMode: () => void;
}

export interface HudPanelCoordinatorHandle {
  getActivePanel(): HudPanel | null;
  openControls(): void;
  toggleControls(): void;
  openSettings(): void;
  toggleSettings(force?: boolean): void;
  activateTextMode(): void;
  closeActivePanel(): boolean;
  sync(): HudPanel | null;
}

export function createHudPanelCoordinator({
  isControlsOpen,
  openControls,
  closeControls,
  isSettingsOpen,
  openSettings,
  closeSettings,
  activateTextMode,
}: HudPanelCoordinatorOptions): HudPanelCoordinatorHandle {
  let activePanel: HudPanel | null = null;

  const sync = () => {
    if (isControlsOpen()) {
      activePanel = 'controls';
      return activePanel;
    }
    if (isSettingsOpen()) {
      activePanel = 'settings';
      return activePanel;
    }
    activePanel = null;
    return activePanel;
  };

  const closeControlsPanel = () => {
    if (isControlsOpen()) {
      closeControls();
    }
  };

  const closeSettingsPanel = () => {
    if (isSettingsOpen()) {
      closeSettings();
    }
  };

  const showControls = () => {
    closeSettingsPanel();
    openControls();
    activePanel = 'controls';
    sync();
  };

  const showSettings = () => {
    closeControlsPanel();
    openSettings();
    activePanel = 'settings';
    sync();
  };

  return {
    getActivePanel() {
      return sync();
    },
    openControls: showControls,
    toggleControls() {
      if (isControlsOpen()) {
        closeControls();
        activePanel = null;
        sync();
        return;
      }
      showControls();
    },
    openSettings: showSettings,
    toggleSettings(force?: boolean) {
      const shouldOpen = force ?? !isSettingsOpen();
      if (shouldOpen) {
        showSettings();
        return;
      }
      closeSettingsPanel();
      activePanel = null;
      sync();
    },
    activateTextMode() {
      closeControlsPanel();
      closeSettingsPanel();
      activePanel = null;
      activateTextMode();
      sync();
    },
    closeActivePanel() {
      sync();
      if (activePanel === 'controls') {
        closeControlsPanel();
        activePanel = null;
        sync();
        return true;
      }
      if (activePanel === 'settings') {
        closeSettingsPanel();
        activePanel = null;
        sync();
        return true;
      }
      return false;
    },
    sync,
  };
}
