import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';
import {
  getSceneDetailPolicy,
  type SceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';

export interface GreenhouseConfig {
  basePosition: Vector3;
  orientationRadians?: number;
  width?: number;
  depth?: number;
  environmentMap?: Texture | null;
  environmentIntensity?: number;
  detailPolicy?: SceneDetailPolicy;
}
export interface GreenhouseBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number }): void;
}

/** Shared backyard solar growing frame: open rails, leaning panels and containers. */
export function createGreenhouse(config: GreenhouseConfig): GreenhouseBuild {
  const policy = config.detailPolicy ?? getSceneDetailPolicy('balanced');
  const width = config.width ?? 4.6;
  const depth = config.depth ?? 3.2;
  const height = 2.6;
  const rail = 0.075;
  const group = new Group();
  group.name = 'BackyardGreenhouse';
  group.position.copy(config.basePosition);
  group.rotation.y = config.orientationRadians ?? 0;
  const metal = new MeshStandardMaterial({
    color: 0xbfcdd1,
    roughness: 0.4,
    metalness: 0.7,
    envMap: config.environmentMap ?? null,
    envMapIntensity: config.environmentIntensity ?? 0.5,
  });
  const fabric = new MeshStandardMaterial({ color: 0x20282b, roughness: 0.95 });
  const soil = new MeshStandardMaterial({ color: 0x443a2c, roughness: 1 });
  const panelMaterial = new MeshStandardMaterial({
    color: 0x18242b,
    roughness: 0.48,
    metalness: 0.2,
  });
  const cellLine = new MeshStandardMaterial({
    color: 0x7d9098,
    roughness: 0.65,
  });
  const box = (
    parent: Group,
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    material = metal
  ) => {
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  };
  // Reserve space inside the existing exhibit footprint for the leaning panels.
  const frameWidth = width * 0.78;
  const centerX = width * 0.09;
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      box(
        group,
        `BackyardSolarFramePost:${x}:${z}`,
        [rail, height, rail],
        [centerX + (x * frameWidth) / 2, height / 2, z * (depth / 2 - rail)]
      );
    }
  for (const y of [rail / 2, height]) {
    for (const z of [-1, 1])
      box(
        group,
        `BackyardSolarFrameCrossbar:${y}:${z}`,
        [frameWidth, rail, rail],
        [centerX, y, z * (depth / 2 - rail)]
      );
    for (const x of [-1, 1])
      box(
        group,
        `BackyardSolarFrameSideRail:${y}:${x}`,
        [rail, rail, depth - rail],
        [centerX + (x * frameWidth) / 2, y, 0]
      );
  }
  const panels = new Group();
  panels.name = 'BackyardGreenhouseSolarPanels';
  group.add(panels);
  for (let i = 0; i < 3; i++) {
    const panel = new Group();
    panel.name = `BackyardLeaningSolarPanel-${i}`;
    const panelHeight = height * (i === 2 ? 0.62 : 0.83);
    const panelWidth = depth * 0.31;
    panel.position.set(
      -width / 2 + 0.3,
      panelHeight / 2 + 0.06,
      (i - 1) * depth * 0.3
    );
    panel.rotation.z = -0.16;
    panels.add(panel);
    box(
      panel,
      `BackyardSolarPanelFrame-${i}`,
      [0.065, panelHeight, panelWidth],
      [0, 0, 0]
    );
    box(
      panel,
      `BackyardSolarPanelCells-${i}`,
      [0.07, panelHeight - 0.08, panelWidth - 0.07],
      [-0.008, 0, 0],
      panelMaterial
    );
    for (let row = 1; row < 6; row++)
      box(
        panel,
        `BackyardSolarCellRow:${i}:${row}`,
        [0.012, 0.012, panelWidth - 0.08],
        [-0.05, -panelHeight / 2 + (row * panelHeight) / 6, 0],
        cellLine
      );
    box(
      panel,
      `BackyardSolarCellColumn:${i}`,
      [0.012, panelHeight - 0.08, 0.012],
      [-0.05, 0, 0],
      cellLine
    );
  }
  const segments = Math.min(12, policy.geometry.cylinderSegments);
  const containers = [
    [-1.05, -0.75, 0.46, 0.75],
    [0, -0.75, 0.48, 0.78],
    [1.05, -0.75, 0.43, 0.72],
    [-1.05, 0.75, 0.48, 0.5],
    [0, 0.75, 0.4, 0.65],
  ];
  const bagMaterial = fabric.clone();
  bagMaterial.side = DoubleSide;
  containers.forEach(([x, z, radius, bagHeight], i) => {
    const bag = new Mesh(
      new CylinderGeometry(radius, radius * 0.88, bagHeight, segments, 1, true),
      bagMaterial
    );
    bag.name = `BackyardGrowBag-${i}`;
    bag.position.set(
      centerX + (x * frameWidth) / 3.6,
      bagHeight / 2,
      (z * depth) / 3.2
    );
    group.add(bag);
    const fill = new Mesh(
      new CylinderGeometry(radius * 0.91, radius * 0.91, 0.04, segments),
      soil
    );
    fill.name = `BackyardGrowBagSoil-${i}`;
    fill.position.copy(bag.position);
    fill.position.y = bagHeight - 0.12;
    group.add(fill);
    for (const side of [-1, 1])
      box(
        group,
        `BackyardGrowBagHandle:${i}:${side}`,
        [0.045, 0.16, 0.12],
        [bag.position.x + side * radius, bagHeight * 0.72, bag.position.z],
        fabric
      );
  });
  const tubMaterial = metal.clone();
  tubMaterial.side = DoubleSide;
  tubMaterial.roughness = 0.62;
  const tub = new Mesh(
    new CylinderGeometry(0.53, 0.4, 0.55, segments, 1, true),
    tubMaterial
  );
  tub.name = 'BackyardGalvanizedTub';
  tub.position.set(
    centerX + (1.05 * frameWidth) / 3.6,
    0.275,
    depth * 0.234375
  );
  group.add(tub);
  const tubSoil = new Mesh(
    new CylinderGeometry(0.47, 0.47, 0.04, segments),
    soil
  );
  tubSoil.name = 'BackyardGalvanizedTubContents';
  tubSoil.position.copy(tub.position);
  tubSoil.position.y = 0.42;
  group.add(tubSoil);
  group.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(group);
  return {
    group,
    colliders: [
      {
        minX: bounds.min.x,
        maxX: bounds.max.x,
        minZ: bounds.min.z,
        maxZ: bounds.max.z,
      },
    ],
    update() {
      /* Physical frame and panels stay stationary in every motion mode. */
    },
  };
}
