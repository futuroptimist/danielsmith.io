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
  TubeGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

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

export interface SugarkubeDeploymentBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

interface DetailSpec {
  cableRadialSegments: number;
  cableTubularSegments: number;
  cylinderSegments: number;
  sphereSegments: number;
  richPiDetails: boolean;
  trayRibs: number;
}

const TABLE_WIDTH = 2.8;
const TABLE_DEPTH = 2.08;
const TABLE_HEIGHT = 0.86;
const TABLE_TOP_THICKNESS = 0.16;
const SWITCH_WIDTH = 1.55;
const SWITCH_DEPTH = 0.76;
const SWITCH_HEIGHT = 0.18;
const RACK_WIDTH = 1.28;
const RACK_DEPTH = 0.7;
const RACK_TIER_GAP = 0.34;
const RACK_BASE_Y = TABLE_HEIGHT + SWITCH_HEIGHT + 0.08;
const PI_WIDTH = 0.32;
const PI_DEPTH = 0.48;

const detailSpecs: Record<SceneDetailPolicy['level'], DetailSpec> = {
  cinematic: {
    cableRadialSegments: 10,
    cableTubularSegments: 24,
    cylinderSegments: 18,
    sphereSegments: 12,
    richPiDetails: true,
    trayRibs: 4,
  },
  balanced: {
    cableRadialSegments: 6,
    cableTubularSegments: 12,
    cylinderSegments: 10,
    sphereSegments: 8,
    richPiDetails: false,
    trayRibs: 2,
  },
  performance: {
    cableRadialSegments: 4,
    cableTubularSegments: 5,
    cylinderSegments: 5,
    sphereSegments: 4,
    richPiDetails: false,
    trayRibs: 0,
  },
};

