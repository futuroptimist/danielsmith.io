import { Camera, Raycaster, Vector2 } from 'three';

import type { PoiInstance } from './markers';
import type { PoiDefinition } from './types';

export type PoiSelectionListener = (poi: PoiDefinition) => void;

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
  private hovered: PoiInstance | null = null;
  private selected: PoiInstance | null = null;
  private active = false;
  private readonly keyboardTarget: ListenerTarget | null;
  private readonly enableKeyboard: boolean;
  private keyboardIndex: number | null = null;
  private usingKeyboard = false;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly camera: Camera,
    private readonly poiInstances: PoiInstance[],
    options: PoiInteractionOptions = {}
  ) {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    const defaultKeyboardTarget =
      options.keyboardTarget ??
      ((typeof window !== 'undefined' ? window : null) as ListenerTarget | null);
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

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.enableKeyboard || this.poiInstances.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.moveKeyboardFocus(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.moveKeyboardFocus(-1);
        break;
      case 'Enter':
      case ' ': {
        if (this.hovered) {
          event.preventDefault();
          this.usingKeyboard = true;
          this.setSelected(this.hovered);
          this.dispatchSelection(this.hovered.definition);
        }
        break;
      }
      case 'Escape':
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
    const rect = this.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return false;
    }
    const normalizedX = (event.clientX - rect.left) / rect.width;
    const normalizedY = (event.clientY - rect.top) / rect.height;
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
  }

  private setSelected(poi: PoiInstance | null) {
    if (this.selected === poi) {
      return;
    }
    if (this.selected && this.selected !== this.hovered) {
      this.selected.focusTarget = 0;
    }
    this.selected = poi;
    if (this.selected) {
      this.selected.focusTarget = 1;
    }
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
}
