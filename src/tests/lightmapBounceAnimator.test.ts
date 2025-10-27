import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';

import { createLightmapBounceAnimator } from '../scene/lighting/lightmapBounceAnimator';
import type { RoomCeilingPanel } from '../scene/structures/ceilingPanels';

describe('createLightmapBounceAnimator', () => {
  afterEach(() => {
    delete document.documentElement.dataset.accessibilityPulseScale;
  });

  it('modulates lightmap intensities using LED program samples', () => {
    const floorMaterial = new MeshStandardMaterial();
    floorMaterial.lightMapIntensity = 0.5;
    const wallMaterial = new MeshStandardMaterial();
    wallMaterial.lightMapIntensity = 0.8;
    const fenceMaterial = new MeshStandardMaterial();
    fenceMaterial.lightMapIntensity = 0.6;

    const livingRoomMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial()
    );
    (livingRoomMesh.material as MeshStandardMaterial).lightMapIntensity = 0.7;
    const studioMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial()
    );
    (studioMesh.material as MeshStandardMaterial).lightMapIntensity = 0.65;

    const panels: RoomCeilingPanel[] = [
      { roomId: 'livingRoom', mesh: livingRoomMesh },
      { roomId: 'studio', mesh: studioMesh },
    ];

    const animator = createLightmapBounceAnimator({
      floorMaterial,
      wallMaterial,
      fenceMaterial,
      ceilingPanels: panels,
      programs: [
        {
          roomId: 'livingRoom',
          cycleSeconds: 10,
          keyframes: [
            { time: 0, stripMultiplier: 0.8 },
            { time: 0.5, stripMultiplier: 1.2 },
            { time: 1, stripMultiplier: 0.8 },
          ],
        },
        {
          roomId: 'studio',
          cycleSeconds: 10,
          keyframes: [
            { time: 0, stripMultiplier: 1.05 },
            { time: 0.5, stripMultiplier: 0.9 },
            { time: 1, stripMultiplier: 1.05 },
          ],
        },
      ],
      response: { floor: 1, wall: 1, fence: 1, ceiling: 1 },
    });

    animator.captureBaseline();
    animator.update(5);

    const average = (1.2 + 0.9) / 2;
    expect(floorMaterial.lightMapIntensity).toBeCloseTo(0.5 * average, 5);
    expect(wallMaterial.lightMapIntensity).toBeCloseTo(0.8 * average, 5);
    expect(fenceMaterial.lightMapIntensity).toBeCloseTo(0.6 * average, 5);
    expect(
      (livingRoomMesh.material as MeshStandardMaterial).lightMapIntensity
    ).toBeCloseTo(0.7 * 1.2, 5);
    expect(
      (studioMesh.material as MeshStandardMaterial).lightMapIntensity
    ).toBeCloseTo(0.65 * 0.9, 5);
  });

  it('dampens bounce intensity when accessibility pulse scale is zero', () => {
    const floorMaterial = new MeshStandardMaterial();
    floorMaterial.lightMapIntensity = 0.42;
    const wallMaterial = new MeshStandardMaterial();
    wallMaterial.lightMapIntensity = 0.73;

    const animator = createLightmapBounceAnimator({
      floorMaterial,
      wallMaterial,
      programs: [
        {
          roomId: 'livingRoom',
          cycleSeconds: 8,
          keyframes: [
            { time: 0, stripMultiplier: 0.85 },
            { time: 0.5, stripMultiplier: 1.15 },
            { time: 1, stripMultiplier: 0.85 },
          ],
        },
      ],
      response: { floor: 1, wall: 1 },
    });

    animator.captureBaseline();
    document.documentElement.dataset.accessibilityPulseScale = '0';
    animator.update(4);

    expect(floorMaterial.lightMapIntensity).toBeCloseTo(0.42, 5);
    expect(wallMaterial.lightMapIntensity).toBeCloseTo(0.73, 5);
  });

  it('falls back to average multiplier when a ceiling room lacks a program', () => {
    const floorMaterial = new MeshStandardMaterial();
    floorMaterial.lightMapIntensity = 0.48;
    const wallMaterial = new MeshStandardMaterial();
    wallMaterial.lightMapIntensity = 0.66;

    const greenhouseMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial()
    );
    (greenhouseMesh.material as MeshStandardMaterial).lightMapIntensity = 0.52;

    const panels: RoomCeilingPanel[] = [
      { roomId: 'greenhouse', mesh: greenhouseMesh },
    ];

    const animator = createLightmapBounceAnimator({
      floorMaterial,
      wallMaterial,
      ceilingPanels: panels,
      programs: [
        {
          roomId: 'livingRoom',
          cycleSeconds: 6,
          keyframes: [
            { time: 0, stripMultiplier: 0.9 },
            { time: 0.5, stripMultiplier: 1.1 },
            { time: 1, stripMultiplier: 0.9 },
          ],
        },
      ],
      response: { floor: 1, wall: 1, ceiling: 1 },
    });

    animator.captureBaseline();
    animator.update(3);

    // Average equals the living room program sample (1.1) because only one program exists.
    expect(floorMaterial.lightMapIntensity).toBeCloseTo(0.48 * 1.1, 5);
    expect(wallMaterial.lightMapIntensity).toBeCloseTo(0.66 * 1.1, 5);
    expect(
      (greenhouseMesh.material as MeshStandardMaterial).lightMapIntensity
    ).toBeCloseTo(0.52 * 1.1, 5);
  });
});
