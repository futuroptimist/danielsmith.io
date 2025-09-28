import type { PoiInteractionManager } from './interactionManager';
import type { PoiInstance } from './markers';

type KeydownTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export interface PoiKeyboardNavigatorOptions {
  /**
   * Event target to listen for keyboard input. Defaults to `window` when running in a browser.
   */
  eventTarget?: KeydownTarget;
}

export class PoiKeyboardNavigator {
  private readonly poiInstances: PoiInstance[];
  private readonly eventTarget?: KeydownTarget;
  private readonly handleKeyDownBound: (event: KeyboardEvent) => void;
  private focusIndex: number | null = null;
  private active = false;

  constructor(
    private readonly manager: PoiInteractionManager,
    poiInstances: PoiInstance[],
    options: PoiKeyboardNavigatorOptions = {}
  ) {
    this.poiInstances = [...poiInstances];
    this.eventTarget =
      options.eventTarget ?? (typeof window !== 'undefined' ? (window as KeydownTarget) : undefined);
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
  }

  start() {
    if (this.active || !this.eventTarget) {
      return;
    }
    this.syncIndexWithManualFocus();
    this.eventTarget.addEventListener('keydown', this.handleKeyDownBound as EventListener);
    this.active = true;
  }

  dispose() {
    if (!this.active || !this.eventTarget) {
      return;
    }
    this.eventTarget.removeEventListener('keydown', this.handleKeyDownBound as EventListener);
    this.active = false;
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        this.advanceFocus(1, event);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.advanceFocus(-1, event);
        break;
      case 'Tab':
        this.advanceFocus(event.shiftKey ? -1 : 1, event);
        break;
      case 'Enter':
      case ' ': // Spacebar in modern browsers.
      case 'Spacebar': // Legacy browsers may emit this string.
      case 'Space':
        this.activate(event);
        break;
      default:
        break;
    }
  }

  private advanceFocus(direction: 1 | -1, event: KeyboardEvent) {
    if (!this.poiInstances.length) {
      return;
    }
    this.syncIndexWithManualFocus();
    const count = this.poiInstances.length;
    if (this.focusIndex === null) {
      this.focusIndex = direction === 1 ? 0 : count - 1;
    } else {
      this.focusIndex = (this.focusIndex + direction + count) % count;
    }
    const instance = this.poiInstances[this.focusIndex];
    if (this.manager.focusPoiById(instance.definition.id)) {
      event.preventDefault();
    }
  }

  private activate(event: KeyboardEvent) {
    const definition = this.manager.activateFocusedPoi();
    if (definition) {
      this.syncIndexWithManualFocus();
      event.preventDefault();
    }
  }

  private syncIndexWithManualFocus() {
    const manualFocus = this.manager.getManualFocus();
    if (!manualFocus) {
      this.focusIndex = null;
      return;
    }
    const index = this.poiInstances.findIndex(
      (poi) => poi.definition.id === manualFocus.id
    );
    this.focusIndex = index === -1 ? null : index;
  }
}
