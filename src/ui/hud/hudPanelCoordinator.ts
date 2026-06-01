export type HudPanel = 'controls' | 'settings';

interface TogglePanelHandle {
  open(): void;
  close(): void;
  toggle(force?: boolean): void;
  isOpen(): boolean;
}

export interface HudPanelCoordinatorOptions {
  controls: TogglePanelHandle;
  settings: TogglePanelHandle;
  controlsButton?: HTMLButtonElement | null;
  settingsButton?: HTMLButtonElement | null;
  textButton?: HTMLButtonElement | null;
  onTextMode: () => void;
  onActivePanelChange?: (panel: HudPanel | null) => void;
  documentTarget?: Document;
}

export interface HudPanelCoordinatorHandle {
  getActivePanel(): HudPanel | null;
  openControls(): void;
  toggleControls(): void;
  openSettings(): void;
  toggleSettings(force?: boolean): void;
  activateTextMode(): void;
  closeActivePanel(): void;
  closeAllPanels(): void;
  dispose(): void;
}

const updateButtonState = (
  button: HTMLButtonElement | null | undefined,
  active: boolean
) => {
  if (!button) {
    return;
  }
  button.setAttribute('aria-expanded', active ? 'true' : 'false');
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
};

export function createHudPanelCoordinator({
  controls,
  settings,
  controlsButton,
  settingsButton,
  textButton,
  onTextMode,
  onActivePanelChange,
  documentTarget = typeof document !== 'undefined' ? document : undefined,
}: HudPanelCoordinatorOptions): HudPanelCoordinatorHandle {
  let activePanel: HudPanel | null = null;
  let disposed = false;

  const syncState = () => {
    const previousPanel = activePanel;
    if (controls.isOpen()) {
      activePanel = 'controls';
    } else if (settings.isOpen()) {
      activePanel = 'settings';
    } else {
      activePanel = null;
    }
    updateButtonState(controlsButton, activePanel === 'controls');
    updateButtonState(settingsButton, activePanel === 'settings');
    if (activePanel !== previousPanel) {
      onActivePanelChange?.(activePanel);
    }
  };

  const closeControls = () => {
    controls.close();
  };

  const closeSettings = () => {
    settings.close();
  };

  const openControls = () => {
    closeSettings();
    controls.open();
    syncState();
  };

  const toggleControls = () => {
    if (controls.isOpen()) {
      closeControls();
      syncState();
      return;
    }
    openControls();
  };

  const openSettings = () => {
    closeControls();
    settings.open();
    syncState();
  };

  const toggleSettings = (force?: boolean) => {
    const shouldOpen = force ?? !settings.isOpen();
    if (shouldOpen) {
      openSettings();
      return;
    }
    closeSettings();
    syncState();
  };

  const closeAllPanels = () => {
    closeControls();
    closeSettings();
    syncState();
  };

  const closeActivePanel = () => {
    if (activePanel === 'controls') {
      closeControls();
    } else if (activePanel === 'settings') {
      closeSettings();
    }
    syncState();
  };

  const activateTextMode = () => {
    closeAllPanels();
    onTextMode();
  };

  const handleControlsClick = () => {
    toggleControls();
  };

  const handleSettingsClick = () => {
    toggleSettings();
  };

  const handleTextClick = () => {
    activateTextMode();
  };

  const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (
      event.key !== 'Escape' ||
      event.defaultPrevented ||
      activePanel === null
    ) {
      return;
    }
    event.preventDefault();
    closeActivePanel();
  };

  controlsButton?.addEventListener('click', handleControlsClick);
  settingsButton?.addEventListener('click', handleSettingsClick);
  textButton?.addEventListener('click', handleTextClick);
  documentTarget?.addEventListener('keydown', handleDocumentKeydown);
  syncState();

  return {
    getActivePanel() {
      syncState();
      return activePanel;
    },
    openControls,
    toggleControls,
    openSettings,
    toggleSettings,
    activateTextMode,
    closeActivePanel,
    closeAllPanels,
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      controlsButton?.removeEventListener('click', handleControlsClick);
      settingsButton?.removeEventListener('click', handleSettingsClick);
      textButton?.removeEventListener('click', handleTextClick);
      documentTarget?.removeEventListener('keydown', handleDocumentKeydown);
    },
  } satisfies HudPanelCoordinatorHandle;
}
