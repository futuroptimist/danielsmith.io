import {
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

import {
  FLOOR_PLAN,
  UPPER_FLOOR_PLAN,
  WALL_THICKNESS,
  type FloorPlanDefinition,
  type RoomDefinition,
} from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import type { PortfolioMannequinPalette } from '../avatar/mannequin';
import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../avatar/mannequin';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../level/floorElevations';
import { getMiniaturePoiProxyDefinition } from '../miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_COVERAGE } from '../miniature/sceneComponentRegistry';
import type { PoiDefinition } from '../poi/types';

import { countObjectTriangles } from './triangleCount';

export const PORTFOLIO_MINIATURE_TABLE_CONTRACT = {
  realWorldReference:
    'white museum display table holding an architectural scale model',
  realWorldDimensionsMeters: { width: 1.4, depth: 0.9, height: 1.25 },
  intendedSceneBounds: { width: 4.6, depth: 4.2, height: 2.35 },
  anchor: 'bottom-center' as const,
  clearances: { markerMinHeight: 2.55, avatarPathRadius: 1.05 },
  table: {
    width: 4.35,
    depth: 3.9,
    topHeight: 1.12,
    topThickness: 0.18,
    bedWidth: 3.8,
    bedDepth: 3.35,
    modelHeight: 1.05,
  },
} as const;

export interface MiniatureWorldTransform {
  readonly worldOrigin: Readonly<Vector3>;
  readonly scale: number;
  readonly modelBedOffset: Readonly<Vector3>;
  mapWorldPosition(
    position: Vector3 | { x: number; y: number; z: number }
  ): Vector3;
  inverseMapPosition(
    position: Vector3 | { x: number; y: number; z: number }
  ): Vector3;
  mapWorldYaw(yaw: number): number;
}

export interface PortfolioMiniatureTableBuild {
  group: Group;
  colliders: [RectCollider];
  miniatureWorldRoot: Group;
  miniaturePlayer: Group;
  selfProxy: Group;
  transform: MiniatureWorldTransform;
  triangleStats: {
    table: number;
    miniatureArchitecture: number;
    poiProxies: number;
    sceneComponents: number;
    tinyPlayer: number;
    total: number;
  };
  update(context: {
    playerWorldPosition: Vector3 | { x: number; y: number; z: number };
    playerYaw: number;
    activeFloor?: 'ground' | 'upper';
    reducedMotion?: boolean;
  }): void;
  setPlayerPalette(palette: PortfolioMannequinPalette): void;
  dispose(): void;
}

export interface PortfolioMiniatureTableOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  tableDetailPolicy: SceneDetailPolicy;
  miniatureDetailPolicy: SceneDetailPolicy;
  poiDefinitions: readonly PoiDefinition[];
}

const ownedGeometry = new Set<
  BoxGeometry | CylinderGeometry | SphereGeometry
>();
const ownedMaterial = new Set<MeshBasicMaterial | MeshStandardMaterial>();

const material = (
  color: number,
  options: { transparent?: boolean; opacity?: number } = {}
) => {
  const mat = new MeshStandardMaterial({
    color,
    metalness: 0.05,
    roughness: 0.72,
    ...(options.transparent === undefined
      ? {}
      : { transparent: options.transparent }),
    opacity: options.opacity ?? 1,
  });
  ownedMaterial.add(mat);
  return mat;
};

const basicMaterial = (color: number) => {
  const mat = new MeshBasicMaterial({ color });
  ownedMaterial.add(mat);
  return mat;
};

