import {
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
  getRoomWallSegments,
} from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import {
  PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT,
  type PortfolioMannequinPalette,
} from '../avatar/mannequin';
import { type SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../level/floorElevations';
import { getMiniaturePoiProxyDefinition } from '../miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_PROXIES } from '../miniature/sceneComponentRegistry';
import type { PoiDefinition } from '../poi/types';

import { countObjectTriangles } from './triangleCount';

export const PORTFOLIO_MINIATURE_TABLE_CONTRACT = {
  realWorldReference:
    'white museum display table holding an architectural scale model',
  realWorldDimensionsMeters: { width: 1.4, depth: 0.9, height: 1.25 },
  intendedSceneBounds: { width: 4.65, depth: 4.25, height: 2.35 },
  tabletop: { width: 4.35, depth: 3.95, height: 1.08, thickness: 0.22 },
  modelBed: { width: 3.92, depth: 3.52, y: 1.22, margin: 0.12 },
  clearances: { markerMinHeight: 2.35, avatarPathRadius: 1.15 },
} as const;

export interface PortfolioMiniatureTransform {
  readonly worldOrigin: Vector3;
  readonly uniformScale: number;
  readonly modelBedOffset: Vector3;
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
  transform: PortfolioMiniatureTransform;
  triangles: {
    table: number;
    architectureAndSceneComponents: number;
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

const tableMaterials = () => ({
  white: new MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.56,
    metalness: 0.04,
  }),
  seam: new MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 }),
  bed: new MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.82 }),
});

function mesh(
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  material: MeshStandardMaterial | MeshBasicMaterial
) {
  const node = new Mesh(new BoxGeometry(...size), material);
  node.name = name;
  node.position.set(...position);
  node.castShadow = false;
  node.receiveShadow = false;
  return node;
}

export function createPortfolioTableShell(
  detailPolicy: SceneDetailPolicy
): Group {
  const group = new Group();
  group.name = 'PortfolioMiniatureTableShell';
  const c = PORTFOLIO_MINIATURE_TABLE_CONTRACT;
  const materials = tableMaterials();
  const baseHeight = c.tabletop.height - c.tabletop.thickness;
  group.add(
    mesh(
      'PortfolioMiniatureTableBase',
      [3.35, baseHeight, 2.95],
      [0, baseHeight / 2, 0],
      materials.white
    )
  );
  group.add(
    mesh(
      'PortfolioMiniatureTableTop',
      [c.tabletop.width, c.tabletop.thickness, c.tabletop.depth],
      [0, c.tabletop.height, 0],
      materials.white
    )
  );
  group.add(
    mesh(
      'PortfolioMiniatureTableModelBed',
      [c.modelBed.width, 0.035, c.modelBed.depth],
      [0, c.modelBed.y, 0],
      materials.bed
    )
  );
  if (detailPolicy.level === 'cinematic' || detailPolicy.level === 'balanced') {
    group.add(
      mesh(
        'PortfolioMiniatureTableInsetLipNorth',
        [c.tabletop.width, 0.12, 0.08],
        [0, c.modelBed.y + 0.06, -c.tabletop.depth / 2 + 0.16],
        materials.seam
      )
    );
    group.add(
      mesh(
        'PortfolioMiniatureTableInsetLipSouth',
        [c.tabletop.width, 0.12, 0.08],
        [0, c.modelBed.y + 0.06, c.tabletop.depth / 2 - 0.16],
        materials.seam
      )
    );
    group.add(
      mesh(
        'PortfolioMiniatureTableInsetLipEast',
        [0.08, 0.12, c.tabletop.depth],
        [c.tabletop.width / 2 - 0.16, c.modelBed.y + 0.06, 0],
        materials.seam
      )
    );
    group.add(
      mesh(
        'PortfolioMiniatureTableInsetLipWest',
        [0.08, 0.12, c.tabletop.depth],
        [-c.tabletop.width / 2 + 0.16, c.modelBed.y + 0.06, 0],
        materials.seam
      )
    );
  }
  group.userData.ownedMaterials = Object.values(materials);
  return group;
}

