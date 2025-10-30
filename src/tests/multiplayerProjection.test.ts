import { CanvasTexture, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type SpyInstance,
} from 'vitest';

import { createMultiplayerProjection } from '../scene/structures/multiplayerProjection';

describe('createMultiplayerProjection', () => {
  let getContextSpy: SpyInstance<
    [contextId: string, ...args: unknown[]],
    RenderingContext | null
  >;

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((type) => {
        if (type === '2d') {
          return {
            clearRect: vi.fn(),
            createLinearGradient: vi
              .fn()
              .mockReturnValue({ addColorStop: vi.fn() }),
            fillRect: vi.fn(),
            fillText: vi.fn(),
            fillStyle: '',
            font: '',
            textAlign: 'left',
            textBaseline: 'alphabetic',
          } as unknown as CanvasRenderingContext2D;
        }
        return null;
      });
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    delete document.documentElement.dataset.accessibilityPulseScale;
    delete document.documentElement.dataset.accessibilityFlickerScale;
  });

  it('builds a holographic projection dais with dynamic screen content', () => {
    const build = createMultiplayerProjection({
      basePosition: new Vector3(1.5, 0, -2.4),
    });

    expect(build.group.name).toBe('BackyardMultiplayerProjection');
    const screen = build.group.getObjectByName(
      'MultiplayerProjectionScreen'
    ) as Mesh<MeshBasicMaterial> | null;
    expect(screen).toBeInstanceOf(Mesh);
    const glow = build.group.getObjectByName(
      'MultiplayerProjectionGlow'
    ) as Mesh<MeshBasicMaterial> | null;
    expect(glow).toBeInstanceOf(Mesh);
    const halo = build.group.getObjectByName(
      'MultiplayerProjectionHalo'
    ) as Mesh<MeshBasicMaterial> | null;
    expect(halo).toBeInstanceOf(Mesh);

    const screenMaterial = screen?.material as MeshBasicMaterial;
    expect(screenMaterial.map).toBeInstanceOf(CanvasTexture);
    expect(screenMaterial.transparent).toBe(true);

    const snapshot = build.getCurrentTour();
    expect(snapshot.title.length).toBeGreaterThan(0);
    expect(snapshot.id).not.toBe(snapshot.nextId);
    expect(snapshot.transition).toBeCloseTo(0);

    const { collider } = build;
    expect(collider.minX).toBeLessThan(collider.maxX);
    expect(collider.minZ).toBeLessThan(collider.maxZ);
    expect(collider.minX).toBeLessThanOrEqual(build.group.position.x);
    expect(collider.maxX).toBeGreaterThanOrEqual(build.group.position.x);
  });

  it('animates screen brightness, halo glow, and tour rotation with accessibility scaling', () => {
    document.documentElement.dataset.accessibilityPulseScale = '1';
    document.documentElement.dataset.accessibilityFlickerScale = '1';
    const fullMotion = createMultiplayerProjection({
      basePosition: new Vector3(0, 0, 0),
    });

    const screen = fullMotion.group.getObjectByName(
      'MultiplayerProjectionScreen'
    ) as Mesh<MeshBasicMaterial>;
    const glow = fullMotion.group.getObjectByName(
      'MultiplayerProjectionGlow'
    ) as Mesh<MeshBasicMaterial>;
    const halo = fullMotion.group.getObjectByName(
      'MultiplayerProjectionHalo'
    ) as Mesh<MeshBasicMaterial>;

    const initialSnapshot = fullMotion.getCurrentTour();

    fullMotion.update({ elapsed: 1.2, delta: 0.016 });
    const animatedScreenOpacity = screen.material.opacity;
    const animatedGlowOpacity = glow.material.opacity;
    const animatedHaloOpacity = halo.material.opacity;

    fullMotion.update({ elapsed: 2.4, delta: 0.016 });
    const oscillatedScreenOpacity = screen.material.opacity;
    const oscillatedGlowOpacity = glow.material.opacity;
    const oscillatedHaloOpacity = halo.material.opacity;

    expect(Math.abs(oscillatedScreenOpacity - animatedScreenOpacity)).toBeGreaterThan(0);
    expect(Math.abs(oscillatedGlowOpacity - animatedGlowOpacity)).toBeGreaterThan(0);
    expect(Math.abs(oscillatedHaloOpacity - animatedHaloOpacity)).toBeGreaterThan(0);

    const intermediateSnapshot = fullMotion.getCurrentTour();
    expect(intermediateSnapshot.id).toBe(initialSnapshot.id);

    fullMotion.update({ elapsed: 9, delta: 0.016 });
    const rotatedSnapshot = fullMotion.getCurrentTour();
    expect(rotatedSnapshot.id).not.toBe(initialSnapshot.id);
    expect(rotatedSnapshot.nextId).not.toBe(rotatedSnapshot.id);
    expect(rotatedSnapshot.transition).toBeGreaterThanOrEqual(0);
    expect(rotatedSnapshot.transition).toBeLessThan(1);

    document.documentElement.dataset.accessibilityPulseScale = '0';
    document.documentElement.dataset.accessibilityFlickerScale = '0';
    const calmMotion = createMultiplayerProjection({
      basePosition: new Vector3(0, 0, 0),
    });
    const calmScreen = calmMotion.group.getObjectByName(
      'MultiplayerProjectionScreen'
    ) as Mesh<MeshBasicMaterial>;
    const calmGlow = calmMotion.group.getObjectByName(
      'MultiplayerProjectionGlow'
    ) as Mesh<MeshBasicMaterial>;
    const calmHalo = calmMotion.group.getObjectByName(
      'MultiplayerProjectionHalo'
    ) as Mesh<MeshBasicMaterial>;
    calmMotion.update({ elapsed: 1.2, delta: 0.016 });
    const calmScreenOpacityFirst = calmScreen.material.opacity;
    const calmGlowOpacityFirst = calmGlow.material.opacity;
    const calmHaloOpacityFirst = calmHalo.material.opacity;

    calmMotion.update({ elapsed: 2.4, delta: 0.016 });
    expect(calmScreen.material.opacity).toBeCloseTo(calmScreenOpacityFirst, 6);
    expect(calmGlow.material.opacity).toBeCloseTo(calmGlowOpacityFirst, 6);
    expect(calmHalo.material.opacity).toBeCloseTo(calmHaloOpacityFirst, 6);
  });
});
