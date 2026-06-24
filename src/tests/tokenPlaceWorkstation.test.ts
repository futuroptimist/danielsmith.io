import { CanvasTexture, Mesh } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import {
  advanceTerminalStateForTest,
  createTerminalRows,
  createTokenPlaceWorkstation,
  fingerprintTerminalRow,
} from '../scene/structures/tokenPlaceWorkstation';
import { countObjectTriangles } from '../scene/structures/triangleCount';

const fillText = vi.fn();

beforeEach(() => {
  fillText.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText,
  } as unknown as CanvasRenderingContext2D);
});

describe('TokenPlaceWorkstation', () => {
  it('anchors the root and places required semantic components', () => {
    const build = createTokenPlaceWorkstation({
      position: { x: 2, y: 0.5, z: -3 },
      orientationRadians: 0.4,
      detailPolicy: getSceneDetailPolicy('balanced'),
    });

    expect(build.group.name).toBe('TokenPlaceWorkstation');
    expect(build.group.position.toArray()).toEqual([2, 0.5, -3]);
    expect(build.group.rotation.y).toBeCloseTo(0.4);
    expect(
      build.group.getObjectByName('TokenPlaceDesk')?.position.x
    ).toBeCloseTo(0);
    expect(
      build.group.getObjectByName('TokenPlacePcTower')?.position.y
    ).toBeLessThan(0.82);
    expect(
      build.group.getObjectByName('TokenPlaceGamingChair')?.position.z
    ).toBeGreaterThan(0);
    expect(
      build.group.children.filter((child) =>
        child.name.startsWith('TokenPlaceMonitor-')
      )
    ).toHaveLength(2);
    expect(
      build.group.getObjectByName('TokenPlaceMonitorScreen-0')
    ).toBeTruthy();
    expect(
      build.group.getObjectByName('TokenPlaceMonitorScreen-1')
    ).toBeTruthy();
    expect(build.group.getObjectByName('TokenPlaceKeyboard')).toBeTruthy();
    expect(build.group.getObjectByName('TokenPlaceMouse')).toBeTruthy();
    expect(build.group.getObjectByName('TokenPlaceMousePad')).toBeTruthy();
    expect(build.group.getObjectByName('TokenPlaceRack')).toBeUndefined();
  });

  it('owns distinct screen textures and disposes them', () => {
    const build = createTokenPlaceWorkstation({ position: { x: 0, z: 0 } });
    const screen0 = build.group.getObjectByName(
      'TokenPlaceMonitorScreen-0'
    ) as Mesh;
    const screen1 = build.group.getObjectByName(
      'TokenPlaceMonitorScreen-1'
    ) as Mesh;
    const map0 = (screen0.material as unknown as { map: CanvasTexture }).map;
    const map1 = (screen1.material as unknown as { map: CanvasTexture }).map;
    const dispose0 = vi.spyOn(map0, 'dispose');
    const dispose1 = vi.spyOn(map1, 'dispose');

    expect(map0).toBeInstanceOf(CanvasTexture);
    expect(map1).toBeInstanceOf(CanvasTexture);
    expect(map0).not.toBe(map1);

    build.dispose();

    expect(dispose0).toHaveBeenCalledOnce();
    expect(dispose1).toHaveBeenCalledOnce();
  });

  it('generates deterministic text-free terminal row patterns', () => {
    const rows = createTerminalRows(1234, 30);
    const sameRows = createTerminalRows(1234, 30);
    const otherRows = createTerminalRows(5678, 30);
    const fingerprints = rows.map(fingerprintTerminalRow);

    expect(fingerprints).toEqual(sameRows.map(fingerprintTerminalRow));
    expect(fillText).not.toHaveBeenCalled();
    expect(new Set(fingerprints).size).toBeGreaterThan(24);
    expect(
      fingerprints.filter(
        (row, index) => row !== fingerprintTerminalRow(otherRows[index])
      )
    ).toHaveLength(30);
  });

  it('scrolls deterministically and keeps terminals out of sync', () => {
    const build = createTokenPlaceWorkstation({ position: { x: 0, z: 0 } });
    const firstBefore = fingerprintTerminalRow(build.terminals[0].rows[0]);
    const secondBefore = fingerprintTerminalRow(build.terminals[1].rows[0]);

    expect(build.terminals[0].speed).not.toBe(build.terminals[1].speed);
    expect(build.terminals[0].phase).not.toBe(build.terminals[1].phase);

    advanceTerminalStateForTest(build.terminals[0]);

    expect(fingerprintTerminalRow(build.terminals[0].rows[0])).not.toBe(
      firstBefore
    );
    expect(fingerprintTerminalRow(build.terminals[1].rows[0])).toBe(
      secondBefore
    );
  });

  it('preserves a static frame when reduced motion suppresses animation', () => {
    document.documentElement.dataset.accessibilityPulseScale = '0';
    const build = createTokenPlaceWorkstation({ position: { x: 0, z: 0 } });
    const before = fingerprintTerminalRow(build.terminals[0].rows[0]);

    build.update({ elapsed: 10, delta: 10, emphasis: 1 });

    expect(fingerprintTerminalRow(build.terminals[0].rows[0])).toBe(before);
    delete document.documentElement.dataset.accessibilityPulseScale;
  });

  it('keeps required components finite in every quality mode and builds one variant', () => {
    for (const level of ['cinematic', 'balanced', 'performance'] as const) {
      const build = createTokenPlaceWorkstation({
        position: { x: 0, z: 0 },
        detailPolicy: getSceneDetailPolicy(level),
      });
      for (const name of [
        'TokenPlaceDesk',
        'TokenPlacePcTower',
        'TokenPlaceGamingChair',
        'TokenPlaceKeyboard',
        'TokenPlaceMouse',
        'TokenPlaceMousePad',
      ]) {
        const object = build.group.getObjectByName(name);
        expect(object, `${level} ${name}`).toBeTruthy();
        expect(Number.isFinite(object?.position.x)).toBe(true);
      }
      expect(
        build.group.children.filter((child) =>
          child.name.startsWith('TokenPlaceMonitor-')
        )
      ).toHaveLength(2);
      expect(build.terminals).toHaveLength(2);
      expect(build.group.getObjectByName('TokenPlaceRack')).toBeUndefined();
      build.colliders.forEach((collider) => {
        expect(Object.values(collider).every(Number.isFinite)).toBe(true);
        expect(collider.maxX - collider.minX).toBeLessThanOrEqual(2.4);
        expect(collider.maxZ - collider.minZ).toBeLessThanOrEqual(2.4);
      });
    }
  });

  it('meets triangle ordering and ratio targets', () => {
    const cinematic = countObjectTriangles(
      createTokenPlaceWorkstation({
        position: { x: 0, z: 0 },
        detailPolicy: getSceneDetailPolicy('cinematic'),
      }).group
    );
    const balanced = countObjectTriangles(
      createTokenPlaceWorkstation({
        position: { x: 0, z: 0 },
        detailPolicy: getSceneDetailPolicy('balanced'),
      }).group
    );
    const performance = countObjectTriangles(
      createTokenPlaceWorkstation({
        position: { x: 0, z: 0 },
        detailPolicy: getSceneDetailPolicy('performance'),
      }).group
    );

    expect(cinematic).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(performance);
    expect(balanced / cinematic).toBeGreaterThanOrEqual(0.4);
    expect(balanced / cinematic).toBeLessThanOrEqual(0.6);
    expect(performance / balanced).toBeGreaterThanOrEqual(0.4);
    expect(performance / balanced).toBeLessThanOrEqual(0.6);
  });
});
