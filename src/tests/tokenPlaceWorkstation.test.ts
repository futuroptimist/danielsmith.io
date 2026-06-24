import { Mesh, Object3D, CanvasTexture } from 'three';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import {
  createTerminalRows,
  createTokenPlaceTerminalState,
  createTokenPlaceWorkstation,
  fingerprintTerminalRows,
} from '../scene/structures/tokenPlaceWorkstation';
import { countObjectTriangles } from '../scene/structures/triangleCount';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    fillRect: vi.fn(),
  })) as unknown as HTMLCanvasElement['getContext'];
});

const findByName = (root: Object3D, name: string): Object3D => {
  const object = root.getObjectByName(name);
  expect(object, name).toBeDefined();
  return object as Object3D;
};

const allFinite = (root: Object3D): boolean => {
  let finite = true;
  root.traverse((object) => {
    finite &&= object.position.toArray().every(Number.isFinite);
    finite &&= [object.rotation.x, object.rotation.y, object.rotation.z].every(
      Number.isFinite
    );
    finite &&= object.scale.toArray().every(Number.isFinite);
    if (object instanceof Mesh) {
      const position = object.geometry.getAttribute('position');
      for (let index = 0; index < position.count; index += 1) {
        finite &&= Number.isFinite(position.getX(index));
        finite &&= Number.isFinite(position.getY(index));
        finite &&= Number.isFinite(position.getZ(index));
      }
    }
  });
  return finite;
};

afterEach(() => {
  document.documentElement.dataset.accessibilityPulseScale = '1';
});

