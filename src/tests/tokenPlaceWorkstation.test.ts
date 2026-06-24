import { CanvasTexture, Mesh } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSceneDetailPolicy,
  type SceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';
import {
  createTerminalPatternGenerator,
  createTokenPlaceWorkstation,
  fingerprintTerminalRows,
} from '../scene/structures/tokenPlaceWorkstation';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const context = {
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  fillRect: vi.fn(),
};

vi.mock('../ui/accessibility/animationPreferences', () => ({
  getPulseScale: vi.fn(() => 1),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as never
  );
});

function build(level: SceneDetailLevel = 'balanced') {
  return createTokenPlaceWorkstation({
    position: { x: 3, y: 0.2, z: -2 },
    orientationRadians: Math.PI / 5,
    detailPolicy: getSceneDetailPolicy(level),
  });
}

describe('createTokenPlaceWorkstation', () => {
  it('anchors the root at the supplied floor position and heading', () => {
    const workstation = build();
    expect(workstation.group.name).toBe('TokenPlaceWorkstation');
    expect(workstation.group.position.toArray()).toEqual([3, 0.2, -2]);
    expect(workstation.group.rotation.y).toBeCloseTo(Math.PI / 5);
  });

  it('places semantic workstation components in the expected local zones', () => {
    const workstation = build();
    const desk = workstation.group.getObjectByName('TokenPlaceDesk');
    const tower = workstation.group.getObjectByName('TokenPlacePcTower');
    const chair = workstation.group.getObjectByName('TokenPlaceGamingChair');
    expect(desk?.position.x).toBeCloseTo(0);
    expect(desk?.position.z).toBeCloseTo(0);
    expect(tower?.position.y).toBeLessThan(0.72);
    expect(chair?.position.z).toBeGreaterThan(0);
    expect(
      workstation.group.getObjectByName('TokenPlaceKeyboard')
    ).toBeTruthy();
    expect(workstation.group.getObjectByName('TokenPlaceMouse')).toBeTruthy();
    expect(
      workstation.group.getObjectByName('TokenPlaceMousePad')
    ).toBeTruthy();
  });

  it('creates exactly two independently textured monitor screens', () => {
    const workstation = build();
    const monitors = workstation.group.children.filter((child) =>
      child.name.startsWith('TokenPlaceMonitor-')
    );
    const screens: Mesh[] = [];
    workstation.group.traverse((object) => {
      if (
        object instanceof Mesh &&
        object.name.startsWith('TokenPlaceMonitorScreen-')
      )
        screens.push(object);
    });
    expect(monitors).toHaveLength(2);
    expect(screens).toHaveLength(2);
    expect(workstation.terminals).toHaveLength(2);
    expect(workstation.terminals[0].texture).toBeInstanceOf(CanvasTexture);
    expect(workstation.terminals[0].texture).not.toBe(
      workstation.terminals[1].texture
    );
    expect(workstation.terminals[0].speed).not.toBe(
      workstation.terminals[1].speed
    );
  });

  it('generates deterministic non-text terminal rows with seed variation', () => {
    const generatorA = createTerminalPatternGenerator(123);
    const generatorB = createTerminalPatternGenerator(123);
    const generatorC = createTerminalPatternGenerator(456);
    const rowsA = Array.from({ length: 40 }, () => generatorA.nextRow());
    const rowsB = Array.from({ length: 40 }, () => generatorB.nextRow());
    const rowsC = Array.from({ length: 40 }, () => generatorC.nextRow());
    expect(fingerprintTerminalRows(rowsA)).toBe(fingerprintTerminalRows(rowsB));
    expect(fingerprintTerminalRows(rowsA)).not.toBe(
      fingerprintTerminalRows(rowsC)
    );
    expect(
      new Set(rowsA.map((row) => fingerprintTerminalRows([row]))).size
    ).toBeGreaterThan(24);
    expect(context.fillRect).not.toHaveBeenCalledWith(expect.any(String));
  });

  it('scrolls deterministically, recycles rows, and preserves static reduced-motion frames', async () => {
    const prefs = await import('../ui/accessibility/animationPreferences');
    const getPulseScale = vi.mocked(prefs.getPulseScale);
    const workstation = build();
    const before = fingerprintTerminalRows(workstation.terminals[0].rows);
    workstation.update({ elapsed: 1, delta: 1, emphasis: 0 });
    expect(fingerprintTerminalRows(workstation.terminals[0].rows)).not.toBe(
      before
    );
    const staticBefore = fingerprintTerminalRows(workstation.terminals[1].rows);
    getPulseScale.mockReturnValue(0);
    workstation.update({ elapsed: 2, delta: 1, emphasis: 0 });
    expect(fingerprintTerminalRows(workstation.terminals[1].rows)).toBe(
      staticBefore
    );
  });

  it('disposes owned textures', () => {
    const workstation = build();
    const dispose = vi.spyOn(workstation.terminals[0].texture, 'dispose');
    workstation.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(workstation.terminals.every((terminal) => terminal.disposed)).toBe(
      true
    );
  });

  it('keeps all transforms and conservative colliders finite', () => {
    const workstation = build();
    workstation.group.traverse((object) => {
      expect(object.position.toArray().every(Number.isFinite)).toBe(true);
      expect(object.rotation.toArray().slice(0, 3).every(Number.isFinite)).toBe(
        true
      );
    });
    expect(workstation.colliders.length).toBeGreaterThanOrEqual(2);
    workstation.colliders.forEach((collider) => {
      expect(Object.values(collider).every(Number.isFinite)).toBe(true);
      expect(collider.maxX).toBeGreaterThan(collider.minX);
      expect(collider.maxZ).toBeGreaterThan(collider.minZ);
    });
  });

  it('builds one complete selected quality variant with ordered triangle budgets', () => {
    const levels: SceneDetailLevel[] = ['cinematic', 'balanced', 'performance'];
    const builds = levels.map((level) => build(level));
    builds.forEach((workstation) => {
      [
        'TokenPlaceDesk',
        'TokenPlacePcTower',
        'TokenPlaceGamingChair',
        'TokenPlaceKeyboard',
        'TokenPlaceMouse',
        'TokenPlaceMousePad',
      ].forEach((name) => {
        expect(workstation.group.getObjectByName(name)).toBeTruthy();
      });
      expect(
        workstation.group.getObjectByName(['TokenPlace', 'Rack'].join(''))
      ).toBeFalsy();
      expect(
        workstation.group.children.filter(
          (child) => child.name === 'TokenPlaceDesk'
        )
      ).toHaveLength(1);
    });
    const triangles = builds.map((workstation) =>
      countObjectTriangles(workstation.group)
    );
    expect(triangles[0]).toBeGreaterThan(triangles[1]);
    expect(triangles[1]).toBeGreaterThan(triangles[2]);
    expect(triangles[1] / triangles[0]).toBeGreaterThanOrEqual(0.4);
    expect(triangles[1] / triangles[0]).toBeLessThanOrEqual(0.6);
    expect(triangles[2] / triangles[1]).toBeGreaterThanOrEqual(0.4);
    expect(triangles[2] / triangles[1]).toBeLessThanOrEqual(0.6);
  });
});
