import type { HudPanel } from '../../ui/hud/hudPanelCoordinator';
import { isTextEntryTarget } from '../camera/zoomControls';

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

  return activePanel === null || activePanel === 'controls';
}