function computeEnvelope() {
  const points = [...FLOOR_PLAN.outline, ...UPPER_FLOOR_PLAN.outline];
  const xs = points.map(([x]) => x);
  const zs = points.map(([, z]) => z);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    height: UPPER_FLOOR_TOP_ELEVATION + 2.2,
    origin: new Vector3(
      (minX + maxX) / 2,
      GROUND_FLOOR_TOP_ELEVATION,
      (minZ + maxZ) / 2
    ),
  };
}

export function createPortfolioMiniatureTransform(): PortfolioMiniatureTransform {
  const envelope = computeEnvelope();
  const c = PORTFOLIO_MINIATURE_TABLE_CONTRACT;
  const scale = Math.min(
    c.modelBed.width / envelope.width,
    c.modelBed.depth / envelope.depth,
    0.98 / envelope.height
  );
  const modelBedOffset = new Vector3(0, c.modelBed.y, 0);
  return {
    worldOrigin: envelope.origin.clone(),
    uniformScale: scale,
    modelBedOffset,
    mapWorldPosition: (position) =>
      position
        .clone()
        .sub(envelope.origin)
        .multiplyScalar(scale)
        .add(modelBedOffset),
    inverseMapPosition: (position) =>
      position
        .clone()
        .sub(modelBedOffset)
        .multiplyScalar(1 / scale)
        .add(envelope.origin),
    mapWorldYaw: (yaw) => yaw,
  };
}

function addArchitecture(parent: Group, detailPolicy: SceneDetailPolicy) {
  const architecture = new Group();
  architecture.name = 'MiniatureArchitecture';
  const floorMaterial = new MeshBasicMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.58,
  });
  const upperMaterial = new MeshBasicMaterial({
    color: 0xe0e7ff,
    transparent: true,
    opacity: 0.42,
  });
  const wallMaterial = new MeshBasicMaterial({ color: 0xffffff });
  const backyardMaterial = new MeshBasicMaterial({
    color: 0xbbf7d0,
    transparent: true,
    opacity: 0.5,
  });
  for (const room of FLOOR_PLAN.rooms) {
    const b = room.bounds;
    const mat = room.category === 'exterior' ? backyardMaterial : floorMaterial;
    const node = mesh(
      room.category === 'exterior'
        ? 'MiniatureBackyard'
        : `MiniatureGroundFloor-${room.id}`,
      [b.maxX - b.minX, 0.05, b.maxZ - b.minZ],
      [
        (b.minX + b.maxX) / 2,
        GROUND_FLOOR_TOP_ELEVATION + 0.025,
        (b.minZ + b.maxZ) / 2,
      ],
      mat
    );
    architecture.add(node);
    if (room.category !== 'exterior')
      getRoomWallSegments(room).forEach((s, i) => {
        const horizontal = s.orientation === 'horizontal';
        architecture.add(
          mesh(
            `MiniatureGroundWall-${room.id}-${i}`,
            [
              horizontal ? Math.abs(s.end.x - s.start.x) : 0.18,
              0.78,
              horizontal ? 0.18 : Math.abs(s.end.z - s.start.z),
            ],
            [(s.start.x + s.end.x) / 2, 0.42, (s.start.z + s.end.z) / 2],
            wallMaterial
          )
        );
      });
  }
  for (const room of UPPER_FLOOR_PLAN.rooms) {
    if (room.category === 'exterior') continue;
    const b = room.bounds;
    architecture.add(
      mesh(
        room.id === 'upperLanding'
          ? 'MiniatureUpperLanding'
          : `MiniatureUpperFloor-${room.id}`,
        [b.maxX - b.minX, 0.05, b.maxZ - b.minZ],
        [
          (b.minX + b.maxX) / 2,
          UPPER_FLOOR_TOP_ELEVATION + 0.025,
          (b.minZ + b.maxZ) / 2,
        ],
        upperMaterial
      )
    );
  }
  architecture.add(
    mesh(
      'MiniatureStaircase',
      [2.2, UPPER_FLOOR_TOP_ELEVATION, 5.8],
      [-20, UPPER_FLOOR_TOP_ELEVATION / 2, -5],
      new MeshBasicMaterial({ color: 0xcbd5e1 })
    )
  );
  if (detailPolicy.level !== 'micro')
    architecture.add(
      mesh(
        'MiniatureStaircaseTreads',
        [2.3, 0.12, 5.9],
        [-20, UPPER_FLOOR_TOP_ELEVATION * 0.52, -5],
        new MeshBasicMaterial({ color: 0x94a3b8 })
      )
    );
  architecture.userData.ownedMaterials = [
    floorMaterial,
    upperMaterial,
    wallMaterial,
    backyardMaterial,
  ];
  parent.add(architecture);
  return architecture;
}

