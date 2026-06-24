import {
  Box3,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';

import {
  FLOOR_PLAN,
  UPPER_FLOOR_PLAN,
  WALL_THICKNESS,
  getFloorBounds,
  getRoomWallSegments,
  type FloorPlanDefinition,
} from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import {
  PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT,
  type PortfolioMannequinPalette,
} from '../avatar/mannequin';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../level/floorElevations';
import { MINIATURE_POI_PROXY_REGISTRY } from '../miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_PROXIES } from '../miniature/sceneComponentRegistry';
import type { PoiDefinition } from '../poi/types';

import { PORTFOLIO_MINIATURE_TABLE_DIMENSIONS } from './portfolioMiniatureTableConstants';
import { countObjectTriangles } from './triangleCount';

export interface MiniatureWorldTransform {
  worldOrigin: Vector3;
  modelBedOffset: Vector3;
  uniformScale: number;
  tableHeadingRadians: number;
  mapWorldPosition(position: Vector3): Vector3;
  invertMiniaturePosition(position: Vector3): Vector3;
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
    table: number;
    architectureAndSceneComponents: number;
    poiProxies: number;
    tinyPlayer: number;
    total: number;
  };
  update(options: {
    playerWorldPosition: Vector3;
    playerWorldYaw: number;
    activeFloor?: 'ground' | 'upper';
    reducedMotion?: boolean;
  }): void;
  setPlayerPalette(palette: PortfolioMannequinPalette): void;
  dispose(): void;
}

export interface PortfolioMiniatureTableOptions {
  position: { x: number; y: number; z: number };
  orientationRadians: number;
  tableDetailPolicy: SceneDetailPolicy;
  miniatureDetailPolicy: SceneDetailPolicy;
  poiDefinitions: readonly PoiDefinition[];
}

function material(color: number, transparent = false, opacity = 1) {
  return new MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.04,
    transparent,
    opacity,
  });
}

function box(
  name: string,
  size: [number, number, number],
  pos: [number, number, number],
  mat: MeshStandardMaterial | MeshBasicMaterial
) {
  const mesh = new Mesh(new BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function createPortfolioTableShell(
  detailPolicy: SceneDetailPolicy
): Group {
  const d = PORTFOLIO_MINIATURE_TABLE_DIMENSIONS;
  const group = new Group();
  group.name = 'PortfolioMiniatureTableShell';
  const white = material(0xf8fafc);
  const shadow = material(0xe5e7eb);
  group.add(
    box(
      'PortfolioMiniatureTableTop',
      [d.width, d.topThickness, d.depth],
      [0, d.height, 0],
      white
    )
  );
  group.add(
    box(
      'PortfolioMiniatureTableBase',
      [d.width * 0.46, d.height, d.depth * 0.46],
      [0, d.height / 2, 0],
      white
    )
  );
  group.add(
    box(
      'PortfolioMiniatureTableModelBed',
      [d.bedWidth, 0.035, d.bedDepth],
      [0, d.bedInsetY, 0],
      shadow
    )
  );
  const lipY = d.bedInsetY + d.lipHeight / 2;
  group.add(
    box(
      'PortfolioMiniatureTableLipNorth',
      [d.width, d.lipHeight, d.lipThickness],
      [0, lipY, -d.depth / 2 + d.lipThickness / 2],
      white
    )
  );
  group.add(
    box(
      'PortfolioMiniatureTableLipSouth',
      [d.width, d.lipHeight, d.lipThickness],
      [0, lipY, d.depth / 2 - d.lipThickness / 2],
      white
    )
  );
  group.add(
    box(
      'PortfolioMiniatureTableLipWest',
      [d.lipThickness, d.lipHeight, d.depth],
      [-d.width / 2 + d.lipThickness / 2, lipY, 0],
      white
    )
  );
  group.add(
    box(
      'PortfolioMiniatureTableLipEast',
      [d.lipThickness, d.lipHeight, d.depth],
      [d.width / 2 - d.lipThickness / 2, lipY, 0],
      white
    )
  );
  if (detailPolicy.detailIndex <= 1) {
    group.add(
      box(
        'PortfolioMiniatureTableInsetSeam',
        [d.bedWidth + 0.1, 0.025, 0.035],
        [0, d.bedInsetY + 0.025, 0],
        material(0xcbd5e1)
      )
    );
  }
  return group;
}

function colliderFor(
  center: Vector3,
  width: number,
  depth: number,
  rotation: number
): RectCollider {
  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ] as const;
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [x, z] of corners) {
    const wx = center.x + x * c - z * s;
    const wz = center.z + x * s + z * c;
    minX = Math.min(minX, wx);
    maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz);
    maxZ = Math.max(maxZ, wz);
  }
  return { minX, maxX, minZ, maxZ };
}

function deriveEnvelope() {
  const g = getFloorBounds(FLOOR_PLAN);
  const u = getFloorBounds(UPPER_FLOOR_PLAN);
  const minX = Math.min(g.minX, u.minX),
    maxX = Math.max(g.maxX, u.maxX);
  const minZ = Math.min(g.minZ, u.minZ),
    maxZ = Math.max(g.maxZ, u.maxZ);
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    minY: GROUND_FLOOR_TOP_ELEVATION,
    maxY: UPPER_FLOOR_TOP_ELEVATION + 2.4,
  };
}

