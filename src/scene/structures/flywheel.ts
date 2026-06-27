import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
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
  FLYWHEEL_AXLE,
  FLYWHEEL_BASE_COLLIDER,
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_BEARING_STAND,
  FLYWHEEL_CRANK,
  FLYWHEEL_CRANK_RAD_PER_SECOND,
  FLYWHEEL_EMPHASIS_SPEED_BOOST,
  FLYWHEEL_ENERGY_PORT,
  FLYWHEEL_GEARBOX,
  FLYWHEEL_GEARBOX_COLLIDER,
  FLYWHEEL_PLANET_ORBIT_RADIUS,
  FLYWHEEL_PLANET_RADIUS,
  FLYWHEEL_PLANET_TEETH,
  FLYWHEEL_RING_RADIUS,
  FLYWHEEL_RING_TEETH,
  FLYWHEEL_SUN_RADIUS,
  FLYWHEEL_SUN_TEETH,
  FLYWHEEL_TORQUE_RATIO,
  FLYWHEEL_WHEEL,
  getFlywheelCarrierAngle,
  getFlywheelPlanetLocalSpin,
} from './flywheelEnergyContract';

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

export interface FlywheelDebugState {
  crankAngle: number;
  sunAngle: number;
  carrierAngle: number;
  flywheelAngle: number;
  planetLocalSpin: number;
  torqueRatio: number;
  triangleCount: number;
}

const MATERIALS = {
  dark: new Color(0x17202a),
  metal: new Color(0x7c8794),
  glow: new Color(0x4dd8ff),
  brass: new Color(0xd19a3a),
};

