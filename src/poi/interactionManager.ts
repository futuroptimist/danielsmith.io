import { Camera, Raycaster, Vector2 } from 'three';

import type { PoiInstance } from './markers';
import type { PoiDefinition } from './types';

export type PoiSelectionListener = (poi: PoiDefinition) => void;

export class PoiInteractionManager {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly listeners = new Set<PoiSelectionListener>();
  private hovered: PoiInstance | null = null;
  private selected: PoiInstance | null = null;
  private active = false;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly camera: Camera,
    private readonly poiInstances: PoiInstance[]
  ) {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  start() {
    if (this.active) {
      return;
    }
    this.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.domElement.addEventListener('mouseleave', this.handleMouseLeave);
    this.domElement.addEventListener('click', this.handleClick);
    this.active = true;
  }

  dispose() {
    if (!this.active) {
      return;
    }
    this.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.domElement.removeEventListener('mouseleave', this.handleMouseLeave);
    this.domElement.removeEventListener('click', this.handleClick);
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
    const poi = this.pickPoi();
    this.setHovered(poi);
  }

  private handleMouseLeave() {
    this.setHovered(null);
  }

  private handleClick(event: MouseEvent) {
    if (!this.updatePointer(event)) {
      return;
    }
    const poi = this.pickPoi();
    if (!poi) {
      this.setSelected(null);
      return;
    }
    this.setSelected(poi);
    this.dispatchSelection(poi.definition);
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
    } else if (this.selected) {
      this.selected.focusTarget = 1;
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
