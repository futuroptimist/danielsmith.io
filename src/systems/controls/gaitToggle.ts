import { isUiOwnedKeyboardEvent } from './KeyboardControls';

/** One gait: Caps Lock off runs, on walks. Pointer controls write the same state. */
export function createGaitToggle(
  target: Window,
  options: {
    canToggle?: (event: KeyboardEvent) => boolean;
    onChange?: (running: boolean) => void;
  } = {}
) {
  let running = true;
  let held = false;
  const setRunning = (next: boolean) => {
    if (running === next) return;
    running = next;
    options.onChange?.(running);
  };
  const sync = (event: KeyboardEvent): boolean => {
    if (typeof event.getModifierState !== 'function') return false;
    setRunning(!event.getModifierState('CapsLock'));
    return true;
  };
  const down = (event: KeyboardEvent) => {
    // Read even UI-owned/repeated events: observing the lock never consumes a key.
    // This also repairs lock changes made while the page was unfocused.
    if (sync(event)) return;
    if (event.key !== 'CapsLock' && event.code !== 'CapsLock') return;
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
    setRunning(!running);
  };
  const up = (event: KeyboardEvent) => {
    sync(event);
    if (event.key === 'CapsLock' || event.code === 'CapsLock') held = false;
  };
  const blur = () => {
    held = false;
  };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return {
    isRunning: () => running,
    setRunning,
    toggle: () => setRunning(!running),
    dispose() {
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
      target.removeEventListener('blur', blur);
    },
  };
}
