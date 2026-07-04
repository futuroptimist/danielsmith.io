import { Box3, CanvasTexture, Mesh, Object3D, PlaneGeometry } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  getSceneDetailPolicy,
  type SceneDetailLevel,
} from '../scene/graphics/sceneDetailPolicy';
import {
  EXPECTED_27_INCH_MONITOR_TO_PI_WIDTH_RATIO,
  MONITOR_SCREEN_WIDTH,
  createTokenPlaceTerminalState,
  createTokenPlaceWorkstation,
  fingerprintRows,
  SUGARKUBE_PI_BOARD_SCENE_WIDTH,
} from '../scene/structures/tokenPlaceWorkstation';
import { countObjectTriangles } from '../scene/structures/triangleCount';

function find(root: Object3D, name: string): Object3D | undefined {
  return root.getObjectByName(name);
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    fillStyle: '',
  })) as unknown as HTMLCanvasElement['getContext'];
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

function localBoundingBox(root: Object3D): Box3 {
  root.updateMatrixWorld(true);
  return new Box3().setFromObject(root);
}

function planeSize(mesh: Mesh): { width: number; height: number } {
  const geometry = mesh.geometry as PlaneGeometry;
  const { width, height } = geometry.parameters;
  return { width, height };
}

function finiteObject(root: Object3D): boolean {
  let finite = true;
  root.traverse((object) => {
    finite &&=
      Number.isFinite(object.position.x) &&
      Number.isFinite(object.position.y) &&
      Number.isFinite(object.position.z) &&
      Number.isFinite(object.rotation.x) &&
      Number.isFinite(object.rotation.y) &&
      Number.isFinite(object.rotation.z);
  });
  return finite;
}

