import { Camera, Raycaster, Vector2 } from 'three';

import type { PoiInstance } from './markers';
import type { PoiDefinition, PoiId } from './types';

export type PoiSelectionListener = (poi: PoiDefinition) => void;

export class PoiInteractionManager {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly listeners = new Set<PoiSelectionListener>();
  private hovered: PoiInstance | null = null;
  private selected: PoiInstance | null = null;
  private manualFocus: PoiInstance | null = null;
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
    this.manualFocus = null;
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
    this.clearManualFocus();
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
    this.clearManualFocus();
    const poi = this.pickPoi();
    if (!poi) {
      this.setSelected(null);
      return;
    }
    this.selectPoi(poi, { emitEvent: true, updateManualFocus: false });
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
    this.hovered = poi;
    this.updateFocusTargets();
  }

  private setSelected(poi: PoiInstance | null) {
    if (this.selected === poi) {
      return;
    }
    this.selected = poi;
    this.updateFocusTargets();
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

  private selectPoi(
    poi: PoiInstance | null,
    { emitEvent, updateManualFocus }: { emitEvent: boolean; updateManualFocus: boolean }
  ) {
    this.setSelected(poi);
    if (updateManualFocus) {
      this.manualFocus = poi;
    }
    this.updateFocusTargets();
    if (emitEvent && poi) {
      this.dispatchSelection(poi.definition);
    }
  }

  private updateFocusTargets() {
    const focusSet = new Set<PoiInstance>();
    if (this.selected) {
      focusSet.add(this.selected);
    }
    const manualOrHover = this.manualFocus ?? this.hovered;
    if (manualOrHover) {
      focusSet.add(manualOrHover);
    }
    for (const poi of this.poiInstances) {
      poi.focusTarget = focusSet.has(poi) ? 1 : 0;
    }
  }

  private clearManualFocus() {
    if (!this.manualFocus) {
      return;
    }
    this.manualFocus = null;
    this.updateFocusTargets();
  }

  focusPoiById(id: PoiId): boolean {
    const poi = this.poiInstances.find((entry) => entry.definition.id === id) ?? null;
    if (!poi) {
      return false;
    }
    this.manualFocus = poi;
    this.setHovered(null);
    this.updateFocusTargets();
    return true;
  }

  getManualFocus(): PoiDefinition | null {
    return this.manualFocus?.definition ?? null;
  }

  activateFocusedPoi({ emitEvent = true } = {}): PoiDefinition | null {
    const target = this.manualFocus ?? this.hovered ?? this.selected;
    if (!target) {
      return null;
    }
    this.selectPoi(target, { emitEvent, updateManualFocus: true });
    return target.definition;
  }

  selectPoiById(id: PoiId, { emitEvent = true } = {}): PoiDefinition | null {
    const poi = this.poiInstances.find((entry) => entry.definition.id === id) ?? null;
    if (!poi) {
      return null;
    }
    this.selectPoi(poi, { emitEvent, updateManualFocus: true });
    return poi.definition;
  }
}
