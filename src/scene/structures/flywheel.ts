import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

import {
  FLYWHEEL_ANIMATION,
  FLYWHEEL_AXLE,
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_BEARING_STAND,
  FLYWHEEL_CRANK,
  FLYWHEEL_DETAIL_TOOTH_STRIDE,
  FLYWHEEL_ENERGY_PORT,
  FLYWHEEL_GEARBOX,
  FLYWHEEL_GEAR_RADII,
  FLYWHEEL_GEAR_TEETH,
  FLYWHEEL_PLANETARY_RATIO,
  FLYWHEEL_WHEEL,
  getFlywheelCarrierAngle,
  getFlywheelPlanetSpinAngle,
} from './flywheelEnergyContract';

const FLYWHEEL_POI_ID = 'flywheel-studio-flywheel';

interface FlywheelUpdateContext {
  elapsed: number;
  delta: number;
  emphasis: number;
  runDecorativeEffects?: boolean;
}

export interface FlywheelDebugState {
  crankAngle: number;
  sunAngle: number;
  carrierAngle: number;
  flywheelAngle: number;
  planetAngles: { orbitAngle: number; spinAngle: number }[];
  triangleCount: number;
  disposed: boolean;
}

export interface FlywheelShowpieceBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: FlywheelUpdateContext): void;
  getDebugState(): FlywheelDebugState;
  dispose(): void;
}

export interface FlywheelShowpieceOptions {
  position?: { x: number; y?: number; z: number };
  centerX?: number;
  centerZ?: number;
  roomBounds: Bounds2D;
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
}

type Owned = Mesh<
  BoxGeometry | CylinderGeometry | TorusGeometry | SphereGeometry
>;