describe('TokenPlace workstation', () => {
  it('anchors the root at the supplied bottom-center position and heading', () => {
    const build = createTokenPlaceWorkstation({
      position: { x: 3, y: 0.25, z: -4 },
      orientationRadians: Math.PI * 0.25,
      detailPolicy: getSceneDetailPolicy('balanced'),
    });

    expect(build.group.name).toBe('TokenPlaceWorkstation');
    expect(build.group.position.toArray()).toEqual([3, 0.25, -4]);
    expect(build.group.rotation.y).toBeCloseTo(Math.PI * 0.25);
    expect(findByName(build.group, 'TokenPlaceDesk').position.x).toBeCloseTo(0);
    expect(findByName(build.group, 'TokenPlaceDesk').position.z).toBeCloseTo(0);
    build.dispose();
  });

  it('places required semantic components in the workstation footprint', () => {
    const build = createTokenPlaceWorkstation({
      position: { x: 0, z: 0 },
      detailPolicy: getSceneDetailPolicy('cinematic'),
    });

    expect(
      findByName(build.group, 'TokenPlacePcTower').position.y
    ).toBeLessThan(0.82);
    expect(
      findByName(build.group, 'TokenPlaceGamingChair').position.z
    ).toBeGreaterThan(0);
    expect(findByName(build.group, 'TokenPlaceKeyboard')).toBeDefined();
    expect(findByName(build.group, 'TokenPlaceMouse')).toBeDefined();
    expect(findByName(build.group, 'TokenPlaceMousePad')).toBeDefined();
    expect(
      build.group.children.filter((child) =>
        child.name.startsWith('TokenPlaceMonitor-')
      )
    ).toHaveLength(2);
    expect(findByName(build.group, 'TokenPlaceMonitorScreen-0')).toBeDefined();
    expect(findByName(build.group, 'TokenPlaceMonitorScreen-1')).toBeDefined();
    expect(build.group.getObjectByName('TokenPlaceRack')).toBeUndefined();
    expect(allFinite(build.group)).toBe(true);
    build.dispose();
  });

  it('creates distinct monitor textures and deterministic terminal patterns', () => {
    const build = createTokenPlaceWorkstation({ position: { x: 0, z: 0 } });
    expect(build.terminals[0].texture).toBeInstanceOf(CanvasTexture);
    expect(build.terminals[1].texture).toBeInstanceOf(CanvasTexture);
    expect(build.terminals[0].texture).not.toBe(build.terminals[1].texture);
    expect(build.terminals[0].speed).not.toBe(build.terminals[1].speed);
    expect(build.terminals[0].scrollOffset).not.toBe(
      build.terminals[1].scrollOffset
    );

    const first = fingerprintTerminalRows(createTerminalRows(1234, 12));
    const second = fingerprintTerminalRows(createTerminalRows(1234, 12));
    const different = fingerprintTerminalRows(createTerminalRows(4321, 12));
    expect(first).toBe(second);
    expect(first).not.toBe(different);
    expect(new Set(first.split('|')).size).toBeGreaterThan(8);
    build.dispose();
  });

  it('advances scrolling deterministically and keeps reduced motion static', () => {
    const animated = createTokenPlaceTerminalState({
      seed: 99,
      speed: 20,
      phase: 0,
      redrawFps: 10,
      size: { width: 128, height: 72 },
    });
    const before = animated.fingerprint();
    animated.update(0.5, true);
    expect(animated.fingerprint()).not.toBe(before);
    animated.dispose();

    const build = createTokenPlaceWorkstation({ position: { x: 0, z: 0 } });
    document.documentElement.dataset.accessibilityPulseScale = '0';
    const staticBefore = build.terminals[0].fingerprint();
    build.update({ elapsed: 2, delta: 2, emphasis: 1 });
    expect(build.terminals[0].fingerprint()).toBe(staticBefore);
    build.dispose();
  });

  it('disposes owned terminal textures', () => {
    const build = createTokenPlaceWorkstation({ position: { x: 0, z: 0 } });
    build.dispose();
    expect(build.terminals[0].disposed).toBe(true);
    expect(build.terminals[1].disposed).toBe(true);
  });

  it('builds only the requested detail variant with required ratio ordering', () => {
    const cinematic = createTokenPlaceWorkstation({
      position: { x: 0, z: 0 },
      detailPolicy: getSceneDetailPolicy('cinematic'),
    });
    const balanced = createTokenPlaceWorkstation({
      position: { x: 0, z: 0 },
      detailPolicy: getSceneDetailPolicy('balanced'),
    });
    const performance = createTokenPlaceWorkstation({
      position: { x: 0, z: 0 },
      detailPolicy: getSceneDetailPolicy('performance'),
    });

    [cinematic, balanced, performance].forEach((build) => {
      expect(findByName(build.group, 'TokenPlaceDesk')).toBeDefined();
      expect(findByName(build.group, 'TokenPlacePcTower')).toBeDefined();
      expect(findByName(build.group, 'TokenPlaceGamingChair')).toBeDefined();
      expect(findByName(build.group, 'TokenPlaceKeyboard')).toBeDefined();
      expect(findByName(build.group, 'TokenPlaceMouse')).toBeDefined();
      expect(findByName(build.group, 'TokenPlaceMousePad')).toBeDefined();
      expect(
        build.group.children.filter((child) =>
          child.name.startsWith('TokenPlaceMonitor-')
        )
      ).toHaveLength(2);
    });

    const cinematicTriangles = countObjectTriangles(cinematic.group);
    const balancedTriangles = countObjectTriangles(balanced.group);
    const performanceTriangles = countObjectTriangles(performance.group);
    expect(cinematicTriangles).toBeGreaterThan(balancedTriangles);
    expect(balancedTriangles).toBeGreaterThan(performanceTriangles);
    expect(balancedTriangles / cinematicTriangles).toBeGreaterThanOrEqual(0.4);
    expect(balancedTriangles / cinematicTriangles).toBeLessThanOrEqual(0.6);
    expect(performanceTriangles / balancedTriangles).toBeGreaterThanOrEqual(
      0.4
    );
    expect(performanceTriangles / balancedTriangles).toBeLessThanOrEqual(0.6);

    cinematic.dispose();
    balanced.dispose();
    performance.dispose();
  });

  it('returns finite conservative colliders', () => {
    const build = createTokenPlaceWorkstation({
      position: { x: 2, z: -3 },
      orientationRadians: 0.5,
    });
    expect(build.colliders).toHaveLength(2);
    build.colliders.forEach((collider) => {
      expect(Object.values(collider).every(Number.isFinite)).toBe(true);
      expect(collider.maxX).toBeGreaterThan(collider.minX);
      expect(collider.maxZ).toBeGreaterThan(collider.minZ);
    });
    build.dispose();
  });
});
