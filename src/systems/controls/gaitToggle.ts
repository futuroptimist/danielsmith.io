import { isUiOwnedKeyboardEvent } from './KeyboardControls';

/** A game-local toggle, independent of the OS Caps Lock state. Blur clears the latch, not the chosen gait. */
export function createGaitToggle(
  target: Window,
  options: {
    canToggle?: (event: KeyboardEvent) => boolean;
    onChange?: (running: boolean) => void;
  } = {}
) {
  let running = false;
  let held = false;
  const down = (event: KeyboardEvent) => {
    if (event.key !== 'CapsLock') return;
    if (event.repeat || held) return;
    held = true;
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      isUiOwnedKeyboardEvent(event) ||
      options.canToggle?.(event) === false
    )
      return;
    event.preventDefault();
    running = !running;
    options.onChange?.(running);
  };
  const up = (event: KeyboardEvent) => {
    if (event.key === 'CapsLock') held = false;
  };
  const blur = () => {
    held = false;
  };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return {
    isRunning: () => running,
    dispose() {
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
      target.removeEventListener('blur', blur);
    },
  };
}