export function createFlywheelShowpiece(
  options: FlywheelShowpieceOptions
): FlywheelShowpieceBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const position = options.position ?? {
    x: options.centerX ?? 0,
    y: 0,
    z: options.centerZ ?? 0,
  };
  const group = new Group();
  group.name = 'FlywheelEnergyInstallation';
  group.position.set(position.x, position.y ?? 0, position.z);
  group.rotation.y = options.orientationRadians ?? 0;

  const ownedGeometries = new Set<{ dispose: () => void }>();
  const ownedMaterials = new Set<{ dispose: () => void }>();
  const own = <T extends { dispose: () => void }>(item: T): T => (
    ownedGeometries.add(item),
    item
  );
  const mat = <T extends { dispose: () => void }>(item: T): T => (
    ownedMaterials.add(item),
    item
  );
  const segmentScale =
    detailPolicy.level === 'cinematic'
      ? 1
      : detailPolicy.level === 'balanced'
        ? 0.75
        : detailPolicy.level === 'performance'
          ? 0.45
          : detailPolicy.level === 'low'
            ? 0.3
            : 0.2;
  const cylSeg = Math.max(
    6,
    Math.floor(detailPolicy.geometry.cylinderSegments * segmentScale)
  );
  const torusSeg = Math.max(
    8,
    Math.floor(detailPolicy.geometry.torusTubularSegments * segmentScale)
  );
  const spokeCount =
    detailPolicy.level === 'cinematic'
      ? 8
      : detailPolicy.level === 'balanced'
        ? 6
        : detailPolicy.level === 'performance'
          ? 5
          : 4;
  const toothStride =
    detailPolicy.level === 'cinematic' || detailPolicy.level === 'balanced'
      ? 1
      : detailPolicy.level === 'performance'
        ? 3
        : 999;

  const steel = mat(
    new MeshStandardMaterial({
      color: MATERIALS.metal,
      roughness: 0.35,
      metalness: 0.8,
    })
  );
  const dark = mat(
    new MeshStandardMaterial({
      color: MATERIALS.dark,
      roughness: 0.5,
      metalness: 0.65,
    })
  );
  const brass = mat(
    new MeshStandardMaterial({
      color: MATERIALS.brass,
      roughness: 0.32,
      metalness: 0.75,
    })
  );
  const glow = mat(
    new MeshBasicMaterial({
      color: MATERIALS.glow,
      transparent: true,
      opacity: 0.62,
    })
  );

  const mesh = (
    name: string,
    geometry: BufferGeometry,
    material: Mesh['material']
  ) => {
    const item = new Mesh(own(geometry), material);
    item.name = name;
    return item;
  };

  const base = mesh(
    'FlywheelBase',
    new BoxGeometry(
      FLYWHEEL_BASE_DIMENSIONS.width,
      FLYWHEEL_BASE_DIMENSIONS.height,
      FLYWHEEL_BASE_DIMENSIONS.depth
    ),
    dark
  );
  base.position.y = FLYWHEEL_BASE_DIMENSIONS.height / 2;
  group.add(base);

  for (const [name, x] of [
    ['FlywheelBearingStandLeft', FLYWHEEL_WHEEL.centerX - 0.62],
    ['FlywheelBearingStandRight', FLYWHEEL_WHEEL.centerX + 0.62],
  ] as const) {
    const stand = mesh(
      name,
      new BoxGeometry(
        FLYWHEEL_BEARING_STAND.width,
        FLYWHEEL_BEARING_STAND.height,
        FLYWHEEL_BEARING_STAND.depth
      ),
      steel
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
      cylSeg
    ),
    steel
  );
  axle.position.set(FLYWHEEL_WHEEL.centerX, FLYWHEEL_WHEEL.centerY, 0);
  axle.rotation.z = Math.PI / 2;
  group.add(axle);

  const wheelGroup = new Group();
  wheelGroup.name = 'FlywheelWheelGroup';
  wheelGroup.position.set(FLYWHEEL_WHEEL.centerX, FLYWHEEL_WHEEL.centerY, 0);
  group.add(wheelGroup);
  const rim = mesh(
    'FlywheelHeavyRim',
    new TorusGeometry(
      FLYWHEEL_WHEEL.radius,
      FLYWHEEL_WHEEL.rimTube,
      Math.max(5, cylSeg / 2),
      torusSeg
    ),
    dark
  );
  wheelGroup.add(rim);
  const hub = mesh(
    'FlywheelInnerHub',
    new CylinderGeometry(0.2, 0.2, FLYWHEEL_WHEEL.thickness, cylSeg),
    steel
  );
  hub.rotation.x = Math.PI / 2;
  wheelGroup.add(hub);
  for (let i = 0; i < spokeCount; i += 1) {
    const spoke = mesh(
      `FlywheelSpoke-${i}`,
      new BoxGeometry(FLYWHEEL_WHEEL.radius * 1.45, 0.045, 0.055),
      steel
    );
    spoke.rotation.z = (i / spokeCount) * Math.PI * 2;
    wheelGroup.add(spoke);
  }
  for (let i = 0; i < Math.max(2, Math.floor(spokeCount / 2)); i += 1) {
    const weight = mesh(
      `FlywheelCounterweight-${i}`,
      new BoxGeometry(0.2, 0.14, 0.16),
      brass
    );
    const a =
      (i / Math.max(2, Math.floor(spokeCount / 2))) * Math.PI * 2 + 0.25;
    weight.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0);
    weight.rotation.z = a;
    wheelGroup.add(weight);
  }
  const glowRing = mesh(
    'FlywheelEnergyGlowRing',
    new TorusGeometry(FLYWHEEL_WHEEL.radius * 0.82, 0.018, 4, torusSeg),
    glow
  );
  wheelGroup.add(glowRing);

  const gearbox = new Group();
  gearbox.name = 'FlywheelPlanetaryGearbox';
  gearbox.position.set(
    FLYWHEEL_GEARBOX.centerX,
    FLYWHEEL_GEARBOX.centerY,
    FLYWHEEL_GEARBOX.centerZ
  );
  group.add(gearbox);
  const ringGear = mesh(
    'FlywheelRingGear',
    new TorusGeometry(FLYWHEEL_RING_RADIUS, 0.045, 4, torusSeg),
    steel
  );
  gearbox.add(ringGear);
  const sunGear = mesh(
    'FlywheelSunGear',
    new CylinderGeometry(
      FLYWHEEL_SUN_RADIUS,
      FLYWHEEL_SUN_RADIUS,
      FLYWHEEL_GEARBOX.depth,
      cylSeg
    ),
    brass
  );
  sunGear.rotation.x = Math.PI / 2;
  gearbox.add(sunGear);
  const carrier = new Group();
  carrier.name = 'FlywheelPlanetCarrier';
  gearbox.add(carrier);
  const planetGears: Object3D[] = [];
  for (let i = 0; i < 3; i += 1) {
    const planet = mesh(
      `FlywheelPlanetGear-${i}`,
      new CylinderGeometry(
        FLYWHEEL_PLANET_RADIUS,
        FLYWHEEL_PLANET_RADIUS,
        FLYWHEEL_GEARBOX.depth * 0.75,
        cylSeg
      ),
      steel
    );
    const a = (i / 3) * Math.PI * 2;
    planet.position.set(
      Math.cos(a) * FLYWHEEL_PLANET_ORBIT_RADIUS,
      Math.sin(a) * FLYWHEEL_PLANET_ORBIT_RADIUS,
      0
    );
    planet.rotation.x = Math.PI / 2;
    carrier.add(planet);
    planetGears.push(planet);
  }
  const output = mesh(
    'FlywheelOutputShaft',
    new CylinderGeometry(0.055, 0.055, 0.95, cylSeg),
    steel
  );
  output.rotation.x = Math.PI / 2;
  gearbox.add(output);

  addTeeth(
    gearbox,
    'FlywheelSunTooth',
    FLYWHEEL_SUN_TEETH,
    FLYWHEEL_SUN_RADIUS,
    toothStride,
    false,
    brass,
    own
  );
  addTeeth(
    gearbox,
    'FlywheelRingTooth',
    FLYWHEEL_RING_TEETH,
    FLYWHEEL_RING_RADIUS,
    toothStride,
    true,
    steel,
    own
  );
  planetGears.forEach((planet, index) =>
    addTeeth(
      planet,
      `FlywheelPlanetTooth-${index}`,
      FLYWHEEL_PLANET_TEETH,
      FLYWHEEL_PLANET_RADIUS,
      toothStride,
      false,
      steel,
      own
    )
  );

  const crankGroup = new Group();
  crankGroup.name = 'FlywheelCrankGroup';
  crankGroup.position.set(
    FLYWHEEL_GEARBOX.centerX,
    FLYWHEEL_GEARBOX.centerY,
    FLYWHEEL_GEARBOX.centerZ + 0.34
  );
  group.add(crankGroup);
  const crankDisc = mesh(
    'FlywheelCrankDisc',
    new CylinderGeometry(0.12, 0.12, 0.04, cylSeg),
    brass
  );
  crankDisc.rotation.x = Math.PI / 2;
  crankGroup.add(crankDisc);
  const crankArm = mesh(
    'FlywheelCrankArm',
    new BoxGeometry(FLYWHEEL_CRANK.radius, 0.045, 0.04),
    brass
  );
  crankArm.position.x = FLYWHEEL_CRANK.radius / 2;
  crankGroup.add(crankArm);
  const crankHandle = mesh(
    'FlywheelCrankHandle',
    new CylinderGeometry(
      FLYWHEEL_CRANK.handleRadius,
      FLYWHEEL_CRANK.handleRadius,
      FLYWHEEL_CRANK.handleLength,
      cylSeg
    ),
    steel
  );
  crankHandle.position.x = FLYWHEEL_CRANK.radius;
  crankHandle.rotation.x = Math.PI / 2;
  crankGroup.add(crankHandle);

  const port = mesh(
    'FlywheelEnergyPort',
    new SphereGeometry(
      FLYWHEEL_ENERGY_PORT.radius,
      cylSeg,
      Math.max(4, cylSeg / 2)
    ),
    glow
  );
  port.position.set(
    FLYWHEEL_ENERGY_PORT.x,
    FLYWHEEL_ENERGY_PORT.y,
    FLYWHEEL_ENERGY_PORT.z
  );
  group.add(port);

  const colliders = createFlywheelColliders(position.x, position.z);
  let state: FlywheelDebugState = {
    crankAngle: 0,
    sunAngle: 0,
    carrierAngle: 0,
    flywheelAngle: 0,
    planetLocalSpin: 0,
    torqueRatio: FLYWHEEL_TORQUE_RATIO,
    triangleCount: countTriangles(group),
  };
  let disposed = false;

  return {
    group,
    colliders,
    update({ elapsed, emphasis, runDecorativeEffects = true }) {
      const speed =
        FLYWHEEL_CRANK_RAD_PER_SECOND *
        (1 + Math.max(0, emphasis) * FLYWHEEL_EMPHASIS_SPEED_BOOST);
      const crankAngle = elapsed * speed;
      const carrierAngle = getFlywheelCarrierAngle(crankAngle);
      const planetLocalSpin = getFlywheelPlanetLocalSpin(
        crankAngle,
        carrierAngle
      );
      crankGroup.rotation.z = crankAngle;
      sunGear.rotation.z = crankAngle;
      carrier.rotation.z = carrierAngle;
      output.rotation.z = carrierAngle;
      wheelGroup.rotation.z = carrierAngle;
      planetGears.forEach((planet) => {
        planet.rotation.z = planetLocalSpin;
      });
      if (runDecorativeEffects) {
        glow.opacity =
          0.45 + Math.min(0.4, emphasis * 0.35) + Math.sin(elapsed * 2) * 0.05;
      }
      state = {
        crankAngle,
        sunAngle: crankAngle,
        carrierAngle,
        flywheelAngle: carrierAngle,
        planetLocalSpin,
        torqueRatio: FLYWHEEL_TORQUE_RATIO,
        triangleCount: state.triangleCount,
      };
    },
    getDebugState: () => ({ ...state }),
    dispose() {
      if (disposed) return;
      disposed = true;
      ownedGeometries.forEach((g) => g.dispose());
      ownedMaterials.forEach((m) => m.dispose());
    },
  };
}