const addBox = (
  parent: Group,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  color: number,
  options?: { transparent?: boolean; opacity?: number; basic?: boolean }
) => {
  const geometry = new BoxGeometry(...size);
  ownedGeometry.add(geometry);
  const mesh = new Mesh(
    geometry,
    options?.basic ? basicMaterial(color) : material(color, options)
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
};

export function createPortfolioTableShell(
  detailPolicy: SceneDetailPolicy
): Group {
  const group = new Group();
  group.name = 'PortfolioMiniatureTableShell';
  group.userData.nonrecursivePortfolioTableShell = true;
  const { table } = PORTFOLIO_MINIATURE_TABLE_CONTRACT;
  addBox(
    group,
    'PortfolioMiniatureTableBase',
    [3.35, table.topHeight, 2.85],
    [0, table.topHeight / 2, 0],
    0xf8fafc
  );
  addBox(
    group,
    'PortfolioMiniatureTableTop',
    [table.width, table.topThickness, table.depth],
    [0, table.topHeight, 0],
    0xffffff
  );
  addBox(
    group,
    'PortfolioMiniatureTableBed',
    [table.bedWidth, 0.035, table.bedDepth],
    [0, table.topHeight + 0.11, 0],
    0xe5e7eb
  );
  if (detailPolicy.detailIndex <= 2) {
    addBox(
      group,
      'PortfolioMiniatureTableInsetLipNorth',
      [table.width, 0.08, 0.08],
      [0, table.topHeight + 0.16, -table.depth / 2 + 0.08],
      0xf1f5f9
    );
    addBox(
      group,
      'PortfolioMiniatureTableInsetLipSouth',
      [table.width, 0.08, 0.08],
      [0, table.topHeight + 0.16, table.depth / 2 - 0.08],
      0xf1f5f9
    );
    addBox(
      group,
      'PortfolioMiniatureTableInsetLipWest',
      [0.08, 0.08, table.depth],
      [-table.width / 2 + 0.08, table.topHeight + 0.16, 0],
      0xf1f5f9
    );
    addBox(
      group,
      'PortfolioMiniatureTableInsetLipEast',
      [0.08, 0.08, table.depth],
      [table.width / 2 - 0.08, table.topHeight + 0.16, 0],
      0xf1f5f9
    );
  }
  return group;
}

const boundsForPlan = (plan: FloorPlanDefinition) => {
  const xs = plan.outline.map(([x]) => x);
  const zs = plan.outline.map(([, z]) => z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
};

export function computeMiniatureWorldEnvelope() {
  const ground = boundsForPlan(FLOOR_PLAN);
  const upper = boundsForPlan(UPPER_FLOOR_PLAN);
  const minX = Math.min(ground.minX, upper.minX);
  const maxX = Math.max(ground.maxX, upper.maxX);
  const minZ = Math.min(ground.minZ, upper.minZ);
  const maxZ = Math.max(ground.maxZ, upper.maxZ);
  const height = UPPER_FLOOR_TOP_ELEVATION - GROUND_FLOOR_TOP_ELEVATION + 2.4;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    minY: GROUND_FLOOR_TOP_ELEVATION,
    maxY: height,
  };
}

export function createMiniatureWorldTransform(): MiniatureWorldTransform {
  const envelope = computeMiniatureWorldEnvelope();
  const { table } = PORTFOLIO_MINIATURE_TABLE_CONTRACT;
  const worldWidth = envelope.maxX - envelope.minX;
  const worldDepth = envelope.maxZ - envelope.minZ;
  const worldHeight = envelope.maxY - envelope.minY;
  const scale =
    Math.min(
      table.bedWidth / worldWidth,
      table.bedDepth / worldDepth,
      table.modelHeight / worldHeight
    ) * 0.92;
  const worldOrigin = new Vector3(
    (envelope.minX + envelope.maxX) / 2,
    envelope.minY,
    (envelope.minZ + envelope.maxZ) / 2
  );
  const modelBedOffset = new Vector3(0, table.topHeight + 0.14, 0);
  return {
    worldOrigin,
    scale,
    modelBedOffset,
    mapWorldPosition(position) {
      return new Vector3(position.x, position.y, position.z)
        .sub(worldOrigin)
        .multiplyScalar(scale)
        .add(modelBedOffset);
    },
    inverseMapPosition(position) {
      return new Vector3(position.x, position.y, position.z)
        .sub(modelBedOffset)
        .divideScalar(scale)
        .add(worldOrigin);
    },
    mapWorldYaw(yaw) {
      return yaw;
    },
  };
}

const addRoomSlabs = (
  parent: Group,
  plan: FloorPlanDefinition,
  y: number,
  floorName: string
) => {
  const root = new Group();
  root.name = floorName;
  parent.add(root);
  plan.rooms.forEach((room: RoomDefinition) => {
    const width = room.bounds.maxX - room.bounds.minX;
    const depth = room.bounds.maxZ - room.bounds.minZ;
    const cx = (room.bounds.minX + room.bounds.maxX) / 2;
    const cz = (room.bounds.minZ + room.bounds.maxZ) / 2;
    const color =
      room.category === 'exterior'
        ? 0x86efac
        : new Color(room.ledColor).lerp(new Color(0xffffff), 0.78).getHex();
    addBox(
      root,
      `MiniatureRoom:${room.id}`,
      [width, 0.08, depth],
      [cx, y, cz],
      color,
      {
        transparent: floorName === 'MiniatureUpperFloor',
        opacity: floorName === 'MiniatureUpperFloor' ? 0.62 : 1,
      }
    );
  });
  return root;
};

const addPlanWalls = (
  parent: Group,
  plan: FloorPlanDefinition,
  y: number,
  name: string
) => {
  const root = new Group();
  root.name = name;
  parent.add(root);
  for (const room of plan.rooms) {
    const height = room.category === 'exterior' ? 0.28 : 0.7;
    const color = room.category === 'exterior' ? 0x166534 : 0xffffff;
    const { minX, maxX, minZ, maxZ } = room.bounds;
    addBox(
      root,
      `${room.id}:north-wall`,
      [maxX - minX, height, WALL_THICKNESS],
      [(minX + maxX) / 2, y + height / 2, minZ],
      color
    );
    addBox(
      root,
      `${room.id}:south-wall`,
      [maxX - minX, height, WALL_THICKNESS],
      [(minX + maxX) / 2, y + height / 2, maxZ],
      color
    );
    addBox(
      root,
      `${room.id}:west-wall`,
      [WALL_THICKNESS, height, maxZ - minZ],
      [minX, y + height / 2, (minZ + maxZ) / 2],
      color
    );
    addBox(
      root,
      `${room.id}:east-wall`,
      [WALL_THICKNESS, height, maxZ - minZ],
      [maxX, y + height / 2, (minZ + maxZ) / 2],
      color
    );
  }
  return root;
};

const createMiniaturePlayer = (policy: SceneDetailPolicy) => {
  const root = new Group();
  root.name = 'MiniaturePlayer';
  const visual = new Group();
  visual.name = 'MiniaturePlayerVisual';
  root.add(visual);
  const h = PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT;
  addBox(
    visual,
    'MiniaturePlayerTorso',
    [0.42, h * 0.32, 0.24],
    [0, h * 0.48, 0],
    0x283347
  );
  addBox(
    visual,
    'MiniaturePlayerLeftArm',
    [0.12, h * 0.28, 0.12],
    [-0.32, h * 0.48, 0],
    0x57d7ff
  );
  addBox(
    visual,
    'MiniaturePlayerRightArm',
    [0.12, h * 0.28, 0.12],
    [0.32, h * 0.48, 0],
    0x57d7ff
  );
  addBox(
    visual,
    'MiniaturePlayerLeftLeg',
    [0.14, h * 0.32, 0.14],
    [-0.12, h * 0.16, 0],
    0x1f2937
  );
  addBox(
    visual,
    'MiniaturePlayerRightLeg',
    [0.14, h * 0.32, 0.14],
    [0.12, h * 0.16, 0],
    0x1f2937
  );
  const geo = new SphereGeometry(
    0.22,
    policy.geometry.sphereWidthSegments,
    policy.geometry.sphereHeightSegments
  );
  ownedGeometry.add(geo);
  const head = new Mesh(geo, material(0xf7c77d));
  head.name = 'MiniaturePlayerHead';
  head.position.y = h * 0.78;
  visual.add(head);
  addBox(
    visual,
    'MiniaturePlayerVisor',
    [0.32, 0.06, 0.04],
    [0, h * 0.8, -0.2],
    0x57d7ff,
    { basic: true }
  );
  return root;
};

export function createPortfolioMiniatureTable(
  options: PortfolioMiniatureTableOptions
): PortfolioMiniatureTableBuild {
  const group = new Group();
  group.name = 'PortfolioMiniatureTable';
  group.position.set(
    options.position.x,
    options.position.y ?? 0,
    options.position.z
  );
  group.rotation.y = options.orientationRadians ?? 0;
  group.scale.set(1, 1, 1);
  const shell = createPortfolioTableShell(options.tableDetailPolicy);
  group.add(shell);

  const transform = createMiniatureWorldTransform();
  const miniatureWorldRoot = new Group();
  miniatureWorldRoot.name = 'MiniatureWorldRoot';
  miniatureWorldRoot.position.copy(transform.modelBedOffset);
  miniatureWorldRoot.scale.setScalar(transform.scale);
  group.add(miniatureWorldRoot);
  const content = new Group();
  content.name = 'MiniatureWorldContent';
  content.position.copy(transform.worldOrigin).multiplyScalar(-1);
  miniatureWorldRoot.add(content);

  const ground = addRoomSlabs(
    content,
    FLOOR_PLAN,
    GROUND_FLOOR_TOP_ELEVATION,
    'MiniatureGroundFloor'
  );
  const upper = addRoomSlabs(
    content,
    UPPER_FLOOR_PLAN,
    UPPER_FLOOR_TOP_ELEVATION,
    'MiniatureUpperFloor'
  );
  addPlanWalls(
    content,
    FLOOR_PLAN,
    GROUND_FLOOR_TOP_ELEVATION,
    'MiniatureGroundFloorWalls'
  );
  addPlanWalls(
    content,
    UPPER_FLOOR_PLAN,
    UPPER_FLOOR_TOP_ELEVATION,
    'MiniatureUpperFloorWalls'
  );
  addBox(
    content,
    'MiniatureStaircase',
    [2.8, UPPER_FLOOR_TOP_ELEVATION, 1],
    [6.2, UPPER_FLOOR_TOP_ELEVATION / 2, -12.5],
    0xcbd5e1
  );
  addBox(
    content,
    'MiniatureUpperLanding',
    [6.2, 0.1, 4.4],
    [4.5, UPPER_FLOOR_TOP_ELEVATION + 0.08, -13.8],
    0xe2e8f0
  );

  const sceneComponentRoot = new Group();
  sceneComponentRoot.name = 'MiniatureSceneComponentRoot';
  content.add(sceneComponentRoot);
  for (const entry of MINIATURE_SCENE_COMPONENT_COVERAGE.filter(
    (item) => item.kind !== 'excluded'
  )) {
    const marker = new Group();
    marker.name = `MiniatureSceneComponent:${entry.id}`;
    sceneComponentRoot.add(marker);
  }

  const poiRoot = new Group();
  poiRoot.name = 'MiniaturePoiRoot';
  content.add(poiRoot);
  let selfProxy: Group | null = null;
  for (const poi of options.poiDefinitions) {
    const definition = getMiniaturePoiProxyDefinition(poi.id);
    const built = buildMiniatureProxy(
      definition,
      options.miniatureDetailPolicy
    );
    built.root.position.set(poi.position.x, poi.position.y, poi.position.z);
    built.root.rotation.y = poi.headingRadians ?? 0;
    built.root.scale.set(1, 1, 1);
    built.root.name =
      poi.id === 'danielsmith-portfolio-table'
        ? 'MiniatureSelfProxy'
        : `MiniaturePoi:${poi.id}`;
    poiRoot.add(built.root);
    if (poi.id === 'danielsmith-portfolio-table')
      selfProxy = built.root as Group;
  }
  if (!selfProxy)
    throw new Error('Missing danielsmith-portfolio-table self proxy.');

  const miniaturePlayer = createMiniaturePlayer(options.miniatureDetailPolicy);
  content.add(miniaturePlayer);

  const { table } = PORTFOLIO_MINIATURE_TABLE_CONTRACT;
  const c = Math.cos(group.rotation.y);
  const s = Math.sin(group.rotation.y);
  const hx = table.width / 2;
  const hz = table.depth / 2;
  const corners = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ].map(([x, z]) => ({
    x: group.position.x + x * c + z * s,
    z: group.position.z - x * s + z * c,
  }));
  const colliders: [RectCollider] = [
    {
      minX: Math.min(...corners.map((p) => p.x)),
      maxX: Math.max(...corners.map((p) => p.x)),
      minZ: Math.min(...corners.map((p) => p.z)),
      maxZ: Math.max(...corners.map((p) => p.z)),
    },
  ];

  let disposed = false;
  const update = ({
    playerWorldPosition,
    playerYaw,
  }: Parameters<PortfolioMiniatureTableBuild['update']>[0]) => {
    if (disposed) return;
    miniaturePlayer.position.set(
      playerWorldPosition.x,
      playerWorldPosition.y,
      playerWorldPosition.z
    );
    miniaturePlayer.rotation.y = transform.mapWorldYaw(playerYaw);
  };
  const setPlayerPalette = (palette: PortfolioMannequinPalette) => {
    if (disposed) return;
    miniaturePlayer.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.name.includes('Torso'))
        (object.material as MeshStandardMaterial).color.set(palette.base);
      if (object.name.includes('Visor') || object.name.includes('Arm'))
        (object.material as MeshStandardMaterial).color.set(palette.accent);
      if (object.name.includes('Head'))
        (object.material as MeshStandardMaterial).color.set(palette.trim);
    });
  };
  const triangleStats = {
    table: countObjectTriangles(shell),
    miniatureArchitecture:
      countObjectTriangles(ground) + countObjectTriangles(upper),
    poiProxies: countObjectTriangles(poiRoot),
    sceneComponents: countObjectTriangles(sceneComponentRoot),
    tinyPlayer: countObjectTriangles(miniaturePlayer),
    total: countObjectTriangles(group),
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    ownedGeometry.forEach((geometry) => geometry.dispose());
    ownedMaterial.forEach((mat) => mat.dispose());
    ownedGeometry.clear();
    ownedMaterial.clear();
  };
  return {
    group,
    colliders,
    miniatureWorldRoot,
    miniaturePlayer,
    selfProxy,
    transform,
    triangleStats,
    update,
    setPlayerPalette,
    dispose,
  };
}

export function getPortfolioMiniatureTableVisibleBounds(
  build: PortfolioMiniatureTableBuild
): Box3 {
  return new Box3().setFromObject(build.group);
}
