import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

import {
  FLYWHEEL_ANIMATION,
  FLYWHEEL_ENERGY_DIMENSIONS,
  FLYWHEEL_ENERGY_INSTALLATION_NAME,
  FLYWHEEL_GEAR_RADII,
  FLYWHEEL_GEAR_TEETH,
  FLYWHEEL_PLANETARY_RATIO,
  getFlywheelCarrierAngle,
  getFlywheelLocalColliders,
  getFlywheelPlanetSpinAngle,
} from './flywheelEnergyContract';

const FLYWHEEL_POI_ID = 'flywheel-studio-flywheel';

export interface FlywheelDebugState {
  crankAngle: number;
  sunAngle: number;
  carrierAngle: number;
  flywheelAngle: number;
  planetAngles: { orbit: number; spin: number }[];
  ratio: number;
  disposed: boolean;
}

export interface FlywheelShowpieceBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: {
    elapsed: number;
    delta: number;
    emphasis: number;
    runDecorativeEffects?: boolean;
  }): void;
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

type DetailSpec = {
  cylinderSegments: number;
  torusRadialSegments: number;
  torusTubularSegments: number;
  toothEvery: number;
  spokeCount: number;
  glowLayers: number;
};

const detailSpecFor = (policy: SceneDetailPolicy): DetailSpec => {
  const scale = [1, 0.75, 0.45, 0.28, 0.18][policy.detailIndex] ?? 0.45;
  return {
    cylinderSegments: Math.max(
      6,
      Math.round(policy.geometry.cylinderSegments * scale)
    ),
    torusRadialSegments: Math.max(
      3,
      Math.round(policy.geometry.torusRadialSegments * scale)
    ),
    torusTubularSegments: Math.max(
      6,
      Math.round(policy.geometry.torusTubularSegments * scale)
    ),
    toothEvery: [1, 2, 3, 6, 9][policy.detailIndex] ?? 3,
    spokeCount: [8, 6, 5, 4, 3][policy.detailIndex] ?? 5,
    glowLayers: [3, 2, 1, 1, 1][policy.detailIndex] ?? 1,
  };
};

const ownedGeometries = new Set<{ dispose(): void }>();
const ownedMaterials = new Set<{ dispose(): void }>();

const trackGeometry = <T extends { dispose(): void }>(geometry: T): T => {
  ownedGeometries.add(geometry);
  return geometry;
};

const trackMaterial = <T extends { dispose(): void }>(material: T): T => {
  ownedMaterials.add(material);
  return material;
};

const std = (color: number, emissive = 0, intensity = 0) =>
  trackMaterial(
    new MeshStandardMaterial({
      color: new Color(color),
      emissive: new Color(emissive),
      emissiveIntensity: intensity,
      metalness: 0.72,
      roughness: 0.28,
    })
  );

const makeBox = (
  name: string,
  size: [number, number, number],
  color: number
) => {
  const mesh = new Mesh(trackGeometry(new BoxGeometry(...size)), std(color));
  mesh.name = name;
  return mesh;
};

const makeCylinder = (
  name: string,
  radius: number,
  height: number,
  segments: number,
  color: number,
  openEnded = false
) => {
  const mesh = new Mesh(
    trackGeometry(
      new CylinderGeometry(radius, radius, height, segments, 1, openEnded)
    ),
    std(color)
  );
  mesh.name = name;
  return mesh;
};

function addGearTeeth(
  parent: Group,
  name: string,
  radius: number,
  count: number,
  toothEvery: number,
  inward: boolean
): void {
  const toothCount = Math.max(3, Math.ceil(count / toothEvery));
  for (let i = 0; i < toothCount; i += 1) {
    const angle = (i / toothCount) * Math.PI * 2;
    const tooth = makeBox(`${name}Tooth-${i}`, [0.045, 0.075, 0.055], 0xcbd5e1);
    tooth.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    tooth.rotation.z = angle + (inward ? 0 : Math.PI / 2);
    parent.add(tooth);
  }
}