describe('TokenPlaceWorkstation', () => {
  it('anchors the root and lays out the required workstation components', () => {
    const build = createTokenPlaceWorkstation({
      position: { x: 2, y: 0.5, z: -3 },
      orientationRadians: 0.4,
      detailPolicy: getSceneDetailPolicy('balanced'),
    });

    expect(build.group.name).toBe('TokenPlaceWorkstation');
    expect(build.group.position.toArray()).toEqual([2, 0.5, -3]);
    expect(build.group.rotation.y).toBeCloseTo(0.4);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    expect(find(build.group, 'TokenPlaceDesk')?.position.x).toBeCloseTo(0);
    expect(find(build.group, 'TokenPlaceDesk')?.position.z).toBeCloseTo(0);
    expect(find(build.group, 'TokenPlacePcTower')?.position.y).toBeLessThan(
      0.76
    );
    expect(
      find(build.group, 'TokenPlaceGamingChair')?.position.z
    ).toBeGreaterThan(0);
    expect(
      ['TokenPlaceKeyboard', 'TokenPlaceMouse', 'TokenPlaceMousePad'].map(
        (name) => Boolean(find(build.group, name))
      )
    ).toEqual([true, true, true]);
    expect(
      [0, 1].map((index) =>
        Boolean(find(build.group, `TokenPlaceMonitor-${index}`))
      )
    ).toEqual([true, true]);
    expect(
      [0, 1].map((index) =>
        Boolean(find(build.group, `TokenPlaceMonitorScreen-${index}`))
      )
    ).toEqual([true, true]);
    expect(
      build.group.children.every(
        (child) => child.name !== 'TokenPlace' + 'Rack'
      )
    ).toBe(true);
    expect(finiteObject(build.group)).toBe(true);
    expect(build.colliders).toHaveLength(1);
    build.colliders.forEach((collider) => {
      expect(
        [collider.minX, collider.maxX, collider.minZ, collider.maxZ].every(
          Number.isFinite
        )
      ).toBe(true);
      expect(collider.maxX - collider.minX).toBeLessThanOrEqual(5.9);
      expect(collider.maxZ - collider.minZ).toBeLessThanOrEqual(5.9);
    });
    build.dispose();
  });

  it('uses Pi-to-monitor proportions without scaling the root', () => {
    const build = createTokenPlaceWorkstation({
      position: { x: 0, z: 0 },
      detailPolicy: getSceneDetailPolicy('balanced'),
    });
    const screens = [0, 1].map(
      (index) => find(build.group, `TokenPlaceMonitorScreen-${index}`) as Mesh
    );
    const screenSizes = screens.map(planeSize);
    const leftMonitor = find(build.group, 'TokenPlaceMonitor-0');
    const rightMonitor = find(build.group, 'TokenPlaceMonitor-1');
    const workstationBounds = localBoundingBox(build.group);

    const dualMonitorOuterWidth =
      Math.abs(
        (rightMonitor?.position.x ?? 0) - (leftMonitor?.position.x ?? 0)
      ) + screenSizes[0].width;

    screenSizes.forEach(({ width, height }) => {
      expect(width).toBeCloseTo(MONITOR_SCREEN_WIDTH, 2);
      expect(width / SUGARKUBE_PI_BOARD_SCENE_WIDTH).toBeCloseTo(
        EXPECTED_27_INCH_MONITOR_TO_PI_WIDTH_RATIO,
        2
      );
      expect(width / height).toBeCloseTo(16 / 9, 2);
    });
    expect(dualMonitorOuterWidth).toBeGreaterThan(
      14 * SUGARKUBE_PI_BOARD_SCENE_WIDTH
    );
    expect(dualMonitorOuterWidth).toBeLessThan(
      16.5 * SUGARKUBE_PI_BOARD_SCENE_WIDTH
    );
    expect(workstationBounds.max.x - workstationBounds.min.x).toBeGreaterThan(
      4.6
    );
    expect(workstationBounds.max.z - workstationBounds.min.z).toBeGreaterThan(
      2
    );
    expect(workstationBounds.max.x - workstationBounds.min.x).toBeLessThan(5.7);
    expect(workstationBounds.max.z - workstationBounds.min.z).toBeLessThan(
      2.85
    );
    expect(workstationBounds.max.y).toBeLessThan(2.4);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    build.dispose();
  });

  it('derives a tight collider from rotated workstation geometry', () => {
    const build = createTokenPlaceWorkstation({
      position: { x: 5, z: 7 },
      orientationRadians: Math.PI / 2,
      detailPolicy: getSceneDetailPolicy('balanced'),
    });
    const [collider] = build.colliders;

    expect(collider.maxX - collider.minX).toBeGreaterThan(2);
    expect(collider.maxX - collider.minX).toBeLessThan(2.9);
    expect(collider.maxZ - collider.minZ).toBeGreaterThan(4.6);
    expect(collider.maxZ - collider.minZ).toBeLessThan(5.7);
    build.dispose();
  });

  it('creates distinct owned terminal textures and disposes them', () => {
    const build = createTokenPlaceWorkstation({ position: { x: 0, z: 0 } });
    const screens = [0, 1].map(
      (index) => find(build.group, `TokenPlaceMonitorScreen-${index}`) as Mesh
    );
    const textures = screens.map(
      (screen) => (screen.material as unknown as { map: CanvasTexture }).map
    );
    const disposeSpies = textures.map((texture) =>
      vi.spyOn(texture, 'dispose')
    );

    expect(textures[0]).toBeInstanceOf(CanvasTexture);
    expect(textures[1]).toBeInstanceOf(CanvasTexture);
    expect(textures[0]).not.toBe(textures[1]);
    build.dispose();
    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it('generates deterministic non-text terminal rows with continuing variation', () => {
    const a = createTokenPlaceTerminalState({
      seed: 7,
      speed: 20,
      phase: 1,
      rowCount: 40,
    });
    const b = createTokenPlaceTerminalState({
      seed: 7,
      speed: 20,
      phase: 1,
      rowCount: 40,
    });
    const c = createTokenPlaceTerminalState({
      seed: 8,
      speed: 20,
      phase: 1,
      rowCount: 40,
    });

    expect(fingerprintRows(a.rows)).toBe(fingerprintRows(b.rows));
    expect(fingerprintRows(a.rows)).not.toBe(fingerprintRows(c.rows));
    expect(
      new Set(
        a.rows.map(
          (row) =>
            `${row.runs.length}:${row.indent.toFixed(2)}:${row.cursor ? 1 : 0}`
        )
      ).size
    ).toBeGreaterThan(18);
    const before = a.fingerprint;
    expect(a.advance(1)).toBeGreaterThan(0);
    expect(a.fingerprint).not.toBe(before);
  });

  it('keeps terminal animation static when update animation is suppressed', () => {
    const build = createTokenPlaceWorkstation({ position: { x: 0, z: 0 } });
    const before = build.terminals.map((terminal) => terminal.fingerprint);
    build.update({
      elapsed: 1,
      delta: 2,
      emphasis: 1,
      animateTerminals: false,
    });
    expect(build.terminals.map((terminal) => terminal.fingerprint)).toEqual(
      before
    );
    expect(build.terminals[0].speed).not.toBe(build.terminals[1].speed);
    expect(build.terminals[0].phase).not.toBe(build.terminals[1].phase);
    build.dispose();
  });

  it('constructs one selected detail variant with required semantics and tuned triangle ratios', () => {
    const levels: SceneDetailLevel[] = [
      'cinematic',
      'balanced',
      'performance',
      'low',
      'micro',
    ];
    const builds = levels.map((level) =>
      createTokenPlaceWorkstation({
        position: { x: 0, z: 0 },
        detailPolicy: getSceneDetailPolicy(level),
      })
    );
    builds.forEach((build) => {
      expect(
        build.group.children.filter((child) => child.name === 'TokenPlaceDesk')
      ).toHaveLength(1);
      expect(
        build.group.children.filter(
          (child) => child.name === 'TokenPlacePcTower'
        )
      ).toHaveLength(1);
      expect(
        build.group.children.filter(
          (child) => child.name === 'TokenPlaceGamingChair'
        )
      ).toHaveLength(1);
      expect(
        [0, 1].every((index) =>
          Boolean(find(build.group, `TokenPlaceMonitorScreen-${index}`))
        )
      ).toBe(true);
    });
    const triangles = builds.map((build) => countObjectTriangles(build.group));
    expect(triangles[0]).toBeGreaterThan(triangles[1]);
    expect(triangles[1]).toBeGreaterThan(triangles[2]);
    expect(triangles[2]).toBeGreaterThanOrEqual(triangles[3]);
    expect(triangles[3]).toBeGreaterThanOrEqual(triangles[4]);
    expect(triangles[1] / triangles[0]).toBeGreaterThanOrEqual(0.4);
    expect(triangles[1] / triangles[0]).toBeLessThanOrEqual(0.6);
    expect(triangles[2] / triangles[1]).toBeGreaterThanOrEqual(0.4);
    expect(triangles[2] / triangles[1]).toBeLessThanOrEqual(0.6);
    builds.forEach((build) => build.dispose());
  });

  it('does not use font rendering in the terminal implementation', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/scene/structures/tokenPlaceWorkstation.ts', 'utf8')
    );
    expect(source).not.toContain('fillText');
    expect(source).not.toContain('.font');
    expect(source).not.toContain('Math.random');
  });
});
