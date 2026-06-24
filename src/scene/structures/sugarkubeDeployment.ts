import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../../systems/collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

export interface SugarkubeDeploymentBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface SugarkubeDeploymentOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
  wallEndpoint: {
    x: number;
    y?: number;
    z: number;
    orientationRadians?: number;
  };
}

interface DetailConfig {
  cableTubularSegments: number;
  cableRadialSegments: number;
  pillarSegments: number;
  standoffSegments: number;
  includeFineDetails: boolean;
  includeMediumDetails: boolean;
}

const TABLE_WIDTH = 2.8;
const TABLE_DEPTH = 2.1;
const TABLE_HEIGHT = 0.76;
const TABLE_TOP_THICKNESS = 0.16;
const SWITCH_WIDTH = 1.58;
const SWITCH_DEPTH = 0.68;
const SWITCH_HEIGHT = 0.16;
const RACK_WIDTH = 1.34;
const RACK_DEPTH = 0.82;
const TIER_Y = [1.02, 1.32, 1.62] as const;

function getDetailConfig(policy: SceneDetailPolicy): DetailConfig {
  if (policy.level === 'performance') {
    return {
      cableTubularSegments: 3,
      cableRadialSegments: 3,
      pillarSegments: 6,
      standoffSegments: 4,
      includeFineDetails: false,
      includeMediumDetails: false,
    };
  }
  if (policy.level === 'balanced') {
    return {
      cableTubularSegments: 6,
      cableRadialSegments: 4,
      pillarSegments: 10,
      standoffSegments: 6,
      includeFineDetails: false,
      includeMediumDetails: true,
    };
  }
  return {
    cableTubularSegments: 12,
    cableRadialSegments: 6,
    pillarSegments: 16,
    standoffSegments: 10,
    includeFineDetails: true,
    includeMediumDetails: true,
  };
}

