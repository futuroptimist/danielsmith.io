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

import { FLOOR_PLAN, FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import type { PortfolioMannequinPalette } from '../avatar/mannequin';
import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../avatar/mannequin';
import {
  getSceneDetailPolicy,
  type SceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';
import { GROUND_FLOOR_TOP_ELEVATION } from '../level/floorElevations';
import { generateWallSegmentInstances } from '../level/generateWalls';
import { PORTFOLIO_LEVEL } from '../level/portfolioLevel';
import { createRoomLedStrips } from '../lighting/ledStrips';
import { getMiniaturePoiProxyDefinition } from '../miniature/poiProxyRegistry';
import { buildMiniatureProxy } from '../miniature/proxyBuilder';
import { MINIATURE_SCENE_COMPONENT_PROXIES } from '../miniature/sceneComponentRegistry';
import { getPoiPhysicalMetadata } from '../poi/physicalMetadata';
import type { PoiDefinition, PoiFootprint, PoiId } from '../poi/types';

import { PORTFOLIO_MINIATURE_TABLE_DIMENSIONS } from './portfolioMiniatureTableContract';
import {
  CEILING_COVE_OFFSET,
  FENCE_HEIGHT,
  FENCE_THICKNESS,
  STAIRCASE_CONFIG,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from './portfolioSceneLayout';
import { createStaircase } from './staircase';
import { countObjectTriangles } from './triangleCount';
import { createWallSegmentMeshes } from './wallSegmentsMesh';

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

export interface MiniaturePoiPlacement {
  id: PoiId;
  position: { x: number; y: number; z: number };
  headingRadians: number;
  floor: 'ground' | 'upper';
  roomId: string;
  footprint: PoiFootprint;
  definition: PoiDefinition;
  anchorKind: 'floor' | 'wall' | 'environment';
  placementSource: 'visual-model-anchor';
}

export interface PortfolioMiniatureTableOptions {
  position: { x: number; y: number; z: number };
  orientationRadians?: number;
  tableDetailPolicy?: SceneDetailPolicy;
  miniatureDetailPolicy?: SceneDetailPolicy;
  poiDefinitions: readonly PoiDefinition[];
  poiPlacements: readonly MiniaturePoiPlacement[];
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
  const xs = FLOOR_PLAN.outline.map(([x]) => x);
  const zs = FLOOR_PLAN.outline.map(([, z]) => z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    minY: GROUND_FLOOR_TOP_ELEVATION,
    maxY: GROUND_FLOOR_TOP_ELEVATION + WALL_HEIGHT,
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
      return yaw;
    },
  };
}

const MINIATURE_MATERIAL_COLORS = {
  groundFloor: 0x0f172a,
  studioFloor: 0x111827,
  kitchenFloor: 0x172033,
  livingRoomFloor: 0x0b1220,
  backyard: 0x052e16,
  backyardAccent: 0x1f6b3b,
  walls: 0x111827,
  ledStrip: 0x7dd3fc,
  upperFloorGhost: 0x38bdf8,
  upperFloorRim: 0x7dd3fc,
  stairs: 0x475569,
  landing: 0xb7791f,
  fence: 0x3f2f1f,
} as const;

const createMiniatureMaterial = (
  role: keyof typeof MINIATURE_MATERIAL_COLORS,
  options: { transparent?: boolean; opacity?: number } = {}
) => {
  const material = createMaterial(
    MINIATURE_MATERIAL_COLORS[role],
    options.transparent,
    options.opacity,
    role.includes('Floor') ? 0.58 : 0.72,
    role.includes('Floor') ? 0.18 : 0.05
  );
  material.name = `MiniatureMaterial:${role}`;
  return material;
};

const getRoomMiniatureMaterialRole = (
  room: (typeof FLOOR_PLAN.rooms)[number]
) => {
  if (room.category === 'exterior') return 'backyard';
  if (room.id.toLowerCase().includes('kitchen')) return 'kitchenFloor';
  if (room.id.toLowerCase().includes('living')) return 'livingRoomFloor';
  if (room.id.toLowerCase().includes('studio')) return 'studioFloor';
  return 'groundFloor';
};

const getRoomCategory = (roomId: string) =>
  FLOOR_PLAN.rooms.find((room) => room.id === roomId)?.category ?? 'interior';

const getLevelFloor = (floorId: 'ground' | 'upper') => {
  const floor = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === floorId
  );
  if (!floor) throw new Error(`Missing portfolio floor definition: ${floorId}`);
  return floor;
};

const createLedStripMaterial = () => {
  const material = new MeshBasicMaterial({
    color: MINIATURE_MATERIAL_COLORS.ledStrip,
  });
  material.name = 'MiniatureMaterial:ledStrip';
  ownedMaterials.add(material);
  return material;
};

const getPoiRoomBounds = (poi: PoiDefinition) =>
  FLOOR_PLAN.rooms.find((room) => room.id === poi.roomId)?.bounds ?? null;

function createArchitecture() {
  const root = new Group();
  root.name = 'MiniatureArchitecture';
  const materials = {
    groundFloor: createMiniatureMaterial('groundFloor'),
    studioFloor: createMiniatureMaterial('studioFloor'),
    kitchenFloor: createMiniatureMaterial('kitchenFloor'),
    livingRoomFloor: createMiniatureMaterial('livingRoomFloor'),
    backyard: createMiniatureMaterial('backyard'),
    backyardAccent: createMiniatureMaterial('backyardAccent'),
    upperFloorGhost: createMiniatureMaterial('upperFloorGhost', {
      transparent: true,
      opacity: 0.025,
    }),
    upperFloorRim: createMiniatureMaterial('upperFloorRim', {
      transparent: true,
      opacity: 0.62,
    }),
    walls: createMiniatureMaterial('walls'),
    stairs: createMiniatureMaterial('stairs'),
    landing: createMiniatureMaterial('landing'),
    fence: createMiniatureMaterial('fence'),
    ledStrip: createLedStripMaterial(),
  } as const;

  const groundSlabs = FLOOR_PLAN.rooms.filter(
    (room) => room.category !== 'exterior'
  );
  for (const room of groundSlabs) {
    const { minX, maxX, minZ, maxZ } = room.bounds;
    const role = getRoomMiniatureMaterialRole(room);
    const mesh = addBox(
      root,
      `MiniatureGroundFloor:${room.id}`,
      [maxX - minX, 0.09, maxZ - minZ],
      [(minX + maxX) / 2, GROUND_FLOOR_TOP_ELEVATION, (minZ + maxZ) / 2],
      materials[role]
    );
    mesh.userData.floor = 'ground';
    mesh.userData.materialRole = role;
    mesh.userData.filledFloorArea = (maxX - minX) * (maxZ - minZ);
    mesh.userData.opaqueFilledFloor = true;
  }

  const backyardRoom = FLOOR_PLAN.rooms.find(
    (room) => room.category === 'exterior'
  );
  if (backyardRoom) {
    const { minX, maxX, minZ, maxZ } = backyardRoom.bounds;
    const mesh = addBox(
      root,
      'MiniatureBackyard',
      [maxX - minX, 0.08, maxZ - minZ],
      [(minX + maxX) / 2, GROUND_FLOOR_TOP_ELEVATION + 0.01, (minZ + maxZ) / 2],
      materials.backyard
    );
    mesh.userData.materialRole = 'backyard';
    addBox(
      root,
      'MiniatureBackyardGrassPatch',
      [6.5, 0.035, 3.2],
      [-3, 0.08, 23],
      materials.backyardAccent
    );
    addBox(
      root,
      'MiniatureBackyardFenceNorth',
      [maxX - minX, 0.55, 0.16],
      [(minX + maxX) / 2, 0.36, maxZ],
      materials.fence
    );
    addBox(
      root,
      'MiniatureBackyardFenceWest',
      [0.16, 0.55, maxZ - minZ],
      [minX, 0.36, (minZ + maxZ) / 2],
      materials.fence
    );
    addBox(
      root,
      'MiniatureBackyardFenceEast',
      [0.16, 0.55, maxZ - minZ],
      [maxX, 0.36, (minZ + maxZ) / 2],
      materials.fence
    );
    addBox(
      root,
      'MiniatureBackyardOutdoorTable',
      [1.4, 0.18, 0.9],
      [-8.5, 0.35, 24],
      materials.fence
    );
    addBox(
      root,
      'MiniatureBackyardGreenObject',
      [1.1, 0.55, 0.8],
      [-16, 0.35, 20.5],
      materials.backyardAccent
    );
  }

  const wallInstances = generateWallSegmentInstances(getLevelFloor('ground'), {
    coordinateScale: FLOOR_PLAN_SCALE,
    baseElevation: GROUND_FLOOR_TOP_ELEVATION,
    wallHeight: WALL_HEIGHT,
    wallThickness: WALL_THICKNESS,
    fenceHeight: FENCE_HEIGHT,
    fenceThickness: FENCE_THICKNESS,
    getRoomCategory,
  });
  const wallMeshes = createWallSegmentMeshes({
    instances: wallInstances,
    groupName: 'MiniatureGroundWallSegments',
    getMaterial(instance) {
      return instance.isFence ? materials.fence : materials.walls;
    },
  });
  for (const mesh of wallMeshes.meshes) {
    mesh.name = `MiniatureWall:${String(mesh.userData.levelSourceId)}`;
    mesh.userData.materialRole = mesh.userData.isFence ? 'fence' : 'walls';
    mesh.userData.floor = 'ground';
  }
  root.add(wallMeshes.group);

  const ledBuild = createRoomLedStrips({
    plan: FLOOR_PLAN,
    getRoomCategory,
    ledHeight: WALL_HEIGHT - CEILING_COVE_OFFSET,
    baseColor: 0x101623,
    emissiveIntensity: 2.6,
    fillLightIntensity: 0,
    wallThickness: WALL_THICKNESS,
  });
  ledBuild.group.name = 'MiniatureGroundLedStrips';
  ledBuild.group.traverse((object) => {
    if (object instanceof Mesh) {
      object.name = `MiniatureLedStrip:${object.name || object.uuid}`;
      object.material = materials.ledStrip;
      object.userData.materialRole = 'ledStrip';
      object.userData.floor = 'ground';
    }
  });
  root.add(ledBuild.group);

  const staircase = createStaircase({
    ...STAIRCASE_CONFIG,
    name: 'MiniatureStaircase',
    step: {
      ...STAIRCASE_CONFIG.step,
      material: { color: MINIATURE_MATERIAL_COLORS.stairs },
    },
    landing: {
      ...STAIRCASE_CONFIG.landing,
      material: { color: MINIATURE_MATERIAL_COLORS.landing },
      guard: STAIRCASE_CONFIG.landing.guard
        ? {
            ...STAIRCASE_CONFIG.landing.guard,
            material: { color: MINIATURE_MATERIAL_COLORS.walls },
          }
        : undefined,
    },
  });
  staircase.group.traverse((object) => {
    if (object instanceof Mesh) object.userData.floor = 'ground';
  });
  root.add(staircase.group);
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
  const architecture = createArchitecture();
  content.add(architecture);

  const sceneRoot = new Group();
  sceneRoot.name = 'MiniatureSceneComponentRoot';
  content.add(sceneRoot);
  MINIATURE_SCENE_COMPONENT_PROXIES.forEach((definition) => {
    if (
      definition.id === 'component:ceiling-panels' ||
      definition.id === 'component:lighting-visible-fixtures' ||
      definition.id === 'component:media-wall-star-bridge'
    ) {
      return;
    }
  });

  const poiRoot = new Group();
  poiRoot.name = 'MiniaturePoiRoot';
  content.add(poiRoot);
  let selfProxy: Object3D | null = null;
  const miniaturePoiPlacements = options.poiPlacements.filter(
    (poi) => poi.floor === 'ground'
  );
  for (const poi of miniaturePoiPlacements) {
    const definition = getMiniaturePoiProxyDefinition(poi.id);
    if (!definition) continue;
    const built = buildMiniatureProxy(definition, miniaturePolicy).root;
    built.name =
      poi.id === 'danielsmith-portfolio-table'
        ? 'MiniatureSelfProxy'
        : `MiniaturePoi:${poi.id}`;
    const metadata = getPoiPhysicalMetadata(poi.id);
    const targetWidth =
      metadata?.intendedSceneBounds.width ?? poi.footprint.width;
    const targetDepth =
      metadata?.intendedSceneBounds.depth ?? poi.footprint.depth;
    const roomBounds = getPoiRoomBounds(poi.definition);
    const roomWidth = roomBounds ? roomBounds.maxX - roomBounds.minX : Infinity;
    const roomDepth = roomBounds ? roomBounds.maxZ - roomBounds.minZ : Infinity;
    const fittedTargetWidth = Math.min(targetWidth, roomWidth * 0.82);
    const fittedTargetDepth = Math.min(targetDepth, roomDepth * 0.82);
    const proxyRoot = new Group();
    proxyRoot.name =
      poi.id === 'danielsmith-portfolio-table'
        ? 'MiniatureSelfProxy'
        : `MiniaturePoi:${poi.id}`;
    const contentGroup = new Group();
    contentGroup.name = `${proxyRoot.name}:Content`;
    proxyRoot.add(contentGroup);
    built.name = `${proxyRoot.name}:Model`;
    contentGroup.add(built);
    const proxyBounds = new Box3().setFromObject(contentGroup);
    const proxySize = proxyBounds.getSize(new Vector3());
    const footprintScale = Math.min(
      fittedTargetWidth / Math.max(proxySize.x, 0.001),
      fittedTargetDepth / Math.max(proxySize.z, 0.001),
      (metadata?.intendedSceneBounds.height ?? 2.2) /
        Math.max(proxySize.y, 0.001)
    );
    if (poi.id !== 'danielsmith-portfolio-table') {
      const fitScale = Math.min(footprintScale * 0.92, 2.2);
      contentGroup.scale.setScalar(Math.max(0.01, fitScale));
    }
    const scaledBounds = new Box3().setFromObject(contentGroup);
    contentGroup.position.sub(
      new Vector3(
        (scaledBounds.min.x + scaledBounds.max.x) / 2,
        scaledBounds.min.y,
        (scaledBounds.min.z + scaledBounds.max.z) / 2
      )
    );
    if (poi.anchorKind === 'wall') {
      contentGroup.position.z += fittedTargetDepth / 2;
    }
    proxyRoot.position.set(poi.position.x, poi.position.y, poi.position.z);
    proxyRoot.rotation.y = poi.headingRadians;
    proxyRoot.userData.placementSource = poi.placementSource;
    proxyRoot.userData.sourceWorldPosition = {
      x: poi.position.x,
      y: poi.position.y,
      z: poi.position.z,
    };
    proxyRoot.userData.roomId = poi.roomId;
    proxyRoot.userData.floor = poi.floor;
    proxyRoot.userData.anchorKind = poi.anchorKind;
    proxyRoot.userData.fittedTargetWidth = fittedTargetWidth;
    proxyRoot.userData.fittedTargetDepth = fittedTargetDepth;
    poiRoot.add(proxyRoot);
    if (poi.id === 'danielsmith-portfolio-table') selfProxy = proxyRoot;
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