function addTeeth(
  parent: Object3D,
  prefix: string,
  count: number,
  radius: number,
  stride: number,
  inward: boolean,
  material: Mesh['material'],
  own: <T extends { dispose: () => void }>(item: T) => T
) {
  if (stride > count) return;
  const geometry = own(new BoxGeometry(0.035, 0.06, 0.055));
  for (let i = 0; i < count; i += stride) {
    const tooth = new Mesh(geometry, material);
    tooth.name = `${prefix}-${i}`;
    const a = (i / count) * Math.PI * 2;
    tooth.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    tooth.rotation.z = a + (inward ? Math.PI / 2 : 0);
    parent.add(tooth);
  }
}

function createFlywheelColliders(x: number, z: number): RectCollider[] {
  return [
    {
      minX: x - FLYWHEEL_BASE_COLLIDER.width / 2,
      maxX: x + FLYWHEEL_BASE_COLLIDER.width / 2,
      minZ: z - FLYWHEEL_BASE_COLLIDER.depth / 2,
      maxZ: z + FLYWHEEL_BASE_COLLIDER.depth / 2,
    },
    {
      minX:
        x +
        FLYWHEEL_GEARBOX_COLLIDER.centerX -
        FLYWHEEL_GEARBOX_COLLIDER.width / 2,
      maxX:
        x +
        FLYWHEEL_GEARBOX_COLLIDER.centerX +
        FLYWHEEL_GEARBOX_COLLIDER.width / 2,
      minZ:
        z +
        FLYWHEEL_GEARBOX_COLLIDER.centerZ -
        FLYWHEEL_GEARBOX_COLLIDER.depth / 2,
      maxZ:
        z +
        FLYWHEEL_GEARBOX_COLLIDER.centerZ +
        FLYWHEEL_GEARBOX_COLLIDER.depth / 2,
    },
  ];
}

function countTriangles(root: Object3D): number {
  let count = 0;
  root.traverse((object) => {
    const mesh = object as Mesh;
    const geometry = mesh.geometry;
    if (!geometry) return;
    const index = geometry.index;
    const position = geometry.getAttribute('position');
    count += index ? index.count / 3 : position.count / 3;
  });
  return count;
}
