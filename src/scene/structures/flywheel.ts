import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  TorusGeometry,
  Object3D,
} from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

import {
  FLYWHEEL_AVATAR_PATH_RADIUS,
  FLYWHEEL_AXLE,
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_BEARING_STAND,
  FLYWHEEL_CRANK,
  FLYWHEEL_CRANK_RAD_PER_SECOND,
  FLYWHEEL_EMPHASIS_SPEED_BOOST,
  FLYWHEEL_ENERGY_PORT,
  FLYWHEEL_GEAR_RADII,
  FLYWHEEL_GEARBOX,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_PLANET_TEETH,
  FLYWHEEL_RING_TEETH,
  FLYWHEEL_SUN_TEETH,
  FLYWHEEL_TORQUE_RATIO,
  FLYWHEEL_WHEEL,
  getFlywheelCarrierAngle,
  getFlywheelPlanetLocalSpin,
} from './flywheelEnergyContract';

export interface FlywheelDebugState {
  crankAngle: number;
  sunAngle: number;
  carrierAngle: number;
  planetOrbitAngle: number;
  planetLocalSpin: number;
  outputShaftAngle: number;
  flywheelAngle: number;
  speedScale: number;
  runDecorativeEffects: boolean;
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

type Disposable = { dispose: () => void };

const detailConfig = (level: SceneDetailPolicy['level']) => {
  switch (level) {
    case 'cinematic':
      return {
        teethStride: 1,
        spokes: 8,
        bolts: 16,
        glowLayers: 2,
        toothDepth: 0.05,
      };
    case 'balanced':
      return {
        teethStride: 1,
        spokes: 6,
        bolts: 12,
        glowLayers: 1,
        toothDepth: 0.04,
      };
    case 'performance':
      return {
        teethStride: 3,
        spokes: 5,
        bolts: 6,
        glowLayers: 1,
        toothDepth: 0.035,
      };
    case 'low':
      return {
        teethStride: Infinity,
        spokes: 4,
        bolts: 0,
        glowLayers: 1,
        toothDepth: 0,
      };
    case 'micro':
      return {
        teethStride: Infinity,
        spokes: 3,
        bolts: 0,
        glowLayers: 0,
        toothDepth: 0,
      };
  }
};

export function createFlywheelShowpiece(
  options: FlywheelShowpieceOptions
): FlywheelShowpieceBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const config = detailConfig(detailPolicy.level);
  const position = options.position ?? {
    x: options.centerX ?? 0,
    y: 0,
    z: options.centerZ ?? 0,
  };
  const cylinderSegments = Math.max(6, detailPolicy.geometry.cylinderSegments);
  const torusRadialSegments = Math.max(
    4,
    detailPolicy.geometry.torusRadialSegments
  );
  const torusTubularSegments = Math.max(
    8,
    detailPolicy.geometry.torusTubularSegments
  );

  const group = new Group();
  group.name = 'FlywheelEnergyInstallation';
  group.position.set(position.x, position.y ?? 0, position.z);
  group.rotation.y = options.orientationRadians ?? 0;
  group.scale.set(1, 1, 1);

