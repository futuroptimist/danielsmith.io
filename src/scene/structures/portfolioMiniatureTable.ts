import {
  Box3,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';

import {
  FLOOR_PLAN,
  UPPER_FLOOR_PLAN,
  getCombinedWallSegments,
} from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import type { PortfolioMannequinPalette } from '../avatar/mannequin';
import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../avatar/mannequin';
import {
  getSceneDetailPolicy,
  type SceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../level/floorElevations';
import { getMiniaturePoiProxyDefinition } from '../miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_PROXIES } from '../miniature/sceneComponentRegistry';
import type { PoiDefinition } from '../poi/types';

import { PORTFOLIO_MINIATURE_TABLE_DIMENSIONS } from './portfolioMiniatureTableContract';
import { countObjectTriangles } from './triangleCount';

export interface MiniatureWorldTransform {
  worldOrigin: Readonly<Vector3>;
  modelBedOffset: Readonly<Vector3>;
  uniformScale: number;
  tableHeading: number;
  mapWorldPosition(position: Vector3): Vector3;
  inverseMapPosition(position: Vector3): Vector3;
  mapWorldYaw(yaw: number): number;
}

export interface PortfolioMiniatureTableBuild {
  group: Group;
  collider: RectCollider;
  miniatureWorldRoot: Group;
  miniaturePlayer: Group;
  selfProxy: Object3D;
  transform: MiniatureWorldTransform;
  triangleStats: {
    tableShell: number;
    miniatureArchitectureAndSceneComponents: number;
    poiProxies: number;
    tinyPlayer: number;
    total: number;
  };
  update(options: {
    playerWorldPosition: Vector3;
    playerYaw: number;
    activeFloor?: 'ground' | 'upper';
  }): void;
  setPlayerPalette(palette: PortfolioMannequinPalette): void;
  dispose(): void;
}

export interface PortfolioMiniatureTableOptions {
  position: { x: number; y: number; z: number };
  orientationRadians?: number;
  tableDetailPolicy?: SceneDetailPolicy;
  miniatureDetailPolicy?: SceneDetailPolicy;
  poiDefinitions: readonly PoiDefinition[];
}

const ownedMaterials = new WeakSet<object>();

const createMaterial = (color: number, transparent = false, opacity = 1) => {
  const material = new MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.05,
    transparent,
    opacity,
  });
  ownedMaterials.add(material);
  return material;
};

function addBox(
  parent: Group,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  color: number
) {
  const mesh = new Mesh(new BoxGeometry(...size), createMaterial(color));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

export function createPortfolioTableShell(
  detailPolicy: SceneDetailPolicy = getSceneDetailPolicy('balanced')
) {
  const group = new Group();
  group.name = 'PortfolioMiniatureTableShell';
  const d = PORTFOLIO_MINIATURE_TABLE_DIMENSIONS;
  addBox(
    group,
    'PortfolioMiniatureTableTop',
    [d.width, d.topThickness, d.depth],
    [0, d.height, 0],
    0xf8fafc
  );
  addBox(
    group,
    'PortfolioMiniatureTableBase',
    [d.width * 0.72, d.height, d.depth * 0.62],
    [0, d.height / 2, 0],
    0xffffff
  );
  addBox(
    group,
    'PortfolioMiniatureTableModelBed',
    [d.bedWidth, 0.035, d.bedDepth],
    [0, d.bedInsetY, 0],
    0xe5e7eb
  );
  addBox(
    group,
    'PortfolioMiniatureTableLipNorth',
    [d.width, d.lipHeight, 0.08],
    [0, d.bedInsetY + d.lipHeight / 2, -d.depth / 2 + 0.06],
    0xffffff
  );
  addBox(
    group,
    'PortfolioMiniatureTableLipSouth',
    [d.width, d.lipHeight, 0.08],
    [0, d.bedInsetY + d.lipHeight / 2, d.depth / 2 - 0.06],
    0xffffff
  );
  if (detailPolicy.detailIndex <= 2) {
    addBox(
      group,
      'PortfolioMiniatureTableInsetSeam',
      [d.bedWidth + 0.12, 0.025, 0.05],
      [0, d.bedInsetY + 0.04, 0],
      0xcbd5e1
    );
  }
  return group;
}

function floorEnvelope() {
  const xs = [...FLOOR_PLAN.outline, ...UPPER_FLOOR_PLAN.outline].map(
    ([x]) => x
  );
  const zs = [...FLOOR_PLAN.outline, ...UPPER_FLOOR_PLAN.outline].map(
    ([, z]) => z
  );
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    minY: GROUND_FLOOR_TOP_ELEVATION,
    maxY: UPPER_FLOOR_TOP_ELEVATION + 2.4,
  };
}

