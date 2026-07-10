import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTutorialPanelStrings } from '../assets/i18n';
import { createHudPanelCoordinator } from '../ui/hud/hudPanelCoordinator';
import { createTutorialPanel } from '../ui/hud/tutorialPanel';

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
    isOpen: () => open,
  };
};

describe('createHudPanelCoordinator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('closes Settings when Controls opens', () => {
    const controls = createPanel();
    const settings = createPanel();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextMode: vi.fn(),
    });

    coordinator.openSettings();
    expect(settings.isOpen()).toBe(true);

    coordinator.openControls();

    expect(settings.close).toHaveBeenCalled();
    expect(settings.isOpen()).toBe(false);
    expect(controls.isOpen()).toBe(true);
    expect(coordinator.getActivePanel()).toBe('controls');

    coordinator.dispose();
  });

  it('closes Controls when Settings opens', () => {
    const controls = createPanel();
    const settings = createPanel();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextMode: vi.fn(),
    });

    coordinator.openControls();
    expect(controls.isOpen()).toBe(true);

    coordinator.openSettings();

    expect(controls.close).toHaveBeenCalled();
    expect(controls.isOpen()).toBe(false);
    expect(settings.isOpen()).toBe(true);
    expect(coordinator.getActivePanel()).toBe('settings');

    coordinator.dispose();
  });

  it('marks pointer-opened Controls so managed overlays can release trigger focus', () => {
    const controls = {
      ...createPanel(),
      releaseButtonFocusOnNextOpen: vi.fn(),
    };
    const settings = createPanel();
    const controlsButton = document.createElement('button');
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      controlsButton,
      onTextMode: vi.fn(),
    });

    controlsButton.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 })
    );

    expect(controls.releaseButtonFocusOnNextOpen).toHaveBeenCalledTimes(1);
    expect(controls.isOpen()).toBe(true);

    coordinator.dispose();
  });

  it('does not mark keyboard-opened Controls for focus release', () => {
    const controls = {
      ...createPanel(),
      releaseButtonFocusOnNextOpen: vi.fn(),
    };
    const settings = createPanel();
    const controlsButton = document.createElement('button');
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      controlsButton,
      onTextMode: vi.fn(),
    });

    controlsButton.click();

    expect(controls.releaseButtonFocusOnNextOpen).not.toHaveBeenCalled();
    expect(controls.isOpen()).toBe(true);

    coordinator.dispose();
  });

  it('closes panels before triggering the Text action', () => {
    const events: string[] = [];
    let controlsOpen = false;
    let settingsOpen = false;
    const controls = {
      open: vi.fn(() => {
        controlsOpen = true;
      }),
      close: vi.fn(() => {
        events.push('controls:close');
        controlsOpen = false;
      }),
      toggle: vi.fn(),
      isOpen: () => controlsOpen,
    };
    const settings = {
      open: vi.fn(() => {
        settingsOpen = true;
      }),
      close: vi.fn(() => {
        events.push('settings:close');
        settingsOpen = false;
      }),
      toggle: vi.fn(),
      isOpen: () => settingsOpen,
    };
    const onTextMode = vi.fn(() => {
      events.push('text');
    });
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      onTextMode,
    });

    coordinator.openControls();
    events.length = 0;
    coordinator.activateTextMode();

    expect(events).toEqual(['controls:close', 'settings:close', 'text']);
    expect(onTextMode).toHaveBeenCalledTimes(1);
    expect(coordinator.getActivePanel()).toBeNull();

    coordinator.dispose();
  });

  it('does not close and reopen Tutorial when asked to open an already open Tutorial', () => {
    const controls = createPanel();
    const settings = createPanel();
    const tutorial = createPanel();
    const onActivePanelChange = vi.fn();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      tutorial,
      onTextMode: vi.fn(),
      onActivePanelChange,
    });

    coordinator.openTutorial();
    coordinator.openTutorial();

    expect(tutorial.open).toHaveBeenCalledTimes(2);
    expect(tutorial.close).not.toHaveBeenCalled();
    expect(tutorial.isOpen()).toBe(true);
    expect(onActivePanelChange).toHaveBeenCalledTimes(1);
    expect(coordinator.getActivePanel()).toBe('tutorial');

    coordinator.dispose();
  });

  it('leaves active panels unchanged when Tutorial is absent', () => {
    const controls = createPanel();
    const settings = createPanel();
    const controlsButton = document.createElement('button');
    const settingsButton = document.createElement('button');
    const tutorialButton = document.createElement('button');
    const onActivePanelChange = vi.fn();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      controlsButton,
      settingsButton,
      tutorialButton,
      onTextMode: vi.fn(),
      onActivePanelChange,
    });

    coordinator.openControls();
    const callbackHistoryAfterControls = onActivePanelChange.mock.calls.map(
      ([panel]) => panel
    );
    coordinator.openTutorial();

    expect(controls.isOpen()).toBe(true);
    expect(settings.isOpen()).toBe(false);
    expect(coordinator.getActivePanel()).toBe('controls');
    expect(controlsButton.getAttribute('aria-expanded')).toBe('true');
    expect(controlsButton.getAttribute('aria-pressed')).toBe('true');
    expect(settingsButton.getAttribute('aria-expanded')).toBe('false');
    expect(settingsButton.getAttribute('aria-pressed')).toBe('false');
    expect(tutorialButton.getAttribute('aria-expanded')).toBe('false');
    expect(tutorialButton.getAttribute('aria-pressed')).toBe('false');
    expect(onActivePanelChange.mock.calls.map(([panel]) => panel)).toEqual(
      callbackHistoryAfterControls
    );

    coordinator.openSettings();
    const callbackHistoryAfterSettings = onActivePanelChange.mock.calls.map(
      ([panel]) => panel
    );
    coordinator.toggleTutorial();

    expect(controls.isOpen()).toBe(false);
    expect(settings.isOpen()).toBe(true);
    expect(coordinator.getActivePanel()).toBe('settings');
    expect(controlsButton.getAttribute('aria-expanded')).toBe('false');
    expect(controlsButton.getAttribute('aria-pressed')).toBe('false');
    expect(settingsButton.getAttribute('aria-expanded')).toBe('true');
    expect(settingsButton.getAttribute('aria-pressed')).toBe('true');
    expect(tutorialButton.getAttribute('aria-expanded')).toBe('false');
    expect(tutorialButton.getAttribute('aria-pressed')).toBe('false');
    expect(onActivePanelChange.mock.calls.map(([panel]) => panel)).toEqual(
      callbackHistoryAfterSettings
    );

    coordinator.dispose();
  });

  it('syncs Tutorial Dismiss through button and root-style state callbacks', () => {
    const controls = createPanel();
    const settings = createPanel();
    const tutorialButton = document.createElement('button');
    const activePanels: Array<string | null> = [];
    let coordinator: ReturnType<typeof createHudPanelCoordinator> | null = null;
    const tutorial = createTutorialPanel({
      container: document.body,
      strings: getTutorialPanelStrings('en'),
      onRequestClose: () => coordinator?.closeActivePanel(),
    });
    coordinator = createHudPanelCoordinator({
      controls,
      settings,
      tutorial,
      tutorialButton,
      onTextMode: vi.fn(),
      onActivePanelChange: (panel) => activePanels.push(panel),
    });

    coordinator.openTutorial();
    expect(tutorial.isOpen()).toBe(true);
    expect(coordinator.getActivePanel()).toBe('tutorial');
    expect(tutorialButton.getAttribute('aria-expanded')).toBe('true');
    expect(tutorialButton.getAttribute('aria-pressed')).toBe('true');

    tutorial.element
      .querySelector<HTMLButtonElement>('[data-testid="tutorial-dismiss"]')
      ?.click();

    expect(tutorial.isOpen()).toBe(false);
    expect(coordinator.getActivePanel()).toBeNull();
    expect(tutorialButton.getAttribute('aria-expanded')).toBe('false');
    expect(tutorialButton.getAttribute('aria-pressed')).toBe('false');
    expect(activePanels).toEqual(['tutorial', null]);

    coordinator.dispose();
    tutorial.dispose();
  });

  it('wires HUD buttons and Escape to panel actions', () => {
    const controls = createPanel();
    const settings = createPanel();
    const controlsButton = document.createElement('button');
    const settingsButton = document.createElement('button');
    const textButton = document.createElement('button');
    const onTextMode = vi.fn();
    const coordinator = createHudPanelCoordinator({
      controls,
      settings,
      controlsButton,
      settingsButton,
      textButton,
      onTextMode,
    });

    controlsButton.click();
    expect(controls.isOpen()).toBe(true);
    expect(controlsButton.getAttribute('aria-pressed')).toBe('true');

    settingsButton.click();
    expect(controls.isOpen()).toBe(false);
    expect(settings.isOpen()).toBe(true);
    expect(settingsButton.getAttribute('aria-pressed')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(settings.isOpen()).toBe(false);
    expect(settingsButton.getAttribute('aria-pressed')).toBe('false');

    textButton.click();
    expect(onTextMode).toHaveBeenCalledTimes(1);

    coordinator.dispose();
  });
});