function colliderForTable(position: Vector3, rotation: number): RectCollider {
  const halfWidth = TABLE_WIDTH / 2;
  const halfDepth = TABLE_DEPTH / 2;
  const corners = [
    new Vector3(-halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, halfDepth),
    new Vector3(-halfWidth, 0, halfDepth),
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  corners.forEach((corner) => {
    const x = position.x + corner.x * cos - corner.z * sin;
    const z = position.z + corner.x * sin + corner.z * cos;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });
  return { minX, maxX, minZ, maxZ };
}

function addBox(
  parent: Group,
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
  parent: Group,
  name: string,
  points: Vector3[],
  config: DetailConfig,
  material: MeshStandardMaterial,
  radius = 0.018
): void {
  const curve = new CatmullRomCurve3(points);
  const cable = new Mesh(
    new TubeGeometry(
      curve,
      config.cableTubularSegments,
      radius,
      config.cableRadialSegments,
      false
    ),
    material
  );
  cable.name = name;
  parent.add(cable);
}

export function createSugarkubeDeployment(
  options: SugarkubeDeploymentOptions
): SugarkubeDeploymentBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const config = getDetailConfig(detailPolicy);
  const root = new Group();
  root.name = 'SugarkubeDeployment';
  root.position.set(
    options.position.x,
    options.position.y ?? 0,
    options.position.z
  );
  root.rotation.y = options.orientationRadians ?? 0;

  const wood = new MeshStandardMaterial({
    color: new Color(0x7a4a25),
    roughness: 0.7,
  });
  const yellow = new MeshStandardMaterial({
    color: new Color(0xffc21c),
    roughness: 0.62,
  });
  const dark = new MeshStandardMaterial({
    color: new Color(0x16191d),
    roughness: 0.55,
    metalness: 0.35,
  });
  const pcb = new MeshStandardMaterial({
    color: new Color(0x0f5b43),
    roughness: 0.65,
  });
  const metal = new MeshStandardMaterial({
    color: new Color(0xc6c9c7),
    roughness: 0.33,
    metalness: 0.8,
  });
  const black = new MeshStandardMaterial({
    color: new Color(0x1b2228),
    roughness: 0.55,
  });
  const cableMat = new MeshStandardMaterial({
    color: new Color(0x2d7ed0),
    roughness: 0.5,
  });
  const uplinkMat = new MeshStandardMaterial({
    color: new Color(0xf2f0d5),
    roughness: 0.48,
  });
  const ledMaterials: MeshStandardMaterial[] = [];

  const table = new Group();
  table.name = 'SugarkubeTable';
  root.add(table);
  addBox(
    table,
    'SugarkubeTableTop',
    [TABLE_WIDTH, TABLE_TOP_THICKNESS, TABLE_DEPTH],
    [0, TABLE_HEIGHT, 0],
    wood
  );
  const legPositions: Array<[number, number]> = [
    [-1.18, -0.82],
    [1.18, -0.82],
    [-1.18, 0.82],
    [1.18, 0.82],
  ];
  legPositions.forEach(([x, z], index) => {
    addBox(
      table,
      `SugarkubeTableLeg-${index}`,
      [0.16, TABLE_HEIGHT, 0.16],
      [x, TABLE_HEIGHT / 2, z],
      wood
    );
  });
  addBox(
    table,
    'SugarkubeTableRearBrace',
    [2.35, 0.08, 0.08],
    [0, 0.48, -0.86],
    wood
  );
  addBox(
    table,
    'SugarkubeTableFrontBrace',
    [2.35, 0.08, 0.08],
    [0, 0.48, 0.86],
    wood
  );

  const switchY = TABLE_HEIGHT + TABLE_TOP_THICKNESS / 2 + SWITCH_HEIGHT / 2;
  const networkSwitch = new Group();
  networkSwitch.name = 'SugarkubeNetworkSwitch';
  root.add(networkSwitch);
  addBox(
    networkSwitch,
    'SugarkubeNetworkSwitchHousing',
    [SWITCH_WIDTH, SWITCH_HEIGHT, SWITCH_DEPTH],
    [0, switchY, 0],
    dark
  );
  for (let port = 0; port < 10; port += 1) {
    const x = -0.68 + port * 0.15;
    addBox(
      networkSwitch,
      `SugarkubeSwitchPort-${port}`,
      [0.1, 0.055, 0.035],
      [x, switchY + 0.012, SWITCH_DEPTH / 2 + 0.02],
      black
    );
    const led = addBox(
      networkSwitch,
      `SugarkubeSwitchLed-${port}`,
      [0.035, 0.025, 0.018],
      [x + 0.04, switchY + 0.055, SWITCH_DEPTH / 2 + 0.025],
      new MeshStandardMaterial({
        color: port % 2 ? 0x47ff84 : 0xffc247,
        emissive: port % 2 ? 0x1bd057 : 0xd68600,
        emissiveIntensity: 0.45,
      })
    );
    ledMaterials.push(led.material as MeshStandardMaterial);
  }
  if (config.includeMediumDetails) {
    for (let vent = 0; vent < (config.includeFineDetails ? 10 : 5); vent += 1) {
      addBox(
        networkSwitch,
        `SugarkubeSwitchVent-${vent}`,
        [0.025, 0.012, 0.32],
        [-0.72 + vent * 0.16, switchY + 0.087, -0.02],
        black
      );
    }
    addBox(
      networkSwitch,
      'SugarkubeNameplate',
      [0.46, 0.035, 0.025],
      [0, switchY + 0.09, -SWITCH_DEPTH / 2 - 0.015],
      yellow
    );
  }

  const pillarGeometry = new CylinderGeometry(
    0.04,
    0.04,
    0.82,
    config.pillarSegments
  );
  const pillarY = (TIER_Y[0] + TIER_Y[2]) / 2;
  const pillars = new Group();
  pillars.name = 'SugarkubeRackPillars';
  root.add(pillars);
  [
    [-0.58, -0.34],
    [0.58, -0.34],
    [-0.58, 0.34],
    [0.58, 0.34],
  ].forEach(([x, z], index) => {
    const pillar = new Mesh(pillarGeometry, yellow);
    pillar.name = `SugarkubeCornerPillar-${index}`;
    pillar.position.set(x, pillarY, z);
    pillars.add(pillar);
  });

  TIER_Y.forEach((tierY, tier) => {
    const tray = addBox(
      root,
      `SugarkubeRackTier-${tier}`,
      [RACK_WIDTH, 0.055, RACK_DEPTH],
      [0, tierY, 0],
      yellow
    );
    if (config.includeMediumDetails) {
      addBox(
        root,
        `SugarkubeRackTierLip-${tier}`,
        [RACK_WIDTH + 0.08, 0.035, 0.04],
        [0, tierY + 0.045, -RACK_DEPTH / 2],
        yellow
      );
      addBox(
        root,
        `SugarkubeRackTierLayerRib-${tier}`,
        [RACK_WIDTH + 0.06, 0.018, 0.035],
        [0, tierY - 0.045, RACK_DEPTH / 2],
        yellow
      );
    }
    tray.userData.sugarkubeTier = tier;
    for (let slot = 0; slot < 3; slot += 1) {
      const pi = new Group();
      pi.name = `SugarkubePi-${tier}-${slot}`;
      const piX = -0.42 + slot * 0.42;
      const piZ = 0.02;
      pi.position.set(piX, tierY + 0.065, piZ);
      root.add(pi);
      addBox(
        pi,
        `SugarkubePiBoard-${tier}-${slot}`,
        [0.32, 0.028, 0.48],
        [0, 0, 0],
        pcb
      );
      addBox(
        pi,
        `SugarkubePiEthernet-${tier}-${slot}`,
        [0.11, 0.07, 0.1],
        [0.105, 0.045, 0.24],
        metal
      );
      addBox(
        pi,
        `SugarkubePiUsb-${tier}-${slot}`,
        [0.11, 0.06, 0.12],
        [-0.105, 0.04, 0.23],
        metal
      );
      addBox(
        pi,
        `SugarkubePiHeatsink-${tier}-${slot}`,
        [0.13, 0.055, 0.16],
        [0, 0.055, -0.05],
        black
      );
      const led = addBox(
        pi,
        `SugarkubePiLed-${tier}-${slot}`,
        [0.035, 0.024, 0.035],
        [-0.12, 0.045, -0.2],
        new MeshStandardMaterial({
          color: slot % 2 ? 0x3cff7a : 0xff4b3c,
          emissive: slot % 2 ? 0x1bbb55 : 0xc91f16,
          emissiveIntensity: 0.55,
        })
      );
      ledMaterials.push(led.material as MeshStandardMaterial);
      if (config.includeMediumDetails) {
        const standoffGeometry = new CylinderGeometry(
          0.014,
          0.014,
          0.055,
          config.standoffSegments
        );
        [
          [-0.13, -0.19],
          [0.13, -0.19],
          [-0.13, 0.19],
          [0.13, 0.19],
        ].forEach(([sx, sz], standoff) => {
          const post = new Mesh(standoffGeometry, metal);
          post.name = `SugarkubePiStandoff-${tier}-${slot}-${standoff}`;
          post.position.set(sx, -0.04, sz);
          pi.add(post);
        });
      }
      if (config.includeFineDetails) {
        addBox(
          pi,
          `SugarkubePiFan-${tier}-${slot}`,
          [0.1, 0.035, 0.1],
          [0, 0.095, -0.05],
          black
        );
      }
      const cableStart = new Vector3(piX + 0.105, tierY + 0.12, piZ + 0.3);
      const cableEnd = new Vector3(
        -0.68 + (tier * 3 + slot) * 0.15,
        switchY + 0.04,
        SWITCH_DEPTH / 2 + 0.08
      );
      addCable(
        root,
        `SugarkubeEthernetCable-${tier * 3 + slot}`,
        [
          cableStart,
          new Vector3(piX, tierY + 0.22, 0.52 + slot * 0.02),
          new Vector3(cableEnd.x, switchY + 0.24, 0.56),
          cableEnd,
        ],
        config,
        cableMat
      );
    }
  });

  for (let clip = 0; clip < 3; clip += 1) {
    addBox(
      root,
      `SugarkubeCableComb-${clip}`,
      [0.1, 0.055, 0.08],
      [-0.25 + clip * 0.25, switchY + 0.22, 0.54],
      yellow
    );
  }

  const localEndpoint = new Vector3(
    options.wallEndpoint.x,
    options.wallEndpoint.y ?? 0.38,
    options.wallEndpoint.z
  );
  root.worldToLocal(localEndpoint);
  const uplinkStart = new Vector3(
    0.68,
    switchY + 0.04,
    SWITCH_DEPTH / 2 + 0.08
  );
  addCable(
    root,
    'SugarkubeUplinkCable',
    [
      uplinkStart,
      new Vector3(1.05, 0.9, 0.72),
      new Vector3(1.05, 0.05, 0.95),
      new Vector3(localEndpoint.x, 0.045, localEndpoint.z + 0.35),
      localEndpoint,
    ],
    config,
    uplinkMat,
    0.021
  );

  const wallPlate = new Group();
  wallPlate.name = 'SugarkubeWallPlate';
  wallPlate.position.copy(localEndpoint);
  wallPlate.rotation.y =
    (options.wallEndpoint.orientationRadians ?? 0) - root.rotation.y;
  root.add(wallPlate);
  addBox(
    wallPlate,
    'SugarkubeWallPlateFace',
    [0.34, 0.24, 0.035],
    [0, 0, 0],
    new MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.5 })
  );
  addBox(
    wallPlate,
    'SugarkubeWallPlateRJ45',
    [0.16, 0.08, 0.045],
    [0, -0.005, 0.025],
    black
  );

  const update = ({
    elapsed,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    ledMaterials.forEach((material, index) => {
      const pulse =
        0.5 + 0.5 * Math.sin(elapsed * (2.2 + (index % 3) * 0.3) + index);
      material.emissiveIntensity =
        MathUtils.lerp(0.28, 0.9, pulse) * MathUtils.lerp(1, 1.5, emphasis);
    });
  };

  const collider = colliderForTable(root.position, root.rotation.y);
  (collider as RectCollider & { debugName: string }).debugName =
    'SugarkubeDeploymentCollider';
  return { group: root, colliders: [collider], update };
}
