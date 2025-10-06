import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  ShaderMaterial,
} from 'three';
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

  it('adds walkway lanterns that glow and pulse along the greenhouse approach', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const lanternGroup = environment.group.getObjectByName(
      'BackyardWalkwayLanterns'
    );
    expect(lanternGroup).toBeInstanceOf(Group);

    const lanternChildren = (lanternGroup as Group).children.filter((child) =>
      child.name.startsWith('BackyardWalkwayLantern-')
    );
    expect(lanternChildren).toHaveLength(6);

    const firstGlass = (lanternGroup as Group).getObjectByName(
      'BackyardWalkwayLanternGlass-0'
    );
    expect(firstGlass).toBeInstanceOf(Mesh);
    const glassMaterial = (firstGlass as Mesh).material as MeshStandardMaterial;
    const baselineEmissive = glassMaterial.emissiveIntensity;

    const firstLight = (lanternGroup as Group).getObjectByName(
      'BackyardWalkwayLanternLight-0'
    );
    expect(firstLight).toBeInstanceOf(PointLight);
    const baselineLightIntensity = (firstLight as PointLight).intensity;

    environment.update({ elapsed: 0.5, delta: 0.016 });
    const midEmissive = glassMaterial.emissiveIntensity;
    const midLightIntensity = (firstLight as PointLight).intensity;

    environment.update({ elapsed: 1.2, delta: 0.016 });

    expect(midEmissive).not.toBe(baselineEmissive);
    expect(glassMaterial.emissiveIntensity).not.toBe(midEmissive);
    expect(midLightIntensity).not.toBe(baselineLightIntensity);
    expect((firstLight as PointLight).intensity).not.toBe(midLightIntensity);
  });

  it('wraps the backyard with a dusk sky dome that subtly shifts over time', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const sky = environment.group.getObjectByName('BackyardSkyDome');
    expect(sky).toBeInstanceOf(Mesh);

    const material = (sky as Mesh).material as ShaderMaterial;
    expect(material).toBeInstanceOf(ShaderMaterial);

    const horizonColor = material.uniforms.horizonColor?.value as
      | Color
      | undefined;
    expect(horizonColor).toBeInstanceOf(Color);

    const beforeHsl = { h: 0, s: 0, l: 0 };
    horizonColor!.getHSL(beforeHsl);

    environment.update({ elapsed: 1.5, delta: 0.016 });
    expect(material.uniforms.time.value).toBeCloseTo(1.5, 5);

    const afterHsl = { h: 0, s: 0, l: 0 };
    horizonColor!.getHSL(afterHsl);
    expect(afterHsl.l).not.toBeCloseTo(beforeHsl.l);

    environment.update({ elapsed: 3.2, delta: 0.016 });
    expect(material.uniforms.time.value).toBeCloseTo(3.2, 5);

    const laterHsl = { h: 0, s: 0, l: 0 };
    horizonColor!.getHSL(laterHsl);
    expect(laterHsl.l).not.toBeCloseTo(afterHsl.l);
  });

  it('exposes ambient audio beds centered on the greenhouse walkway', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    expect(environment.ambientAudioBeds.length).toBeGreaterThan(0);
    const walkwayBed = environment.ambientAudioBeds.find(
      (bed) => bed.id === 'backyard-greenhouse-chimes'
    );
    expect(walkwayBed).toBeDefined();

    const walkway = environment.group.getObjectByName(
      'BackyardGreenhouseWalkway'
    ) as Mesh | null;
    expect(walkway).toBeInstanceOf(Mesh);
    expect(walkwayBed?.center.x).toBeCloseTo(walkway!.position.x, 5);
    expect(walkwayBed?.center.z).toBeCloseTo(walkway!.position.z, 5);
    expect(walkwayBed?.innerRadius).toBeGreaterThan(0);
    expect(walkwayBed?.outerRadius).toBeGreaterThan(
      walkwayBed?.innerRadius ?? 0
    );
    expect(walkwayBed?.baseVolume).toBeGreaterThan(0);
  });
});
