import { Box3, CanvasTexture, Mesh, Object3D, PlaneGeometry } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import {
  createTokenPlaceTerminalState,
  createTokenPlaceWorkstation,
  fingerprintRows,
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
    expect(build.colliders).toHaveLength(2);
    build.colliders.forEach((collider) => {
      expect(Object.values(collider).every(Number.isFinite)).toBe(true);
      expect(collider.maxX - collider.minX).toBeLessThanOrEqual(3.2);
      expect(collider.maxZ - collider.minZ).toBeLessThanOrEqual(3.2);
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

    // Raspberry Pi 5 footprint is about 85mm x 56mm. A 27 inch 16:9
    // monitor has about a 598mm x 336mm active area, so each screen
    // should be ~7x wider than a Pi board and the dual-monitor setup
    // should read as a full desk, not a board-sized accessory.
    const raspberryPi5WidthMm = 85;
    const monitor27InchWidthMm = 598;
    const expectedMonitorToPiRatio = monitor27InchWidthMm / raspberryPi5WidthMm;
    const screenToPiReferenceWidth =
      screenSizes[0].width / expectedMonitorToPiRatio;
    const dualMonitorOuterWidth =
      Math.abs(
        (rightMonitor?.position.x ?? 0) - (leftMonitor?.position.x ?? 0)
      ) + screenSizes[0].width;

    screenSizes.forEach(({ width, height }) => {
      expect(width / height).toBeGreaterThan(1.75);
      expect(width / height).toBeLessThan(1.79);
      expect(width / screenToPiReferenceWidth).toBeCloseTo(
        expectedMonitorToPiRatio
      );
    });
    expect(dualMonitorOuterWidth / screenToPiReferenceWidth).toBeGreaterThan(
      12
    );
    expect(workstationBounds.max.x - workstationBounds.min.x).toBeGreaterThan(
      2.3
    );
    expect(workstationBounds.max.z - workstationBounds.min.z).toBeGreaterThan(
      1.5
    );
    expect(workstationBounds.max.x - workstationBounds.min.x).toBeLessThan(3);
    expect(workstationBounds.max.z - workstationBounds.min.z).toBeLessThan(2.4);
    expect(workstationBounds.max.y).toBeLessThan(1.7);
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    build.dispose();
  });

  it('rotates collider offsets with the workstation heading', () => {
    const orientationRadians = Math.PI / 2;
    const build = createTokenPlaceWorkstation({
      position: { x: 5, z: 7 },
      orientationRadians,
      detailPolicy: getSceneDetailPolicy('balanced'),
    });
    const chairCollider = build.colliders[1];
    const chairCenterX = (chairCollider.minX + chairCollider.maxX) / 2;
    const chairCenterZ = (chairCollider.minZ + chairCollider.maxZ) / 2;

    expect(chairCenterX).toBeLessThan(4);
    expect(chairCenterZ).toBeCloseTo(7.06, 1);
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
    const builds = ['cinematic', 'balanced', 'performance'].map((level) =>
      createTokenPlaceWorkstation({
        position: { x: 0, z: 0 },
        detailPolicy: getSceneDetailPolicy(
          level as 'cinematic' | 'balanced' | 'performance'
        ),
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