  const disposables = new Set<Disposable>();
  const own = <T extends Disposable>(item: T): T => {
    disposables.add(item);
    return item;
  };
  const metal = own(
    new MeshStandardMaterial({
      color: 0x55606a,
      metalness: 0.82,
      roughness: 0.28,
    })
  );
  const darkMetal = own(
    new MeshStandardMaterial({
      color: 0x1b2430,
      metalness: 0.9,
      roughness: 0.24,
    })
  );
  const glow = own(
    new MeshStandardMaterial({
      color: 0x37bdf8,
      emissive: new Color(0x1d9bf0),
      emissiveIntensity: 1.1,
      roughness: 0.18,
      metalness: 0.35,
    })
  );
  const glowBasic = own(
    new MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.48 })
  );

  const addMesh = (
    name: string,
    geometry: Disposable,
    material: Mesh['material'],
    parent = group
  ) => {
    own(geometry);
    const mesh = new Mesh(geometry as never, material);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };

  const base = addMesh(
    'FlywheelBase',
    new BoxGeometry(
      FLYWHEEL_BASE_DIMENSIONS.width,
      FLYWHEEL_BASE_DIMENSIONS.height,
      FLYWHEEL_BASE_DIMENSIONS.depth
    ),
    darkMetal
  );
  base.position.y = FLYWHEEL_BASE_DIMENSIONS.height / 2;

  for (const [name, sx] of [
    ['FlywheelBearingStandLeft', -1],
    ['FlywheelBearingStandRight', 1],
  ] as const) {
    const stand = addMesh(
      name,
      new BoxGeometry(
        FLYWHEEL_BEARING_STAND.width,
        FLYWHEEL_BEARING_STAND.height,
        FLYWHEEL_BEARING_STAND.depth
      ),
      metal
    );
    stand.position.set(
      FLYWHEEL_WHEEL.centerX + sx * FLYWHEEL_BEARING_STAND.centerOffsetX,
      FLYWHEEL_BEARING_STAND.height / 2 + FLYWHEEL_BASE_DIMENSIONS.height,
      0
    );
  }

  const axle = addMesh(
    'FlywheelAxle',
    new CylinderGeometry(
      FLYWHEEL_AXLE.radius,
      FLYWHEEL_AXLE.radius,
      FLYWHEEL_AXLE.length,
      cylinderSegments
    ),
    metal
  );
  axle.rotation.z = Math.PI / 2;
  axle.position.set(FLYWHEEL_WHEEL.centerX + 0.35, FLYWHEEL_WHEEL.centerY, 0);

  const wheelGroup = new Group();
  wheelGroup.name = 'FlywheelWheelGroup';
  wheelGroup.position.set(FLYWHEEL_WHEEL.centerX, FLYWHEEL_WHEEL.centerY, 0);
  group.add(wheelGroup);
  const rim = addMesh(
    'FlywheelHeavyRim',
    new TorusGeometry(
      FLYWHEEL_WHEEL.radius,
      FLYWHEEL_WHEEL.rimTube,
      torusRadialSegments,
      torusTubularSegments
    ),
    darkMetal,
    wheelGroup
  );
  rim.rotation.y = Math.PI / 2;
  const hub = addMesh(
    'FlywheelInnerHub',
    new CylinderGeometry(0.2, 0.2, FLYWHEEL_WHEEL.thickness, cylinderSegments),
    metal,
    wheelGroup
  );
  hub.rotation.z = Math.PI / 2;
  for (let i = 0; i < config.spokes; i += 1) {
    const spoke = addMesh(
      `FlywheelSpoke-${i}`,
      new BoxGeometry(FLYWHEEL_WHEEL.radius * 1.42, 0.045, 0.055),
      metal,
      wheelGroup
    );
    spoke.rotation.z = (i / config.spokes) * Math.PI;
  }
  for (let i = 0; i < Math.min(4, config.spokes); i += 1) {
    const weight = addMesh(
      `FlywheelCounterweight-${i}`,
      new BoxGeometry(0.2, 0.1, 0.28),
      metal,
      wheelGroup
    );
    const a = (i / Math.min(4, config.spokes)) * Math.PI * 2 + Math.PI / 8;
    weight.position.set(
      Math.cos(a) * FLYWHEEL_WHEEL.radius * 0.68,
      Math.sin(a) * FLYWHEEL_WHEEL.radius * 0.68,
      0
    );
    weight.rotation.z = a;
  }
  if (config.glowLayers > 0) {
    const ring = addMesh(
      'FlywheelEnergyGlowRing',
      new TorusGeometry(
        FLYWHEEL_WHEEL.radius * 0.78,
        0.015,
        4,
        torusTubularSegments
      ),
      glow,
      wheelGroup
    );
    ring.rotation.y = Math.PI / 2;
  }

  const crankGroup = new Group();
  crankGroup.name = 'FlywheelCrankGroup';
  crankGroup.position.set(
    FLYWHEEL_GEARBOX.centerX,
    FLYWHEEL_GEARBOX.centerY,
    FLYWHEEL_GEARBOX.centerZ + FLYWHEEL_GEARBOX.depth * 0.72
  );
  group.add(crankGroup);
  const crankDisc = addMesh(
    'FlywheelCrankDisc',
    new CylinderGeometry(
      FLYWHEEL_CRANK.discRadius,
      FLYWHEEL_CRANK.discRadius,
      0.05,
      cylinderSegments
    ),
    metal,
    crankGroup
  );
  crankDisc.rotation.x = Math.PI / 2;
  const crankArm = addMesh(
    'FlywheelCrankArm',
    new BoxGeometry(FLYWHEEL_CRANK.armLength, 0.045, 0.04),
    metal,
    crankGroup
  );
  crankArm.position.x = FLYWHEEL_CRANK.armLength / 2;
  const crankHandle = addMesh(
    'FlywheelCrankHandle',
    new CylinderGeometry(
      FLYWHEEL_CRANK.handleRadius,
      FLYWHEEL_CRANK.handleRadius,
      FLYWHEEL_CRANK.handleLength,
      cylinderSegments
    ),
    metal,
    crankGroup
  );
  crankHandle.rotation.x = Math.PI / 2;
  crankHandle.position.x = FLYWHEEL_CRANK.radius;

  const gearbox = new Group();
  gearbox.name = 'FlywheelPlanetaryGearbox';
  gearbox.position.set(
    FLYWHEEL_GEARBOX.centerX,
    FLYWHEEL_GEARBOX.centerY,
    FLYWHEEL_GEARBOX.centerZ
  );
  group.add(gearbox);
  addGear(
    'FlywheelRingGear',
    FLYWHEEL_GEAR_RADII.ring,
    FLYWHEEL_RING_TEETH,
    true,
    gearbox
  );
  const sunGear = addGear(
    'FlywheelSunGear',
    FLYWHEEL_GEAR_RADII.sun,
    FLYWHEEL_SUN_TEETH,
    false,
    gearbox
  );
  const carrier = new Group();
  carrier.name = 'FlywheelPlanetCarrier';
  gearbox.add(carrier);
  const planets: Group[] = [];
  for (let i = 0; i < 3; i += 1) {
    const planetPivot = new Group();
    planetPivot.name = `FlywheelPlanetGear-${i}`;
    const a = (i / 3) * Math.PI * 2;
    planetPivot.position.set(
      Math.cos(a) * FLYWHEEL_GEAR_RADII.planetOrbit,
      Math.sin(a) * FLYWHEEL_GEAR_RADII.planetOrbit,
      0
    );
    const planetMesh = addGear(
      `FlywheelPlanetGear-${i}-Mesh`,
      FLYWHEEL_GEAR_RADII.planet,
      FLYWHEEL_PLANET_TEETH,
      false,
      planetPivot
    );
    planetMesh.userData.phase = a;
    carrier.add(planetPivot);
    planets.push(planetPivot);
  }
  const outputShaft = addMesh(
    'FlywheelOutputShaft',
    new CylinderGeometry(0.065, 0.065, 1.2, cylinderSegments),
    metal,
    gearbox
  );
  outputShaft.rotation.y = Math.PI / 2;
  outputShaft.position.x = -0.55;

  const port = addMesh(
    'FlywheelEnergyPort',
    new CylinderGeometry(
      FLYWHEEL_ENERGY_PORT.radius,
      FLYWHEEL_ENERGY_PORT.radius,
      0.08,
      cylinderSegments
    ),
    glow,
    group
  );
  port.rotation.x = Math.PI / 2;
  port.position.set(
    FLYWHEEL_ENERGY_PORT.x,
    FLYWHEEL_ENERGY_PORT.y,
    FLYWHEEL_ENERGY_PORT.z
  );
  if (config.glowLayers > 1) {
    const halo = addMesh(
      'FlywheelEnergyPortHalo',
      new RingGeometry(
        FLYWHEEL_ENERGY_PORT.radius * 1.2,
        FLYWHEEL_ENERGY_PORT.radius * 2.3,
        detailPolicy.geometry.ringSegments
      ),
      glowBasic,
      group
    );
    halo.position.copy(port.position);
  }

  for (let i = 0; i < config.bolts; i += 1) {
    const bolt = addMesh(
      `FlywheelBaseBolt-${i}`,
      new CylinderGeometry(0.025, 0.025, 0.025, 8),
      metal,
      group
    );
    const side = i % 2 === 0 ? -1 : 1;
    bolt.position.set(
      -1.45 + Math.floor(i / 2) * (2.9 / Math.max(1, config.bolts / 2 - 1)),
      FLYWHEEL_BASE_DIMENSIONS.height + 0.014,
      side * 0.62
    );
  }

  function addGear(
    name: string,
    radius: number,
    teeth: number,
    internal: boolean,
    parent: Object3D
  ): Group {
    const gear = new Group();
    gear.name = name;
    parent.add(gear);
    const body = addMesh(
      `${name}Body`,
      new CylinderGeometry(radius, radius, 0.065, cylinderSegments),
      internal ? darkMetal : metal,
      gear
    );
    body.rotation.x = Math.PI / 2;
    const toothCount = Number.isFinite(config.teethStride)
      ? Math.ceil(teeth / config.teethStride)
      : 0;
    for (let i = 0; i < toothCount; i += 1) {
      const a = (i / toothCount) * Math.PI * 2;
      const tooth = addMesh(
        `${name}Tooth-${i}`,
        new BoxGeometry(0.035, config.toothDepth, 0.075),
        metal,
        gear
      );
      const r =
        radius + (internal ? -config.toothDepth / 2 : config.toothDepth / 2);
      tooth.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      tooth.rotation.z = a + (internal ? Math.PI / 2 : 0);
    }
    return gear;
  }

  const colliders: RectCollider[] = [
    {
      minX: position.x - FLYWHEEL_BASE_DIMENSIONS.width / 2,
      maxX: position.x + FLYWHEEL_BASE_DIMENSIONS.width / 2,
      minZ: position.z - FLYWHEEL_BASE_DIMENSIONS.depth / 2,
      maxZ: position.z + FLYWHEEL_BASE_DIMENSIONS.depth / 2,
    },
    {
      minX: position.x + FLYWHEEL_GEARBOX.centerX - 0.62,
      maxX: position.x + FLYWHEEL_GEARBOX.centerX + 0.62,
      minZ: position.z + 0.35 - 0.58,
      maxZ: position.z + 0.35 + 0.58,
    },
  ];

  let debug: FlywheelDebugState = {
    crankAngle: 0,
    sunAngle: 0,
    carrierAngle: 0,
    planetOrbitAngle: 0,
    planetLocalSpin: 0,
    outputShaftAngle: 0,
    flywheelAngle: 0,
    speedScale: 1,
    runDecorativeEffects: true,
  };
  let disposed = false;

  return {
    group,
    colliders,
    update({ elapsed, emphasis, runDecorativeEffects = true }) {
      const speedScale =
        1 + MathUtils.clamp(emphasis, 0, 1) * FLYWHEEL_EMPHASIS_SPEED_BOOST;
      const crankAngle = elapsed * FLYWHEEL_CRANK_RAD_PER_SECOND * speedScale;
      const carrierAngle = getFlywheelCarrierAngle(crankAngle);
      const planetLocalSpin = getFlywheelPlanetLocalSpin(
        crankAngle,
        carrierAngle
      );
      crankGroup.rotation.z = crankAngle;
      sunGear.rotation.z = crankAngle;
      carrier.rotation.z = carrierAngle;
      for (const planet of planets) planet.rotation.z = planetLocalSpin;
      outputShaft.rotation.x = carrierAngle;
      wheelGroup.rotation.z = carrierAngle;
      const glowIntensity = 0.85 + MathUtils.clamp(emphasis, 0, 1) * 0.85;
      glow.emissiveIntensity = runDecorativeEffects ? glowIntensity : 0.75;
      glowBasic.opacity = runDecorativeEffects ? 0.28 + emphasis * 0.36 : 0.18;
      debug = {
        crankAngle,
        sunAngle: crankAngle,
        carrierAngle,
        planetOrbitAngle: carrierAngle,
        planetLocalSpin,
        outputShaftAngle: carrierAngle,
        flywheelAngle: carrierAngle,
        speedScale,
        runDecorativeEffects,
      };
    },
    getDebugState() {
      return { ...debug };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposables.forEach((item) => item.dispose());
      disposables.clear();
    },
  };
}

export {
  FLYWHEEL_AVATAR_PATH_RADIUS,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_TORQUE_RATIO,
};
