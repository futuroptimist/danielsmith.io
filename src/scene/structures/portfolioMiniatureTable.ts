import {
  Box3,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';

import { FLOOR_PLAN_LEVELS } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import type { PortfolioMannequinPalette } from '../avatar/mannequin';
import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../avatar/mannequin';
import {
  getSceneDetailPolicy,
  type SceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';
import type { FloorId } from '../level/floorElevations';
import {
  createSourceSnapshot,
  type MiniatureSource,
} from '../miniature/sourceSnapshot';
import type { PoiDefinition, PoiFootprint, PoiId } from '../poi/types';

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
  sourceSnapshot: ReturnType<typeof createSourceSnapshot>;
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
    activeFloor?: FloorId;
  }): void;
  setPlayerPalette(palette: PortfolioMannequinPalette): void;
  dispose(): void;
}

export interface MiniaturePoiPlacement {
  id: PoiId;
  position: { x: number; y: number; z: number };
  headingRadians: number;
  floor: FloorId;
  roomId: string;
  footprint: PoiFootprint;
  definition: PoiDefinition;
  anchorKind: 'floor' | 'wall' | 'environment';
  placementSource: 'visual-model-anchor';
}

export interface PortfolioMiniatureTableOptions {
  sourceVisuals: readonly MiniatureSource[];
  position: { x: number; y: number; z: number };
  orientationRadians?: number;
  tableDetailPolicy?: SceneDetailPolicy;
  miniatureDetailPolicy?: SceneDetailPolicy;
  poiDefinitions: readonly PoiDefinition[];
  poiPlacements: readonly MiniaturePoiPlacement[];
}

export interface GroundFloorMiniaturePoiPlacementResolution {
  placements: MiniaturePoiPlacement[];
  missingAnchorIds: PoiId[];
}

export function resolveGroundFloorMiniaturePoiPlacements(
  poiDefinitions: readonly PoiDefinition[],
  resolveAnchor: (id: PoiId) => {
    worldPosition: Vector3;
    worldYaw: number;
    kind: MiniaturePoiPlacement['anchorKind'];
  } | null,
  getFloorId: (definition: PoiDefinition) => FloorId,
  finiteSelfPlacement?: MiniaturePoiPlacement
): GroundFloorMiniaturePoiPlacementResolution {
  const placements: MiniaturePoiPlacement[] = [];
  const missingAnchorIds: PoiId[] = [];

  for (const definition of poiDefinitions) {
    if (getFloorId(definition) !== 'ground') continue;
    if (finiteSelfPlacement && definition.id === finiteSelfPlacement.id) {
      placements.push(finiteSelfPlacement);
      continue;
    }
    const anchor = resolveAnchor(definition.id);
    if (!anchor) {
      missingAnchorIds.push(definition.id);
      continue;
    }
    placements.push({
      id: definition.id,
      position: {
        x: anchor.worldPosition.x,
        y: anchor.worldPosition.y,
        z: anchor.worldPosition.z,
      },
      headingRadians: anchor.worldYaw,
      floor: 'ground',
      roomId: definition.roomId,
      footprint: definition.footprint,
      definition,
      anchorKind: anchor.kind,
      placementSource: 'visual-model-anchor',
    });
  }

  return { placements, missingAnchorIds };
}

const ownedMaterials = new WeakSet<object>();

const createMaterial = (
  color: number,
  transparent = false,
  opacity = 1,
  roughness = 0.72,
  metalness = 0.05
) => {
  const material = new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent,
    opacity,
    depthWrite: !transparent,
  });
  ownedMaterials.add(material);
  return material;
};

function addBox(
  parent: Group,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  color: number | Material
) {
  const mesh = new Mesh(
    new BoxGeometry(...size),
    typeof color === 'number' ? createMaterial(color) : color
  );
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
  const points = FLOOR_PLAN_LEVELS.flatMap((level) => level.plan.outline);
  return {
    minX: Math.min(...points.map(([x]) => x)),
    maxX: Math.max(...points.map(([x]) => x)),
    minZ: Math.min(...points.map(([, z]) => z)),
    maxZ: Math.max(...points.map(([, z]) => z)),
    minY: -5,
    maxY: 11,
  };
}

export function createMiniatureWorldTransform(
  tableHeading = 0,
  sourceBounds?: Box3
): MiniatureWorldTransform {
  const env = sourceBounds
    ? {
        minX: sourceBounds.min.x,
        maxX: sourceBounds.max.x,
        minZ: sourceBounds.min.z,
        maxZ: sourceBounds.max.z,
        minY: sourceBounds.min.y,
        maxY: sourceBounds.max.y,
      }
    : floorEnvelope();
  const origin = new Vector3(
    (env.minX + env.maxX) / 2,
    env.minY,
    (env.minZ + env.maxZ) / 2
  );
  const scale = Math.min(
    PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.bedWidth / (env.maxX - env.minX),
    PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.bedDepth / (env.maxZ - env.minZ),
    0.9 / (env.maxY - env.minY)
  );
  const offset = new Vector3(
    0,
    PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.height +
      PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.topThickness / 2 +
      0.04,
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
      // The outer table heading rotates miniature architecture and player
      // together, so local yaw intentionally stays in overworld coordinates.
      return yaw;
    },
  };
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

  const sourceSnapshot = createSourceSnapshot(
    options.sourceVisuals,
    miniaturePolicy
  );
  const transform = createMiniatureWorldTransform(
    heading,
    sourceSnapshot.bounds
  );
  const miniatureWorldRoot = new Group();
  miniatureWorldRoot.name = 'MiniatureWorldRoot';
  miniatureWorldRoot.position.copy(transform.modelBedOffset);
  miniatureWorldRoot.scale.setScalar(transform.uniformScale);
  group.add(miniatureWorldRoot);
  const content = new Group();
  content.name = 'MiniatureWorldContent';
  content.position.copy(transform.worldOrigin).multiplyScalar(-1);
  miniatureWorldRoot.add(content);
  const architecture = sourceSnapshot.group;
  content.add(architecture);

  const selfPlacement = options.poiPlacements.find(
    (poi) => poi.id === 'danielsmith-portfolio-table'
  );
  if (!selfPlacement)
    throw new Error('Portfolio miniature table requires a self placement.');
  const selfProxy = createPortfolioTableShell(miniaturePolicy);
  selfProxy.name = 'MiniatureSelfProxy';
  selfProxy.position.set(
    selfPlacement.position.x,
    selfPlacement.position.y,
    selfPlacement.position.z
  );
  selfProxy.rotation.y = selfPlacement.headingRadians;
  content.add(selfProxy);
  sourceSnapshot.setFloor('ground');

  const player = createTinyPlayer(miniaturePolicy);
  content.add(player.root);

  let disposed = false;
  const build: PortfolioMiniatureTableBuild = {
    sourceSnapshot,
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
        countObjectTriangles(architecture),
      poiProxies: countObjectTriangles(selfProxy),
      tinyPlayer: countObjectTriangles(player.root),
      total: countObjectTriangles(group),
    },
    update({ playerWorldPosition, playerYaw, activeFloor = 'ground' }) {
      if (disposed) return;
      player.root.position.copy(playerWorldPosition);
      player.root.rotation.y = transform.mapWorldYaw(playerYaw);
      sourceSnapshot.setFloor(activeFloor);
    },
    setPlayerPalette(palette) {
      if (!disposed) player.setPalette(palette);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      sourceSnapshot.dispose();
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
