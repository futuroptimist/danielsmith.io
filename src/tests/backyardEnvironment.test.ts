import {
  Color,
  EquirectangularReflectionMapping,
  Group,
  LightProbe,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type SpyInstance,
} from 'vitest';

import { createBackyardEnvironment } from '../scene/environments/backyard';
import type { SeasonalLightingPreset } from '../scene/lighting/seasonalPresets';

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
    RenderingContext | null
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
    delete document.documentElement.dataset.accessibilityPulseScale;
    delete document.documentElement.dataset.accessibilityFlickerScale;
  });

  it('adds the model rocket installation and collider to the backyard', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const { group, colliders } = environment;
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

    const thruster = (rocket as Group).getObjectByName('ModelRocketThruster');
    expect(thruster).toBeInstanceOf(Mesh);
    const thrusterMaterial = (thruster as Mesh)
      .material as MeshStandardMaterial;
    const thrusterBaseline = thrusterMaterial.emissiveIntensity;

    const flame = (rocket as Group).getObjectByName('ModelRocketThrusterFlame');
    expect(flame).toBeInstanceOf(Mesh);
    const flameMaterial = (flame as Mesh).material as MeshBasicMaterial;
    const flameBaseline = flameMaterial.opacity;

    const thrusterLight = (rocket as Group).getObjectByName(
      'ModelRocketThrusterLight'
    );
    expect(thrusterLight).toBeInstanceOf(PointLight);
    const lightBaseline = (thrusterLight as PointLight).intensity;

    const safetyRing = (rocket as Group).getObjectByName(
      'ModelRocketSafetyRing'
    );
    expect(safetyRing).toBeInstanceOf(Mesh);
    const safetyMaterial = (safetyRing as Mesh).material as MeshBasicMaterial;
    const safetyBaseline = safetyMaterial.opacity;

    const countdownPanel = (rocket as Group).getObjectByName(
      'ModelRocketCountdownPanel'
    );
    expect(countdownPanel).toBeInstanceOf(Mesh);
    const countdownMaterial = (countdownPanel as Mesh)
      .material as MeshBasicMaterial;
    const countdownOpacityBaseline = countdownMaterial.opacity;
    const countdownScaleBaseline = (countdownPanel as Mesh).scale.y;

    environment.update({ elapsed: 1.25, delta: 0.016 });

    expect(thrusterMaterial.emissiveIntensity).not.toBeCloseTo(
      thrusterBaseline
    );
    expect(flameMaterial.opacity).not.toBeCloseTo(flameBaseline);
    expect((thrusterLight as PointLight).intensity).not.toBeCloseTo(
      lightBaseline
    );
    expect(safetyMaterial.opacity).not.toBeCloseTo(safetyBaseline);
    expect(countdownMaterial.opacity).not.toBeCloseTo(countdownOpacityBaseline);
    expect((countdownPanel as Mesh).scale.y).not.toBeCloseTo(
      countdownScaleBaseline
    );
  });

  it('installs the greenhouse exhibit with animated elements and collider', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const greenhouse = environment.group.getObjectByName('BackyardGreenhouse');
    expect(greenhouse).toBeInstanceOf(Group);

    const walkway = environment.group.getObjectByName(
      'BackyardGreenhouseWalkway'
    );
    expect(walkway).toBeInstanceOf(Mesh);

    const pondRipple = environment.group.getObjectByName(
      'BackyardGreenhousePondRipple'
    );
    expect(pondRipple).toBeInstanceOf(Mesh);
    expect((pondRipple as Mesh).material).toBeInstanceOf(ShaderMaterial);

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

  it('retints walkway lanterns and preserves seasonal baselines', () => {
    const preset: SeasonalLightingPreset = {
      id: 'aurora-backyard',
      label: 'Aurora Backyard',
      start: { month: 11, day: 1 },
      end: { month: 11, day: 30 },
      tintHex: '#88ccff',
      tintStrength: 0.4,
      emissiveIntensityScale: 1.2,
      fillIntensityScale: 1.3,
      roomOverrides: {
        backyard: {
          tintStrength: 0.7,
          emissiveIntensityScale: 1.5,
          fillIntensityScale: 1.6,
        },
      },
    };

    const environment = createBackyardEnvironment(BACKYARD_BOUNDS, {
      seasonalPreset: preset,
    });
    const lanternGroup = environment.group.getObjectByName(
      'BackyardWalkwayLanterns'
    ) as Group | null;
    expect(lanternGroup).toBeInstanceOf(Group);

    const glass = lanternGroup?.getObjectByName(
      'BackyardWalkwayLanternGlass-0'
    ) as Mesh | null;
    expect(glass).toBeInstanceOf(Mesh);
    const glassMaterial = (glass!.material as MeshStandardMaterial)!;

    const expectedTint = new Color(0xffa445).lerp(new Color('#88ccff'), 0.7);
    expect(glassMaterial.emissive.getHexString()).toBe(
      expectedTint.getHexString()
    );
    const tintedEmissiveBaseline = 1.18 * 1.5;
    expect(glassMaterial.emissiveIntensity).toBeCloseTo(
      tintedEmissiveBaseline,
      5
    );

    const light = lanternGroup?.getObjectByName(
      'BackyardWalkwayLanternLight-0'
    ) as PointLight | null;
    expect(light).toBeInstanceOf(PointLight);
    expect(light!.color.getHexString()).toBe(expectedTint.getHexString());
    const tintedLightBaseline = 0.85 * 1.6;
    expect(light!.intensity).toBeCloseTo(tintedLightBaseline, 5);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    environment.update({ elapsed: 0.8, delta: 0.016 });

    const dampingScale = 0.6; // steadyBase when flicker scale is 0 in lantern animation.
    expect(glassMaterial.emissiveIntensity).toBeCloseTo(
      tintedEmissiveBaseline * dampingScale,
      5
    );
    expect(light!.intensity).toBeCloseTo(
      tintedLightBaseline * dampingScale,
      5
    );
    expect(glassMaterial.emissiveIntensity).toBeGreaterThan(1.18 * dampingScale);
    expect(light!.intensity).toBeGreaterThan(0.85 * dampingScale);
  });

  it('wraps the backyard exhibits with a perimeter fence and matching colliders', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const fenceGroup = environment.group.getObjectByName(
      'BackyardPerimeterFence'
    );
    expect(fenceGroup).toBeInstanceOf(Group);

    const leftRun = (fenceGroup as Group).getObjectByName(
      'BackyardFenceRun-0'
    ) as Group | null;
    expect(leftRun).toBeInstanceOf(Group);

    const leftPosts = (leftRun as Group).children.filter((child) =>
      child.name.startsWith('BackyardFencePost-0-')
    );
    expect(leftPosts.length).toBeGreaterThan(2);

    const firstTopRail = leftRun?.getObjectByName('BackyardFenceRail-Top-0-0');
    expect(firstTopRail).toBeInstanceOf(Mesh);

    const firstMidRail = leftRun?.getObjectByName('BackyardFenceRail-Mid-0-0');
    expect(firstMidRail).toBeInstanceOf(Mesh);

    const topRailMesh = firstTopRail as Mesh;
    const midRailMesh = firstMidRail as Mesh;
    expect(topRailMesh.position.y).toBeGreaterThan(midRailMesh.position.y);
    expect(topRailMesh.scale.x).toBeGreaterThan(1);

    const verticalOrientation = new Vector3(1, 0, 0).applyQuaternion(
      topRailMesh.quaternion
    );
    expect(Math.abs(verticalOrientation.z)).toBeCloseTo(1, 5);

    const backRun = (fenceGroup as Group).getObjectByName(
      'BackyardFenceRun-2'
    ) as Group | null;
    expect(backRun).toBeInstanceOf(Group);

    const backTopRail = backRun?.getObjectByName(
      'BackyardFenceRail-Top-2-0'
    ) as Mesh | null;
    expect(backTopRail).toBeInstanceOf(Mesh);

    const horizontalOrientation = new Vector3(1, 0, 0).applyQuaternion(
      backTopRail!.quaternion
    );
    expect(Math.abs(horizontalOrientation.x)).toBeCloseTo(1, 5);
    expect(Math.abs(horizontalOrientation.z)).toBeLessThan(0.25);

    const postZPositions = leftPosts.map((child) => (child as Mesh).position.z);
    const frontMostPostZ = Math.min(...postZPositions);
    const backMostPostZ = Math.max(...postZPositions);
    const fenceRunX = (leftPosts[0] as Mesh).position.x;

    const leftCollider = environment.colliders.find(
      (collider) =>
        collider.minX <= fenceRunX &&
        collider.maxX >= fenceRunX &&
        collider.minZ <= frontMostPostZ + 0.05 &&
        collider.maxZ >= backMostPostZ - 0.05
    );
    expect(leftCollider).toBeDefined();

    const backCollider = environment.colliders.find(
      (collider) =>
        collider.minZ <= backMostPostZ &&
        collider.maxZ >= backMostPostZ &&
        collider.minX <= backTopRail!.position.x + backTopRail!.scale.x / 2 &&
        collider.maxX >= backTopRail!.position.x - backTopRail!.scale.x / 2
    );
    expect(backCollider).toBeDefined();

    const railMaterial = topRailMesh.material as MeshStandardMaterial;
    expect(railMaterial.envMap).toBeTruthy();
    expect(railMaterial.envMapIntensity).toBeGreaterThan(0);
  });

  it('dampens backyard pulses when the photosensitive safe scale is disabled', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const lanternGroup = environment.group.getObjectByName(
      'BackyardWalkwayLanterns'
    ) as Group | null;
    expect(lanternGroup).toBeInstanceOf(Group);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    const glass = lanternGroup?.getObjectByName(
      'BackyardWalkwayLanternGlass-0'
    ) as Mesh | null;
    expect(glass).toBeInstanceOf(Mesh);
    const glassMaterial = (glass!.material as MeshStandardMaterial)!;

    const light = lanternGroup?.getObjectByName(
      'BackyardWalkwayLanternLight-0'
    ) as PointLight | null;
    expect(light).toBeInstanceOf(PointLight);

    environment.update({ elapsed: 0.6, delta: 0.016 });
    const steadyEmissive = glassMaterial.emissiveIntensity;
    const steadyLight = light!.intensity;

    environment.update({ elapsed: 1.4, delta: 0.016 });
    expect(glassMaterial.emissiveIntensity).toBeCloseTo(steadyEmissive, 5);
    expect(light!.intensity).toBeCloseTo(steadyLight, 5);

    const growLight = environment.group.getObjectByName(
      'BackyardGreenhouseGrowLight-1'
    ) as Mesh | null;
    expect(growLight).toBeInstanceOf(Mesh);
    const growMaterial = (growLight!.material as MeshStandardMaterial)!;

    environment.update({ elapsed: 2.1, delta: 0.016 });
    const steadyGrow = growMaterial.emissiveIntensity;
    environment.update({ elapsed: 3.2, delta: 0.016 });
    expect(growMaterial.emissiveIntensity).toBeCloseTo(steadyGrow, 5);
  });

  it('animates the hologram barrier while respecting accessibility damping', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const barrier = environment.group.getObjectByName(
      'BackyardHologramBarrier'
    ) as Mesh | null;
    expect(barrier).toBeInstanceOf(Mesh);
    const barrierMaterial = (barrier!.material as MeshStandardMaterial)!;

    const signage = environment.group.getObjectByName(
      'BackyardBarrierSignage'
    ) as Mesh | null;
    expect(signage).toBeInstanceOf(Mesh);
    const signageMaterial = (signage!.material as MeshBasicMaterial)!;

    const emitters = environment.group.getObjectByName(
      'BackyardBarrierEmitters'
    ) as Points | null;
    expect(emitters).toBeInstanceOf(Points);
    const emitterMaterial = (emitters!.material as PointsMaterial)!;

    const baseBarrier = barrierMaterial.emissiveIntensity;
    const baseSignageOpacity = signageMaterial.opacity;
    const baseEmitterOpacity = emitterMaterial.opacity;
    const baseEmitterSize = emitterMaterial.size;

    environment.update({ elapsed: 0.6, delta: 0.016 });
    expect(barrierMaterial.emissiveIntensity).not.toBeCloseTo(baseBarrier, 5);
    expect(signageMaterial.opacity).not.toBeCloseTo(baseSignageOpacity, 5);
    expect(emitterMaterial.opacity).not.toBeCloseTo(baseEmitterOpacity, 5);
    expect(emitterMaterial.size).not.toBeCloseTo(baseEmitterSize, 5);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';
    barrierMaterial.emissiveIntensity = baseBarrier;
    signageMaterial.opacity = baseSignageOpacity;
    emitterMaterial.opacity = baseEmitterOpacity;
    emitterMaterial.size = baseEmitterSize;

    environment.update({ elapsed: 1.6, delta: 0.016 });
    expect(barrierMaterial.emissiveIntensity).toBeCloseTo(baseBarrier, 5);
    expect(signageMaterial.opacity).toBeCloseTo(baseSignageOpacity, 5);
    expect(emitterMaterial.opacity).toBeCloseTo(baseEmitterOpacity, 5);
    expect(emitterMaterial.size).toBeCloseTo(baseEmitterSize, 5);
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

  it('layers dusk reflections and a light probe across the backyard materials', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const walkway = environment.group.getObjectByName(
      'BackyardGreenhouseWalkway'
    ) as Mesh | null;
    expect(walkway).toBeInstanceOf(Mesh);
    const walkwayMaterial = (walkway as Mesh).material as MeshStandardMaterial;
    const envMap = walkwayMaterial.envMap as Texture | null;
    expect(envMap).toBeTruthy();
    expect(envMap?.mapping).toBe(EquirectangularReflectionMapping);
    expect(envMap?.colorSpace).toBe(SRGBColorSpace);
    expect(walkwayMaterial.envMapIntensity).toBeGreaterThan(0);

    const lightProbe = environment.group.getObjectByName(
      'BackyardDuskLightProbe'
    );
    expect(lightProbe).toBeInstanceOf(LightProbe);
    expect((lightProbe as LightProbe).intensity).toBeGreaterThan(0.1);
  });
});