export function createFlywheelShowpiece(
  options: FlywheelShowpieceOptions
): FlywheelShowpieceBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const spec = detailSpecFor(detailPolicy);
  const position = options.position ?? {
    x: options.centerX ?? 0,
    y: 0,
    z: options.centerZ ?? 0,
  };
  const group = new Group();
  group.name = FLYWHEEL_ENERGY_INSTALLATION_NAME;
  group.position.set(position.x, position.y ?? 0, position.z);
  group.rotation.y = options.orientationRadians ?? 0;

  const colliders = getFlywheelLocalColliders().map((collider) => ({
    minX: collider.minX + position.x,
    maxX: collider.maxX + position.x,
    minZ: collider.minZ + position.z,
    maxZ: collider.maxZ + position.z,
  }));

  const d = FLYWHEEL_ENERGY_DIMENSIONS;
  const base = makeBox(
    'FlywheelBase',
    [d.base.width, d.base.height, d.base.depth],
    0x1f2937
  );
  base.position.y = d.base.height / 2;
  group.add(base);

  for (const [name, x] of [
    ['FlywheelBearingStandLeft', -d.bearingStand.offsetX],
    ['FlywheelBearingStandRight', d.bearingStand.offsetX],
  ] as const) {
    const stand = makeBox(
      name,
      [d.bearingStand.width, d.bearingStand.height, d.bearingStand.depth],
      0x334155
    );
    stand.position.set(
      x,
      d.base.height + d.bearingStand.height / 2,
      d.wheel.centerZ
    );
    group.add(stand);
  }

  const axle = makeCylinder(
    'FlywheelAxle',
    d.axle.radius,
    d.axle.length,
    spec.cylinderSegments,
    0xe2e8f0
  );
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, d.wheel.centerY, d.wheel.centerZ);
  group.add(axle);

  const wheelGroup = new Group();
  wheelGroup.name = 'FlywheelWheelGroup';
  wheelGroup.position.set(0.28, d.wheel.centerY, d.wheel.centerZ);
  group.add(wheelGroup);
  const rim = new Mesh(
    trackGeometry(
      new TorusGeometry(
        d.wheel.radius,
        d.wheel.thickness / 2,
        spec.torusRadialSegments,
        spec.torusTubularSegments
      )
    ),
    std(0x94a3b8, 0x1d4ed8, 0.12)
  );
  rim.name = 'FlywheelHeavyRim';
  wheelGroup.add(rim);
  const hub = makeCylinder(
    'FlywheelInnerHub',
    0.18,
    d.wheel.thickness * 1.25,
    spec.cylinderSegments,
    0xcbd5e1
  );
  hub.rotation.x = Math.PI / 2;
  wheelGroup.add(hub);
  for (let i = 0; i < spec.spokeCount; i += 1) {
    const spoke = makeBox(
      `FlywheelSpoke-${i}`,
      [d.wheel.radius * 1.45, 0.045, 0.055],
      0xe2e8f0
    );
    spoke.rotation.z = (i / spec.spokeCount) * Math.PI;
    wheelGroup.add(spoke);
  }
  for (let i = 0; i < Math.min(4, spec.spokeCount); i += 1) {
    const cw = makeBox(
      `FlywheelCounterweight-${i}`,
      [0.18, 0.12, 0.1],
      0xf59e0b
    );
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    cw.position.set(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0);
    cw.rotation.z = angle;
    wheelGroup.add(cw);
  }
  for (let i = 0; i < spec.glowLayers; i += 1) {
    const glow = new Mesh(
      trackGeometry(
        new TorusGeometry(
          d.wheel.radius + 0.04 + i * 0.035,
          0.012,
          4,
          spec.torusTubularSegments
        )
      ),
      trackMaterial(
        new MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.24,
        })
      )
    );
    glow.name =
      i === 0 ? 'FlywheelEnergyGlowRing' : `FlywheelEnergyGlowRing-${i}`;
    wheelGroup.add(glow);
  }

  const crankGroup = new Group();
  crankGroup.name = 'FlywheelCrankGroup';
  crankGroup.position.set(
    d.gearbox.centerX - 0.14,
    d.gearbox.centerY,
    d.gearbox.centerZ - 0.22
  );
  group.add(crankGroup);
  const crankDisc = makeCylinder(
    'FlywheelCrankDisc',
    0.16,
    0.06,
    spec.cylinderSegments,
    0xcbd5e1
  );
  crankDisc.rotation.x = Math.PI / 2;
  crankGroup.add(crankDisc);
  const crankArm = makeBox(
    'FlywheelCrankArm',
    [d.crank.armLength, 0.045, 0.045],
    0xe2e8f0
  );
  crankArm.position.x = d.crank.armLength / 2;
  crankGroup.add(crankArm);
  const handle = makeCylinder(
    'FlywheelCrankHandle',
    d.crank.handleRadius,
    d.crank.handleLength,
    spec.cylinderSegments,
    0xfbbf24
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.x = d.crank.armLength;
  crankGroup.add(handle);

  const gearbox = new Group();
  gearbox.name = 'FlywheelPlanetaryGearbox';
  gearbox.position.set(d.gearbox.centerX, d.gearbox.centerY, d.gearbox.centerZ);
  group.add(gearbox);
  const ringGear = new Mesh(
    trackGeometry(
      new TorusGeometry(
        FLYWHEEL_GEAR_RADII.ringPitch,
        0.045,
        spec.torusRadialSegments,
        spec.torusTubularSegments
      )
    ),
    std(0x64748b)
  );
  ringGear.name = 'FlywheelRingGear';
  gearbox.add(ringGear);
  addGearTeeth(
    gearbox,
    'FlywheelRingGear',
    FLYWHEEL_GEAR_RADII.ringPitch - 0.055,
    FLYWHEEL_GEAR_TEETH.ring,
    spec.toothEvery,
    true
  );
  const sunGear = new Group();
  sunGear.name = 'FlywheelSunGear';
  gearbox.add(sunGear);
  sunGear.add(
    makeCylinder(
      'FlywheelSunGearBody',
      FLYWHEEL_GEAR_RADII.sun,
      0.08,
      spec.cylinderSegments,
      0xfacc15
    )
  );
  addGearTeeth(
    sunGear,
    'FlywheelSunGear',
    FLYWHEEL_GEAR_RADII.sun + 0.035,
    FLYWHEEL_GEAR_TEETH.sun,
    spec.toothEvery,
    false
  );
  const carrier = new Group();
  carrier.name = 'FlywheelPlanetCarrier';
  gearbox.add(carrier);
  const carrierPlate = makeCylinder(
    'FlywheelPlanetCarrierPlate',
    FLYWHEEL_GEAR_RADII.carrier,
    0.035,
    spec.cylinderSegments,
    0x475569
  );
  carrier.add(carrierPlate);
  const planetGroups: Group[] = [];
  for (let i = 0; i < FLYWHEEL_GEAR_TEETH.planets; i += 1) {
    const planet = new Group();
    planet.name = `FlywheelPlanetGear-${i}`;
    const angle = (i / FLYWHEEL_GEAR_TEETH.planets) * Math.PI * 2;
    planet.position.set(
      Math.cos(angle) * FLYWHEEL_GEAR_RADII.carrier,
      Math.sin(angle) * FLYWHEEL_GEAR_RADII.carrier,
      0.04
    );
    planet.add(
      makeCylinder(
        `FlywheelPlanetGearBody-${i}`,
        FLYWHEEL_GEAR_RADII.planet,
        0.08,
        spec.cylinderSegments,
        0x93c5fd
      )
    );
    addGearTeeth(
      planet,
      `FlywheelPlanetGear-${i}`,
      FLYWHEEL_GEAR_RADII.planet + 0.03,
      FLYWHEEL_GEAR_TEETH.planet,
      spec.toothEvery,
      false
    );
    carrier.add(planet);
    planetGroups.push(planet);
  }
  const outputShaft = makeCylinder(
    'FlywheelOutputShaft',
    0.07,
    0.95,
    spec.cylinderSegments,
    0xe2e8f0
  );
  outputShaft.rotation.z = Math.PI / 2;
  outputShaft.position.x = 0.5;
  gearbox.add(outputShaft);

  const port = new Mesh(
    trackGeometry(
      new SphereGeometry(
        d.energyPort.radius,
        spec.cylinderSegments,
        Math.max(4, spec.cylinderSegments / 2)
      )
    ),
    trackMaterial(new MeshBasicMaterial({ color: 0x38bdf8 }))
  );
  port.name = 'FlywheelEnergyPort';
  port.position.set(d.energyPort.x, d.energyPort.y, d.energyPort.z);
  group.add(port);

  let selectionTarget = 0;
  let selectionStrength = 0;
  let crankAngle = 0;
  let disposed = false;
  const getPoiId = (event: Event) =>
    (event as CustomEvent).detail?.poi?.id ?? (event as CustomEvent).detail?.id;
  const onSelect = (event: Event) => {
    selectionTarget = getPoiId(event) === FLYWHEEL_POI_ID ? 1 : 0;
  };
  const onClear = (event: Event) => {
    if (!getPoiId(event) || getPoiId(event) === FLYWHEEL_POI_ID)
      selectionTarget = 0;
  };
  const target = typeof window === 'undefined' ? null : window;
  target?.addEventListener('poi:selected', onSelect);
  target?.addEventListener('poi:selected:analytics', onSelect);
  target?.addEventListener('poi:selection-cleared', onClear);

  const applyAngles = (angle: number) => {
    const carrierAngle = getFlywheelCarrierAngle(angle);
    crankGroup.rotation.z = angle;
    sunGear.rotation.z = angle;
    carrier.rotation.z = carrierAngle;
    outputShaft.rotation.x = carrierAngle;
    wheelGroup.rotation.z = carrierAngle;
    planetGroups.forEach((planet) => {
      planet.rotation.z = getFlywheelPlanetSpinAngle(angle);
    });
  };

  const update = ({
    elapsed,
    delta,
    emphasis,
    runDecorativeEffects = true,
  }: Parameters<FlywheelShowpieceBuild['update']>[0]) => {
    if (disposed) return;
    selectionStrength = MathUtils.damp(
      selectionStrength,
      selectionTarget,
      5,
      Math.max(0, delta)
    );
    const boost =
      1 +
      MathUtils.clamp(Math.max(emphasis, selectionStrength), 0, 1) *
        FLYWHEEL_ANIMATION.emphasisSpeedBoost;
    crankAngle +=
      FLYWHEEL_ANIMATION.crankRadiansPerSecond * boost * Math.max(0, delta);
    applyAngles(crankAngle);
    if (runDecorativeEffects) {
      const glow =
        0.25 +
        Math.sin(elapsed * FLYWHEEL_ANIMATION.glowPulseRadiansPerSecond) *
          0.08 +
        selectionStrength * 0.25;
      group.traverse((object: Object3D) => {
        if (
          object.name.startsWith('FlywheelEnergyGlowRing') &&
          object instanceof Mesh
        ) {
          (object.material as MeshBasicMaterial).opacity = glow;
        }
      });
      (port.material as MeshBasicMaterial).color
        .setScalar(1)
        .lerp(new Color(0x38bdf8), 0.65 - selectionStrength * 0.25);
    }
  };

  applyAngles(0);

  return {
    group,
    colliders,
    update,
    getDebugState: () => ({
      crankAngle,
      sunAngle: crankAngle,
      carrierAngle: getFlywheelCarrierAngle(crankAngle),
      flywheelAngle: getFlywheelCarrierAngle(crankAngle),
      planetAngles: planetGroups.map((planet, index) => ({
        orbit:
          getFlywheelCarrierAngle(crankAngle) +
          (index / FLYWHEEL_GEAR_TEETH.planets) * Math.PI * 2,
        spin: planet.rotation.z,
      })),
      ratio: FLYWHEEL_PLANETARY_RATIO,
      disposed,
    }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      target?.removeEventListener('poi:selected', onSelect);
      target?.removeEventListener('poi:selected:analytics', onSelect);
      target?.removeEventListener('poi:selection-cleared', onClear);
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
    },
  };
}