export function createMiniatureWorldTransform(
  tableHeading = 0
): MiniatureWorldTransform {
  const env = floorEnvelope();
  const origin = new Vector3(
    (env.minX + env.maxX) / 2,
    GROUND_FLOOR_TOP_ELEVATION,
    (env.minZ + env.maxZ) / 2
  );
  const scale = Math.min(
    PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.bedWidth / (env.maxX - env.minX),
    PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.bedDepth / (env.maxZ - env.minZ),
    0.9 / (env.maxY - env.minY)
  );
  const offset = new Vector3(
    0,
    PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.bedInsetY + 0.035,
    0
  );
  return {
    worldOrigin: origin,
    modelBedOffset: offset,
    uniformScale: scale,
    tableHeading,
    mapWorldPosition(position) {
      return position.clone().sub(origin).multiplyScalar(scale).add(offset);
    },
    inverseMapPosition(position) {
      return position
        .clone()
        .sub(offset)
        .multiplyScalar(1 / scale)
        .add(origin);
    },
    mapWorldYaw(yaw) {
      return yaw;
    },
  };
}

function createArchitecture(detailPolicy: SceneDetailPolicy) {
  const root = new Group();
  root.name = 'MiniatureArchitecture';
  const slab = (name: string, y: number, plan = FLOOR_PLAN) => {
    for (const room of plan.rooms) {
      const { minX, maxX, minZ, maxZ } = room.bounds;
      const mesh = addBox(
        root,
        `${name}:${room.id}`,
        [maxX - minX, 0.08, maxZ - minZ],
        [(minX + maxX) / 2, y, (minZ + maxZ) / 2],
        room.category === 'exterior' ? 0x86efac : 0xdbeafe
      );
      mesh.userData.floor = name;
    }
  };
  slab('MiniatureGroundFloor', GROUND_FLOOR_TOP_ELEVATION, FLOOR_PLAN);
  slab('MiniatureUpperFloor', UPPER_FLOOR_TOP_ELEVATION, UPPER_FLOOR_PLAN);
  const wallHeight = detailPolicy.detailIndex >= 3 ? 0.45 : 0.7;
  for (const [plan, y, label] of [
    [FLOOR_PLAN, 0, 'ground'],
    [UPPER_FLOOR_PLAN, UPPER_FLOOR_TOP_ELEVATION, 'upper'],
  ] as const) {
    for (const segment of getCombinedWallSegments(plan)) {
      const cx = (segment.start.x + segment.end.x) / 2;
      const cz = (segment.start.z + segment.end.z) / 2;
      const length =
        segment.orientation === 'horizontal'
          ? Math.abs(segment.end.x - segment.start.x)
          : Math.abs(segment.end.z - segment.start.z);
      addBox(
        root,
        `MiniatureWall:${label}`,
        segment.orientation === 'horizontal'
          ? [length, wallHeight, 0.12]
          : [0.12, wallHeight, length],
        [cx, y + wallHeight / 2 + 0.06, cz],
        0xf8fafc
      );
    }
  }
  addBox(
    root,
    'MiniatureBackyard',
    [10, 0.05, 8],
    [-8, GROUND_FLOOR_TOP_ELEVATION + 0.02, -28],
    0xbbf7d0
  );
  addBox(
    root,
    'MiniatureStaircase',
    [1.2, UPPER_FLOOR_TOP_ELEVATION, 4.2],
    [-6, UPPER_FLOOR_TOP_ELEVATION / 2, -2],
    0xcbd5e1
  );
  addBox(
    root,
    'MiniatureUpperLanding',
    [4, 0.1, 3],
    [-6, UPPER_FLOOR_TOP_ELEVATION + 0.05, 0],
    0xe2e8f0
  );
  return root;
}