function createMiniaturePlayer(detailPolicy: SceneDetailPolicy) {
  const root = new Group();
  root.name = 'MiniaturePlayer';
  const base = new MeshBasicMaterial({ color: 0x283347 });
  const accent = new MeshBasicMaterial({ color: 0x57d7ff });
  const trim = new MeshBasicMaterial({ color: 0xf7c77d });
  const h = PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT;
  root.add(
    mesh('MiniaturePlayerTorso', [0.42, 0.9, 0.28], [0, h * 0.48, 0], base)
  );
  root.add(
    mesh('MiniaturePlayerHead', [0.38, 0.38, 0.38], [0, h * 0.82, 0], trim)
  );
  root.add(
    mesh(
      'MiniaturePlayerVisor',
      [0.32, 0.08, 0.04],
      [0, h * 0.84, -0.21],
      accent
    )
  );
  root.add(
    mesh(
      'MiniaturePlayerLeftArm',
      [0.14, 0.72, 0.14],
      [-0.34, h * 0.48, 0],
      base
    )
  );
  root.add(
    mesh(
      'MiniaturePlayerRightArm',
      [0.14, 0.72, 0.14],
      [0.34, h * 0.48, 0],
      base
    )
  );
  root.add(
    mesh(
      'MiniaturePlayerLeftLeg',
      [0.16, 0.72, 0.16],
      [-0.13, h * 0.15, 0],
      base
    )
  );
  root.add(
    mesh(
      'MiniaturePlayerRightLeg',
      [0.16, 0.72, 0.16],
      [0.13, h * 0.15, 0],
      base
    )
  );
  root.userData.playerMaterials = { base, accent, trim };
  root.userData.detailLevel = detailPolicy.level;
  return root;
}

function rotatedAabb(
  center: Vector3,
  width: number,
  depth: number,
  yaw: number
): RectCollider {
  const hw = width / 2,
    hd = depth / 2,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  const corners = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, z]) => ({
    x: center.x + x * c - z * s,
    z: center.z + x * s + z * c,
  }));
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    maxX: Math.max(...corners.map((p) => p.x)),
    minZ: Math.min(...corners.map((p) => p.z)),
    maxZ: Math.max(...corners.map((p) => p.z)),
  };
}

