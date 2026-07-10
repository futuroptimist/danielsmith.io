export type HudPanel = 'controls' | 'tutorial' | 'settings';

interface TogglePanelHandle {
  open(): void;
  close(): void;
  toggle(force?: boolean): void;
  releaseButtonFocusOnNextOpen?(): void;
  isOpen(): boolean;
}

export interface HudPanelCoordinatorOptions {
  controls: TogglePanelHandle;
  settings: TogglePanelHandle;
  tutorial?: TogglePanelHandle;
  controlsButton?: HTMLButtonElement | null;
  settingsButton?: HTMLButtonElement | null;
  tutorialButton?: HTMLButtonElement | null;
  textButton?: HTMLButtonElement | null;
  onTextMode: () => void;
  onActivePanelChange?: (panel: HudPanel | null) => void;
  documentTarget?: Document;
}

export interface HudPanelCoordinatorHandle {
  getActivePanel(): HudPanel | null;
  openControls(): void;
  toggleControls(): void;
  openTutorial(): void;
  toggleTutorial(): void;
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
  tutorial,
  controlsButton,
  settingsButton,
  tutorialButton,
  textButton,
  onTextMode,
  onActivePanelChange,
  documentTarget = typeof document !== 'undefined' ? document : undefined,
}: HudPanelCoordinatorOptions): HudPanelCoordinatorHandle {
  const hasTutorialPanel = tutorial !== undefined;
  const tutorialPanel =
    tutorial ??
    ({
      open() {},
      close() {},
      toggle() {},
      isOpen: () => false,
    } satisfies TogglePanelHandle);
  let activePanel: HudPanel | null = null;
  let disposed = false;

  const syncState = () => {
    const previousPanel = activePanel;
    if (controls.isOpen()) {
      activePanel = 'controls';
    } else if (tutorialPanel.isOpen()) {
      activePanel = 'tutorial';
    } else if (settings.isOpen()) {
      activePanel = 'settings';
    } else {
      activePanel = null;
    }
    updateButtonState(controlsButton, activePanel === 'controls');
    updateButtonState(settingsButton, activePanel === 'settings');
    updateButtonState(tutorialButton, activePanel === 'tutorial');
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

  const closeTutorial = () => {
    tutorialPanel.close();
  };

  const openControls = () => {
    closeSettings();
    closeTutorial();
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

  const openTutorial = () => {
    if (!hasTutorialPanel) {
      return;
    }
    closeControls();
    closeSettings();
    tutorialPanel.open();
    syncState();
  };

  const toggleTutorial = () => {
    if (!hasTutorialPanel) {
      return;
    }
    if (tutorialPanel.isOpen()) {
      closeTutorial();
      syncState();
      return;
    }
    openTutorial();
  };

  const openSettings = () => {
    closeControls();
    closeTutorial();
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
    closeTutorial();
    closeSettings();
    syncState();
  };

  const closeActivePanel = () => {
    if (activePanel === 'controls') {
      closeControls();
    } else if (activePanel === 'tutorial') {
      closeTutorial();
    } else if (activePanel === 'settings') {
      closeSettings();
    }
    syncState();
  };

  const activateTextMode = () => {
    closeAllPanels();
    onTextMode();
  };

  const handleControlsClick = (event: MouseEvent) => {
    if (!controls.isOpen() && event.detail > 0) {
      controls.releaseButtonFocusOnNextOpen?.();
    }
    toggleControls();
  };

  const handleSettingsClick = () => {
    toggleSettings();
  };

  const handleTutorialClick = () => {
    toggleTutorial();
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
  tutorialButton?.addEventListener('click', handleTutorialClick);
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
    openTutorial,
    toggleTutorial,
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
      tutorialButton?.removeEventListener('click', handleTutorialClick);
      textButton?.removeEventListener('click', handleTextClick);
      documentTarget?.removeEventListener('keydown', handleDocumentKeydown);
    },
  } satisfies HudPanelCoordinatorHandle;
}