function createTinyPlayer(detailPolicy: SceneDetailPolicy) {
  const root = new Group();
  root.name = 'MiniaturePlayer';
  const body = new Group();
  body.name = 'MiniaturePlayerBody';
  root.add(body);
  const height = PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT;
  const material = new MeshBasicMaterial({ color: '#283347' });
  const accent = new MeshBasicMaterial({ color: '#57d7ff' });
  const trim = new MeshBasicMaterial({ color: '#f8fafc' });
  [material, accent, trim].forEach((m) => ownedMaterials.add(m));
  const part = (
    name: string,
    size: [number, number, number],
    y: number,
    x = 0,
    mat = material
  ) => {
    const mesh = new Mesh(new BoxGeometry(...size), mat);
    mesh.name = name;
    mesh.position.set(x, y, 0);
    body.add(mesh);
  };
  part('MiniaturePlayerTorso', [0.42, 0.85, 0.24], height * 0.48);
  part('MiniaturePlayerLeftArm', [0.12, 0.7, 0.12], height * 0.48, -0.32);
  part('MiniaturePlayerRightArm', [0.12, 0.7, 0.12], height * 0.48, 0.32);
  part('MiniaturePlayerLeftLeg', [0.14, 0.72, 0.14], height * 0.14, -0.12);
  part('MiniaturePlayerRightLeg', [0.14, 0.72, 0.14], height * 0.14, 0.12);
  const head = new Mesh(
    new SphereGeometry(
      0.22,
      detailPolicy.geometry.sphereWidthSegments,
      detailPolicy.geometry.sphereHeightSegments
    ),
    trim
  );
  head.name = 'MiniaturePlayerHead';
  head.position.y = height * 0.86;
  body.add(head);
  part(
    'MiniaturePlayerFacingVisor',
    [0.3, 0.06, 0.035],
    height * 0.88,
    0,
    accent
  );
  return {
    root,
    setPalette: (p: PortfolioMannequinPalette) => {
      material.color = new Color(p.base);
      accent.color = new Color(p.accent);
      trim.color = new Color(p.trim);
    },
  };
}

function rotatedAabb(
  position: { x: number; z: number },
  width: number,
  depth: number,
  heading: number
): RectCollider {
  const hw = width / 2,
    hd = depth / 2;
  const c = Math.cos(heading),
    s = Math.sin(heading);
  const points = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, z]) => ({
    x: position.x + x * c - z * s,
    z: position.z + x * s + z * c,
  }));
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
  };
}

