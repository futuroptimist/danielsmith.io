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

import type { RectCollider } from '../collision';
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
  wallNetworkEndpoint: {
    x: number;
    y?: number;
    z: number;
    orientationRadians?: number;
  };
}

interface LedNode {
  material: MeshStandardMaterial;
  baseIntensity: number;
  offset: number;
}

const TABLE_WIDTH = 2.8;
const TABLE_DEPTH = 2.08;
const TABLE_HEIGHT = 0.86;
const TABLE_TOP_THICKNESS = 0.16;
const SWITCH_WIDTH = 1.55;
const SWITCH_DEPTH = 0.62;
const SWITCH_HEIGHT = 0.18;
const RACK_WIDTH = 1.34;
const RACK_DEPTH = 0.78;
const TIER_SPACING = 0.34;
const TIER_THICKNESS = 0.055;
const BOARD_WIDTH = 0.31;
const BOARD_DEPTH = 0.43;

const createMat = (color: number, metalness = 0.08, roughness = 0.55) =>
  new MeshStandardMaterial({ color: new Color(color), metalness, roughness });

function createCollider(
  center: { x: number; z: number },
  width: number,
  depth: number,
  rotation: number
): RectCollider & { debugName: string } {
  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const xs = corners.map(([x, z]) => center.x + x * cos - z * sin);
  const zs = corners.map(([x, z]) => center.z + x * sin + z * cos);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    debugName: 'SugarkubeDeploymentCollider',
  };
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
  radius: number,
  tubularSegments: number,
  radialSegments: number,
  material: MeshStandardMaterial
): Mesh {
  const mesh = new Mesh(
    new TubeGeometry(
      new CatmullRomCurve3(points),
      tubularSegments,
      radius,
      radialSegments,
      false
    ),
    material
  );
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

const detailSettings = (level: SceneDetailPolicy['level']) => {
  if (level === 'cinematic') {
    return { cableSeg: 24, cableRad: 10, cyl: 24, extras: true, mid: true };
  }
  if (level === 'performance') {
    return { cableSeg: 4, cableRad: 3, cyl: 5, extras: false, mid: false };
  }
  return { cableSeg: 12, cableRad: 6, cyl: 10, extras: false, mid: true };
};

export function createSugarkubeDeployment(
  options: SugarkubeDeploymentOptions
): SugarkubeDeploymentBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const detail = detailSettings(detailPolicy.level);
  const position = new Vector3(
    options.position.x,
    options.position.y ?? 0,
    options.position.z
  );
  const orientation = options.orientationRadians ?? 0;
  const group = new Group();
  group.name = 'SugarkubeDeployment';
  group.position.copy(position);
  group.rotation.y = orientation;
  group.userData.detailLevel = detailPolicy.level;

  const wood = createMat(0x6b3f21, 0.04, 0.48);
  const dark = createMat(0x15191d, 0.36, 0.38);
  const yellow = createMat(0xf3c21a, 0.02, 0.44);
  const green = createMat(0x14613d, 0.12, 0.45);
  const silver = createMat(0xb8c0c7, 0.55, 0.3);
  const black = createMat(0x111315, 0.22, 0.5);
  const cableMat = createMat(0x2fb7ff, 0.02, 0.35);
  const ledMaterials: LedNode[] = [];

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
    for (const z of [-1, 1]) {
      addBox(
        table,
        `SugarkubeTableLeg-${x}-${z}`,
        [0.16, TABLE_HEIGHT, 0.16],
        [x * 1.18, TABLE_HEIGHT / 2, z * 0.82],
        wood
      );
    }
  addBox(
    table,
    'SugarkubeTableRearBrace',
    [2.35, 0.08, 0.08],
    [0, 0.52, -0.86],
    wood
  );
  addBox(
    table,
    'SugarkubeTableFrontBrace',
    [2.35, 0.08, 0.08],
    [0, 0.52, 0.86],
    wood
  );

  const switchY = TABLE_HEIGHT + TABLE_TOP_THICKNESS / 2 + SWITCH_HEIGHT / 2;
  const netSwitch = new Group();
  netSwitch.name = 'SugarkubeNetworkSwitch';
  netSwitch.position.y = switchY;
  group.add(netSwitch);
  addBox(
    netSwitch,
    'SugarkubeNetworkSwitchHousing',
    [SWITCH_WIDTH, SWITCH_HEIGHT, SWITCH_DEPTH],
    [0, 0, 0],
    dark
  );
  for (let port = 0; port < 10; port += 1) {
    const x = -0.62 + port * 0.138;
    addBox(
      netSwitch,
      `SugarkubeSwitchPort-${port}`,
      [0.09, 0.052, 0.028],
      [x, 0.015, SWITCH_DEPTH / 2 + 0.015],
      black
    );
    const led = new Mesh(
      new BoxGeometry(0.028, 0.02, 0.012),
      createMat(port % 2 ? 0x37ff62 : 0xff3b2e, 0.1, 0.25)
    );
    led.name = `SugarkubeSwitchPortLed-${port}`;
    led.position.set(x, 0.06, SWITCH_DEPTH / 2 + 0.018);
    netSwitch.add(led);
    ledMaterials.push({
      material: led.material as MeshStandardMaterial,
      baseIntensity: 0.18,
      offset: port * 0.21,
    });
  }
  addBox(
    netSwitch,
    'SugarkubeNameplate',
    [0.48, 0.035, 0.018],
    [0, 0.08, -SWITCH_DEPTH / 2 - 0.012],
    yellow
  );

  const rackBaseY = switchY + SWITCH_HEIGHT / 2 + TIER_THICKNESS / 2 + 0.045;
  const pillarGeom = new CylinderGeometry(
    0.035,
    0.035,
    TIER_SPACING * 2 + 0.28,
    detail.cyl
  );
  const pillarOffsets = [
    [-RACK_WIDTH / 2 + 0.08, -RACK_DEPTH / 2 + 0.08],
    [RACK_WIDTH / 2 - 0.08, -RACK_DEPTH / 2 + 0.08],
    [-RACK_WIDTH / 2 + 0.08, RACK_DEPTH / 2 - 0.08],
    [RACK_WIDTH / 2 - 0.08, RACK_DEPTH / 2 - 0.08],
  ];
  pillarOffsets.forEach(([x, z], index) => {
    const pillar = new Mesh(pillarGeom, yellow);
    pillar.name = `SugarkubeRackPillar-${index}`;
    pillar.position.set(x, rackBaseY + TIER_SPACING, z);
    group.add(pillar);
  });

  for (let tier = 0; tier < 3; tier += 1) {
    const tierY = rackBaseY + tier * TIER_SPACING;
    const tray = new Group();
    tray.name = `SugarkubeRackTier-${tier}`;
    tray.position.y = tierY;
    group.add(tray);
    addBox(
      tray,
      `SugarkubeRackTierPlate-${tier}`,
      [RACK_WIDTH, TIER_THICKNESS, RACK_DEPTH],
      [0, 0, 0],
      yellow
    );
    addBox(
      tray,
      `SugarkubeRackTierFrontLip-${tier}`,
      [RACK_WIDTH, 0.045, 0.035],
      [0, 0.045, RACK_DEPTH / 2],
      yellow
    );
    addBox(
      tray,
      `SugarkubeRackTierRearLip-${tier}`,
      [RACK_WIDTH, 0.045, 0.035],
      [0, 0.045, -RACK_DEPTH / 2],
      yellow
    );
    if (detail.extras) {
      for (const z of [-0.18, 0, 0.18])
        addBox(
          tray,
          `SugarkubeRackLayerRib-${tier}-${z}`,
          [RACK_WIDTH, 0.012, 0.012],
          [0, 0.07, z],
          yellow
        );
    }
    for (let slot = 0; slot < 3; slot += 1) {
      const pi = new Group();
      pi.name = `SugarkubePi-${tier}-${slot}`;
      pi.position.set((slot - 1) * 0.41, 0.075, 0.02);
      tray.add(pi);
      addBox(
        pi,
        `SugarkubePiBoard-${tier}-${slot}`,
        [BOARD_WIDTH, 0.035, BOARD_DEPTH],
        [0, 0, 0],
        green
      );
      addBox(
        pi,
        `SugarkubePiEthernetJack-${tier}-${slot}`,
        [0.09, 0.065, 0.085],
        [0.085, 0.045, BOARD_DEPTH / 2 - 0.045],
        silver
      );
      addBox(
        pi,
        `SugarkubePiUsbBlock-${tier}-${slot}`,
        [0.095, 0.06, 0.075],
        [-0.075, 0.045, BOARD_DEPTH / 2 - 0.05],
        silver
      );
      addBox(
        pi,
        `SugarkubePiHeatsink-${tier}-${slot}`,
        [0.12, 0.04, 0.1],
        [0, 0.055, -0.035],
        black
      );
      if (detail.mid)
        addBox(
          pi,
          `SugarkubePiConnector-${tier}-${slot}`,
          [0.22, 0.028, 0.026],
          [0, 0.04, -0.18],
          black
        );
      const ledMat = createMat(
        (tier + slot) % 2 ? 0x39ff64 : 0xff3a2d,
        0.06,
        0.24
      );
      ledMat.emissive = new Color((tier + slot) % 2 ? 0x0cff45 : 0xff2415);
      ledMat.emissiveIntensity = 0.35;
      const led = new Mesh(new BoxGeometry(0.035, 0.022, 0.025), ledMat);
      led.name = `SugarkubePiStatusLed-${tier}-${slot}`;
      led.position.set(-0.12, 0.06, -0.16);
      pi.add(led);
      ledMaterials.push({
        material: ledMat,
        baseIntensity: 0.35,
        offset: tier * 0.8 + slot * 0.31,
      });

      const cableIndex = tier * 3 + slot;
      const start = new Vector3(
        (slot - 1) * 0.41 + 0.085,
        tierY + 0.15,
        BOARD_DEPTH / 2 + 0.02
      );
      const end = new Vector3(
        -0.62 + cableIndex * 0.138,
        switchY + 0.06,
        SWITCH_DEPTH / 2 + 0.045
      );
      addCable(
        group,
        `SugarkubeEthernetCable-${cableIndex}`,
        [
          start,
          new Vector3(start.x, start.y + 0.07, 0.62),
          new Vector3(end.x, end.y + 0.12, 0.62),
          end,
        ],
        0.014,
        detail.cableSeg,
        detail.cableRad,
        cableMat
      );
    }
  }
  addBox(
    group,
    'SugarkubeCableComb',
    [1.28, 0.045, 0.06],
    [0, rackBaseY - 0.055, 0.63],
    yellow
  );

  const inverseEndpoint = new Vector3(
    options.wallNetworkEndpoint.x,
    options.wallNetworkEndpoint.y ?? 0.42,
    options.wallNetworkEndpoint.z
  );
  inverseEndpoint
    .sub(position)
    .applyAxisAngle(new Vector3(0, 1, 0), -orientation);
  const uplinkStart = new Vector3(
    0.72,
    switchY + 0.04,
    SWITCH_DEPTH / 2 + 0.05
  );
  addCable(
    group,
    'SugarkubeUplinkCable',
    [
      uplinkStart,
      new Vector3(1.12, 0.62, 0.92),
      new Vector3(1.18, 0.05, 0.92),
      new Vector3(inverseEndpoint.x, 0.035, inverseEndpoint.z + 0.18),
      new Vector3(
        inverseEndpoint.x,
        inverseEndpoint.y - 0.08,
        inverseEndpoint.z + 0.035
      ),
    ],
    0.016,
    detail.cableSeg * 2,
    detail.cableRad,
    cableMat
  );

  const wallPlate = new Group();
  wallPlate.name = 'SugarkubeWallPlate';
  wallPlate.position.copy(inverseEndpoint);
  wallPlate.rotation.y =
    (options.wallNetworkEndpoint.orientationRadians ?? 0) - orientation;
  group.add(wallPlate);
  addBox(
    wallPlate,
    'SugarkubeWallPlateFace',
    [0.34, 0.24, 0.035],
    [0, 0, 0],
    createMat(0xf2eadc, 0, 0.42)
  );
  addBox(
    wallPlate,
    'SugarkubeWallPlateRJ45Port',
    [0.16, 0.09, 0.025],
    [0, -0.02, 0.025],
    black
  );
  if (detail.extras) {
    const screwGeom = new CylinderGeometry(0.018, 0.018, 0.012, detail.cyl);
    for (const y of [-0.075, 0.075]) {
      const screw = new Mesh(screwGeom, silver);
      screw.name = `SugarkubeWallPlateScrew-${y}`;
      screw.rotation.x = Math.PI / 2;
      screw.position.set(0, y, 0.03);
      wallPlate.add(screw);
    }
  }

  const colliders = [
    createCollider(
      { x: position.x, z: position.z },
      TABLE_WIDTH,
      TABLE_DEPTH,
      orientation
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
    ledMaterials.forEach((node, index) => {
      node.material.emissiveIntensity =
        node.baseIntensity *
        MathUtils.lerp(
          0.75,
          1.9,
          Math.max(0, Math.sin(elapsed * 3.1 + node.offset + index * 0.07))
        ) *
        MathUtils.lerp(1, 1.35, emphasis);
    });
  };
  return { group, colliders, update };
}
