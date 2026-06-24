import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';

import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import type { RectCollider } from '../../systems/collision';

export interface SugarkubeDeploymentBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface SugarkubeWallEndpoint {
  x: number;
  y?: number;
  z: number;
  orientationRadians?: number;
}

export interface SugarkubeDeploymentOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
  wallEndpoint: SugarkubeWallEndpoint;
}

interface DetailConfig {
  cableRadialSegments: number;
  cableTubeSegments: number;
  cylinderSegments: number;
  piExtra: boolean;
  portDepth: number;
  switchVents: number;
  trayRibs: number;
}

interface LedNode {
  material: MeshStandardMaterial;
  offset: number;
}

const TABLE_WIDTH = 2.8;
const TABLE_DEPTH = 2.08;
const TABLE_HEIGHT = 0.78;
const TABLE_TOP_THICKNESS = 0.16;
const SWITCH_WIDTH = 1.55;
const SWITCH_DEPTH = 0.58;
const SWITCH_HEIGHT = 0.16;
const RACK_WIDTH = 1.32;
const RACK_DEPTH = 0.76;
const TIER_HEIGHTS = [1.1, 1.44, 1.78] as const;

function getDetailConfig(policy: SceneDetailPolicy): DetailConfig {
  if (policy.level === 'cinematic') {
    return {
      cableRadialSegments: 8,
      cableTubeSegments: 26,
      cylinderSegments: 20,
      piExtra: true,
      portDepth: 0.045,
      switchVents: 12,
      trayRibs: 5,
    };
  }
  if (policy.level === 'performance') {
    return {
      cableRadialSegments: 3,
      cableTubeSegments: 7,
      cylinderSegments: 6,
      piExtra: false,
      portDepth: 0.028,
      switchVents: 3,
      trayRibs: 1,
    };
  }
  return {
    cableRadialSegments: 5,
    cableTubeSegments: 12,
    cylinderSegments: 10,
    piExtra: false,
    portDepth: 0.035,
    switchVents: 6,
    trayRibs: 3,
  };
}

