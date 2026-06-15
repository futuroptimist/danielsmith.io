import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
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

function clonePositions(attribute: BufferAttribute): Float32Array {
  return new Float32Array(attribute.array as Float32Array);
}

function averageDisplacement(
  attribute: BufferAttribute,
  base: Float32Array
): number {
  const positions = attribute.array as Float32Array;
  let total = 0;
  for (let index = 0; index < attribute.count; index += 1) {
    const baseIndex = index * 3;
    const dx = positions[baseIndex] - base[baseIndex];
    const dy = positions[baseIndex + 1] - base[baseIndex + 1];
    const dz = positions[baseIndex + 2] - base[baseIndex + 2];
    total += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return total / attribute.count;
}

function areColorsRoughlyEqual(a: Color, b: Color, epsilon = 1e-3): boolean {
  return (
    Math.abs(a.r - b.r) <= epsilon &&
    Math.abs(a.g - b.g) <= epsilon &&
    Math.abs(a.b - b.b) <= epsilon
  );
}

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
            fill: vi.fn(),
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
    const rippleMaterial = (pondRipple as Mesh).material as ShaderMaterial;
    const baseAmplitude = rippleMaterial.uniforms.amplitude.value as number;
    const baseSparkle = rippleMaterial.uniforms.sparkle.value as number;

    const pondPlinth = environment.group.getObjectByName(
      'BackyardGreenhousePondPlinth'
    );
    expect(pondPlinth).toBeInstanceOf(Mesh);
    const pond = environment.group.getObjectByName('BackyardGreenhousePond');
    expect(pond).toBeInstanceOf(Mesh);
    const pondGeometry = (pond as Mesh).geometry as CylinderGeometry;
    const plinthGeometry = (pondPlinth as Mesh).geometry as CylinderGeometry;
    expect(plinthGeometry.parameters.radiusTop).toBeGreaterThan(
      pondGeometry.parameters.radiusTop
    );
    expect(plinthGeometry.parameters.height).toBeGreaterThan(0);

    const solarPivot = (greenhouse as Group).getObjectByName(
      'BackyardGreenhouseSolarPanels'
    );
    expect(solarPivot).toBeInstanceOf(Group);
    const initialSolarRotation = (solarPivot as Group).rotation.x;
    environment.update({ elapsed: 1.4, delta: 0.016 });
    expect((solarPivot as Group).rotation.x).not.toBe(initialSolarRotation);

    const livelyAmplitude = rippleMaterial.uniforms.amplitude.value as number;
    const livelySparkle = rippleMaterial.uniforms.sparkle.value as number;
    expect(livelyAmplitude).toBeGreaterThan(baseAmplitude);
    expect(livelySparkle).toBeGreaterThan(baseSparkle);

    const growLight = environment.group.getObjectByName(
      'BackyardGreenhouseGrowLight-1'
    );
    expect(growLight).toBeInstanceOf(Mesh);
    const growMaterial = (growLight as Mesh).material as MeshStandardMaterial;
    const baseline = growMaterial.emissiveIntensity;
    environment.update({ elapsed: 2.8, delta: 0.016 });
    expect(growMaterial.emissiveIntensity).not.toBe(baseline);

    document.documentElement.dataset.accessibilityPulseScale = '0';
    document.documentElement.dataset.accessibilityFlickerScale = '0';
    environment.update({ elapsed: 4.8, delta: 0.016 });

    const calmAmplitude = rippleMaterial.uniforms.amplitude.value as number;
    const calmSparkle = rippleMaterial.uniforms.sparkle.value as number;
    const calmFactor = rippleMaterial.uniforms.calm.value as number;
    expect(calmAmplitude).toBeGreaterThan(0);
    expect(calmAmplitude).toBeLessThan(livelyAmplitude);
    expect(calmSparkle).toBeLessThan(livelySparkle);
    expect(calmFactor).toBeGreaterThan(0);
    expect(calmFactor).toBeLessThan(1);

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
    document.documentElement.dataset.accessibilityPulseScale = '1';
    document.documentElement.dataset.accessibilityFlickerScale = '1';
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
    const firstGlassMaterial = (firstGlass as Mesh)
      .material as MeshStandardMaterial;
    const baseFirstColor = firstGlassMaterial.emissive.clone();

    const firstLight = (lanternGroup as Group).getObjectByName(
      'BackyardWalkwayLanternLight-0'
    );
    expect(firstLight).toBeInstanceOf(PointLight);
    const baselineLightIntensity = (firstLight as PointLight).intensity;

    const oppositeGlass = (lanternGroup as Group).getObjectByName(
      'BackyardWalkwayLanternGlass-5'
    );
    expect(oppositeGlass).toBeInstanceOf(Mesh);
    const oppositeMaterial = (oppositeGlass as Mesh)
      .material as MeshStandardMaterial;
    const baseOppositeColor = oppositeMaterial.emissive.clone();

    environment.update({ elapsed: 0.6, delta: 0.016 });
    const firstColorAfterFirstUpdate = firstGlassMaterial.emissive.clone();
    const oppositeColorAfterFirstUpdate = oppositeMaterial.emissive.clone();
    const intensityAfterFirstUpdate = (firstLight as PointLight).intensity;

    expect(
      areColorsRoughlyEqual(firstColorAfterFirstUpdate, baseFirstColor)
    ).toBe(false);
    expect(
      areColorsRoughlyEqual(
        firstColorAfterFirstUpdate,
        oppositeColorAfterFirstUpdate
      )
    ).toBe(false);
    expect(intensityAfterFirstUpdate).not.toBeCloseTo(
      baselineLightIntensity,
      5
    );

    environment.update({ elapsed: 1.6, delta: 0.016 });

    expect((firstLight as PointLight).intensity).not.toBeCloseTo(
      intensityAfterFirstUpdate,
      5
    );

    document.documentElement.dataset.accessibilityPulseScale = '0';
    document.documentElement.dataset.accessibilityFlickerScale = '0';
    environment.update({ elapsed: 2.4, delta: 0.016 });

    expect(
      areColorsRoughlyEqual(firstGlassMaterial.emissive, baseFirstColor, 1e-4)
    ).toBe(true);
    expect(
      areColorsRoughlyEqual(oppositeMaterial.emissive, baseOppositeColor, 1e-4)
    ).toBe(true);
  });

  it('adds walkway lantern halos that ripple toward the greenhouse with accessibility damping', () => {
    document.documentElement.dataset.accessibilityPulseScale = '1';
    document.documentElement.dataset.accessibilityFlickerScale = '1';
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const lanternGroup = environment.group.getObjectByName(
      'BackyardWalkwayLanterns'
    );
    expect(lanternGroup).toBeInstanceOf(Group);

    const halo = (lanternGroup as Group).getObjectByName(
      'BackyardWalkwayLanternHalo-0'
    );
    expect(halo).toBeInstanceOf(Mesh);
    const haloMesh = halo as Mesh;
    const haloMaterial = haloMesh.material as MeshBasicMaterial;
    const baseHaloOpacity = haloMaterial.opacity;
    const baseHaloScale = haloMesh.scale.x;

    const glass = (lanternGroup as Group).getObjectByName(
      'BackyardWalkwayLanternGlass-0'
    );
    expect(glass).toBeInstanceOf(Mesh);
    const glassMaterial = (glass as Mesh).material as MeshStandardMaterial;

    environment.update({ elapsed: 0.8, delta: 0.016 });

    expect(haloMaterial.opacity).not.toBeCloseTo(baseHaloOpacity, 5);
    expect(haloMesh.scale.x).not.toBeCloseTo(baseHaloScale, 4);
    expect(
      areColorsRoughlyEqual(haloMaterial.color, glassMaterial.emissive, 1e-4)
    ).toBe(true);

    document.documentElement.dataset.accessibilityPulseScale = '0';
    document.documentElement.dataset.accessibilityFlickerScale = '0';
    environment.update({ elapsed: 1.6, delta: 0.016 });

    expect(haloMaterial.opacity).toBeCloseTo(baseHaloOpacity, 3);
    expect(haloMesh.scale.x).toBeCloseTo(baseHaloScale, 3);
  });

  it('adds walkway guides that pulse with seasonal-aware damping', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const guidesGroup = environment.group.getObjectByName(
      'BackyardWalkwayGuides'
    );
    expect(guidesGroup).toBeInstanceOf(Group);

    const guides = (guidesGroup as Group).children.filter((child) =>
      child.name.startsWith('BackyardWalkwayGuide-')
    );
    expect(guides.length).toBeGreaterThan(0);
    expect(guides.length % 2).toBe(0);

    const firstGuide = guides[0] as Mesh | undefined;
    expect(firstGuide).toBeInstanceOf(Mesh);
    const guideMaterial = (firstGuide!.material as MeshStandardMaterial)!;
    const baseEmissive = guideMaterial.emissiveIntensity;
    const baseOpacity = guideMaterial.opacity ?? 1;

    environment.update({ elapsed: 0.9, delta: 0.016 });

    expect(guideMaterial.emissiveIntensity).not.toBeCloseTo(baseEmissive, 5);
    expect(guideMaterial.opacity).not.toBeCloseTo(baseOpacity, 5);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    guideMaterial.emissiveIntensity = baseEmissive;
    guideMaterial.opacity = baseOpacity;

    environment.update({ elapsed: 1.6, delta: 0.016 });

    expect(guideMaterial.emissiveIntensity).toBeCloseTo(baseEmissive * 0.55, 5);
    expect(guideMaterial.opacity).toBeCloseTo(baseOpacity * 0.55, 5);
  });

  it('installs the multiplayer projection marquee with animated telemetry', () => {
    document.documentElement.dataset.accessibilityPulseScale = '1';
    document.documentElement.dataset.accessibilityFlickerScale = '1';
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const projectionGroup = environment.group.getObjectByName(
      'BackyardMultiplayerProjection'
    );
    expect(projectionGroup).toBeInstanceOf(Group);

    const screen = projectionGroup?.getObjectByName(
      'MultiplayerProjectionScreen'
    ) as Mesh<MeshBasicMaterial> | null;
    const glow = projectionGroup?.getObjectByName(
      'MultiplayerProjectionGlow'
    ) as Mesh<MeshBasicMaterial> | null;
    const halo = projectionGroup?.getObjectByName(
      'MultiplayerProjectionHalo'
    ) as Mesh<MeshBasicMaterial> | null;

    expect(screen).toBeInstanceOf(Mesh);
    expect(glow).toBeInstanceOf(Mesh);
    expect(halo).toBeInstanceOf(Mesh);

    const screenMaterial = (screen!.material as MeshBasicMaterial)!;
    const glowMaterial = (glow!.material as MeshBasicMaterial)!;
    const haloMaterial = (halo!.material as MeshBasicMaterial)!;

    const baselineScreenOpacity = screenMaterial.opacity;
    const baselineGlowOpacity = glowMaterial.opacity;
    const baselineHaloOpacity = haloMaterial.opacity;

    environment.update({ elapsed: 0.6, delta: 0.016 });
    const midScreenOpacity = screenMaterial.opacity;
    const midGlowOpacity = glowMaterial.opacity;
    const midHaloOpacity = haloMaterial.opacity;

    expect(midScreenOpacity).not.toBeCloseTo(baselineScreenOpacity, 5);
    expect(midGlowOpacity).not.toBeCloseTo(baselineGlowOpacity, 5);
    expect(midHaloOpacity).not.toBeCloseTo(baselineHaloOpacity, 5);

    environment.update({ elapsed: 8.6, delta: 0.016 });
    expect(screenMaterial.opacity).not.toBeCloseTo(midScreenOpacity, 5);
    expect(glowMaterial.opacity).not.toBeCloseTo(midGlowOpacity, 5);
    expect(haloMaterial.opacity).not.toBeCloseTo(midHaloOpacity, 5);

    const projectionPosition = projectionGroup!.position.clone();
    const collider = environment.colliders.find(
      (candidate) =>
        projectionPosition.x >= candidate.minX &&
        projectionPosition.x <= candidate.maxX &&
        projectionPosition.z >= candidate.minZ &&
        projectionPosition.z <= candidate.maxZ
    );

    expect(collider).toBeDefined();
    expect(collider?.maxX).toBeGreaterThan(collider!.minX);
    expect(collider?.maxZ).toBeGreaterThan(collider!.minZ);
  });

  it('adds fiber optic walkway segments that sweep toward the greenhouse', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const fiberGroup = environment.group.getObjectByName(
      'BackyardWalkwayFiberGuides'
    );
    expect(fiberGroup).toBeInstanceOf(Group);

    const segments = (fiberGroup as Group).children.filter((child) =>
      child.name.startsWith('BackyardWalkwayFiberSegment-')
    );
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.length % 2).toBe(0);

    const firstSegment = segments[0] as Mesh | undefined;
    expect(firstSegment).toBeInstanceOf(Mesh);
    const material = (firstSegment!.material as MeshStandardMaterial)!;
    const baseEmissive = material.emissiveIntensity;
    const baseOpacity = material.opacity ?? 1;

    environment.update({ elapsed: 0.6, delta: 0.016 });
    expect(material.emissiveIntensity).not.toBeCloseTo(baseEmissive, 5);
    expect(material.opacity).not.toBeCloseTo(baseOpacity, 5);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    material.emissiveIntensity = baseEmissive;
    material.opacity = baseOpacity;

    environment.update({ elapsed: 1.3, delta: 0.016 });

    expect(material.emissiveIntensity).toBeCloseTo(baseEmissive * 0.45, 5);
    expect(material.opacity).toBeCloseTo(baseOpacity * 0.45, 5);
  });

  it('adds drifting walkway motes that respond to accessibility damping', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const motes = environment.group.getObjectByName('BackyardWalkwayMotes');
    expect(motes).toBeInstanceOf(Points);

    const geometry = (motes as Points).geometry;
    expect(geometry).toBeDefined();
    const positions = (geometry as BufferGeometry).getAttribute(
      'position'
    ) as BufferAttribute;
    const baseX = positions.getX(0);
    const baseY = positions.getY(0);
    const baseZ = positions.getZ(0);
    const material = (motes as Points).material as PointsMaterial;
    const baseOpacity = material.opacity;
    const baseSize = material.size;

    environment.update({ elapsed: 1.4, delta: 0.016 });

    expect(positions.getX(0)).not.toBeCloseTo(baseX, 5);
    expect(positions.getY(0)).not.toBeCloseTo(baseY, 5);
    expect(positions.getZ(0)).not.toBeCloseTo(baseZ, 5);
    expect(material.opacity).not.toBeCloseTo(baseOpacity, 5);
    expect(material.size).not.toBeCloseTo(baseSize, 5);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    material.opacity = baseOpacity;
    material.size = baseSize;
    positions.setXYZ(0, baseX, baseY, baseZ);

    environment.update({ elapsed: 2.1, delta: 0.016 });

    const dampedDeltaX = Math.abs(positions.getX(0) - baseX);
    const dampedDeltaY = Math.abs(positions.getY(0) - baseY);
    const dampedDeltaZ = Math.abs(positions.getZ(0) - baseZ);

    expect(material.opacity).toBeCloseTo(baseOpacity * 0.62, 5);
    expect(material.size).toBeCloseTo(baseSize * 0.84, 5);
    expect(dampedDeltaX).toBeLessThan(0.12);
    expect(dampedDeltaY).toBeLessThan(0.05);
    expect(dampedDeltaZ).toBeLessThan(0.12);
  });

  it('adds elevated pollen motes that swirl with calm-mode damping', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const pollen = environment.group.getObjectByName('BackyardPollenMotes');
    expect(pollen).toBeInstanceOf(Points);

    const geometry = (pollen as Points).geometry as BufferGeometry;
    const positions = geometry.getAttribute('position') as BufferAttribute;
    const baseX = positions.getX(0);
    const baseY = positions.getY(0);
    const baseZ = positions.getZ(0);
    const material = (pollen as Points).material as PointsMaterial;
    const baseOpacity = material.opacity;
    const baseSize = material.size;

    environment.update({ elapsed: 0.9, delta: 0.016 });

    const animatedX = positions.getX(0);
    const animatedY = positions.getY(0);
    const animatedZ = positions.getZ(0);
    expect(animatedX).not.toBeCloseTo(baseX, 5);
    expect(animatedY).not.toBeCloseTo(baseY, 5);
    expect(animatedZ).not.toBeCloseTo(baseZ, 5);
    expect(material.opacity).not.toBeCloseTo(baseOpacity, 5);
    expect(material.size).not.toBeCloseTo(baseSize, 5);

    const animatedDelta =
      Math.abs(animatedX - baseX) +
      Math.abs(animatedY - baseY) +
      Math.abs(animatedZ - baseZ);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    material.opacity = baseOpacity;
    material.size = baseSize;
    positions.setXYZ(0, baseX, baseY, baseZ);

    environment.update({ elapsed: 1.8, delta: 0.016 });

    const dampedX = positions.getX(0);
    const dampedY = positions.getY(0);
    const dampedZ = positions.getZ(0);
    const dampedDelta =
      Math.abs(dampedX - baseX) +
      Math.abs(dampedY - baseY) +
      Math.abs(dampedZ - baseZ);

    expect(dampedDelta).toBeGreaterThan(0);
    expect(dampedDelta).toBeLessThan(animatedDelta);
    expect(material.opacity).toBeCloseTo(baseOpacity * 0.6, 5);
    expect(material.size).toBeCloseTo(baseSize * 0.8, 5);
  });

  it('retints walkway motes when seasonal presets provide backyard tints', () => {
    const baseline = createBackyardEnvironment(BACKYARD_BOUNDS);
    const baselineMotes = baseline.group.getObjectByName(
      'BackyardWalkwayMotes'
    );
    expect(baselineMotes).toBeInstanceOf(Points);
    const baselineMaterial = (baselineMotes as Points)
      .material as PointsMaterial;
    const baseColor = baselineMaterial.color.clone();
    const baselinePollen = baseline.group.getObjectByName(
      'BackyardPollenMotes'
    );
    expect(baselinePollen).toBeInstanceOf(Points);
    const baselinePollenMaterial = (baselinePollen as Points)
      .material as PointsMaterial;
    const basePollenColor = baselinePollenMaterial.color.clone();
    const baselineArrowGroup = baseline.group.getObjectByName(
      'BackyardWalkwayArrows'
    );
    expect(baselineArrowGroup).toBeInstanceOf(Group);
    const baselineArrow = (baselineArrowGroup as Group).children.find((child) =>
      child.name.startsWith('BackyardWalkwayArrow-')
    ) as Mesh | undefined;
    expect(baselineArrow).toBeInstanceOf(Mesh);
    const baselineArrowMaterial = (baselineArrow!
      .material as MeshBasicMaterial)!;
    const baseArrowColor = baselineArrowMaterial.color.clone();

    const preset: SeasonalLightingPreset = {
      id: 'backyard-festival',
      label: 'Backyard Festival',
      start: { month: 6, day: 1 },
      end: { month: 6, day: 30 },
      tintHex: '#86c5ff',
      tintStrength: 0.4,
      roomOverrides: {
        backyard: {
          tintHex: '#ff88cc',
          tintStrength: 0.65,
        },
      },
    };

    const environment = createBackyardEnvironment(BACKYARD_BOUNDS, {
      seasonalPreset: preset,
    });
    const motes = environment.group.getObjectByName('BackyardWalkwayMotes');
    expect(motes).toBeInstanceOf(Points);
    const material = (motes as Points).material as PointsMaterial;

    const expectedTint = baseColor.clone().lerp(new Color('#ff88cc'), 0.65);
    expect(material.color.r).toBeCloseTo(expectedTint.r, 5);
    expect(material.color.g).toBeCloseTo(expectedTint.g, 5);
    expect(material.color.b).toBeCloseTo(expectedTint.b, 5);

    const arrowGroup = environment.group.getObjectByName(
      'BackyardWalkwayArrows'
    );
    expect(arrowGroup).toBeInstanceOf(Group);
    const tintedArrow = (arrowGroup as Group).children.find((child) =>
      child.name.startsWith('BackyardWalkwayArrow-')
    ) as Mesh | undefined;
    expect(tintedArrow).toBeInstanceOf(Mesh);
    const tintedArrowMaterial = (tintedArrow!.material as MeshBasicMaterial)!;
    const expectedArrowTint = baseArrowColor
      .clone()
      .lerp(new Color('#ff88cc'), 0.65);
    expect(tintedArrowMaterial.color.r).toBeCloseTo(expectedArrowTint.r, 5);
    expect(tintedArrowMaterial.color.g).toBeCloseTo(expectedArrowTint.g, 5);
    expect(tintedArrowMaterial.color.b).toBeCloseTo(expectedArrowTint.b, 5);

    const pollen = environment.group.getObjectByName('BackyardPollenMotes');
    expect(pollen).toBeInstanceOf(Points);
    const pollenMaterial = (pollen as Points).material as PointsMaterial;
    const expectedPollenTint = basePollenColor
      .clone()
      .lerp(new Color('#ff88cc'), 0.65);
    expect(pollenMaterial.color.r).toBeCloseTo(expectedPollenTint.r, 5);
    expect(pollenMaterial.color.g).toBeCloseTo(expectedPollenTint.g, 5);
    expect(pollenMaterial.color.b).toBeCloseTo(expectedPollenTint.b, 5);

    environment.applySeasonalPreset(null);
    expect(material.color.r).toBeCloseTo(baseColor.r, 5);
    expect(material.color.g).toBeCloseTo(baseColor.g, 5);
    expect(material.color.b).toBeCloseTo(baseColor.b, 5);
    expect(pollenMaterial.color.r).toBeCloseTo(basePollenColor.r, 5);
    expect(pollenMaterial.color.g).toBeCloseTo(basePollenColor.g, 5);
    expect(pollenMaterial.color.b).toBeCloseTo(basePollenColor.b, 5);
    expect(tintedArrowMaterial.color.r).toBeCloseTo(baseArrowColor.r, 5);
    expect(tintedArrowMaterial.color.g).toBeCloseTo(baseArrowColor.g, 5);
    expect(tintedArrowMaterial.color.b).toBeCloseTo(baseArrowColor.b, 5);

    const zeroStrengthPreset: SeasonalLightingPreset = {
      ...preset,
      tintHex: '#223344',
      tintStrength: Number.NaN,
      roomOverrides: {
        backyard: { tintStrength: 0 },
      },
    };
    environment.applySeasonalPreset(zeroStrengthPreset);
    expect(material.color.r).toBeCloseTo(baseColor.r, 5);
    expect(material.color.g).toBeCloseTo(baseColor.g, 5);
    expect(material.color.b).toBeCloseTo(baseColor.b, 5);
    expect(pollenMaterial.color.r).toBeCloseTo(basePollenColor.r, 5);
    expect(pollenMaterial.color.g).toBeCloseTo(basePollenColor.g, 5);
    expect(pollenMaterial.color.b).toBeCloseTo(basePollenColor.b, 5);
    expect(tintedArrowMaterial.color.r).toBeCloseTo(baseArrowColor.r, 5);
    expect(tintedArrowMaterial.color.g).toBeCloseTo(baseArrowColor.g, 5);
    expect(tintedArrowMaterial.color.b).toBeCloseTo(baseArrowColor.b, 5);

    const invalidTintPreset: SeasonalLightingPreset = {
      ...preset,
      tintHex: 'zzzzzz',
      tintStrength: 0.5,
      roomOverrides: {},
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    environment.applySeasonalPreset(invalidTintPreset);
    warnSpy.mockRestore();
    expect(material.color.r).toBeCloseTo(baseColor.r, 5);
    expect(material.color.g).toBeCloseTo(baseColor.g, 5);
    expect(material.color.b).toBeCloseTo(baseColor.b, 5);
    expect(pollenMaterial.color.r).toBeCloseTo(basePollenColor.r, 5);
    expect(pollenMaterial.color.g).toBeCloseTo(basePollenColor.g, 5);
    expect(pollenMaterial.color.b).toBeCloseTo(basePollenColor.b, 5);

    environment.applySeasonalPreset(preset);
    expect(material.color.r).toBeCloseTo(expectedTint.r, 5);
    expect(material.color.g).toBeCloseTo(expectedTint.g, 5);
    expect(material.color.b).toBeCloseTo(expectedTint.b, 5);
    expect(pollenMaterial.color.r).toBeCloseTo(expectedPollenTint.r, 5);
    expect(pollenMaterial.color.g).toBeCloseTo(expectedPollenTint.g, 5);
    expect(pollenMaterial.color.b).toBeCloseTo(expectedPollenTint.b, 5);
    expect(tintedArrowMaterial.color.r).toBeCloseTo(expectedArrowTint.r, 5);
    expect(tintedArrowMaterial.color.g).toBeCloseTo(expectedArrowTint.g, 5);
    expect(tintedArrowMaterial.color.b).toBeCloseTo(expectedArrowTint.b, 5);

    const highStrengthPreset: SeasonalLightingPreset = {
      ...preset,
      tintHex: '#ff88cc',
      tintStrength: 1.5,
      roomOverrides: {},
    };
    environment.applySeasonalPreset(highStrengthPreset);
    const saturatedTint = baseColor.clone().lerp(new Color('#ff88cc'), 1);
    expect(material.color.r).toBeCloseTo(saturatedTint.r, 5);
    expect(material.color.g).toBeCloseTo(saturatedTint.g, 5);
    expect(material.color.b).toBeCloseTo(saturatedTint.b, 5);
    const saturatedPollenTint = basePollenColor
      .clone()
      .lerp(new Color('#ff88cc'), 1);
    expect(pollenMaterial.color.r).toBeCloseTo(saturatedPollenTint.r, 5);
    expect(pollenMaterial.color.g).toBeCloseTo(saturatedPollenTint.g, 5);
    expect(pollenMaterial.color.b).toBeCloseTo(saturatedPollenTint.b, 5);
    const saturatedArrowTint = baseArrowColor
      .clone()
      .lerp(new Color('#ff88cc'), 1);
    expect(tintedArrowMaterial.color.r).toBeCloseTo(saturatedArrowTint.r, 5);
    expect(tintedArrowMaterial.color.g).toBeCloseTo(saturatedArrowTint.g, 5);
    expect(tintedArrowMaterial.color.b).toBeCloseTo(saturatedArrowTint.b, 5);
  });

  it('retints firefly swarms with seasonal backyard palettes', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const fireflies = environment.group.getObjectByName('BackyardFireflies');
    expect(fireflies).toBeInstanceOf(Points);
    const fireflyMaterial = (fireflies as Points).material as PointsMaterial;
    const baseFireflyColor = fireflyMaterial.color.clone();

    const preset: SeasonalLightingPreset = {
      id: 'firefly-spring-wave',
      label: 'Firefly Spring Wave',
      start: { month: 4, day: 1 },
      end: { month: 4, day: 30 },
      tintHex: '#88ccff',
      tintStrength: 0.4,
      roomOverrides: {
        backyard: {
          tintHex: '#88ccff',
          tintStrength: 0.65,
        },
      },
    };

    environment.applySeasonalPreset(preset);
    const expectedTint = baseFireflyColor
      .clone()
      .lerp(new Color('#88ccff'), 0.65);
    expect(fireflyMaterial.color.r).toBeCloseTo(expectedTint.r, 5);
    expect(fireflyMaterial.color.g).toBeCloseTo(expectedTint.g, 5);
    expect(fireflyMaterial.color.b).toBeCloseTo(expectedTint.b, 5);

    environment.applySeasonalPreset(null);
    expect(fireflyMaterial.color.r).toBeCloseTo(baseFireflyColor.r, 5);
    expect(fireflyMaterial.color.g).toBeCloseTo(baseFireflyColor.g, 5);
    expect(fireflyMaterial.color.b).toBeCloseTo(baseFireflyColor.b, 5);
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
    expect(light!.intensity).toBeCloseTo(tintedLightBaseline * dampingScale, 5);
    expect(glassMaterial.emissiveIntensity).toBeGreaterThan(
      1.18 * dampingScale
    );
    expect(light!.intensity).toBeGreaterThan(0.85 * dampingScale);
  });

  it('reapplies seasonal presets to walkway lanterns on demand', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const lanternGroup = environment.group.getObjectByName(
      'BackyardWalkwayLanterns'
    ) as Group | null;
    expect(lanternGroup).toBeInstanceOf(Group);

    const glass = lanternGroup?.getObjectByName(
      'BackyardWalkwayLanternGlass-0'
    ) as Mesh | null;
    expect(glass).toBeInstanceOf(Mesh);
    const glassMaterial = (glass!.material as MeshStandardMaterial)!;

    const light = lanternGroup?.getObjectByName(
      'BackyardWalkwayLanternLight-0'
    ) as PointLight | null;
    expect(light).toBeInstanceOf(PointLight);

    const baseEmissiveColor = new Color(0xffa445);
    expect(glassMaterial.emissive.getHexString()).toBe(
      baseEmissiveColor.getHexString()
    );
    expect(glassMaterial.emissiveIntensity).toBeCloseTo(1.18, 5);
    expect(light!.color.getHexString()).toBe(baseEmissiveColor.getHexString());
    expect(light!.intensity).toBeCloseTo(0.85, 5);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    const winterPreset: SeasonalLightingPreset = {
      id: 'winter-dusk',
      label: 'Winter Dusk',
      start: { month: 12, day: 1 },
      end: { month: 12, day: 31 },
      tintHex: '#7fc2ff',
      tintStrength: 0.5,
      emissiveIntensityScale: 1.25,
      fillIntensityScale: 1.15,
      roomOverrides: {
        backyard: {
          tintStrength: 0.6,
          emissiveIntensityScale: 1.4,
          fillIntensityScale: 1.35,
        },
      },
    };

    environment.applySeasonalPreset(winterPreset);

    const winterTint = baseEmissiveColor
      .clone()
      .lerp(new Color('#7fc2ff'), 0.6);
    const winterEmissiveBaseline = 1.18 * 1.4;
    const winterLightBaseline = 0.85 * 1.35;

    expect(glassMaterial.emissive.getHexString()).toBe(
      winterTint.getHexString()
    );
    expect(glassMaterial.emissiveIntensity).toBeCloseTo(
      winterEmissiveBaseline,
      5
    );
    expect(light!.color.getHexString()).toBe(winterTint.getHexString());
    expect(light!.intensity).toBeCloseTo(winterLightBaseline, 5);

    environment.update({ elapsed: 0.75, delta: 0.016 });

    const dampingScale = 0.6;
    expect(glassMaterial.emissiveIntensity).toBeCloseTo(
      winterEmissiveBaseline * dampingScale,
      5
    );
    expect(light!.intensity).toBeCloseTo(winterLightBaseline * dampingScale, 5);

    environment.applySeasonalPreset(null);

    expect(glassMaterial.emissive.getHexString()).toBe(
      baseEmissiveColor.getHexString()
    );
    expect(glassMaterial.emissiveIntensity).toBeCloseTo(1.18, 5);
    expect(light!.color.getHexString()).toBe(baseEmissiveColor.getHexString());
    expect(light!.intensity).toBeCloseTo(0.85, 5);

    environment.update({ elapsed: 1.1, delta: 0.016 });

    expect(glassMaterial.emissiveIntensity).toBeCloseTo(1.18 * dampingScale, 5);
    expect(light!.intensity).toBeCloseTo(0.85 * dampingScale, 5);

    const springPreset: SeasonalLightingPreset = {
      id: 'spring-horizon',
      label: 'Spring Horizon',
      start: { month: 3, day: 10 },
      end: { month: 4, day: 30 },
      tintHex: '#ffeab0',
      tintStrength: 0.4,
      emissiveIntensityScale: 0.95,
      fillIntensityScale: 0.9,
      roomOverrides: {
        backyard: {
          tintHex: '#ffd1eb',
          tintStrength: 0.55,
          emissiveIntensityScale: 1.1,
          fillIntensityScale: 1.05,
        },
      },
    };

    environment.applySeasonalPreset(springPreset);

    const springTint = baseEmissiveColor
      .clone()
      .lerp(new Color('#ffd1eb'), 0.55);
    const springEmissiveBaseline = 1.18 * 1.1;
    const springLightBaseline = 0.85 * 1.05;

    expect(glassMaterial.emissive.getHexString()).toBe(
      springTint.getHexString()
    );
    expect(glassMaterial.emissiveIntensity).toBeCloseTo(
      springEmissiveBaseline,
      5
    );
    expect(light!.color.getHexString()).toBe(springTint.getHexString());
    expect(light!.intensity).toBeCloseTo(springLightBaseline, 5);

    environment.update({ elapsed: 1.8, delta: 0.016 });

    expect(glassMaterial.emissiveIntensity).toBeCloseTo(
      springEmissiveBaseline * dampingScale,
      5
    );
    expect(light!.intensity).toBeCloseTo(springLightBaseline * dampingScale, 5);
  });

  it('reapplies seasonal presets to walkway guides and restores baselines', () => {
    const preset: SeasonalLightingPreset = {
      id: 'aurora-backyard-guides',
      label: 'Aurora Backyard Guides',
      start: { month: 10, day: 1 },
      end: { month: 10, day: 31 },
      tintHex: '#88ccff',
      tintStrength: 0.4,
      emissiveIntensityScale: 1.2,
      fillIntensityScale: 1.1,
      roomOverrides: {
        backyard: {
          tintStrength: 0.7,
          emissiveIntensityScale: 1.5,
        },
      },
    };

    const environment = createBackyardEnvironment(BACKYARD_BOUNDS, {
      seasonalPreset: preset,
    });
    const guidesGroup = environment.group.getObjectByName(
      'BackyardWalkwayGuides'
    ) as Group | null;
    expect(guidesGroup).toBeInstanceOf(Group);

    const firstGuide = guidesGroup?.children.find((child) =>
      child.name.startsWith('BackyardWalkwayGuide-')
    ) as Mesh | undefined;
    expect(firstGuide).toBeInstanceOf(Mesh);
    const guideMaterial = (firstGuide!.material as MeshStandardMaterial)!;

    const baseColor = new Color(0x5cd4ff);
    const expectedTint = baseColor.clone().lerp(new Color('#88ccff'), 0.7);
    expect(guideMaterial.emissive.getHexString()).toBe(
      expectedTint.getHexString()
    );

    const expectedBaseline = 0.9 * 1.5;
    expect(guideMaterial.emissiveIntensity).toBeCloseTo(expectedBaseline, 5);
    const baseOpacity = guideMaterial.opacity ?? 1;

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    guideMaterial.emissiveIntensity = expectedBaseline;
    guideMaterial.opacity = baseOpacity;

    environment.update({ elapsed: 1.2, delta: 0.016 });

    expect(guideMaterial.emissiveIntensity).toBeCloseTo(
      expectedBaseline * 0.55,
      5
    );
    expect(guideMaterial.opacity).toBeCloseTo(baseOpacity * 0.55, 5);

    environment.applySeasonalPreset(null);

    expect(guideMaterial.emissive.getHexString()).toBe(
      baseColor.getHexString()
    );
    expect(guideMaterial.emissiveIntensity).toBeCloseTo(0.9, 5);

    guideMaterial.emissiveIntensity = 0.9;
    guideMaterial.opacity = baseOpacity;

    environment.update({ elapsed: 2.2, delta: 0.016 });

    expect(guideMaterial.emissiveIntensity).toBeCloseTo(0.9 * 0.55, 5);
    expect(guideMaterial.opacity).toBeCloseTo(baseOpacity * 0.55, 5);

    environment.applySeasonalPreset(preset);

    const retint = baseColor.clone().lerp(new Color('#88ccff'), 0.7);
    expect(guideMaterial.emissive.getHexString()).toBe(retint.getHexString());
    expect(guideMaterial.emissiveIntensity).toBeCloseTo(expectedBaseline, 5);
  });

  it('retints fiber optic walkway segments and refreshes animation baselines', () => {
    const baseline = createBackyardEnvironment(BACKYARD_BOUNDS);
    const baselineFiberGroup = baseline.group.getObjectByName(
      'BackyardWalkwayFiberGuides'
    ) as Group | null;
    expect(baselineFiberGroup).toBeInstanceOf(Group);

    const baselineSegment = baselineFiberGroup?.children.find((child) =>
      child.name.startsWith('BackyardWalkwayFiberSegment-')
    ) as Mesh | undefined;
    expect(baselineSegment).toBeInstanceOf(Mesh);
    const baselineMaterial = (baselineSegment!
      .material as MeshStandardMaterial)!;
    const baseColor = baselineMaterial.emissive.clone();
    const baseIntensity = baselineMaterial.emissiveIntensity;
    const baseOpacity = baselineMaterial.opacity ?? 1;

    const preset: SeasonalLightingPreset = {
      id: 'spring-fiber-guides',
      label: 'Spring Fiber Guides',
      start: { month: 3, day: 1 },
      end: { month: 3, day: 31 },
      tintHex: '#7ce7ff',
      tintStrength: 0.45,
      emissiveIntensityScale: 1.15,
      roomOverrides: {
        backyard: {
          tintHex: '#ff9ad6',
          tintStrength: 0.6,
          emissiveIntensityScale: 1.4,
        },
      },
    };

    const environment = createBackyardEnvironment(BACKYARD_BOUNDS, {
      seasonalPreset: preset,
    });
    const fiberGroup = environment.group.getObjectByName(
      'BackyardWalkwayFiberGuides'
    ) as Group | null;
    expect(fiberGroup).toBeInstanceOf(Group);

    const tintedSegment = fiberGroup?.children.find((child) =>
      child.name.startsWith('BackyardWalkwayFiberSegment-')
    ) as Mesh | undefined;
    expect(tintedSegment).toBeInstanceOf(Mesh);
    const tintedMaterial = (tintedSegment!.material as MeshStandardMaterial)!;

    const expectedTint = baseColor.clone().lerp(new Color('#ff9ad6'), 0.6);
    expect(tintedMaterial.emissive.getHexString()).toBe(
      expectedTint.getHexString()
    );
    const expectedBaseline = baseIntensity * 1.4;
    expect(tintedMaterial.emissiveIntensity).toBeCloseTo(expectedBaseline, 5);
    const expectedOpacity = tintedMaterial.opacity ?? 1;

    environment.applySeasonalPreset(null);
    expect(tintedMaterial.emissive.getHexString()).toBe(
      baseColor.getHexString()
    );
    expect(tintedMaterial.emissiveIntensity).toBeCloseTo(baseIntensity, 5);
    expect(tintedMaterial.opacity).toBeCloseTo(baseOpacity, 5);

    environment.applySeasonalPreset(preset);
    expect(tintedMaterial.emissive.getHexString()).toBe(
      expectedTint.getHexString()
    );
    expect(tintedMaterial.emissiveIntensity).toBeCloseTo(expectedBaseline, 5);
    expect(tintedMaterial.opacity).toBeCloseTo(expectedOpacity, 5);

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';

    tintedMaterial.emissiveIntensity = expectedBaseline;
    tintedMaterial.opacity = expectedOpacity;

    environment.update({ elapsed: 1.5, delta: 0.016 });

    expect(tintedMaterial.emissiveIntensity).toBeCloseTo(
      expectedBaseline * 0.45,
      5
    );
    expect(tintedMaterial.opacity).toBeCloseTo(expectedOpacity * 0.45, 5);
  });

  it('animates fireflies around the greenhouse walkway with accessibility damping', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const fireflies = environment.group.getObjectByName('BackyardFireflies');
    expect(fireflies).toBeInstanceOf(Points);

    const points = fireflies as Points;
    const positions = points.geometry.getAttribute(
      'position'
    ) as BufferAttribute;
    expect(positions).toBeInstanceOf(BufferAttribute);
    expect(positions.count).toBeGreaterThan(0);

    const baselinePositions = clonePositions(positions);
    const baseVersion = positions.version;
    const material = points.material as PointsMaterial;
    expect(material.blending).toBe(AdditiveBlending);
    const baseOpacity = material.opacity;
    const baseSize = material.size;

    environment.update({ elapsed: 0.7, delta: 0.016 });

    const animatedDisplacement = averageDisplacement(
      positions,
      baselinePositions
    );
    expect(animatedDisplacement).toBeGreaterThan(0);
    expect(positions.version).toBeGreaterThan(baseVersion);

    const animatedOpacity = material.opacity;
    const animatedSize = material.size;
    expect(animatedOpacity).not.toBeCloseTo(baseOpacity);
    expect(animatedSize).not.toBeCloseTo(baseSize);

    document.documentElement.dataset.accessibilityPulseScale = '0';
    document.documentElement.dataset.accessibilityFlickerScale = '0';

    environment.update({ elapsed: 1.8, delta: 0.016 });

    expect(material.opacity).toBeLessThan(animatedOpacity);
    expect(material.opacity).toBeLessThan(baseOpacity * 0.5);
    expect(material.opacity).toBeGreaterThan(baseOpacity * 0.35);
    expect(material.size).toBeLessThan(animatedSize);
    expect(material.size).toBeLessThan(baseSize * 0.9);
    expect(material.size).toBeGreaterThan(baseSize * 0.8);
  });

  it('damps firefly orbit amplitude when accessibility presets request calm mode', () => {
    document.documentElement.dataset.accessibilityFlickerScale = '1';
    document.documentElement.dataset.accessibilityPulseScale = '1';
    const vibrantEnvironment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const vibrantFireflies =
      vibrantEnvironment.group.getObjectByName('BackyardFireflies');
    expect(vibrantFireflies).toBeInstanceOf(Points);
    const vibrantPositions = (vibrantFireflies as Points).geometry.getAttribute(
      'position'
    ) as BufferAttribute;
    const vibrantBase = clonePositions(vibrantPositions);
    vibrantEnvironment.update({ elapsed: 2.4, delta: 0.016 });
    const vibrantDisplacement = averageDisplacement(
      vibrantPositions,
      vibrantBase
    );
    expect(vibrantDisplacement).toBeGreaterThan(0);
    const vibrantMaterial = (vibrantFireflies as Points)
      .material as PointsMaterial;
    const vibrantOpacity = vibrantMaterial.opacity;
    const vibrantSize = vibrantMaterial.size;

    document.documentElement.dataset.accessibilityFlickerScale = '0';
    document.documentElement.dataset.accessibilityPulseScale = '0';
    const calmEnvironment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const calmFireflies =
      calmEnvironment.group.getObjectByName('BackyardFireflies');
    expect(calmFireflies).toBeInstanceOf(Points);
    const calmPositions = (calmFireflies as Points).geometry.getAttribute(
      'position'
    ) as BufferAttribute;
    const calmBase = clonePositions(calmPositions);
    calmEnvironment.update({ elapsed: 2.4, delta: 0.016 });
    const calmDisplacement = averageDisplacement(calmPositions, calmBase);
    expect(calmDisplacement).toBeGreaterThan(0);
    const calmMaterial = (calmFireflies as Points).material as PointsMaterial;

    expect(calmDisplacement).toBeLessThan(vibrantDisplacement * 0.6);
    expect(calmMaterial.opacity).toBeLessThan(vibrantOpacity);
    expect(calmMaterial.size).toBeLessThan(vibrantSize);
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

  it('retints the dusk sky dome when seasonal presets include backyard tint overrides', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const sky = environment.group.getObjectByName(
      'BackyardSkyDome'
    ) as Mesh | null;
    expect(sky).toBeInstanceOf(Mesh);

    const material = (sky as Mesh).material as ShaderMaterial;
    const topColor = material.uniforms.topColor.value as Color;
    const midColor = material.uniforms.midColor.value as Color;
    const horizonColor = material.uniforms.horizonColor.value as Color;

    const baseTop = topColor.clone();
    const baseMid = midColor.clone();
    const baseHorizon = horizonColor.clone();

    const preset: SeasonalLightingPreset = {
      id: 'seasonal-sky',
      label: 'Seasonal Sky',
      start: { month: 6, day: 1 },
      end: { month: 6, day: 30 },
      roomOverrides: {
        backyard: {
          tintHex: '77ccff',
          tintStrength: 0.65,
          cycleScale: 1.4,
        },
      },
    };

    environment.applySeasonalPreset(preset);

    const tintColor = new Color('#77ccff');
    const expectedTop = baseTop.clone().lerp(tintColor, 0.65);
    const expectedMid = baseMid.clone().lerp(tintColor, 0.65);
    const expectedHorizon = baseHorizon.clone().lerp(tintColor, 0.65);

    expect(areColorsRoughlyEqual(topColor, expectedTop, 1e-4)).toBe(true);
    expect(areColorsRoughlyEqual(midColor, expectedMid, 1e-4)).toBe(true);
    expect(areColorsRoughlyEqual(horizonColor, expectedHorizon, 1e-4)).toBe(
      true
    );

    environment.applySeasonalPreset(null);

    expect(areColorsRoughlyEqual(topColor, baseTop)).toBe(true);
    expect(areColorsRoughlyEqual(midColor, baseMid)).toBe(true);
    expect(areColorsRoughlyEqual(horizonColor, baseHorizon)).toBe(true);
  });

  it('falls back to the base sky palette when seasonal tint data is invalid or muted', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const sky = environment.group.getObjectByName(
      'BackyardSkyDome'
    ) as Mesh | null;
    expect(sky).toBeInstanceOf(Mesh);

    const material = (sky as Mesh).material as ShaderMaterial;
    const topColor = material.uniforms.topColor.value as Color;
    const midColor = material.uniforms.midColor.value as Color;
    const horizonColor = material.uniforms.horizonColor.value as Color;

    const baseTop = topColor.clone();
    const baseMid = midColor.clone();
    const baseHorizon = horizonColor.clone();

    const invalidPreset: SeasonalLightingPreset = {
      id: 'invalid-sky',
      label: 'Invalid Sky',
      start: { month: 1, day: 1 },
      end: { month: 1, day: 2 },
      tintHex: 'zzzzzz',
      tintStrength: 1.2,
    };

    environment.applySeasonalPreset(invalidPreset);
    expect(areColorsRoughlyEqual(topColor, baseTop)).toBe(true);
    expect(areColorsRoughlyEqual(midColor, baseMid)).toBe(true);
    expect(areColorsRoughlyEqual(horizonColor, baseHorizon)).toBe(true);

    const mutedPreset: SeasonalLightingPreset = {
      id: 'muted-sky',
      label: 'Muted Sky',
      start: { month: 2, day: 1 },
      end: { month: 2, day: 2 },
      roomOverrides: {
        backyard: {
          tintHex: '#123456',
          tintStrength: -0.4,
          cycleScale: -1,
        },
      },
    };

    environment.applySeasonalPreset(mutedPreset);
    expect(areColorsRoughlyEqual(topColor, baseTop)).toBe(true);
    expect(areColorsRoughlyEqual(midColor, baseMid)).toBe(true);
    expect(areColorsRoughlyEqual(horizonColor, baseHorizon)).toBe(true);
  });

  it('scales the sky horizon glow using seasonal cycle overrides', () => {
    const baseEnvironment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const cycleEnvironment = createBackyardEnvironment(BACKYARD_BOUNDS);

    const peakElapsed = Math.PI / (2 * 0.12);

    const baseSky = baseEnvironment.group.getObjectByName(
      'BackyardSkyDome'
    ) as Mesh;
    const baseMaterial = baseSky.material as ShaderMaterial;
    const baseHorizon = baseMaterial.uniforms.horizonColor.value as Color;
    const baseBefore = { h: 0, s: 0, l: 0 };
    baseHorizon.getHSL(baseBefore);
    baseEnvironment.update({ elapsed: peakElapsed, delta: 0.016 });
    const baseAfter = { h: 0, s: 0, l: 0 };
    baseHorizon.getHSL(baseAfter);
    const baseDelta = baseAfter.l - baseBefore.l;

    const cycleSky = cycleEnvironment.group.getObjectByName(
      'BackyardSkyDome'
    ) as Mesh;
    const cycleMaterial = cycleSky.material as ShaderMaterial;
    const boostedPreset: SeasonalLightingPreset = {
      id: 'cycle-boost',
      label: 'Cycle Boost',
      start: { month: 6, day: 1 },
      end: { month: 6, day: 30 },
      roomOverrides: {
        backyard: {
          cycleScale: 1.8,
        },
      },
    };

    cycleEnvironment.applySeasonalPreset(boostedPreset);
    const cycleHorizon = cycleMaterial.uniforms.horizonColor.value as Color;
    const cycleBefore = { h: 0, s: 0, l: 0 };
    cycleHorizon.getHSL(cycleBefore);
    cycleEnvironment.update({ elapsed: peakElapsed, delta: 0.016 });
    const cycleAfter = { h: 0, s: 0, l: 0 };
    cycleHorizon.getHSL(cycleAfter);
    const cycleDelta = cycleAfter.l - cycleBefore.l;

    expect(cycleDelta).toBeGreaterThan(baseDelta);
    expect(cycleDelta).toBeCloseTo(baseDelta * 1.8, 5);

    const zeroPreset: SeasonalLightingPreset = {
      id: 'cycle-zero',
      label: 'Cycle Zero',
      start: { month: 7, day: 1 },
      end: { month: 7, day: 2 },
      roomOverrides: {
        backyard: {
          cycleScale: 0,
        },
      },
    };

    cycleEnvironment.applySeasonalPreset(zeroPreset);
    const zeroBefore = { h: 0, s: 0, l: 0 };
    cycleHorizon.getHSL(zeroBefore);
    cycleEnvironment.update({ elapsed: peakElapsed, delta: 0.016 });
    const zeroAfter = { h: 0, s: 0, l: 0 };
    cycleHorizon.getHSL(zeroAfter);
    const zeroDelta = zeroAfter.l - zeroBefore.l;

    expect(Math.abs(zeroDelta)).toBeLessThan(1e-6);
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

    const walkwayGeometry = walkway!.geometry as BoxGeometry;
    const walkwayDepth = walkwayGeometry.parameters.depth ?? 0;
    const lanternBed = environment.ambientAudioBeds.find(
      (bed) => bed.id === 'backyard-lantern-wave'
    );
    expect(lanternBed).toBeDefined();
    expect(lanternBed?.center.x).toBeCloseTo(walkway!.position.x, 5);
    expect(lanternBed?.center.z).toBeCloseTo(
      walkway!.position.z - walkwayDepth * 0.18,
      5
    );
    expect(lanternBed?.innerRadius).toBeGreaterThan(0);
    expect(lanternBed?.outerRadius).toBeGreaterThan(
      lanternBed?.innerRadius ?? 0
    );
    expect(lanternBed?.baseVolume).toBeGreaterThan(0);
    expect(lanternBed?.falloffCurve).toBe('smoothstep');
    expect(typeof lanternBed?.volumeModulator).toBe('function');

    const sampleScale = lanternBed?.volumeModulator?.({
      elapsed: 1.2,
      delta: 0.016,
      listenerPosition: { x: walkway!.position.x, z: walkway!.position.z },
      baseVolume: lanternBed!.baseVolume,
    });
    expect(sampleScale).toBeGreaterThan(0);
  });

  it('adds holographic walkway arrows that pulse toward the greenhouse and honor calm-mode damping', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const arrowGroup = environment.group.getObjectByName(
      'BackyardWalkwayArrows'
    );
    expect(arrowGroup).toBeInstanceOf(Group);

    const arrows = (arrowGroup as Group).children.filter(
      (child): child is Mesh => child instanceof Mesh
    );
    expect(arrows.length).toBeGreaterThanOrEqual(1);

    const firstArrow = arrows[0];
    const walkway = environment.group.getObjectByName(
      'BackyardGreenhouseWalkway'
    ) as Mesh | null;
    expect(walkway).toBeInstanceOf(Mesh);
    expect(firstArrow.position.x).toBeCloseTo(walkway!.position.x, 5);
    const firstMaterial = firstArrow.material as MeshBasicMaterial;
    expect(firstMaterial.transparent).toBe(true);
    expect(firstMaterial.blending).toBe(AdditiveBlending);
    expect(firstMaterial.map).toBeInstanceOf(Texture);
    const calmArrow = arrows[1] ?? firstArrow;
    const calmMaterial = calmArrow.material as MeshBasicMaterial;
    const calmScaleBaseline = calmArrow.scale.z;
    const calmOpacityBaseline = calmMaterial.opacity;
    const baseScale = firstArrow.scale.z;
    const baseOpacity = firstMaterial.opacity;

    environment.update({ elapsed: 0.9, delta: 0.016 });

    expect(firstArrow.scale.z).not.toBeCloseTo(baseScale, 5);
    expect(firstMaterial.opacity).not.toBeCloseTo(baseOpacity, 5);

    document.documentElement.dataset.accessibilityPulseScale = '0';
    document.documentElement.dataset.accessibilityFlickerScale = '0';

    environment.update({ elapsed: 2.4, delta: 0.016 });

    expect(calmArrow.scale.z).toBeCloseTo(calmScaleBaseline, 5);
    expect(calmMaterial.opacity).toBeCloseTo(calmOpacityBaseline, 5);
  });

  it('adds greenhouse walkway mist ribbons that respond to accessibility damping', () => {
    const environment = createBackyardEnvironment(BACKYARD_BOUNDS);
    const mistGroup = environment.group.getObjectByName('BackyardWalkwayMist');
    expect(mistGroup).toBeInstanceOf(Group);

    const layers = (mistGroup as Group).children.filter(
      (child): child is Mesh => child instanceof Mesh
    );
    expect(layers.length).toBeGreaterThan(0);

    const firstLayer = layers[0];
    const material = firstLayer.material as ShaderMaterial;
    expect(material).toBeInstanceOf(ShaderMaterial);
    expect(material.transparent).toBe(true);
    expect(material.blending).toBe(AdditiveBlending);

    const opacityUniform = material.uniforms.opacity;
    const timeUniform = material.uniforms.time;
    expect(opacityUniform).toBeDefined();
    expect(timeUniform).toBeDefined();

    const baseHeight = firstLayer.position.y;
    const baseOpacity = opacityUniform?.value as number;
    expect(baseOpacity).toBeGreaterThan(0);

    environment.update({ elapsed: 0.8, delta: 0.016 });
    const timeAfterFirstUpdate = timeUniform?.value as number;
    expect(timeAfterFirstUpdate).toBeCloseTo(0.8, 5);
    const animatedHeightDelta = Math.abs(firstLayer.position.y - baseHeight);
    const animatedOpacityDelta = Math.abs(
      (opacityUniform?.value as number) - baseOpacity
    );
    expect(animatedHeightDelta).toBeGreaterThan(0);
    expect(animatedOpacityDelta).toBeGreaterThan(0);

    document.documentElement.dataset.accessibilityPulseScale = '0';
    document.documentElement.dataset.accessibilityFlickerScale = '0';
    firstLayer.position.y = baseHeight;
    if (opacityUniform) {
      opacityUniform.value = baseOpacity;
    }

    environment.update({ elapsed: 1.6, delta: 0.016 });
    const timeAfterCalmUpdate = timeUniform?.value as number;
    expect(timeAfterCalmUpdate).toBeCloseTo(1.6, 5);

    const calmHeightDelta = Math.abs(firstLayer.position.y - baseHeight);
    const calmOpacityDelta = Math.abs(
      (opacityUniform?.value as number) - baseOpacity
    );
    expect(calmHeightDelta).toBeLessThan(animatedHeightDelta);
    expect(calmOpacityDelta).toBeLessThan(animatedOpacityDelta);
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
