import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { PoiInteractionManager } from '../scene/poi/interactionManager';
import type { PoiInstance } from '../scene/poi/markers';
import type { PoiAnalytics, PoiDefinition } from '../scene/poi/types';

function createMockPoi(definition: PoiDefinition): PoiInstance {
  const group = new Group();
  const orbMaterial = new MeshStandardMaterial();
  const orb = new Mesh(new SphereGeometry(0.4, 8, 8), orbMaterial);
  const accentMaterial = new MeshStandardMaterial();
  const labelMaterial = new MeshBasicMaterial({ transparent: true });
  const label = new Mesh(new PlaneGeometry(1, 0.5), labelMaterial);
  const haloMaterial = new MeshBasicMaterial({ side: DoubleSide });
  const halo = new Mesh(new RingGeometry(0.4, 0.6, 8), haloMaterial);
  const hitArea = new Mesh(
    new PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ side: DoubleSide })
  );
  hitArea.position.y = 0.1;

  const accentBaseColor = new Color(0x3bb7ff);
  const accentFocusColor = new Color(0x7ce9ff);
  const haloBaseColor = new Color(0x4bd8ff);
  const haloFocusColor = new Color(0xaefbff);
  const orbEmissiveBase = new Color(0x3de1ff);
  const orbEmissiveHighlight = new Color(0x7efcff);

  accentMaterial.color.copy(accentBaseColor);
  haloMaterial.color.copy(haloBaseColor);
  orbMaterial.emissive.copy(orbEmissiveBase);

  group.add(orb);
  group.add(label);
  group.add(halo);
  group.add(hitArea);
  group.position.set(
    definition.position.x,
    definition.position.y,
    definition.position.z
  );
  group.updateMatrixWorld(true);

  return {
    definition,
    group,
    orb,
    orbMaterial,
    orbBaseHeight: 1,
    accentMaterial,
    label,
    labelMaterial,
    labelBaseHeight: 1.4,
    labelWorldPosition: new Vector3(),
    floatPhase: 0,
    floatSpeed: 1,
    floatAmplitude: 0.1,
    halo,
    haloMaterial,
    collider: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
    activation: 0,
    pulseOffset: 0,
    hitArea,
    focus: 0,
    focusTarget: 0,
    accentBaseColor,
    accentFocusColor,
    haloBaseColor,
    haloFocusColor,
    orbEmissiveBase,
    orbEmissiveHighlight,
    visualMode: 'pedestal',
    visited: false,
    visitedStrength: 0,
  } satisfies PoiInstance;
}

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'width', { value: 400, writable: true });
  Object.defineProperty(canvas, 'height', { value: 400, writable: true });
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 400,
      height: 400,
      right: 400,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }) as DOMRect;
  return canvas;
}

interface MockTouchInit {
  clientX: number;
  clientY: number;
  identifier?: number;
}

function createTouchList(
  target: EventTarget,
  touches: MockTouchInit[]
): TouchList {
  const entries = touches.map((touch, index) => ({
    clientX: touch.clientX,
    clientY: touch.clientY,
    screenX: touch.clientX,
    screenY: touch.clientY,
    pageX: touch.clientX,
    pageY: touch.clientY,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
    identifier: touch.identifier ?? index,
    target,
  })) as unknown as Touch[];
  const touchList = {
    length: entries.length,
    item(index: number) {
      return entries[index] ?? null;
    },
    [Symbol.iterator]: entries[Symbol.iterator].bind(entries),
  } as TouchList & { [index: number]: Touch };
  entries.forEach((touch, index) => {
    (touchList as { [key: number]: Touch })[index] = touch;
  });
  return touchList;
}

function dispatchTouchEvent(
  target: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  touches: MockTouchInit[]
) {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as TouchEvent;
  const changedTouches = createTouchList(target, touches);
  const activeTouches =
    type === 'touchend' || type === 'touchcancel'
      ? createTouchList(target, [])
      : changedTouches;
  Object.defineProperty(event, 'changedTouches', {
    configurable: true,
    value: changedTouches,
  });
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: activeTouches,
  });
  target.dispatchEvent(event);
}