export function createPortfolioMiniatureTable(
  options: PortfolioMiniatureTableOptions
): PortfolioMiniatureTableBuild {
  const tablePolicy =
    options.tableDetailPolicy ?? getSceneDetailPolicy('balanced');
  const miniaturePolicy =
    options.miniatureDetailPolicy ?? getSceneDetailPolicy('performance');
  const heading = options.orientationRadians ?? 0;
  const group = new Group();
  group.name = 'PortfolioMiniatureTable';
  group.position.set(
    options.position.x,
    options.position.y,
    options.position.z
  );
  group.rotation.y = heading;
  const shell = createPortfolioTableShell(tablePolicy);
  group.add(shell);

  const transform = createMiniatureWorldTransform(heading);
  const miniatureWorldRoot = new Group();
  miniatureWorldRoot.name = 'MiniatureWorldRoot';
  miniatureWorldRoot.position.copy(transform.modelBedOffset);
  miniatureWorldRoot.scale.setScalar(transform.uniformScale);
  group.add(miniatureWorldRoot);
  const content = new Group();
  content.name = 'MiniatureWorldContent';
  content.position.copy(transform.worldOrigin).multiplyScalar(-1);
  miniatureWorldRoot.add(content);
  const architecture = createArchitecture(miniaturePolicy);
  content.add(architecture);

  const sceneRoot = new Group();
  sceneRoot.name = 'MiniatureSceneComponentRoot';
  content.add(sceneRoot);
  MINIATURE_SCENE_COMPONENT_PROXIES.forEach((definition, index) => {
    const built = buildMiniatureProxy(definition, miniaturePolicy).root;
    built.name = definition.id;
    built.position.set(-26 + index * 3, GROUND_FLOOR_TOP_ELEVATION, -26);
    sceneRoot.add(built);
  });

  const poiRoot = new Group();
  poiRoot.name = 'MiniaturePoiRoot';
  content.add(poiRoot);
  let selfProxy: Object3D | null = null;
  for (const poi of options.poiDefinitions) {
    const definition = getMiniaturePoiProxyDefinition(poi.id);
    if (!definition) continue;
    const built = buildMiniatureProxy(definition, miniaturePolicy).root;
    built.name =
      poi.id === 'danielsmith-portfolio-table'
        ? 'MiniatureSelfProxy'
        : `MiniaturePoi:${poi.id}`;
    built.position.set(
      poi.position.x,
      poi.position.y ?? GROUND_FLOOR_TOP_ELEVATION,
      poi.position.z
    );
    built.rotation.y = poi.headingRadians ?? 0;
    poiRoot.add(built);
    if (poi.id === 'danielsmith-portfolio-table') selfProxy = built;
  }
  if (!selfProxy)
    throw new Error(
      'Portfolio miniature table requires danielsmith-portfolio-table POI proxy.'
    );

  const player = createTinyPlayer(miniaturePolicy);
  content.add(player.root);

  let disposed = false;
  const build: PortfolioMiniatureTableBuild = {
    group,
    collider: rotatedAabb(
      options.position,
      PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.width,
      PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.depth,
      heading
    ),
    miniatureWorldRoot,
    miniaturePlayer: player.root,
    selfProxy,
    transform,
    triangleStats: {
      tableShell: countObjectTriangles(shell),
      miniatureArchitectureAndSceneComponents:
        countObjectTriangles(architecture) + countObjectTriangles(sceneRoot),
      poiProxies: countObjectTriangles(poiRoot),
      tinyPlayer: countObjectTriangles(player.root),
      total: countObjectTriangles(group),
    },
    update({ playerWorldPosition, playerYaw }) {
      if (disposed) return;
      player.root.position.copy(playerWorldPosition);
      player.root.rotation.y = transform.mapWorldYaw(playerYaw);
    },
    setPlayerPalette(palette) {
      if (!disposed) player.setPalette(palette);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.traverse((object) => {
        const mesh = object as Mesh;
        if (
          mesh.geometry &&
          !mesh.geometry.name.startsWith('miniature-geometry:')
        )
          mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material))
          material.forEach((m) => ownedMaterials.has(m) && m.dispose());
        else if (material && ownedMaterials.has(material)) material.dispose();
      });
      group.clear();
    },
  };
  return build;
}

export function getPortfolioMiniatureTableVisibleBounds(
  build: Pick<PortfolioMiniatureTableBuild, 'group'>
) {
  build.group.updateMatrixWorld(true);
  return new Box3().setFromObject(build.group);
}

export const PORTFOLIO_MINIATURE_PROXY_SOURCE_FILES = [
  'src/scene/structures/portfolioMiniatureTable.ts',
  'src/scene/poi/physicalMetadata.ts',
] as const;