export function createMiniatureWorldTransform(
  tableHeadingRadians = 0
): MiniatureWorldTransform {
  const env = deriveEnvelope();
  const d = PORTFOLIO_MINIATURE_TABLE_DIMENSIONS;
  const origin = new Vector3(
    (env.minX + env.maxX) / 2,
    GROUND_FLOOR_TOP_ELEVATION,
    (env.minZ + env.maxZ) / 2
  );
  const scale = Math.min(
    d.bedWidth / (env.maxX - env.minX),
    d.bedDepth / (env.maxZ - env.minZ),
    d.modelHeight / (env.maxY - env.minY)
  );
  const offset = new Vector3(0, d.bedInsetY + 0.025, 0);
  return {
    worldOrigin: origin,
    modelBedOffset: offset,
    uniformScale: scale,
    tableHeadingRadians,
    mapWorldPosition(position) {
      return new Vector3(
        position.x - origin.x,
        position.y - origin.y,
        position.z - origin.z
      )
        .multiplyScalar(scale)
        .add(offset);
    },
    invertMiniaturePosition(position) {
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

function addFloor(
  content: Group,
  plan: FloorPlanDefinition,
  y: number,
  name: string,
  opacity: number
) {
  const root = new Group();
  root.name = name;
  const slabMat = material(0xdbeafe, true, opacity);
  for (const room of plan.rooms) {
    const w = room.bounds.maxX - room.bounds.minX;
    const z = room.bounds.maxZ - room.bounds.minZ;
    const m = box(
      `${name}:${room.id}:slab`,
      [w, 0.06, z],
      [
        (room.bounds.minX + room.bounds.maxX) / 2,
        y,
        (room.bounds.minZ + room.bounds.maxZ) / 2,
      ],
      slabMat
    );
    root.add(m);
    for (const seg of getRoomWallSegments(room)) {
      const len = Math.hypot(seg.end.x - seg.start.x, seg.end.z - seg.start.z);
      const horizontal = seg.orientation === 'horizontal';
      const wall = box(
        `${name}:${room.id}:${seg.wall}:wall`,
        [
          horizontal ? len : WALL_THICKNESS,
          0.55,
          horizontal ? WALL_THICKNESS : len,
        ],
        [(seg.start.x + seg.end.x) / 2, y + 0.3, (seg.start.z + seg.end.z) / 2],
        material(0xf8fafc, true, 0.72)
      );
      root.add(wall);
    }
  }
  content.add(root);
}

function createTinyPlayer(policy: SceneDetailPolicy) {
  const root = new Group();
  root.name = 'MiniaturePlayer';
  const visual = new Group();
  visual.name = 'MiniaturePlayerVisual';
  root.add(visual);
  const h = PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT;
  const base = new MeshStandardMaterial({ color: '#283347' });
  const accent = new MeshStandardMaterial({
    color: '#57d7ff',
    emissive: new Color('#57d7ff'),
    emissiveIntensity: 0.25,
  });
  const trim = new MeshStandardMaterial({ color: '#f7c77d' });
  visual.add(
    box('MiniaturePlayerTorso', [0.38, h * 0.34, 0.2], [0, h * 0.48, 0], base)
  );
  visual.add(
    box('MiniaturePlayerHead', [0.28, h * 0.16, 0.24], [0, h * 0.76, 0], trim)
  );
  visual.add(
    box(
      'MiniaturePlayerVisor',
      [0.22, h * 0.04, 0.035],
      [0, h * 0.78, -0.13],
      accent
    )
  );
  visual.add(
    box(
      'MiniaturePlayerArmLeft',
      [0.11, h * 0.32, 0.12],
      [-0.28, h * 0.46, 0],
      base
    )
  );
  visual.add(
    box(
      'MiniaturePlayerArmRight',
      [0.11, h * 0.32, 0.12],
      [0.28, h * 0.46, 0],
      base
    )
  );
  visual.add(
    box(
      'MiniaturePlayerLegLeft',
      [0.13, h * 0.34, 0.14],
      [-0.1, h * 0.17, 0],
      base
    )
  );
  visual.add(
    box(
      'MiniaturePlayerLegRight',
      [0.13, h * 0.34, 0.14],
      [0.1, h * 0.17, 0],
      base
    )
  );
  root.userData.height = h;
  root.userData.detailLevel = policy.level;
  return { root, materials: { base, accent, trim }, visual };
}

function disposeObject(root: Object3D) {
  root.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!String(m.name).startsWith('miniature-material:')) m.dispose();
      });
    }
  });
}

