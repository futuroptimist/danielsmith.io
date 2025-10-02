import { Camera, Raycaster, Vector2 } from 'three';

import type { PoiInstance } from './markers';
import type { PoiAnalytics, PoiDefinition } from './types';

export type PoiSelectionListener = (poi: PoiDefinition) => void;
export type PoiHoverListener = (poi: PoiDefinition | null) => void;
export type PoiSelectionStateListener = (poi: PoiDefinition | null) => void;

type ListenerTarget = Pick<
  HTMLElement,
  'addEventListener' | 'removeEventListener'
>;

export interface PoiInteractionOptions {
  keyboardTarget?: ListenerTarget | null;
  enableKeyboard?: boolean;
}

export class PoiInteractionManager {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly listeners = new Set<PoiSelectionListener>();
  private readonly hoverListeners = new Set<PoiHoverListener>();
  private readonly selectionStateListeners =
    new Set<PoiSelectionStateListener>();
  private hovered: PoiInstance | null = null;
  private selected: PoiInstance | null = null;
  private active = false;
  private readonly keyboardTarget: ListenerTarget | null;
  private readonly enableKeyboard: boolean;
  private keyboardIndex: number | null = null;
  private usingKeyboard = false;
  private touchPointerId: number | null = null;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly camera: Camera,
    private readonly poiInstances: PoiInstance[],
    options: PoiInteractionOptions = {},
    private readonly analytics?: PoiAnalytics
  ) {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);

    const defaultKeyboardTarget =
      options.keyboardTarget ??
      ((typeof window !== 'undefined'
        ? window
        : null) as ListenerTarget | null);
    this.keyboardTarget = defaultKeyboardTarget ?? domElement;
    this.enableKeyboard = options.enableKeyboard ?? true;
  }

  start() {
    if (this.active) {
      return;
    }
    this.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.domElement.addEventListener('mouseleave', this.handleMouseLeave);
    this.domElement.addEventListener('click', this.handleClick);
    this.domElement.addEventListener('touchstart', this.handleTouchStart);
    this.domElement.addEventListener('touchmove', this.handleTouchMove);
    this.domElement.addEventListener('touchend', this.handleTouchEnd);
    this.domElement.addEventListener('touchcancel', this.handleTouchCancel);
    if (this.enableKeyboard) {
      this.keyboardTarget?.addEventListener('keydown', this.handleKeyDown);
    }
    this.active = true;
  }

  dispose() {
    if (!this.active) {
      return;
    }
    this.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.domElement.removeEventListener('mouseleave', this.handleMouseLeave);
    this.domElement.removeEventListener('click', this.handleClick);
    this.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.domElement.removeEventListener('touchmove', this.handleTouchMove);
    this.domElement.removeEventListener('touchend', this.handleTouchEnd);
    this.domElement.removeEventListener('touchcancel', this.handleTouchCancel);
    if (this.enableKeyboard) {
      this.keyboardTarget?.removeEventListener('keydown', this.handleKeyDown);
    }
    this.active = false;
    this.setHovered(null);
    this.setSelected(null);
  }

  addSelectionListener(listener: PoiSelectionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  addHoverListener(listener: PoiHoverListener): () => void {
    this.hoverListeners.add(listener);
    return () => {
      this.hoverListeners.delete(listener);
    };
  }

  addSelectionStateListener(listener: PoiSelectionStateListener): () => void {
    this.selectionStateListeners.add(listener);
    return () => {
      this.selectionStateListeners.delete(listener);
    };
  }

  selectPoiById(poiId: string): void {
    const poi = this.poiInstances.find(
      (instance) => instance.definition.id === poiId
    );
    if (!poi) {
      return;
    }
    this.usingKeyboard = true;
    this.keyboardIndex = this.poiInstances.indexOf(poi);
    this.setHovered(poi);
    this.setSelected(poi);
    this.dispatchSelection(poi.definition);
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.updatePointer(event)) {
      return;
    }
    this.usingKeyboard = false;
    const poi = this.pickPoi();
    this.setHovered(poi);
  }

  private handleMouseLeave() {
    this.usingKeyboard = false;
    this.setHovered(null);
  }

  private handleClick(event: MouseEvent) {
    if (!this.updatePointer(event)) {
      return;
    }
    this.usingKeyboard = false;
    const poi = this.pickPoi();
    if (!poi) {
      this.setSelected(null);
      return;
    }
    this.setSelected(poi);
    this.dispatchSelection(poi.definition);
  }

  private handleTouchStart(event: TouchEvent) {
    if (!event.changedTouches.length) {
      return;
    }
    const touch = event.changedTouches[0];
    this.touchPointerId = touch.identifier;
    this.usingKeyboard = false;
    if (!this.updatePointerFromTouch(touch)) {
      return;
    }
    const poi = this.pickPoi();
    this.setHovered(poi);
  }

  private handleTouchMove(event: TouchEvent) {
    if (!event.changedTouches.length) {
      return;
    }
    const touch = this.getActiveTouch(event.changedTouches);
    if (!touch) {
      return;
    }
    this.usingKeyboard = false;
    if (this.touchPointerId === null || touch.identifier !== this.touchPointerId) {
      this.touchPointerId = touch.identifier;
    }
    if (!this.updatePointerFromTouch(touch)) {
      return;
    }
    const poi = this.pickPoi();
    this.setHovered(poi);
  }

  private handleTouchEnd(event: TouchEvent) {
    const touch = this.getActiveTouch(event.changedTouches);
    this.usingKeyboard = false;
    if (!touch) {
      this.touchPointerId = null;
      this.setHovered(null);
      return;
    }
    this.touchPointerId = null;
    if (!this.updatePointerFromTouch(touch)) {
      return;
    }
    const poi = this.pickPoi();
    if (!poi) {
      this.setSelected(null);
      this.setHovered(null);
      return;
    }
    this.setHovered(poi);
    this.setSelected(poi);
    this.dispatchSelection(poi.definition);
  }

  private handleTouchCancel() {
    this.touchPointerId = null;
    this.usingKeyboard = false;
    this.setHovered(null);
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.enableKeyboard || this.poiInstances.length === 0) {
      return;
    }

    const { key } = event;
    const normalizedKey = key.toLowerCase();

    const isCycleKey =
      key === 'ArrowRight' ||
      key === 'ArrowLeft' ||
      normalizedKey === 'e' ||
      normalizedKey === 'q';

    if (isCycleKey) {
      if (normalizedKey === 'e' || normalizedKey === 'q') {
        event.preventDefault();
      }

      const direction = key === 'ArrowRight' || normalizedKey === 'e' ? 1 : -1;
      this.moveKeyboardFocus(direction);
      return;
    }

    switch (normalizedKey) {
      case 'enter':
      case ' ': {
        if (this.hovered) {
          event.preventDefault();
          this.usingKeyboard = true;
          this.setSelected(this.hovered);
          this.dispatchSelection(this.hovered.definition);
        }
        break;
      }
      case 'escape':
        if (this.selected) {
          event.preventDefault();
          this.setSelected(null);
        }
        break;
      default:
        break;
    }
  }

  private moveKeyboardFocus(direction: 1 | -1) {
    this.usingKeyboard = true;
    const count = this.poiInstances.length;
    if (!count) {
      return;
    }

    const currentIndex = this.keyboardIndex ?? (direction > 0 ? -1 : 0);
    const nextIndex = (currentIndex + direction + count) % count;
    this.keyboardIndex = nextIndex;
    const poi = this.poiInstances[nextIndex];
    this.setHovered(poi);
  }

  private updatePointer(event: MouseEvent): boolean {
    return this.updatePointerFromClientPosition(event.clientX, event.clientY);
  }

  private updatePointerFromTouch(touch: Touch): boolean {
    return this.updatePointerFromClientPosition(touch.clientX, touch.clientY);
  }

  private updatePointerFromClientPosition(
    clientX: number,
    clientY: number
  ): boolean {
    const rect = this.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return false;
    }
    const normalizedX = (clientX - rect.left) / rect.width;
    const normalizedY = (clientY - rect.top) / rect.height;
    this.pointer.set(normalizedX * 2 - 1, -(normalizedY * 2 - 1));
    return true;
  }

  private pickPoi(): PoiInstance | null {
    if (this.poiInstances.length === 0) {
      return null;
    }
    for (const poi of this.poiInstances) {
      poi.hitArea.updateWorldMatrix(true, false);
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(
      this.poiInstances.map((poi) => poi.hitArea),
      false
    );
    if (!intersections.length) {
      return null;
    }
    const target = intersections[0].object;
    return this.poiInstances.find((poi) => poi.hitArea === target) ?? null;
  }

  private setHovered(poi: PoiInstance | null) {
    if (this.hovered === poi) {
      return;
    }
    const previous = this.hovered;
    if (this.hovered && this.hovered !== this.selected) {
      this.hovered.focusTarget = 0;
    }
    this.hovered = poi;
    if (this.hovered) {
      this.hovered.focusTarget = 1;
      if (!this.usingKeyboard) {
        this.keyboardIndex = this.poiInstances.indexOf(this.hovered);
      }
    } else if (this.selected) {
      this.selected.focusTarget = 1;
      if (!this.usingKeyboard) {
        this.keyboardIndex = this.poiInstances.indexOf(this.selected);
      }
    } else if (!this.usingKeyboard) {
      this.keyboardIndex = null;
    }
    if (previous && previous !== poi) {
      this.analytics?.hoverEnded?.(previous.definition);
    }
    if (poi && previous !== poi) {
      this.analytics?.hoverStarted?.(poi.definition);
    }
    this.notifyHoverListeners(poi?.definition ?? null);
  }

  private setSelected(poi: PoiInstance | null) {
    if (this.selected === poi) {
      return;
    }
    const previous = this.selected;
    if (this.selected && this.selected !== this.hovered) {
      this.selected.focusTarget = 0;
    }
    this.selected = poi;
    if (this.selected) {
      this.selected.focusTarget = 1;
    }
    if (previous && previous !== poi) {
      this.analytics?.selectionCleared?.(previous.definition);
    }
    if (poi && previous !== poi) {
      this.analytics?.selected?.(poi.definition);
    }
    this.notifySelectionStateListeners(poi?.definition ?? null);
  }

  private dispatchSelection(definition: PoiDefinition) {
    for (const listener of this.listeners) {
      listener(definition);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('poi:selected', { detail: { poi: definition } })
      );
    }
  }

  private notifyHoverListeners(poi: PoiDefinition | null) {
    for (const listener of this.hoverListeners) {
      listener(poi);
    }
  }

  private notifySelectionStateListeners(poi: PoiDefinition | null) {
    for (const listener of this.selectionStateListeners) {
      listener(poi);
    }
  }

  private getActiveTouch(touches: TouchList): Touch | null {
    if (touches.length === 0) {
      return null;
    }
    if (this.touchPointerId === null) {
      return touches[0] ?? null;
    }
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (touch && touch.identifier === this.touchPointerId) {
        return touch;
      }
    }
    return touches[0] ?? null;
  }
}
