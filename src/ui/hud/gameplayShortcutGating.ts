import { isTextEntryTarget } from '../../systems/camera/zoomControls';

import type { HudPanel } from './hudPanelCoordinator';

export interface GameplayShortcutEvent {
  defaultPrevented: boolean;
  target: EventTarget | null;
}

export function canHandleGameplayShortcut(
  event: GameplayShortcutEvent,
  activePanel: HudPanel | null
): boolean {
  if (event.defaultPrevented || isTextEntryTarget(event.target)) {
    return false;
  }
  return activePanel !== 'settings';
}