export function createFlywheelShowpiece(
  options: FlywheelShowpieceOptions
): FlywheelShowpieceBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const anchor = {
    x: options.position?.x ?? options.centerX ?? 0,
    y: options.position?.y ?? 0,
    z: options.position?.z ?? options.centerZ ?? 0,
  };
  const segmentScale = Math.max(0.3, detailPolicy.modelDetailScale);
  const cylinderSegments = Math.max(
    6,
    Math.round(detailPolicy.geometry.cylinderSegments)
  );
  const torusRadialSegments = Math.max(
    4,
    Math.round(detailPolicy.geometry.torusRadialSegments)
  );
  const torusTubularSegments = Math.max(
    8,
    Math.round(detailPolicy.geometry.torusTubularSegments)
  );
  const toothStride = FLYWHEEL_DETAIL_TOOTH_STRIDE[detailPolicy.level];
  const spokeCount = Math.max(
    4,
    Math.round(FLYWHEEL_WHEEL.spokeCount * segmentScale)
  );
  const owned: Owned[] = [];
  const materials: (MeshStandardMaterial | MeshBasicMaterial)[] = [];
  const selectionEventTarget = typeof window === 'undefined' ? null : window;
  let disposed = false;
  let selectionTarget = 0;
  let selectionStrength = 0;
  let crankAngle = 0;
  let decorativePhase = 0;

  const metal = material({ color: 0x64748b, metalness: 0.78, roughness: 0.24 });
  const darkMetal = material({
    color: 0x172033,
    metalness: 0.68,
    roughness: 0.3,
  });
  const brass = material({ color: 0xc08422, metalness: 0.74, roughness: 0.22 });
  const glow = material({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.7,
  });
  const rubber = material({
    color: 0x111827,
    metalness: 0.15,
    roughness: 0.55,
  });

  const group = new Group();
  group.name = 'FlywheelEnergyInstallation';
  group.position.set(anchor.x, anchor.y, anchor.z);
  group.rotation.y = options.orientationRadians ?? 0;
  group.scale.set(1, 1, 1);

  const base = mesh(
    'FlywheelBase',
    new BoxGeometry(
      FLYWHEEL_BASE_DIMENSIONS.width,
      FLYWHEEL_BASE_DIMENSIONS.height,
      FLYWHEEL_BASE_DIMENSIONS.depth
    ),
    darkMetal
  );
  base.position.y = FLYWHEEL_BASE_DIMENSIONS.height / 2;
  group.add(base);

  for (const [name, x] of [
    ['FlywheelBearingStandLeft', -FLYWHEEL_BEARING_STAND.xOffset],
    ['FlywheelBearingStandRight', FLYWHEEL_BEARING_STAND.xOffset],
  ] as const) {
    const stand = mesh(
      name,
      new BoxGeometry(
        FLYWHEEL_BEARING_STAND.width,
        FLYWHEEL_BEARING_STAND.height,
        FLYWHEEL_BEARING_STAND.depth
      ),
      metal
    );
    stand.position.set(
      x,
      FLYWHEEL_BASE_DIMENSIONS.height + FLYWHEEL_BEARING_STAND.height / 2,
      0
    );
    group.add(stand);
  }

  const axle = mesh(
    'FlywheelAxle',
    new CylinderGeometry(
      FLYWHEEL_AXLE.radius,
      FLYWHEEL_AXLE.radius,
      FLYWHEEL_AXLE.length,
      cylinderSegments
    ),
    brass
  );
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, FLYWHEEL_WHEEL.centerY, 0);
  group.add(axle);

  const wheelGroup = new Group();
  wheelGroup.name = 'FlywheelWheelGroup';
  wheelGroup.position.set(
    FLYWHEEL_WHEEL.centerX,
    FLYWHEEL_WHEEL.centerY,
    FLYWHEEL_WHEEL.centerZ
  );
  group.add(wheelGroup);
  const rim = mesh(
    'FlywheelHeavyRim',
    new TorusGeometry(
      FLYWHEEL_WHEEL.radius,
      FLYWHEEL_WHEEL.rimTube,
      torusRadialSegments,
      torusTubularSegments
    ),
    metal
  );
  rim.rotation.y = Math.PI / 2;
  wheelGroup.add(rim);
  const hub = mesh(
    'FlywheelInnerHub',
    new CylinderGeometry(
      0.22,
      0.22,
      FLYWHEEL_WHEEL.thickness,
      cylinderSegments
    ),
    brass
  );
  hub.rotation.x = Math.PI / 2;
  wheelGroup.add(hub);
  for (let i = 0; i < spokeCount; i += 1) {
    const spoke = mesh(
      `FlywheelSpoke-${i}`,
      new BoxGeometry(FLYWHEEL_WHEEL.radius * 1.5, 0.055, 0.06),
      metal
    );
    spoke.rotation.z = (i / spokeCount) * Math.PI * 2;
    wheelGroup.add(spoke);
  }
  for (let i = 0; i < FLYWHEEL_WHEEL.counterweightCount; i += 1) {
    const weight = mesh(
      `FlywheelCounterweight-${i}`,
      new BoxGeometry(0.2, 0.22, 0.16),
      brass
    );
    const angle = i * Math.PI;
    weight.position.set(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0);
    weight.rotation.z = angle;
    wheelGroup.add(weight);
  }
  const glowRing = mesh(
    'FlywheelEnergyGlowRing',
    new TorusGeometry(
      FLYWHEEL_WHEEL.radius * 0.78,
      0.018,
      torusRadialSegments,
      torusTubularSegments
    ),
    glow
  );
  glowRing.rotation.y = Math.PI / 2;
  wheelGroup.add(glowRing);

  const crankGroup = new Group();
  crankGroup.name = 'FlywheelCrankGroup';
  crankGroup.position.set(
    FLYWHEEL_CRANK.centerX,
    FLYWHEEL_CRANK.centerY,
    FLYWHEEL_CRANK.centerZ
  );
  group.add(crankGroup);
  const crankDisc = mesh(
    'FlywheelCrankDisc',
    new CylinderGeometry(
      FLYWHEEL_CRANK.discRadius,
      FLYWHEEL_CRANK.discRadius,
      0.06,
      cylinderSegments
    ),
    brass
  );
  crankDisc.rotation.x = Math.PI / 2;
  crankGroup.add(crankDisc);
  const crankArm = mesh(
    'FlywheelCrankArm',
    new BoxGeometry(FLYWHEEL_CRANK.armLength, FLYWHEEL_CRANK.armWidth, 0.045),
    brass
  );
  crankArm.position.x = FLYWHEEL_CRANK.armLength / 2;
  crankGroup.add(crankArm);
  const crankHandle = mesh(
    'FlywheelCrankHandle',
    new CylinderGeometry(
      FLYWHEEL_CRANK.handleRadius,
      FLYWHEEL_CRANK.handleRadius,
      FLYWHEEL_CRANK.handleLength,
      cylinderSegments
    ),
    rubber
  );
  crankHandle.rotation.x = Math.PI / 2;
  crankHandle.position.x = FLYWHEEL_CRANK.radius;
  crankGroup.add(crankHandle);

  const gearbox = new Group();
  gearbox.name = 'FlywheelPlanetaryGearbox';
  gearbox.position.set(
    FLYWHEEL_GEARBOX.centerX,
    FLYWHEEL_GEARBOX.centerY,
    FLYWHEEL_GEARBOX.centerZ
  );
  group.add(gearbox);
  const ringGear = makeGear(
    'FlywheelRingGear',
    FLYWHEEL_GEAR_RADII.ring,
    FLYWHEEL_GEAR_TEETH.ring,
    true,
    darkMetal
  );
  gearbox.add(ringGear);
  const sunGear = makeGear(
    'FlywheelSunGear',
    FLYWHEEL_GEAR_RADII.sun,
    FLYWHEEL_GEAR_TEETH.sun,
    false,
    brass
  );
  gearbox.add(sunGear);
  const carrier = new Group();
  carrier.name = 'FlywheelPlanetCarrier';
  gearbox.add(carrier);
  const carrierBar = mesh(
    'FlywheelPlanetCarrierBar',
    new BoxGeometry(FLYWHEEL_GEARBOX.planetOrbitRadius * 2.2, 0.04, 0.04),
    metal
  );
  carrier.add(carrierBar);
  const planetGears: Group[] = [];
  for (let i = 0; i < FLYWHEEL_GEAR_TEETH.planets; i += 1) {
    const planet = makeGear(
      `FlywheelPlanetGear-${i}`,
      FLYWHEEL_GEAR_RADII.planet,
      FLYWHEEL_GEAR_TEETH.planet,
      false,
      metal
    );
    carrier.add(planet);
    planetGears.push(planet);
  }
  const outputShaft = mesh(
    'FlywheelOutputShaft',
    new CylinderGeometry(0.06, 0.06, 1.05, cylinderSegments),
    brass
  );
  outputShaft.rotation.x = Math.PI / 2;
  gearbox.add(outputShaft);

  const energyPort = mesh(
    'FlywheelEnergyPort',
    new SphereGeometry(
      FLYWHEEL_ENERGY_PORT.radius,
      cylinderSegments,
      Math.max(4, Math.round(cylinderSegments / 2))
    ),
    glow
  );
  energyPort.position.set(
    FLYWHEEL_ENERGY_PORT.x,
    FLYWHEEL_ENERGY_PORT.y,
    FLYWHEEL_ENERGY_PORT.z
  );
  group.add(energyPort);

  const colliders = createColliders(anchor);
  attachSelectionListeners();

  function update(context: FlywheelUpdateContext) {
    if (disposed) return;
    const emphasis = MathUtils.clamp(
      Math.max(context.emphasis, selectionStrength),
      0,
      1
    );
    selectionStrength = MathUtils.damp(
      selectionStrength,
      selectionTarget,
      7,
      context.delta
    );
    const speed =
      FLYWHEEL_ANIMATION.crankRadiansPerSecond *
      (1 + emphasis * FLYWHEEL_ANIMATION.emphasisSpeedBoost);
    crankAngle += speed * Math.max(0, context.delta);
    const carrierAngle = getFlywheelCarrierAngle(crankAngle);
    const planetSpinAngle = getFlywheelPlanetSpinAngle(crankAngle);
    crankGroup.rotation.z = crankAngle;
    sunGear.rotation.z = crankAngle;
    carrier.rotation.z = carrierAngle;
    wheelGroup.rotation.z = carrierAngle;
    outputShaft.rotation.z = carrierAngle;
    planetGears.forEach((planet, index) => {
      const orbitAngle = (index / planetGears.length) * Math.PI * 2;
      planet.position.set(
        Math.cos(orbitAngle) * FLYWHEEL_GEARBOX.planetOrbitRadius,
        Math.sin(orbitAngle) * FLYWHEEL_GEARBOX.planetOrbitRadius,
        0.03
      );
      planet.rotation.z = planetSpinAngle;
    });
    if (context.runDecorativeEffects ?? true) {
      decorativePhase = context.elapsed;
      const glowIntensity =
        FLYWHEEL_ANIMATION.glowBaseIntensity +
        emphasis * FLYWHEEL_ANIMATION.glowEmphasisIntensity;
      glow.emissiveIntensity =
        glowIntensity + Math.sin(decorativePhase * 3) * 0.08;
      energyPort.scale.setScalar(
        1 + emphasis * 0.25 + Math.sin(decorativePhase * 4) * 0.04
      );
    }
  }

  function getDebugState(): FlywheelDebugState {
    const carrierAngle = getFlywheelCarrierAngle(crankAngle);
    return {
      crankAngle,
      sunAngle: sunGear.rotation.z,
      carrierAngle,
      flywheelAngle: wheelGroup.rotation.z,
      planetAngles: planetGears.map((planet, index) => ({
        orbitAngle: (index / planetGears.length) * Math.PI * 2 + carrierAngle,
        spinAngle: planet.rotation.z,
      })),
      triangleCount: countTriangles(group),
      disposed,
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    removeSelectionListeners();
    owned.forEach((item) => item.geometry.dispose());
    materials.forEach((item) => item.dispose());
  }

  function material(options: {
    color: number;
    metalness?: number;
    roughness?: number;
    emissive?: number;
    emissiveIntensity?: number;
  }) {
    const created = new MeshStandardMaterial({
      color: new Color(options.color),
      metalness: options.metalness ?? 0.4,
      roughness: options.roughness ?? 0.28,
      emissive: new Color(options.emissive ?? 0x000000),
      emissiveIntensity: options.emissiveIntensity ?? 0,
    });
    materials.push(created);
    return created;
  }

  function mesh(
    name: string,
    geometry: Owned['geometry'],
    meshMaterial: MeshStandardMaterial | MeshBasicMaterial
  ): Owned {
    const created = new Mesh(geometry, meshMaterial) as Owned;
    created.name = name;
    owned.push(created);
    return created;
  }

  function makeGear(
    name: string,
    radius: number,
    teeth: number,
    internal: boolean,
    gearMaterial: MeshStandardMaterial
  ): Group {
    const gear = new Group();
    gear.name = name;
    const body = mesh(
      `${name}Body`,
      new CylinderGeometry(
        radius,
        radius,
        FLYWHEEL_GEAR_RADII.depth,
        cylinderSegments
      ),
      gearMaterial
    );
    body.rotation.x = Math.PI / 2;
    gear.add(body);
    const visibleTeeth = Math.max(4, Math.ceil(teeth / toothStride));
    for (let i = 0; i < visibleTeeth; i += 1) {
      const angle = (i / visibleTeeth) * Math.PI * 2;
      const tooth = mesh(
        `${name}Tooth-${i}`,
        new BoxGeometry(
          0.045,
          FLYWHEEL_GEAR_RADII.toothDepth,
          FLYWHEEL_GEAR_RADII.depth * 1.1
        ),
        gearMaterial
      );
      const direction = internal ? -1 : 1;
      const toothRadius =
        radius + direction * FLYWHEEL_GEAR_RADII.toothDepth * 0.45;
      tooth.position.set(
        Math.cos(angle) * toothRadius,
        Math.sin(angle) * toothRadius,
        0
      );
      tooth.rotation.z = angle + (internal ? 0 : Math.PI / 2);
      gear.add(tooth);
    }
    return gear;
  }

  function getPoiIdFromEvent(event: Event): string | null {
    const detail = (
      event as CustomEvent<{ poi?: { id?: string }; poiId?: string }>
    ).detail;
    return detail?.poi?.id ?? detail?.poiId ?? null;
  }

  function handleSelection(event: Event) {
    selectionTarget = getPoiIdFromEvent(event) === FLYWHEEL_POI_ID ? 1 : 0;
  }
  function handleSelectionCleared(event: Event) {
    const poiId = getPoiIdFromEvent(event);
    if (!poiId || poiId === FLYWHEEL_POI_ID) selectionTarget = 0;
  }
  function attachSelectionListeners() {
    selectionEventTarget?.addEventListener('poi:selected', handleSelection);
    selectionEventTarget?.addEventListener(
      'poi:selected:analytics',
      handleSelection
    );
    selectionEventTarget?.addEventListener(
      'poi:selection-cleared',
      handleSelectionCleared
    );
  }
  function removeSelectionListeners() {
    selectionEventTarget?.removeEventListener('poi:selected', handleSelection);
    selectionEventTarget?.removeEventListener(
      'poi:selected:analytics',
      handleSelection
    );
    selectionEventTarget?.removeEventListener(
      'poi:selection-cleared',
      handleSelectionCleared
    );
  }

  return { group, colliders, update, getDebugState, dispose };
}

