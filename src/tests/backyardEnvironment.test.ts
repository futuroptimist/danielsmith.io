import { Group, Mesh, MeshStandardMaterial } from 'three';
import { beforeEach, describe, expect, it, vi, type SpyInstance } from 'vitest';

import { createBackyardEnvironment } from '../environments/backyard';

const BACKYARD_BOUNDS = {
  minX: -10,
  maxX: 10,
  minZ: 8,
  maxZ: 16,
};

describe('createBackyardEnvironment', () => {
  let randomSpy: SpyInstance<[], number>;
  let getContextSpy: SpyInstance<
    [contextId: string, ...args: unknown[]],
    CanvasRenderingContext2D | null
  >;

  beforeEach(() => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);
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
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            quadraticCurveTo: vi.fn(),
            font: '',
            textAlign: 'left',
            textBaseline: 'alphabetic',
            shadowColor: '',
            shadowBlur: 0,
            globalAlpha: 1,
            fillStyle: '',
          } as unknown as CanvasRenderingContext2D;
        }
        return null;
      });
  });

  afterEach(() => {
    randomSpy.mockRestore();
    getContextSpy.mockRestore();
  });

  it('adds the model rocket installation and collider to the backyard', () => {
    const { group, colliders } = createBackyardEnvironment(BACKYARD_BOUNDS);
    const rocket = group.getObjectByName('BackyardModelRocket');
    expect(rocket).toBeInstanceOf(Group);

    const rocketPosition = (rocket as Group).position.clone();
    const matchingCollider = colliders.find(
      (collider) =>
        rocketPosition.x >= collider.minX &&
        rocketPosition.x <= collider.maxX &&
        rocketPosition.z >= collider.minZ &&
        rocketPosition.z <= collider.maxZ
    );

    expect(matchingCollider).toBeDefined();
    expect(matchingCollider?.maxX).toBeGreaterThan(matchingCollider!.minX);
    expect(matchingCollider?.maxZ).toBeGreaterThan(matchingCollider!.minZ);
  });

  it('installs the greenhouse exhibit with animated elements and collider', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const greenhouse = environment.group.getObjectByName('BackyardGreenhouse');
    expect(greenhouse).toBeInstanceOf(Group);

    const walkway = environment.group.getObjectByName(
      'BackyardGreenhouseWalkway'
    );
    expect(walkway).toBeInstanceOf(Mesh);

    const solarPivot = (greenhouse as Group).getObjectByName(
      'BackyardGreenhouseSolarPanels'
    );
    expect(solarPivot).toBeInstanceOf(Group);
    const initialSolarRotation = (solarPivot as Group).rotation.x;
    environment.update({ elapsed: 1.4, delta: 0.016 });
    expect((solarPivot as Group).rotation.x).not.toBe(initialSolarRotation);

    const growLight = environment.group.getObjectByName(
      'BackyardGreenhouseGrowLight-1'
    );
    expect(growLight).toBeInstanceOf(Mesh);
    const growMaterial = (growLight as Mesh).material as MeshStandardMaterial;
    const baseline = growMaterial.emissiveIntensity;
    environment.update({ elapsed: 2.8, delta: 0.016 });
    expect(growMaterial.emissiveIntensity).not.toBe(baseline);

    const greenhousePosition = (greenhouse as Group).position.clone();
    const greenhouseCollider = environment.colliders.find(
      (collider) =>
        greenhousePosition.x >= collider.minX &&
        greenhousePosition.x <= collider.maxX &&
        greenhousePosition.z >= collider.minZ &&
        greenhousePosition.z <= collider.maxZ
    );

    expect(greenhouseCollider).toBeDefined();
    expect(greenhouseCollider?.maxX).toBeGreaterThan(greenhouseCollider!.minX);
    expect(greenhouseCollider?.maxZ).toBeGreaterThan(greenhouseCollider!.minZ);
  });
});
