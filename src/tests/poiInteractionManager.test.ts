import {
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

import { PoiInteractionManager } from '../poi/interactionManager';
import type { PoiInstance } from '../poi/markers';
import type { PoiDefinition } from '../poi/types';

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

describe('PoiInteractionManager', () => {
  const definition: PoiDefinition = {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist TV Wall',
    summary: 'summary',
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
    manager.start();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('updates focus target based on pointer hover', () => {
    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 200 })
    );
    expect(poi.focusTarget).toBe(1);

    domElement.dispatchEvent(new MouseEvent('mouseleave'));
    expect(poi.focusTarget).toBe(0);
  });

  it('persists focus on selected POIs and emits selection events', () => {
    const listener = vi.fn();
    manager.addSelectionListener(listener);
    const customEventHandler = vi.fn();
    window.addEventListener('poi:selected', customEventHandler);

    domElement.dispatchEvent(
      new MouseEvent('click', { clientX: 200, clientY: 200 })
    );

    expect(listener).toHaveBeenCalledWith(definition);
    expect(customEventHandler).toHaveBeenCalledTimes(1);
    expect(poi.focusTarget).toBe(1);

    domElement.dispatchEvent(new MouseEvent('mouseleave'));
    expect(poi.focusTarget).toBe(1);

    window.removeEventListener('poi:selected', customEventHandler);
  });
});
