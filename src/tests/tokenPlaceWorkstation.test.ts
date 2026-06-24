import { CanvasTexture, Mesh, Object3D } from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';

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

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    fillStyle: '',
  })) as unknown as HTMLCanvasElement['getContext'];
});

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
    expect(build.group.getObjectByName('TokenPlaceRack')).toBeUndefined();
    expect(finiteObject(build.group)).toBe(true);
    expect(build.colliders).toHaveLength(2);
    build.colliders.forEach((collider) => {
      expect(Object.values(collider).every(Number.isFinite)).toBe(true);
      expect(collider.maxX - collider.minX).toBeLessThanOrEqual(2.4);
      expect(collider.maxZ - collider.minZ).toBeLessThanOrEqual(2.4);
    });
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
