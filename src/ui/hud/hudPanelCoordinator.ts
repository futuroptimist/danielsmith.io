export type HudPanel = 'controls' | 'settings';

export interface HudPanelHandle {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
}

export interface HudPanelCoordinatorOptions {
  controls: HudPanelHandle | null;
  settings: HudPanelHandle | null;
  onTextAction: () => void;
}

export interface HudPanelCoordinatorHandle {
  getActivePanel(): HudPanel | null;
  openControls(): void;
  toggleControls(): void;
  openSettings(): void;
  toggleSettings(): void;
  closeActivePanel(): boolean;
  closePanel(panel: HudPanel): void;
  notifyOpened(panel: HudPanel): void;
  notifyClosed(panel: HudPanel): void;
  activateTextAction(): void;
}

export function createHudPanelCoordinator({
  controls,
  settings,
  onTextAction,
}: HudPanelCoordinatorOptions): HudPanelCoordinatorHandle {
  let activePanel: HudPanel | null = null;

  const getHandle = (panel: HudPanel): HudPanelHandle | null =>
    panel === 'controls' ? controls : settings;

  const oppositePanel = (panel: HudPanel): HudPanel =>
    panel === 'controls' ? 'settings' : 'controls';

  const closePanel = (panel: HudPanel): void => {
    getHandle(panel)?.close();
    if (activePanel === panel) {
      activePanel = null;
    }
  };

  const openPanel = (panel: HudPanel): void => {
    closePanel(oppositePanel(panel));
    getHandle(panel)?.open();
    activePanel = panel;
  };

  const togglePanel = (panel: HudPanel): void => {
    const handle = getHandle(panel);
    if (!handle) {
      return;
    }
    if (activePanel === panel || handle.isOpen()) {
      handle.close();
      if (activePanel === panel) {
        activePanel = null;
      }
      return;
    }
    openPanel(panel);
  };

  return {
    getActivePanel() {
      return activePanel;
    },
    openControls() {
      openPanel('controls');
    },
    toggleControls() {
      togglePanel('controls');
    },
    openSettings() {
      openPanel('settings');
    },
    toggleSettings() {
      togglePanel('settings');
    },
    closeActivePanel() {
      if (!activePanel) {
        return false;
      }
      closePanel(activePanel);
      return true;
    },
    closePanel,
    notifyOpened(panel) {
      closePanel(oppositePanel(panel));
      activePanel = panel;
    },
    notifyClosed(panel) {
      if (activePanel === panel) {
        activePanel = null;
      }
    },
    activateTextAction() {
      closePanel('controls');
      closePanel('settings');
      onTextAction();
    },
  };
}