export function createPortfolioMiniatureTable(
  options: PortfolioMiniatureTableOptions
): PortfolioMiniatureTableBuild {
  const d = PORTFOLIO_MINIATURE_TABLE_DIMENSIONS;
  const group = new Group();
  group.name = 'PortfolioMiniatureTable';
  group.position.set(
    options.position.x,
    options.position.y,
    options.position.z
  );
  group.rotation.y = options.orientationRadians;
  const shell = createPortfolioTableShell(options.tableDetailPolicy);
  group.add(shell);
  const transform = createMiniatureWorldTransform(options.orientationRadians);
  const miniatureWorldRoot = new Group();
  miniatureWorldRoot.name = 'MiniatureWorldRoot';
  miniatureWorldRoot.position.copy(transform.modelBedOffset);
  miniatureWorldRoot.scale.setScalar(transform.uniformScale);
  group.add(miniatureWorldRoot);
  const content = new Group();
  content.name = 'MiniatureWorldContent';
  content.position.copy(transform.worldOrigin).multiplyScalar(-1);
  miniatureWorldRoot.add(content);
  addFloor(
    content,
    FLOOR_PLAN,
    GROUND_FLOOR_TOP_ELEVATION,
    'MiniatureGroundFloor',
    0.72
  );
  addFloor(
    content,
    UPPER_FLOOR_PLAN,
    UPPER_FLOOR_TOP_ELEVATION,
    'MiniatureUpperFloor',
    0.38
  );
  const backyard = box(
    'MiniatureBackyard',
    [20, 0.035, 12],
    [0, -0.02, 17],
    material(0xbbf7d0, true, 0.65)
  );
  content.add(backyard);
  const stairs = box(
    'MiniatureStaircase',
    [2.2, UPPER_FLOOR_TOP_ELEVATION, 0.7],
    [12, UPPER_FLOOR_TOP_ELEVATION / 2, 6],
    material(0xcbd5e1)
  );
  content.add(stairs);
  const landing = box(
    'MiniatureUpperLanding',
    [3.2, 0.08, 2.2],
    [12, UPPER_FLOOR_TOP_ELEVATION, 8],
    material(0xe2e8f0)
  );
  content.add(landing);
  const componentRoot = new Group();
  componentRoot.name = 'MiniatureSceneComponentRoot';
  content.add(componentRoot);
  MINIATURE_SCENE_COMPONENT_PROXIES.forEach((def, i) => {
    const built = buildMiniatureProxy(def, options.miniatureDetailPolicy);
    built.root.name = `MiniatureSceneComponentRoot:${def.id}`;
    built.root.position.set(
      -14 + (i % 8) * 4,
      0.08,
      14 + Math.floor(i / 8) * 2
    );
    componentRoot.add(built.root);
  });
  const poiRoot = new Group();
  poiRoot.name = 'MiniaturePoiRoot';
  content.add(poiRoot);
  let selfProxy: Object3D | null = null;
  for (const poi of options.poiDefinitions) {
    const def = MINIATURE_POI_PROXY_REGISTRY[poi.id];
    const built = buildMiniatureProxy(def, options.miniatureDetailPolicy);
    built.root.name =
      poi.id === 'danielsmith-portfolio-table'
        ? 'MiniatureSelfProxy'
        : `MiniaturePoiRoot:${poi.id}`;
    built.root.position.set(poi.position.x, poi.position.y, poi.position.z);
    built.root.rotation.y = poi.headingRadians ?? 0;
    built.root.scale.set(1, 1, 1);
    poiRoot.add(built.root);
    if (poi.id === 'danielsmith-portfolio-table') selfProxy = built.root;
  }
  const tiny = createTinyPlayer(options.miniatureDetailPolicy);
  content.add(tiny.root);
  const collider = colliderFor(
    group.position,
    d.width,
    d.depth,
    options.orientationRadians
  );
  const stats = {
    table: countObjectTriangles(shell),
    architectureAndSceneComponents:
      countObjectTriangles(content) -
      countObjectTriangles(poiRoot) -
      countObjectTriangles(tiny.root),
    poiProxies: countObjectTriangles(poiRoot),
    tinyPlayer: countObjectTriangles(tiny.root),
    total: countObjectTriangles(group),
  };
  let disposed = false;
  return {
    group,
    collider,
    miniatureWorldRoot,
    miniaturePlayer: tiny.root,
    selfProxy: selfProxy ?? poiRoot,
    transform,
    triangleStats: stats,
    update({ playerWorldPosition, playerWorldYaw, reducedMotion }) {
      if (disposed) return;
      tiny.root.position.copy(playerWorldPosition);
      tiny.root.rotation.y = transform.mapWorldYaw(playerWorldYaw);
      tiny.visual.position.y = reducedMotion ? 0 : tiny.visual.position.y;
    },
    setPlayerPalette(palette) {
      if (disposed) return;
      tiny.materials.base.color.set(palette.base);
      tiny.materials.accent.color.set(palette.accent);
      tiny.materials.accent.emissive.set(palette.accent);
      tiny.materials.trim.color.set(palette.trim);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeObject(shell);
      disposeObject(tiny.root);
      group.removeFromParent();
    },
  };
}

export function getPortfolioMiniatureTableVisibleBounds(
  build: PortfolioMiniatureTableBuild
): Box3 {
  build.group.updateMatrixWorld(true);
  return new Box3().setFromObject(build.group);
}