function createColliders(anchor: { x: number; z: number }): RectCollider[] {
  const baseHalfWidth = FLYWHEEL_BASE_DIMENSIONS.width / 2;
  const baseHalfDepth = FLYWHEEL_BASE_DIMENSIONS.depth / 2;
  return [
    {
      minX: anchor.x - baseHalfWidth,
      maxX: anchor.x + baseHalfWidth,
      minZ: anchor.z - baseHalfDepth,
      maxZ: anchor.z + baseHalfDepth,
    },
    {
      minX: anchor.x + FLYWHEEL_GEARBOX.centerX - 0.62,
      maxX: anchor.x + FLYWHEEL_CRANK.centerX + 0.45,
      minZ: anchor.z - 0.55,
      maxZ: anchor.z + FLYWHEEL_CRANK.centerZ + 0.25,
    },
  ];
}

function countTriangles(group: Group): number {
  let total = 0;
  group.traverse((object) => {
    const maybeMesh = object as Mesh;
    const geometry = maybeMesh.geometry;
    if (!geometry) return;
    const index = geometry.getIndex();
    const position = geometry.getAttribute('position');
    total += index ? index.count / 3 : position.count / 3;
  });
  return total;
}

export { FLYWHEEL_PLANETARY_RATIO, FLYWHEEL_GEAR_TEETH };