describe('PoiInteractionManager', () => {
  const definition: PoiDefinition = {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist Creator Desk',
    summary: 'Triple-monitor editing suite showcasing Futuroptimist workflows.',
    interactionPrompt: 'Inspect Futuroptimist Creator Desk',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 2,
    footprint: { width: 1, depth: 1 },
  };

  let domElement: HTMLCanvasElement;
  let camera: OrthographicCamera;
  let poi: PoiInstance;
  let manager: PoiInteractionManager;

  beforeEach(() => {
    domElement = createCanvas();
    camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    poi = createMockPoi(definition);
    poi.hitArea.updateWorldMatrix(true, true);
    manager = new PoiInteractionManager(domElement, camera, [poi]);
  });

  afterEach(() => {
    manager.dispose();
  });

  it('updates focus target based on pointer hover', () => {
    const hoverListener = vi.fn();
    const removeHover = manager.addHoverListener(hoverListener);
    manager.start();
    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 200 })
    );
    expect(poi.focusTarget).toBe(1);
    expect(hoverListener).toHaveBeenLastCalledWith(definition);

    domElement.dispatchEvent(new MouseEvent('mouseleave'));
    expect(poi.focusTarget).toBe(0);
    expect(hoverListener).toHaveBeenLastCalledWith(null);
    removeHover();
  });

  it('emits hover custom events with the last input method', () => {
    manager.start();
    const hoveredEvents: CustomEvent[] = [];
    const eventRecorder = (event: Event) =>
      hoveredEvents.push(event as CustomEvent);
    window.addEventListener('poi:hovered', eventRecorder);

    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 200 })
    );
    expect(hoveredEvents).toHaveLength(1);
    expect(hoveredEvents[0]?.detail).toEqual({
      poi: definition,
      inputMethod: 'pointer',
    });

    domElement.dispatchEvent(new MouseEvent('mouseleave'));
    expect(hoveredEvents).toHaveLength(2);
    expect(hoveredEvents[1]?.detail).toEqual({
      poi: null,
      inputMethod: 'pointer',
    });

    dispatchTouchEvent(domElement, 'touchstart', [
      { clientX: 200, clientY: 200, identifier: 3 },
    ]);
    expect(hoveredEvents).toHaveLength(3);
    expect(hoveredEvents[2]?.detail).toEqual({
      poi: definition,
      inputMethod: 'touch',
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(hoveredEvents).toHaveLength(4);
    expect(hoveredEvents[3]?.detail).toEqual({
      poi: definition,
      inputMethod: 'keyboard',
    });

    window.removeEventListener('poi:hovered', eventRecorder);
  });

  it('emits hover events when switching between pointer and touch on the same POI', () => {
    manager.start();
    const hoveredEvents: CustomEvent[] = [];
    const recordHover = (event: Event) =>
      hoveredEvents.push(event as CustomEvent);
    window.addEventListener('poi:hovered', recordHover);

    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 200 })
    );

    dispatchTouchEvent(domElement, 'touchstart', [
      { clientX: 200, clientY: 200, identifier: 11 },
    ]);

    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 200 })
    );

    expect(hoveredEvents.map((event) => event.detail)).toEqual([
      { poi: definition, inputMethod: 'pointer' },
      { poi: definition, inputMethod: 'touch' },
      { poi: definition, inputMethod: 'pointer' },
    ]);

    window.removeEventListener('poi:hovered', recordHover);
  });

  it('persists focus on selected POIs and emits selection events', () => {
    manager.start();
    const listener = vi.fn();
    manager.addSelectionListener(listener);
    const selectionState = vi.fn();
    const removeSelectionState =
      manager.addSelectionStateListener(selectionState);
    const customEventHandler = vi.fn();
    window.addEventListener('poi:selected', customEventHandler);

    domElement.dispatchEvent(
      new MouseEvent('click', { clientX: 200, clientY: 200 })
    );

    expect(listener).toHaveBeenCalledWith(definition, {
      inputMethod: 'pointer',
    });
    expect(customEventHandler).toHaveBeenCalledTimes(1);
    const customEvent = customEventHandler.mock.calls[0]?.[0] as CustomEvent;
    expect(customEvent.detail).toEqual({
      poi: definition,
      inputMethod: 'pointer',
    });
    expect(poi.focusTarget).toBe(1);
    expect(selectionState).toHaveBeenLastCalledWith(definition, {
      inputMethod: 'pointer',
    });

    domElement.dispatchEvent(new MouseEvent('mouseleave'));
    expect(poi.focusTarget).toBe(1);
    expect(selectionState).toHaveBeenCalledTimes(1);

    window.removeEventListener('poi:selected', customEventHandler);
    removeSelectionState();
  });

  it('supports touch interactions for hover and selection', () => {
    manager.start();
    const selection = vi.fn();
    const hover = vi.fn();
    manager.addSelectionListener(selection);
    manager.addHoverListener(hover);

    dispatchTouchEvent(domElement, 'touchstart', [
      { clientX: 200, clientY: 200, identifier: 42 },
    ]);
    expect(hover).toHaveBeenLastCalledWith(definition);
    expect(poi.focusTarget).toBe(1);

    dispatchTouchEvent(domElement, 'touchmove', [
      { clientX: 210, clientY: 210, identifier: 42 },
    ]);
    expect(hover).toHaveBeenLastCalledWith(definition);

    dispatchTouchEvent(domElement, 'touchmove', [
      { clientX: 205, clientY: 205, identifier: 99 },
    ]);
    expect(hover).toHaveBeenLastCalledWith(definition);

    dispatchTouchEvent(domElement, 'touchend', [
      { clientX: 210, clientY: 210, identifier: 42 },
    ]);
    expect(selection).toHaveBeenCalledWith(definition, {
      inputMethod: 'touch',
    });
    expect(poi.focusTarget).toBe(1);

    dispatchTouchEvent(domElement, 'touchend', []);
    expect(hover).toHaveBeenLastCalledWith(null);
    expect(poi.focusTarget).toBe(1);

    dispatchTouchEvent(domElement, 'touchmove', [
      { clientX: 200, clientY: 200, identifier: 7 },
    ]);
    expect(hover).toHaveBeenLastCalledWith(definition);

    dispatchTouchEvent(domElement, 'touchcancel', []);
    expect(hover).toHaveBeenLastCalledWith(null);
    expect(poi.focusTarget).toBe(1);
  });

  it('suppresses synthetic clicks dispatched after touch selection', () => {
    manager.start();
    const selection = vi.fn();
    manager.addSelectionListener(selection);

    let currentTime = 1_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    try {
      dispatchTouchEvent(domElement, 'touchstart', [
        { clientX: 200, clientY: 200, identifier: 5 },
      ]);

      dispatchTouchEvent(domElement, 'touchend', [
        { clientX: 200, clientY: 200, identifier: 5 },
      ]);

      expect(selection).toHaveBeenCalledTimes(1);

      domElement.dispatchEvent(
        new MouseEvent('click', { clientX: 200, clientY: 200 })
      );

      expect(selection).toHaveBeenCalledTimes(1);

      currentTime += 600;

      domElement.dispatchEvent(
        new MouseEvent('click', { clientX: 200, clientY: 200 })
      );

      expect(selection).toHaveBeenCalledTimes(2);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('cycles focus with keyboard input and wraps around', () => {
    manager.dispose();
    const secondDefinition: PoiDefinition = {
      ...definition,
      id: 'flywheel-studio-flywheel',
      title: 'Flywheel Centerpiece',
      position: { x: 3, y: 0, z: 0 },
      interactionPrompt: 'Engage Flywheel Centerpiece',
    };
    const secondPoi = createMockPoi(secondDefinition);
    const keyboardManager = new PoiInteractionManager(
      domElement,
      camera,
      [poi, secondPoi],
      {
        keyboardTarget: window,
      }
    );
    keyboardManager.start();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(poi.focusTarget).toBe(1);
    expect(secondPoi.focusTarget).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(poi.focusTarget).toBe(0);
    expect(secondPoi.focusTarget).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(poi.focusTarget).toBe(1);
    expect(secondPoi.focusTarget).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(poi.focusTarget).toBe(0);
    expect(secondPoi.focusTarget).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
    expect(poi.focusTarget).toBe(1);
    expect(secondPoi.focusTarget).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
    expect(poi.focusTarget).toBe(0);
    expect(secondPoi.focusTarget).toBe(1);

    keyboardManager.dispose();
  });

  it('selects focused POIs via keyboard activation', () => {
    manager.start();
    const listener = vi.fn();
    manager.addSelectionListener(listener);
    const customEventHandler = vi.fn();
    window.addEventListener('poi:selected', customEventHandler);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(listener).toHaveBeenNthCalledWith(1, definition, {
      inputMethod: 'keyboard',
    });
    expect(customEventHandler).toHaveBeenCalledTimes(1);
    const keyboardSelectionEvent = customEventHandler.mock
      .calls[0]?.[0] as CustomEvent;
    expect(keyboardSelectionEvent.detail.inputMethod).toBe('keyboard');
    expect(poi.focusTarget).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(poi.focusTarget).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(2, definition, {
      inputMethod: 'keyboard',
    });

    window.removeEventListener('poi:selected', customEventHandler);
  });

  it('selects POIs programmatically by id', () => {
    manager.start();
    const listener = vi.fn();
    manager.addSelectionListener(listener);

    manager.selectPoiById(definition.id);

    expect(listener).toHaveBeenCalledWith(definition, {
      inputMethod: 'keyboard',
    });
    expect(poi.focusTarget).toBe(1);
  });

  it('notifies selection state listeners when selection clears', () => {
    manager.start();
    const selectionState = vi.fn();
    manager.addSelectionStateListener(selectionState);

    domElement.dispatchEvent(
      new MouseEvent('click', { clientX: 200, clientY: 200 })
    );
    expect(selectionState).toHaveBeenLastCalledWith(definition, {
      inputMethod: 'pointer',
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(selectionState).toHaveBeenLastCalledWith(null, {
      inputMethod: 'keyboard',
    });
  });

  it('ignores keyboard input when disabled', () => {
    const disabledManager = new PoiInteractionManager(
      domElement,
      camera,
      [poi],
      {
        enableKeyboard: false,
      }
    );
    disabledManager.start();
    const handler = disabledManager as unknown as {
      handleKeyDown(event: KeyboardEvent): void;
    };
    handler.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(poi.focusTarget).toBe(0);
    disabledManager.dispose();
  });

  it('notifies analytics hooks for hover and selection transitions', () => {
    const hoverStarted = vi.fn();
    const hoverEnded = vi.fn();
    const selected = vi.fn();
    const selectionCleared = vi.fn();
    const analytics = {
      hoverStarted,
      hoverEnded,
      selected,
      selectionCleared,
    } satisfies PoiAnalytics;

    manager.dispose();
    manager = new PoiInteractionManager(
      domElement,
      camera,
      [poi],
      {},
      analytics
    );
    manager.start();

    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 200 })
    );
    expect(hoverStarted).toHaveBeenCalledWith(definition);
    expect(hoverEnded).not.toHaveBeenCalled();

    domElement.dispatchEvent(
      new MouseEvent('click', { clientX: 200, clientY: 200 })
    );
    expect(selected).toHaveBeenCalledWith(definition);
    expect(selectionCleared).not.toHaveBeenCalled();

    domElement.dispatchEvent(new MouseEvent('mouseleave'));
    expect(hoverEnded).toHaveBeenCalledWith(definition);

    manager.dispose();
    expect(selectionCleared).toHaveBeenCalledWith(definition);
  });

  it('supports analytics passed without options for backward compatibility', () => {
    const analytics = {
      hoverStarted: vi.fn(),
      hoverEnded: vi.fn(),
      selected: vi.fn(),
      selectionCleared: vi.fn(),
    } satisfies PoiAnalytics;

    manager.dispose();
    manager = new PoiInteractionManager(domElement, camera, [poi], analytics);
    manager.start();

    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 200 })
    );
    expect(analytics.hoverStarted).toHaveBeenCalledWith(definition);

    domElement.dispatchEvent(
      new MouseEvent('click', { clientX: 200, clientY: 200 })
    );
    expect(analytics.selected).toHaveBeenCalledWith(definition);

    domElement.dispatchEvent(new MouseEvent('mouseleave'));
    expect(analytics.hoverEnded).toHaveBeenCalledWith(definition);

    manager.dispose();
    expect(analytics.selectionCleared).toHaveBeenCalledWith(definition);
  });
});