function createRotatedCollider(
  center: Vector3,
  width: number,
  depth: number,
  rotation: number,
  debugName: string
): RectCollider {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const corners = [
    new Vector3(-halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, halfDepth),
    new Vector3(-halfWidth, 0, halfDepth),
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  corners.forEach((corner) => {
    const x = center.x + corner.x * cos - corner.z * sin;
    const z = center.z + corner.x * sin + corner.z * cos;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });
  return { minX, maxX, minZ, maxZ, debugName } as RectCollider;
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
  spec: DetailSpec,
  material: MeshStandardMaterial,
  radius = 0.022
): Mesh {
  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  const cable = new Mesh(
    new TubeGeometry(
      curve,
      spec.cableTubularSegments,
      radius,
      spec.cableRadialSegments,
      false
    ),
    material
  );
  cable.name = name;
  parent.add(cable);
  return cable;
}

export function createSugarkubeDeployment(
  options: SugarkubeDeploymentOptions
): SugarkubeDeploymentBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const spec = detailSpecs[detailPolicy.level];
  const position = new Vector3(
    options.position.x,
    options.position.y ?? 0,
    options.position.z
  );
  const orientationRadians = options.orientationRadians ?? 0;
  const group = new Group();
  group.name = 'SugarkubeDeployment';
  group.position.copy(position);
  group.rotation.y = orientationRadians;

  const wood = new MeshStandardMaterial({
    color: new Color(0x6b3f22),
    roughness: 0.68,
  });
  const dark = new MeshStandardMaterial({
    color: new Color(0x15191d),
    roughness: 0.5,
    metalness: 0.35,
  });
  const yellow = new MeshStandardMaterial({
    color: new Color(0xf5c21a),
    roughness: 0.5,
  });
  const pcb = new MeshStandardMaterial({
    color: new Color(0x0f6b47),
    roughness: 0.48,
  });
  const metal = new MeshStandardMaterial({
    color: new Color(0xbcc1bf),
    roughness: 0.26,
    metalness: 0.65,
  });
  const black = new MeshStandardMaterial({
    color: new Color(0x101113),
    roughness: 0.55,
  });
  const cableMat = new MeshStandardMaterial({
    color: new Color(0x3ba0ff),
    roughness: 0.34,
  });
  const uplinkMat = new MeshStandardMaterial({
    color: new Color(0xffb23b),
    roughness: 0.34,
  });
  const ledMaterials: MeshStandardMaterial[] = [];

  const table = new Group();
  table.name = 'SugarkubeTable';
  group.add(table);
  addBox(
    table,
    'SugarkubeTableTop',
    [TABLE_WIDTH, TABLE_TOP_THICKNESS, TABLE_DEPTH],
    [0, TABLE_HEIGHT, 0],
    wood
  );
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      addBox(
        table,
        `SugarkubeTableLeg-${x}-${z}`,
        [0.16, TABLE_HEIGHT, 0.16],
        [
          x * (TABLE_WIDTH / 2 - 0.2),
          TABLE_HEIGHT / 2,
          z * (TABLE_DEPTH / 2 - 0.2),
        ],
        wood
      );
  addBox(
    table,
    'SugarkubeTableRearBrace',
    [TABLE_WIDTH - 0.42, 0.08, 0.08],
    [0, 0.38, TABLE_DEPTH / 2 - 0.2],
    wood
  );

  const switchY = TABLE_HEIGHT + TABLE_TOP_THICKNESS / 2 + SWITCH_HEIGHT / 2;
  const networkSwitch = new Group();
  networkSwitch.name = 'SugarkubeNetworkSwitch';
  networkSwitch.position.y = switchY;
  group.add(networkSwitch);
  addBox(
    networkSwitch,
    'SugarkubeSwitchHousing',
    [SWITCH_WIDTH, SWITCH_HEIGHT, SWITCH_DEPTH],
    [0, 0, 0],
    dark
  );
  for (let port = 0; port < 10; port += 1) {
    const x = (port - 4.5) * 0.13;
    addBox(
      networkSwitch,
      `SugarkubeSwitchPort-${port}`,
      [0.09, 0.052, 0.035],
      [x, 0.02, -SWITCH_DEPTH / 2 - 0.012],
      black
    );
    const led = new MeshStandardMaterial({
      color: new Color(0x78ff65),
      emissive: new Color(0x1eff00),
      emissiveIntensity: port % 2 ? 0.45 : 0.8,
    });
    ledMaterials.push(led);
    addBox(
      networkSwitch,
      `SugarkubeSwitchLed-${port}`,
      [0.025, 0.018, 0.012],
      [x + 0.035, 0.065, -SWITCH_DEPTH / 2 - 0.018],
      led
    );
  }
  addBox(
    networkSwitch,
    'SugarkubeNameplate',
    [0.42, 0.045, 0.012],
    [0, 0.075, SWITCH_DEPTH / 2 + 0.012],
    yellow
  );

  const rack = new Group();
  rack.name = 'SugarkubeRack';
  group.add(rack);
  const tierYs = [
    RACK_BASE_Y,
    RACK_BASE_Y + RACK_TIER_GAP,
    RACK_BASE_Y + RACK_TIER_GAP * 2,
  ];
  tierYs.forEach((y, tier) => {
    addBox(
      rack,
      `SugarkubeRackTier-${tier}`,
      [RACK_WIDTH, 0.055, RACK_DEPTH],
      [0, y, 0],
      yellow
    );
    addBox(
      rack,
      `SugarkubeRackTierLip-${tier}-front`,
      [RACK_WIDTH, 0.045, 0.035],
      [0, y + 0.04, -RACK_DEPTH / 2],
      yellow
    );
    addBox(
      rack,
      `SugarkubeRackTierLip-${tier}-rear`,
      [RACK_WIDTH, 0.045, 0.035],
      [0, y + 0.04, RACK_DEPTH / 2],
      yellow
    );
    for (let rib = 0; rib < spec.trayRibs; rib += 1)
      addBox(
        rack,
        `SugarkubeRackLayerRib-${tier}-${rib}`,
        [RACK_WIDTH, 0.012, 0.012],
        [0, y + 0.06 + rib * 0.018, -RACK_DEPTH / 2 - 0.018],
        yellow
      );
  });
  const pillarGeometry = new CylinderGeometry(
    0.04,
    0.04,
    RACK_TIER_GAP * 2 + 0.22,
    spec.cylinderSegments
  );
  for (const [index, x, z] of [
    [0, -1, -1],
    [1, 1, -1],
    [2, -1, 1],
    [3, 1, 1],
  ] as const) {
    const pillar = new Mesh(pillarGeometry, yellow);
    pillar.name = `SugarkubeRackCornerPillar-${index}`;
    pillar.position.set(
      x * (RACK_WIDTH / 2 - 0.08),
      RACK_BASE_Y + RACK_TIER_GAP + 0.04,
      z * (RACK_DEPTH / 2 - 0.08)
    );
    rack.add(pillar);
  }

  for (let tier = 0; tier < 3; tier += 1) {
    for (let slot = 0; slot < 3; slot += 1) {
      const pi = new Group();
      pi.name = `SugarkubePi-${tier}-${slot}`;
      pi.position.set((slot - 1) * 0.38, tierYs[tier] + 0.065, 0.03);
      rack.add(pi);
      addBox(
        pi,
        `SugarkubePiBoard-${tier}-${slot}`,
        [PI_WIDTH, 0.035, PI_DEPTH],
        [0, 0, 0],
        pcb
      );
      addBox(
        pi,
        `SugarkubePiEthernetJack-${tier}-${slot}`,
        [0.12, 0.07, 0.1],
        [0.1, 0.045, -PI_DEPTH / 2 - 0.015],
        metal
      );
      addBox(
        pi,
        `SugarkubePiUsbBlock-${tier}-${slot}`,
        [0.12, 0.06, 0.12],
        [-0.1, 0.04, -PI_DEPTH / 2],
        metal
      );
      addBox(
        pi,
        `SugarkubePiHeatsink-${tier}-${slot}`,
        [0.13, 0.045, 0.14],
        [0, 0.055, 0.04],
        black
      );
      if (spec.richPiDetails)
        addBox(
          pi,
          `SugarkubePiFan-${tier}-${slot}`,
          [0.11, 0.025, 0.11],
          [0, 0.09, 0.12],
          black
        );
      const led = new MeshStandardMaterial({
        color: new Color(slot % 2 ? 0xff4949 : 0x58ff58),
        emissive: new Color(slot % 2 ? 0xff1212 : 0x19ff19),
        emissiveIntensity: 0.65,
      });
      ledMaterials.push(led);
      addBox(
        pi,
        `SugarkubePiStatusLed-${tier}-${slot}`,
        [0.025, 0.015, 0.025],
        [-0.13, 0.06, 0.18],
        led
      );
      addBox(
        pi,
        `SugarkubePiStandoffs-${tier}-${slot}`,
        [0.24, 0.025, 0.025],
        [0, -0.035, 0.18],
        metal
      );
    }
  }

  for (let index = 0; index < 9; index += 1) {
    const tier = Math.floor(index / 3);
    const slot = index % 3;
    const piX = (slot - 1) * 0.38 + 0.1;
    const piY = tierYs[tier] + 0.14;
    const portX = (index - 4) * 0.13;
    addCable(
      group,
      `SugarkubeEthernetCable-${index}`,
      [
        new Vector3(piX, piY, -0.24),
        new Vector3(piX, RACK_BASE_Y - 0.07, -0.55 - tier * 0.04),
        new Vector3(portX, switchY + 0.08, -SWITCH_DEPTH / 2 - 0.08),
      ],
      spec,
      cableMat,
      0.018
    );
  }
  addBox(
    group,
    'SugarkubeCableComb',
    [1.15, 0.04, 0.05],
    [0, RACK_BASE_Y - 0.05, -0.55],
    black
  );

  const wallLocal = group.worldToLocal(
    new Vector3(
      options.wallEndpoint.x,
      options.wallEndpoint.y ?? position.y,
      options.wallEndpoint.z
    )
  );
  addCable(
    group,
    'SugarkubeUplinkCable',
    [
      new Vector3(0.585, switchY + 0.08, -SWITCH_DEPTH / 2 - 0.08),
      new Vector3(1.1, TABLE_HEIGHT * 0.5, -0.82),
      new Vector3(1.1, 0.04, -0.82),
      new Vector3(wallLocal.x, 0.04, wallLocal.z + 0.22),
      new Vector3(wallLocal.x, 0.42, wallLocal.z + 0.04),
    ],
    spec,
    uplinkMat,
    0.02
  );
  const plate = new Group();
  plate.name = 'SugarkubeWallPlate';
  plate.position.copy(wallLocal);
  plate.rotation.y =
    (options.wallEndpoint.orientationRadians ?? 0) - orientationRadians;
  group.add(plate);
  addBox(
    plate,
    'SugarkubeWallPlateFace',
    [0.34, 0.44, 0.035],
    [0, 0.48, 0],
    metal
  );
  addBox(
    plate,
    'SugarkubeWallPlateRJ45',
    [0.16, 0.1, 0.04],
    [0, 0.48, -0.025],
    black
  );

  const colliders = [
    createRotatedCollider(
      position,
      TABLE_WIDTH,
      TABLE_DEPTH,
      orientationRadians,
      'SugarkubeDeploymentCollider'
    ),
  ];
  const update = ({
    elapsed,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    ledMaterials.forEach((material, index) => {
      const pulse = Math.max(0, Math.sin(elapsed * 3.5 + index * 0.71));
      material.emissiveIntensity =
        MathUtils.lerp(0.35, 0.95, pulse) * MathUtils.lerp(1, 1.4, emphasis);
    });
  };
  return { group, colliders, update };
}