export function createPortfolioMiniatureTable(options: {
  position: Vector3;
  orientationRadians: number;
  tableDetailPolicy: SceneDetailPolicy;
  miniatureDetailPolicy: SceneDetailPolicy;
  poiDefinitions: readonly PoiDefinition[];
}): PortfolioMiniatureTableBuild {
  const group = new Group();
  group.name = 'PortfolioMiniatureTable';
  group.position.copy(options.position);
  group.rotation.y = options.orientationRadians;
  group.scale.set(1, 1, 1);
  const shell = createPortfolioTableShell(options.tableDetailPolicy);
  group.add(shell);
  const transform = createPortfolioMiniatureTransform();
  const miniatureWorldRoot = new Group();
  miniatureWorldRoot.name = 'MiniatureWorldRoot';
  miniatureWorldRoot.position.copy(transform.modelBedOffset);
  miniatureWorldRoot.scale.setScalar(transform.uniformScale);
  const content = new Group();
  content.name = 'MiniatureWorldContent';
  content.position.copy(transform.worldOrigin).multiplyScalar(-1);
  miniatureWorldRoot.add(content);
  group.add(miniatureWorldRoot);
  const arch = addArchitecture(content, options.miniatureDetailPolicy);
  const sceneRoot = new Group();
  sceneRoot.name = 'MiniatureSceneComponentRoot';
  MINIATURE_SCENE_COMPONENT_PROXIES.forEach((definition, index) => {
    const built = buildMiniatureProxy(
      definition,
      options.miniatureDetailPolicy
    );
    built.root.name = `MiniatureSceneComponent-${definition.id}`;
    built.root.position.set(-18 + index * 3, GROUND_FLOOR_TOP_ELEVATION, 18);
    sceneRoot.add(built.root);
  });
  content.add(sceneRoot);
  const poiRoot = new Group();
  poiRoot.name = 'MiniaturePoiRoot';
  let selfProxy: Object3D | null = null;
  for (const poi of options.poiDefinitions) {
    const definition = getMiniaturePoiProxyDefinition(poi.id);
    const built = buildMiniatureProxy(
      definition,
      options.miniatureDetailPolicy
    );
    built.root.name =
      poi.id === 'danielsmith-portfolio-table'
        ? 'MiniatureSelfProxy'
        : `MiniaturePoiProxy-${poi.id}`;
    built.root.position.set(poi.position.x, poi.position.y, poi.position.z);
    built.root.rotation.y = poi.headingRadians ?? 0;
    built.root.scale.set(1, 1, 1);
    poiRoot.add(built.root);
    if (poi.id === 'danielsmith-portfolio-table') selfProxy = built.root;
  }
  content.add(poiRoot);
  const miniaturePlayer = createMiniaturePlayer(options.miniatureDetailPolicy);
  content.add(miniaturePlayer);
  const collider = rotatedAabb(
    options.position,
    PORTFOLIO_MINIATURE_TABLE_CONTRACT.intendedSceneBounds.width,
    PORTFOLIO_MINIATURE_TABLE_CONTRACT.intendedSceneBounds.depth,
    options.orientationRadians
  );
  let disposed = false;
  const tableTriangles = countObjectTriangles(shell);
  const tinyPlayerTriangles = countObjectTriangles(miniaturePlayer);
  const poiTriangles = countObjectTriangles(poiRoot);
  const architectureAndSceneComponents =
    countObjectTriangles(arch) + countObjectTriangles(sceneRoot);
  return {
    group,
    collider,
    miniatureWorldRoot,
    miniaturePlayer,
    selfProxy: selfProxy ?? poiRoot,
    transform,
    triangles: {
      table: tableTriangles,
      architectureAndSceneComponents,
      poiProxies: poiTriangles,
      tinyPlayer: tinyPlayerTriangles,
      total:
        tableTriangles +
        architectureAndSceneComponents +
        poiTriangles +
        tinyPlayerTriangles,
    },
    update: ({ playerWorldPosition, playerYaw }) => {
      if (disposed) return;
      miniaturePlayer.position.copy(playerWorldPosition);
      miniaturePlayer.rotation.y = transform.mapWorldYaw(playerYaw);
    },
    setPlayerPalette: (palette) => {
      if (disposed) return;
      const mats = miniaturePlayer.userData.playerMaterials as Record<
        string,
        MeshBasicMaterial
      >;
      mats.base.color = new Color(palette.base);
      mats.accent.color = new Color(palette.accent);
      mats.trim.color = new Color(palette.trim);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      group.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    },
  };
}