function createRotatedCollider(
  center: Vector3,
  width: number,
  depth: number,
  rotation: number
): RectCollider {
  const corners = [
    new Vector3(-width / 2, 0, -depth / 2),
    new Vector3(width / 2, 0, -depth / 2),
    new Vector3(width / 2, 0, depth / 2),
    new Vector3(-width / 2, 0, depth / 2),
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const xs = corners.map(
    (corner) => center.x + corner.x * cos - corner.z * sin
  );
  const zs = corners.map(
    (corner) => center.z + corner.x * sin + corner.z * cos
  );
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

function addBox(
  parent: Object3D,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  material: MeshStandardMaterial
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addCable(
  parent: Object3D,
  name: string,
  points: Vector3[],
  material: MeshStandardMaterial,
  detail: DetailConfig,
  radius = 0.018
): Mesh {
  const curve = new CatmullRomCurve3(points, false, 'centripetal', 0.45);
  const cable = new Mesh(
    new TubeGeometry(
      curve,
      detail.cableTubeSegments,
      radius,
      detail.cableRadialSegments,
      false
    ),
    material
  );
  cable.name = name;
  parent.add(cable);
  return cable;
}

function addPi(
  parent: Group,
  tier: number,
  slot: number,
  y: number,
  x: number,
  materials: ReturnType<typeof createMaterials>,
  detail: DetailConfig,
  ledNodes: LedNode[]
): Vector3 {
  const pi = new Group();
  pi.name = `SugarkubePi-${tier}-${slot}`;
  pi.position.set(x, y + 0.055, 0.02);
  parent.add(pi);

  addBox(pi, `${pi.name}-Board`, [0.32, 0.035, 0.42], [0, 0, 0], materials.pcb);
  addBox(
    pi,
    `${pi.name}-EthernetJack`,
    [0.11, 0.07, 0.1],
    [0, 0.035, -0.23],
    materials.metal
  );
  addBox(
    pi,
    `${pi.name}-UsbBlock`,
    [0.1, 0.055, 0.13],
    [0.11, 0.032, -0.2],
    materials.metal
  );
  addBox(
    pi,
    `${pi.name}-Heatsink`,
    [0.14, 0.04, 0.14],
    [-0.06, 0.045, 0.04],
    materials.black
  );
  if (detail.piExtra) {
    addBox(
      pi,
      `${pi.name}-FanHousing`,
      [0.13, 0.025, 0.13],
      [0.08, 0.06, 0.07],
      materials.black
    );
    addBox(
      pi,
      `${pi.name}-GpioHeader`,
      [0.22, 0.035, 0.035],
      [-0.02, 0.044, 0.18],
      materials.pin
    );
  }
  const led = new Mesh(
    new SphereGeometry(0.025, detail.cylinderSegments, 6),
    materials.ledGreen.clone()
  );
  led.name = `${pi.name}-StatusLed`;
  led.position.set(-0.13, 0.045, -0.16);
  pi.add(led);
  ledNodes.push({
    material: led.material as MeshStandardMaterial,
    offset: tier * 0.7 + slot * 0.31,
  });

  return new Vector3(x, y + 0.13, -0.24);
}

function createMaterials() {
  return {
    wood: new MeshStandardMaterial({
      color: new Color(0x6b3f21),
      roughness: 0.68,
    }),
    darkWood: new MeshStandardMaterial({
      color: new Color(0x3a2416),
      roughness: 0.72,
    }),
    switchBody: new MeshStandardMaterial({
      color: new Color(0x161b20),
      roughness: 0.52,
      metalness: 0.35,
    }),
    port: new MeshStandardMaterial({
      color: new Color(0x05080a),
      roughness: 0.45,
      metalness: 0.2,
    }),
    yellow: new MeshStandardMaterial({
      color: new Color(0xf2c230),
      roughness: 0.58,
    }),
    pcb: new MeshStandardMaterial({
      color: new Color(0x18583e),
      roughness: 0.5,
      metalness: 0.05,
    }),
    metal: new MeshStandardMaterial({
      color: new Color(0xb8bcc0),
      roughness: 0.28,
      metalness: 0.72,
    }),
    black: new MeshStandardMaterial({
      color: new Color(0x101419),
      roughness: 0.46,
      metalness: 0.25,
    }),
    pin: new MeshStandardMaterial({
      color: new Color(0xd3a648),
      roughness: 0.35,
      metalness: 0.45,
    }),
    cable: new MeshStandardMaterial({
      color: new Color(0x2ca06c),
      roughness: 0.62,
    }),
    uplink: new MeshStandardMaterial({
      color: new Color(0x39a9ff),
      roughness: 0.55,
    }),
    ledGreen: new MeshStandardMaterial({
      color: 0x4dff74,
      emissive: 0x20d94b,
      emissiveIntensity: 0.7,
    }),
    ledAmber: new MeshStandardMaterial({
      color: 0xffc84d,
      emissive: 0xffa000,
      emissiveIntensity: 0.45,
    }),
    wall: new MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.7 }),
  };
}

export function createSugarkubeDeployment(
  options: SugarkubeDeploymentOptions
): SugarkubeDeploymentBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const detail = getDetailConfig(detailPolicy);
  const orientationRadians = options.orientationRadians ?? 0;
  const rootPosition = new Vector3(
    options.position.x,
    options.position.y ?? 0,
    options.position.z
  );
  const group = new Group();
  group.name = 'SugarkubeDeployment';
  group.position.copy(rootPosition);
  group.rotation.y = orientationRadians;
  group.userData.sceneDetailLevel = detailPolicy.level;

  const materials = createMaterials();
  const ledNodes: LedNode[] = [];

  addBox(
    group,
    'SugarkubeTable',
    [TABLE_WIDTH, TABLE_TOP_THICKNESS, TABLE_DEPTH],
    [0, TABLE_HEIGHT, 0],
    materials.wood
  );
  const legX = TABLE_WIDTH / 2 - 0.18;
  const legZ = TABLE_DEPTH / 2 - 0.18;
  [
    [-legX, -legZ],
    [legX, -legZ],
    [-legX, legZ],
    [legX, legZ],
  ].forEach(([x, z], index) => {
    addBox(
      group,
      `SugarkubeTableLeg-${index}`,
      [0.13, TABLE_HEIGHT, 0.13],
      [x, TABLE_HEIGHT / 2, z],
      materials.darkWood
    );
  });
  addBox(
    group,
    'SugarkubeTableRearBrace',
    [TABLE_WIDTH - 0.35, 0.07, 0.06],
    [0, 0.38, -legZ],
    materials.darkWood
  );

  const switchY = TABLE_HEIGHT + TABLE_TOP_THICKNESS / 2 + SWITCH_HEIGHT / 2;
  addBox(
    group,
    'SugarkubeNetworkSwitch',
    [SWITCH_WIDTH, SWITCH_HEIGHT, SWITCH_DEPTH],
    [0, switchY, -0.04],
    materials.switchBody
  );
  addBox(
    group,
    'SugarkubeNameplate',
    [0.44, 0.028, 0.035],
    [0, switchY + 0.03, SWITCH_DEPTH / 2 - 0.02],
    materials.yellow
  );
  const portY = switchY + 0.012;
  const portZ = SWITCH_DEPTH / 2 + 0.006;
  const switchPorts: Vector3[] = [];
  for (let port = 0; port < 10; port += 1) {
    const px = -0.63 + port * 0.14;
    switchPorts.push(new Vector3(px, portY + 0.07, portZ));
    addBox(
      group,
      `SugarkubeSwitchPort-${port}`,
      [0.095, 0.055, detail.portDepth],
      [px, portY, portZ],
      materials.port
    );
    addBox(
      group,
      `SugarkubeSwitchPortLed-${port}`,
      [0.028, 0.018, 0.015],
      [px + 0.035, portY + 0.045, portZ + 0.02],
      port % 2 ? materials.ledAmber : materials.ledGreen
    );
  }
  for (let vent = 0; vent < detail.switchVents; vent += 1) {
    addBox(
      group,
      `SugarkubeSwitchVent-${vent}`,
      [0.035, 0.012, 0.2],
      [-0.66 + vent * 0.12, switchY + 0.085, -0.18],
      materials.black
    );
  }

  const trayGeometry = new BoxGeometry(RACK_WIDTH, 0.055, RACK_DEPTH);
  TIER_HEIGHTS.forEach((tierY, tier) => {
    const tray = new Mesh(trayGeometry, materials.yellow);
    tray.name = `SugarkubeRackTier-${tier}`;
    tray.position.set(0, tierY, 0.02);
    group.add(tray);
    for (let rib = 0; rib < detail.trayRibs; rib += 1) {
      addBox(
        group,
        `SugarkubeRackTier-${tier}-LayerRib-${rib}`,
        [RACK_WIDTH, 0.018, 0.018],
        [0, tierY + 0.04 + rib * 0.012, -RACK_DEPTH / 2 + 0.06 + rib * 0.08],
        materials.yellow
      );
    }
  });
  const pillarGeometry = new CylinderGeometry(
    0.045,
    0.045,
    0.9,
    detail.cylinderSegments
  );
  [
    [-0.58, -0.31],
    [0.58, -0.31],
    [-0.58, 0.35],
    [0.58, 0.35],
  ].forEach(([x, z], index) => {
    const pillar = new Mesh(pillarGeometry, materials.yellow);
    pillar.name = `SugarkubeRackCornerPillar-${index}`;
    pillar.position.set(x, 1.42, z);
    group.add(pillar);
  });

  const cableStarts: Vector3[] = [];
  TIER_HEIGHTS.forEach((tierY, tier) => {
    [-0.38, 0, 0.38].forEach((x, slot) => {
      cableStarts.push(
        addPi(group, tier, slot, tierY, x, materials, detail, ledNodes)
      );
      const standY = tierY + 0.07;
      [-0.12, 0.12].forEach((dx, standoff) => {
        const stand = new Mesh(
          new CylinderGeometry(0.014, 0.014, 0.09, detail.cylinderSegments),
          materials.metal
        );
        stand.name = `SugarkubePi-${tier}-${slot}-Standoff-${standoff}`;
        stand.position.set(x + dx, standY, 0.18);
        group.add(stand);
      });
    });
  });

  cableStarts.forEach((start, index) => {
    const tier = Math.floor(index / 3);
    const slot = index % 3;
    const combX = -0.5 + slot * 0.5;
    addCable(
      group,
      `SugarkubeEthernetCable-${index}`,
      [
        start,
        new Vector3(combX, 1.02 + tier * 0.08, 0.5),
        new Vector3(switchPorts[index].x, switchPorts[index].y + 0.08, 0.48),
        switchPorts[index],
      ],
      materials.cable,
      detail
    );
  });
  addBox(
    group,
    'SugarkubeCableComb',
    [1.08, 0.05, 0.07],
    [0, 1.04, 0.5],
    materials.black
  );

  const inverseEndpoint = new Vector3(
    options.wallEndpoint.x - rootPosition.x,
    (options.wallEndpoint.y ?? 0) - rootPosition.y,
    options.wallEndpoint.z - rootPosition.z
  ).applyAxisAngle(new Vector3(0, 1, 0), -orientationRadians);
  const plateY = inverseEndpoint.y + 0.62;
  addCable(
    group,
    'SugarkubeUplinkCable',
    [
      switchPorts[9],
      new Vector3(0.68, switchY + 0.02, 0.42),
      new Vector3(0.9, 0.16, 0.72),
      new Vector3(inverseEndpoint.x, 0.035, inverseEndpoint.z + 0.34),
      new Vector3(inverseEndpoint.x, plateY - 0.18, inverseEndpoint.z + 0.04),
    ],
    materials.uplink,
    detail,
    0.02
  );
  const plate = addBox(
    group,
    'SugarkubeWallPlate',
    [0.42, 0.32, 0.035],
    [inverseEndpoint.x, plateY, inverseEndpoint.z],
    materials.wall
  );
  plate.rotation.y =
    (options.wallEndpoint.orientationRadians ?? Math.PI) - orientationRadians;
  const rj45 = addBox(
    plate,
    'SugarkubeWallPlate-RJ45',
    [0.16, 0.08, 0.022],
    [0, -0.02, 0.024],
    materials.port
  );
  rj45.name = 'SugarkubeWallPlateRJ45';

  const colliders = [
    createRotatedCollider(
      rootPosition,
      TABLE_WIDTH,
      TABLE_DEPTH,
      orientationRadians
    ),
  ];
  colliders[0].debugName = 'SugarkubeDeploymentCollider';

  const update = ({
    elapsed,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    ledNodes.forEach((node, index) => {
      const pulse = Math.max(
        0,
        Math.sin(elapsed * 3.8 + node.offset + index * 0.17)
      );
      node.material.emissiveIntensity =
        MathUtils.lerp(0.32, 1.25, pulse) * MathUtils.lerp(1, 1.4, emphasis);
    });
  };

  return { group, colliders, update };
}
