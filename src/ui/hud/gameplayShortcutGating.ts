import { isTextEntryTarget } from '../../systems/camera/zoomControls';

import type { HudPanel } from './hudPanelCoordinator';

export function canHandleGameplayShortcut(
  event: Pick<KeyboardEvent, 'defaultPrevented' | 'target'>,
  activePanel: HudPanel | null
): boolean {
  if (event.defaultPrevented || isTextEntryTarget(event.target)) {
    return false;
  }
  return activePanel !== 'settings';
}
