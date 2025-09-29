import './styles.css';

import {
  ACESFilmicToneMapping,
  AmbientLight,
  Audio,
  AudioListener,
  BoxGeometry,
  CanvasTexture,
  Clock,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import {
  AmbientAudioController,
  type AmbientAudioBedDefinition,
  type AmbientAudioSource,
} from './audio/ambientAudio';
import {
  createCricketChorusBuffer,
  createDistantHumBuffer,
} from './audio/proceduralBuffers';
import { collidesWithColliders, type RectCollider } from './collision';
import { KeyboardControls } from './controls/KeyboardControls';
import { VirtualJoystick } from './controls/VirtualJoystick';
import { createBackyardEnvironment } from './environments/backyard';
import { evaluateFailoverDecision, renderTextFallback } from './failover';
import {
  FLOOR_PLAN,
  FLOOR_PLAN_SCALE,
  getCombinedWallSegments,
  getFloorBounds,
  RoomWall,
  WALL_THICKNESS,
  type Bounds2D,
  type RoomCategory,
} from './floorPlan';
import {
  createLightingDebugController,
  type LightingMode,
} from './lighting/debugControls';
import { getCameraRelativeMovementVector } from './movement/cameraRelativeMovement';
import { createWindowPoiAnalytics } from './poi/analytics';
import { PoiInteractionManager } from './poi/interactionManager';
import { createPoiInstances, type PoiInstance } from './poi/markers';
import { getPoiDefinitions } from './poi/registry';
import { PoiTooltipOverlay } from './poi/tooltipOverlay';
import {
  createFlywheelShowpiece,
  type FlywheelShowpieceBuild,
} from './structures/flywheel';
import {
  createJobbotTerminal,
  type JobbotTerminalBuild,
} from './structures/jobbotTerminal';
import { createLivingRoomMediaWall } from './structures/mediaWall';
import { createStaircase, type StaircaseConfig } from './structures/staircase';

const WALL_HEIGHT = 6;
const FENCE_HEIGHT = 2.4;
const FENCE_THICKNESS = 0.28;
const PLAYER_RADIUS = 0.75;
const PLAYER_SPEED = 6;
const MOVEMENT_SMOOTHING = 8;
const CAMERA_PAN_SMOOTHING = 6;
const CAMERA_MARGIN = 1.1;
const CEILING_COVE_OFFSET = 0.35;
const LED_STRIP_THICKNESS = 0.12;
const LED_STRIP_DEPTH = 0.22;
const LED_STRIP_EDGE_BUFFER = 0.3;
const POSITION_EPSILON = 1e-4;
const BACKYARD_ROOM_ID = 'backyard';

const toWorldUnits = (value: number) => value * FLOOR_PLAN_SCALE;

const STAIRCASE_CONFIG = {
  name: 'LivingRoomStaircase',
  basePosition: new Vector3(toWorldUnits(6.2), 0, toWorldUnits(-5.3)),
  direction: 'negativeZ',
  step: {
    count: 9,
    rise: 0.42,
    run: toWorldUnits(0.85),
    width: toWorldUnits(3.1),
    material: {
      color: 0x708091,
      roughness: 0.6,
      metalness: 0.12,
    },
    colliderInset: toWorldUnits(0.05),
  },
  landing: {
    depth: toWorldUnits(2.6),
    thickness: 0.38,
    material: {
      color: 0x5b6775,
      roughness: 0.55,
      metalness: 0.08,
    },
    colliderInset: toWorldUnits(0.05),
    guard: {
      height: 0.55,
      thickness: toWorldUnits(0.14),
      inset: toWorldUnits(0.07),
      widthScale: 0.95,
      material: {
        color: 0x2c343f,
        roughness: 0.7,
        metalness: 0.05,
      },
    },
  },
} satisfies StaircaseConfig;

const LIGHTING_OPTIONS = {
  enableLedStrips: true,
  enableBloom: true,
  ledEmissiveIntensity: 3.2,
  ledLightIntensity: 1.4,
  bloomStrength: 0.55,
  bloomRadius: 0.85,
  bloomThreshold: 0.2,
} as const;

const staticColliders: RectCollider[] = [];
const poiInstances: PoiInstance[] = [];
let flywheelShowpiece: FlywheelShowpieceBuild | null = null;
let jobbotTerminal: JobbotTerminalBuild | null = null;
let ledStripGroup: Group | null = null;
let ledFillLightGroup: Group | null = null;
let ambientAudioController: AmbientAudioController | null = null;

const roomDefinitions = new Map(
  FLOOR_PLAN.rooms.map((room) => [room.id, room])
);

function getRoomCategory(roomId: string): RoomCategory {
  const room = roomDefinitions.get(roomId);
  return room?.category ?? 'interior';
}

function createVerticalGradientTexture(
  topHex: number,
  bottomHex: number
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create gradient canvas context.');
  }
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, new Color(topHex).getStyle());
  gradient.addColorStop(1, new Color(bottomHex).getStyle());
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createMediaWallScreenTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create media wall screen context.');
  }

  context.save();
  context.fillStyle = '#0f1724';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, '#182a47');
  gradient.addColorStop(0.55, '#0f233c');
  gradient.addColorStop(1, '#192339');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.6;
  const accent = context.createLinearGradient(0, 0, canvas.width, 0);
  accent.addColorStop(0, 'rgba(75, 217, 255, 0.8)');
  accent.addColorStop(0.45, 'rgba(83, 146, 255, 0.35)');
  accent.addColorStop(1, 'rgba(255, 82, 82, 0.6)');
  context.fillStyle = accent;
  context.fillRect(
    canvas.width * 0.05,
    canvas.height * 0.16,
    canvas.width * 0.9,
    canvas.height * 0.68
  );
  context.globalAlpha = 1;

  context.fillStyle = '#ffffff';
  context.font = 'bold 180px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillText('Futuroptimist', canvas.width * 0.08, canvas.height * 0.44);

  context.font = 'bold 120px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#ff4c4c';
  context.fillText('YouTube', canvas.width * 0.08, canvas.height * 0.62);

  context.font = '48px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#dbe7ff';
  context.fillText(
    'Designing resilient automation, live devlogs, and deep dives.',
    canvas.width * 0.08,
    canvas.height * 0.74
  );

  context.font = '48px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#9ddcff';
  context.fillText(
    'Latest Episode · Async Flywheel Blueprints',
    canvas.width * 0.08,
    canvas.height * 0.84
  );

  context.font = '600 72px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'right';
  context.fillText('Watch now →', canvas.width * 0.92, canvas.height * 0.84);

  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createYouTubeBadgeTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create media wall badge context.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const radius = 42;
  context.fillStyle = '#ff0000';
  context.beginPath();
  context.moveTo(radius, 0);
  context.lineTo(canvas.width - radius, 0);
  context.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
  context.lineTo(canvas.width, canvas.height - radius);
  context.quadraticCurveTo(
    canvas.width,
    canvas.height,
    canvas.width - radius,
    canvas.height
  );
  context.lineTo(radius, canvas.height);
  context.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
  context.lineTo(0, radius);
  context.quadraticCurveTo(0, 0, radius, 0);
  context.closePath();
  context.fill();

  context.fillStyle = '#ffffff';
  const playWidth = 120;
  const playHeight = 120;
  context.beginPath();
  context.moveTo(
    canvas.width / 2 - playWidth / 4,
    canvas.height / 2 - playHeight / 2
  );
  context.lineTo(
    canvas.width / 2 - playWidth / 4,
    canvas.height / 2 + playHeight / 2
  );
  context.lineTo(canvas.width / 2 + playWidth / 2, canvas.height / 2);
  context.closePath();
  context.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

interface LivingRoomMediaWallBuild {
  group: Group;
  colliders: RectCollider[];
}

function createLivingRoomMediaWall(bounds: Bounds2D): LivingRoomMediaWallBuild {
  const group = new Group();
  group.name = 'LivingRoomMediaWall';
  const colliders: RectCollider[] = [];

  const wallInteriorX = bounds.minX + 0.12;
  const anchorZ = MathUtils.clamp(-14.2, bounds.minZ + 3, bounds.maxZ - 3);

  const boardWidth = 6.4;
  const boardHeight = 3.6;
  const boardDepth = 0.18;
  const boardMaterial = new MeshStandardMaterial({
    color: 0x141c26,
    roughness: 0.48,
    metalness: 0.16,
  });
  const boardGeometry = new BoxGeometry(boardDepth, boardHeight, boardWidth);
  const board = new Mesh(boardGeometry, boardMaterial);
  board.position.set(wallInteriorX + boardDepth / 2, 2.35, anchorZ);
  group.add(board);

  const trimMaterial = new MeshStandardMaterial({
    color: 0x1f2a3b,
    roughness: 0.35,
    metalness: 0.22,
  });
  const trimDepth = 0.12;
  const trimHeight = boardHeight + 0.2;
  const trimGeometry = new BoxGeometry(
    trimDepth,
    trimHeight,
    boardWidth + 0.24
  );
  const trim = new Mesh(trimGeometry, trimMaterial);
  trim.position.set(
    wallInteriorX + boardDepth / 2 - trimDepth / 2,
    2.35,
    anchorZ
  );
  group.add(trim);

  const screenTexture = createMediaWallScreenTexture();
  const screenMaterial = new MeshBasicMaterial({
    map: screenTexture,
    transparent: true,
    toneMapped: false,
  });
  const screenGeometry = new PlaneGeometry(
    boardWidth * 0.9,
    boardHeight * 0.68
  );
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.position.set(wallInteriorX + boardDepth + 0.02, 2.36, anchorZ);
  screen.rotation.y = Math.PI / 2;
  screen.renderOrder = 10;
  group.add(screen);

  const screenGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x3abfff),
    transparent: true,
    opacity: 0.18,
    toneMapped: false,
  });
  const screenGlowGeometry = new PlaneGeometry(
    boardWidth * 0.95,
    boardHeight * 0.74
  );
  const screenGlow = new Mesh(screenGlowGeometry, screenGlowMaterial);
  screenGlow.position.set(wallInteriorX + boardDepth + 0.015, 2.36, anchorZ);
  screenGlow.rotation.y = Math.PI / 2;
  screenGlow.renderOrder = 9;
  group.add(screenGlow);

  const accentHeight = boardHeight * 0.78;
  const accentGeometry = new BoxGeometry(0.06, accentHeight, 0.18);
  const accentMaterial = new MeshStandardMaterial({
    color: new Color(0x1f6dff),
    emissive: new Color(0x2b8aff),
    emissiveIntensity: 1.2,
    roughness: 0.24,
    metalness: 0.18,
  });
  const accentOffsetZ = boardWidth * 0.46;
  const accentY = 2.36;
  const accentLeft = new Mesh(accentGeometry, accentMaterial);
  accentLeft.position.set(
    wallInteriorX + boardDepth + 0.05,
    accentY,
    anchorZ - accentOffsetZ
  );
  accentLeft.rotation.y = Math.PI / 2;
  group.add(accentLeft);
  const accentRight = accentLeft.clone();
  accentRight.position.z = anchorZ + accentOffsetZ;
  group.add(accentRight);

  const badgeTexture = createYouTubeBadgeTexture();
  const badgeMaterial = new MeshBasicMaterial({
    map: badgeTexture,
    transparent: true,
    toneMapped: false,
  });
  const badgeGeometry = new PlaneGeometry(1.4, 0.72);
  const badge = new Mesh(badgeGeometry, badgeMaterial);
  badge.position.set(
    wallInteriorX + boardDepth + 0.04,
    3.56,
    anchorZ + boardWidth * 0.32
  );
  badge.rotation.y = Math.PI / 2;
  badge.renderOrder = 11;
  group.add(badge);

  const shelfDepth = 0.58;
  const shelfWidth = boardWidth * 0.92;
  const shelfThickness = 0.12;
  const shelfMaterial = new MeshStandardMaterial({
    color: 0x1a212d,
    roughness: 0.4,
    metalness: 0.2,
  });
  const shelfGeometry = new BoxGeometry(shelfDepth, shelfThickness, shelfWidth);
  const shelf = new Mesh(shelfGeometry, shelfMaterial);
  shelf.position.set(
    wallInteriorX + boardDepth + shelfDepth / 2,
    shelfThickness / 2 + 0.46,
    anchorZ
  );
  group.add(shelf);

  const consoleMaterial = new MeshStandardMaterial({
    color: 0x0f1724,
    roughness: 0.55,
    metalness: 0.08,
  });
  const consoleHeight = 0.32;
  const consoleGeometry = new BoxGeometry(
    0.34,
    consoleHeight,
    shelfWidth * 0.72
  );
  const console = new Mesh(consoleGeometry, consoleMaterial);
  console.position.set(
    wallInteriorX + boardDepth + 0.22,
    0.46 + consoleHeight / 2,
    anchorZ
  );
  group.add(console);

  const soundbarGeometry = new BoxGeometry(0.16, 0.1, shelfWidth * 0.6);
  const soundbarMaterial = new MeshStandardMaterial({
    color: 0x111723,
    emissive: new Color(0x2a3550),
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.18,
  });
  const soundbar = new Mesh(soundbarGeometry, soundbarMaterial);
  soundbar.position.set(wallInteriorX + boardDepth + 0.28, 0.78, anchorZ);
  group.add(soundbar);

  const haloMaterial = new MeshStandardMaterial({
    color: new Color(0x1b2a3c),
    emissive: new Color(0x2d8cff),
    emissiveIntensity: 0.6,
    roughness: 0.28,
    metalness: 0.18,
  });
  const haloGeometry = new BoxGeometry(0.06, 0.24, shelfWidth * 0.85);
  const halo = new Mesh(haloGeometry, haloMaterial);
  halo.position.set(wallInteriorX + boardDepth + 0.37, 1.02, anchorZ);
  group.add(halo);

  colliders.push({
    minX: wallInteriorX + boardDepth,
    maxX: wallInteriorX + boardDepth + shelfDepth,
    minZ: anchorZ - shelfWidth / 2,
    maxZ: anchorZ + shelfWidth / 2,
  });

  return { group, colliders };
}

function isInsideAnyRoom(x: number, z: number): boolean {
  return FLOOR_PLAN.rooms.some(
    (room) =>
      x >= room.bounds.minX - POSITION_EPSILON &&
      x <= room.bounds.maxX + POSITION_EPSILON &&
      z >= room.bounds.minZ - POSITION_EPSILON &&
      z <= room.bounds.maxZ + POSITION_EPSILON
  );
}

function getOutwardDirectionForWall(wall: RoomWall): { x: number; z: number } {
  switch (wall) {
    case 'north':
      return { x: 0, z: 1 };
    case 'south':
      return { x: 0, z: -1 };
    case 'east':
      return { x: 1, z: 0 };
    case 'west':
      return { x: -1, z: 0 };
  }
}

const container = document.getElementById('app');

if (!container) {
  throw new Error('Missing #app container element.');
}

const failoverDecision = evaluateFailoverDecision();

if (failoverDecision.shouldUseFallback) {
  const immersiveUrl = (() => {
    if (typeof window === 'undefined') {
      return '/?mode=immersive';
    }
    const params = new URLSearchParams(window.location.search);
    params.set('mode', 'immersive');
    const query = params.toString();
    const hash = window.location.hash ?? '';
    return `${window.location.pathname}${query ? `?${query}` : ''}${hash}`;
  })();

  renderTextFallback(container, {
    reason: failoverDecision.reason ?? 'manual',
    immersiveUrl,
  });
} else {
  initializeImmersiveScene(container);
}

function initializeImmersiveScene(container: HTMLElement) {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new Color(0x0d121c));
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = createVerticalGradientTexture(0x152238, 0x04080f);

  const floorBounds = getFloorBounds(FLOOR_PLAN);
  const floorCenter = new Vector3(
    (floorBounds.minX + floorBounds.maxX) / 2,
    0,
    (floorBounds.minZ + floorBounds.maxZ) / 2
  );

  const initialRoom = FLOOR_PLAN.rooms[0];
  const initialPlayerPosition = new Vector3(
    (initialRoom.bounds.minX + initialRoom.bounds.maxX) / 2,
    PLAYER_RADIUS,
    (initialRoom.bounds.minZ + initialRoom.bounds.maxZ) / 2
  );

  const halfWidth = (floorBounds.maxX - floorBounds.minX) / 2;
  const distanceToNorthEdge = floorBounds.maxZ - initialPlayerPosition.z;
  const distanceToSouthEdge = initialPlayerPosition.z - floorBounds.minZ;
  const largestHalfExtent = Math.max(
    halfWidth,
    distanceToNorthEdge,
    distanceToSouthEdge
  );
  const cameraSize = largestHalfExtent + CAMERA_MARGIN;

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new OrthographicCamera(
    -cameraSize * aspect,
    cameraSize * aspect,
    cameraSize,
    -cameraSize,
    0.1,
    1000
  );
  const audioListener = new AudioListener();
  camera.add(audioListener);
  const cameraBaseOffset = new Vector3(
    cameraSize * 1.06,
    cameraSize * 1.08,
    cameraSize * 1.06
  );

  const cameraCenter = initialPlayerPosition.clone();
  camera.position.copy(cameraCenter).add(cameraBaseOffset);
  camera.lookAt(cameraCenter.x, cameraCenter.y, cameraCenter.z);

  const ambientLight = new AmbientLight(0xf5f7ff, 0.38);
  const hemisphericLight = new HemisphereLight(0x324a6d, 0x131a17, 0.22);
  const directionalLight = new DirectionalLight(0xf1f0ff, 0.64);
  directionalLight.position.set(20, 30, 10);
  directionalLight.target.position.set(floorCenter.x, 0, floorCenter.z);
  scene.add(ambientLight);
  scene.add(hemisphericLight);
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  const backyardRoom = FLOOR_PLAN.rooms.find(
    (room) => room.id === BACKYARD_ROOM_ID
  );
  if (backyardRoom) {
    const backyard = createBackyardEnvironment(backyardRoom.bounds);
    scene.add(backyard.group);
    backyard.colliders.forEach((collider) => staticColliders.push(collider));
  }

  const floorMaterial = new MeshStandardMaterial({ color: 0x2a3547 });
  const floorShape = new Shape();
  const [firstX, firstZ] = FLOOR_PLAN.outline[0];
  floorShape.moveTo(firstX, firstZ);
  for (let i = 1; i < FLOOR_PLAN.outline.length; i += 1) {
    const [x, z] = FLOOR_PLAN.outline[i];
    floorShape.lineTo(x, z);
  }
  floorShape.closePath();
  const floorGeometry = new ShapeGeometry(floorShape);
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.position.y = 0;
  scene.add(floor);

  const wallMaterial = new MeshStandardMaterial({ color: 0x3d4a63 });
  const fenceMaterial = new MeshStandardMaterial({ color: 0x4a5668 });
  const wallGroup = new Group();
  const combinedWallSegments = getCombinedWallSegments(FLOOR_PLAN);

  combinedWallSegments.forEach((segment) => {
    const length =
      segment.orientation === 'horizontal'
        ? Math.abs(segment.end.x - segment.start.x)
        : Math.abs(segment.end.z - segment.start.z);
    if (length <= 1e-4) {
      return;
    }

    const hasExterior = segment.rooms.some(
      (roomInfo) => getRoomCategory(roomInfo.id) === 'exterior'
    );
    const hasInterior = segment.rooms.some(
      (roomInfo) => getRoomCategory(roomInfo.id) !== 'exterior'
    );
    const isMixed = hasExterior && hasInterior;
    const segmentThickness =
      hasExterior && !isMixed ? FENCE_THICKNESS : WALL_THICKNESS;
    const segmentHeight = hasExterior && !isMixed ? FENCE_HEIGHT : WALL_HEIGHT;
    const material = hasExterior && !isMixed ? fenceMaterial : wallMaterial;

    const isInterior = segment.rooms.length > 1;
    const extension = isInterior ? segmentThickness * 0.5 : segmentThickness;
    const width =
      segment.orientation === 'horizontal'
        ? length + extension
        : segmentThickness;
    const depth =
      segment.orientation === 'horizontal'
        ? segmentThickness
        : length + extension;

    const baseX =
      segment.orientation === 'horizontal'
        ? (segment.start.x + segment.end.x) / 2
        : segment.start.x;
    const baseZ =
      segment.orientation === 'horizontal'
        ? segment.start.z
        : (segment.start.z + segment.end.z) / 2;

    let offsetX = 0;
    let offsetZ = 0;
    if (!isInterior) {
      const direction = getOutwardDirectionForWall(segment.rooms[0].wall);
      offsetX = direction.x * (WALL_THICKNESS / 2);
      offsetZ = direction.z * (WALL_THICKNESS / 2);
    }

    const geometry = new BoxGeometry(width, segmentHeight, depth);
    const wall = new Mesh(geometry, material);
    wall.position.set(baseX + offsetX, segmentHeight / 2, baseZ + offsetZ);
    wallGroup.add(wall);

    staticColliders.push({
      minX: wall.position.x - width / 2,
      maxX: wall.position.x + width / 2,
      minZ: wall.position.z - depth / 2,
      maxZ: wall.position.z + depth / 2,
    });
  });

  scene.add(wallGroup);

  const livingRoom = FLOOR_PLAN.rooms.find((room) => room.id === 'livingRoom');
  if (livingRoom) {
    const mediaWall = createLivingRoomMediaWall(livingRoom.bounds);
    scene.add(mediaWall.group);
    mediaWall.colliders.forEach((collider) => staticColliders.push(collider));
  }

  const staircase = createStaircase(STAIRCASE_CONFIG);
  scene.add(staircase.group);
  // Block the player from rolling onto the vertical geometry until slope handling lands.
  staircase.colliders.forEach((collider) => staticColliders.push(collider));

  if (LIGHTING_OPTIONS.enableLedStrips) {
    const ledHeight = WALL_HEIGHT - CEILING_COVE_OFFSET;
    const ledBaseColor = new Color(0x101623);
    const ledGroup = new Group();
    const ledFillLights = new Group();
    ledStripGroup = ledGroup;
    ledFillLightGroup = ledFillLights;
    const roomLedGroups = new Map<string, Group>();
    const roomLedMaterials = new Map<string, MeshStandardMaterial>();

    FLOOR_PLAN.rooms.forEach((room) => {
      if (getRoomCategory(room.id) === 'exterior') {
        return;
      }
      const emissiveColor = new Color(room.ledColor);
      const material = new MeshStandardMaterial({
        color: ledBaseColor,
        emissive: emissiveColor,
        emissiveIntensity: LIGHTING_OPTIONS.ledEmissiveIntensity,
        roughness: 0.35,
        metalness: 0.15,
      });
      roomLedMaterials.set(room.id, material);

      const group = new Group();
      group.name = `${room.name} LED`; // helpful for debugging
      roomLedGroups.set(room.id, group);
      ledGroup.add(group);

      const inset = 1.1;
      const light = new PointLight(
        emissiveColor,
        LIGHTING_OPTIONS.ledLightIntensity,
        Math.max(
          room.bounds.maxX - room.bounds.minX,
          room.bounds.maxZ - room.bounds.minZ
        ) * 1.1,
        2
      );
      light.position.set(
        (room.bounds.minX + room.bounds.maxX) / 2,
        ledHeight - 0.1,
        (room.bounds.minZ + room.bounds.maxZ) / 2
      );
      light.castShadow = false;
      ledFillLights.add(light);

      const cornerOffsets = [
        new Vector3(
          room.bounds.minX + inset,
          ledHeight - 0.1,
          room.bounds.minZ + inset
        ),
        new Vector3(
          room.bounds.maxX - inset,
          ledHeight - 0.1,
          room.bounds.minZ + inset
        ),
        new Vector3(
          room.bounds.minX + inset,
          ledHeight - 0.1,
          room.bounds.maxZ - inset
        ),
        new Vector3(
          room.bounds.maxX - inset,
          ledHeight - 0.1,
          room.bounds.maxZ - inset
        ),
      ];

      cornerOffsets.forEach((offset) => {
        const cornerLight = new PointLight(
          emissiveColor,
          LIGHTING_OPTIONS.ledLightIntensity * 0.35,
          Math.max(
            room.bounds.maxX - room.bounds.minX,
            room.bounds.maxZ - room.bounds.minZ
          ) * 0.9,
          2
        );
        cornerLight.position.copy(offset);
        cornerLight.castShadow = false;
        ledFillLights.add(cornerLight);
      });
    });

    combinedWallSegments.forEach((segment) => {
      const segmentLength =
        segment.orientation === 'horizontal'
          ? Math.abs(segment.end.x - segment.start.x)
          : Math.abs(segment.end.z - segment.start.z);
      const effectiveLength = segmentLength - LED_STRIP_EDGE_BUFFER * 2;
      if (effectiveLength <= LED_STRIP_DEPTH * 0.5) {
        return;
      }

      const width =
        segment.orientation === 'horizontal'
          ? effectiveLength
          : LED_STRIP_DEPTH;
      const depth =
        segment.orientation === 'horizontal'
          ? LED_STRIP_DEPTH
          : effectiveLength;
      const baseX =
        segment.orientation === 'horizontal'
          ? (segment.start.x + segment.end.x) / 2
          : segment.start.x;
      const baseZ =
        segment.orientation === 'horizontal'
          ? segment.start.z
          : (segment.start.z + segment.end.z) / 2;

      segment.rooms.forEach((roomInfo) => {
        if (getRoomCategory(roomInfo.id) === 'exterior') {
          return;
        }
        const material = roomLedMaterials.get(roomInfo.id);
        const group = roomLedGroups.get(roomInfo.id);
        if (!material || !group) {
          return;
        }
        const direction = getOutwardDirectionForWall(roomInfo.wall);
        const inwardOffset =
          segment.rooms.length > 1
            ? WALL_THICKNESS / 2 + LED_STRIP_DEPTH / 2
            : LED_STRIP_DEPTH / 2;
        const offsetX = -direction.x * inwardOffset;
        const offsetZ = -direction.z * inwardOffset;

        const geometry = new BoxGeometry(width, LED_STRIP_THICKNESS, depth);
        const strip = new Mesh(geometry, material);
        strip.position.set(baseX + offsetX, ledHeight, baseZ + offsetZ);
        strip.renderOrder = 1;
        group.add(strip);
      });
    });

    scene.add(ledGroup);
    scene.add(ledFillLights);
  }

  const builtPoiInstances = createPoiInstances(getPoiDefinitions());
  builtPoiInstances.forEach((poi) => {
    scene.add(poi.group);
    staticColliders.push(poi.collider);
    poiInstances.push(poi);
  });

  const poiAnalytics = createWindowPoiAnalytics();
  const poiTooltipOverlay = new PoiTooltipOverlay({ container });

  const flywheelPoi = poiInstances.find(
    (poi) => poi.definition.id === 'flywheel-studio-flywheel'
  );
  const jobbotPoi = poiInstances.find(
    (poi) => poi.definition.id === 'jobbot-studio-terminal'
  );
  const studioRoom = FLOOR_PLAN.rooms.find((room) => room.id === 'studio');
  if (studioRoom) {
    const centerX =
      flywheelPoi?.group.position.x ??
      (studioRoom.bounds.minX + studioRoom.bounds.maxX) / 2;
    const centerZ =
      flywheelPoi?.group.position.z ??
      (studioRoom.bounds.minZ + studioRoom.bounds.maxZ) / 2;
    const showpiece = createFlywheelShowpiece({
      centerX,
      centerZ,
      roomBounds: studioRoom.bounds,
      orientationRadians: flywheelPoi?.group.rotation.y ?? 0,
    });
    scene.add(showpiece.group);
    showpiece.colliders.forEach((collider) => staticColliders.push(collider));
    flywheelShowpiece = showpiece;

    const terminalOrientation = jobbotPoi?.group.rotation.y ?? -Math.PI / 2;
    const terminalX = MathUtils.clamp(
      jobbotPoi?.group.position.x ?? 11.4,
      studioRoom.bounds.minX + 1.2,
      studioRoom.bounds.maxX - 0.8
    );
    const terminalZ = MathUtils.clamp(
      jobbotPoi?.group.position.z ?? -0.6,
      studioRoom.bounds.minZ + 1.2,
      studioRoom.bounds.maxZ - 1.1
    );
    const terminal = createJobbotTerminal({
      position: { x: terminalX, y: 0, z: terminalZ },
      orientationRadians: terminalOrientation,
    });
    scene.add(terminal.group);
    terminal.colliders.forEach((collider) => staticColliders.push(collider));
    jobbotTerminal = terminal;
  }

  const poiInteractionManager = new PoiInteractionManager(
    renderer.domElement,
    camera,
    poiInstances,
    poiAnalytics
  );
  const removeHoverListener = poiInteractionManager.addHoverListener((poi) => {
    poiTooltipOverlay.setHovered(poi);
  });
  const removeSelectionStateListener =
    poiInteractionManager.addSelectionStateListener((poi) => {
      poiTooltipOverlay.setSelected(poi);
    });
  poiInteractionManager.start();
  window.addEventListener('beforeunload', () => {
    poiInteractionManager.dispose();
    removeHoverListener();
    removeSelectionStateListener();
    poiTooltipOverlay.dispose();
    ambientAudioController?.dispose();
  });

  const playerMaterial = new MeshStandardMaterial({ color: 0xffc857 });
  const playerGeometry = new SphereGeometry(PLAYER_RADIUS, 32, 32);
  const player = new Mesh(playerGeometry, playerMaterial);
  player.position.copy(initialPlayerPosition);
  scene.add(player);

  const controlOverlay = document.getElementById('control-overlay');
  const interactControl = controlOverlay?.querySelector<HTMLElement>(
    '[data-control="interact"]'
  );
  const interactDescription = controlOverlay?.querySelector<HTMLElement>(
    '[data-control="interact-description"]'
  );
  let interactablePoi: PoiInstance | null = null;

  const controls = new KeyboardControls();
  const joystick = new VirtualJoystick(renderer.domElement);
  const clock = new Clock();
  const targetVelocity = new Vector3();
  const velocity = new Vector3();
  const moveDirection = new Vector3();
  const cameraPan = new Vector3();
  const cameraPanTarget = new Vector3();
  const poiLabelLookTarget = new Vector3();
  const poiPlayerOffset = new Vector2();
  let cameraPanLimitX = 0;
  let cameraPanLimitZ = 0;
  let interactKeyWasPressed = false;

  if (!ambientAudioController) {
    const audioBeds: AmbientAudioBedDefinition[] = [];
    const audioContext: AudioContext = audioListener.context;

    const createLoopingSource = (
      id: string,
      bufferFactory: (context: AudioContext) => AudioBuffer
    ): AmbientAudioSource => {
      const audio = new Audio(audioListener);
      audio.setLoop(true);
      audio.setVolume(0);
      const buffer = bufferFactory(audioContext);
      audio.setBuffer(buffer);
      return {
        id,
        get isPlaying() {
          return audio.isPlaying;
        },
        play: () => {
          if (!audio.isPlaying) {
            audio.play();
          }
        },
        stop: () => {
          if (audio.isPlaying) {
            audio.stop();
          }
        },
        setVolume: (volume: number) => {
          audio.setVolume(volume);
        },
      };
    };

    const homeHalfExtent = Math.max(
      (floorBounds.maxX - floorBounds.minX) / 2,
      (floorBounds.maxZ - floorBounds.minZ) / 2
    );
    audioBeds.push({
      id: 'interior-hum',
      center: {
        x: (floorBounds.minX + floorBounds.maxX) / 2,
        z: (floorBounds.minZ + floorBounds.maxZ) / 2,
      },
      innerRadius: homeHalfExtent * 0.55,
      outerRadius: homeHalfExtent * 1.2,
      baseVolume: 0.32,
      source: createLoopingSource('interior-hum', (context) =>
        createDistantHumBuffer(context)
      ),
    });

    if (backyardRoom) {
      const bounds = backyardRoom.bounds;
      const backyardHalfExtent = Math.max(
        (bounds.maxX - bounds.minX) / 2,
        (bounds.maxZ - bounds.minZ) / 2
      );
      audioBeds.push({
        id: 'backyard-crickets',
        center: {
          x: (bounds.minX + bounds.maxX) / 2,
          z: (bounds.minZ + bounds.maxZ) / 2,
        },
        innerRadius: backyardHalfExtent * 0.6,
        outerRadius: backyardHalfExtent + toWorldUnits(6),
        baseVolume: 0.65,
        source: createLoopingSource('backyard-crickets', (context) =>
          createCricketChorusBuffer(context)
        ),
      });
    }

    ambientAudioController = new AmbientAudioController(audioBeds, {
      smoothing: 3.2,
      onEnable: async () => {
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      },
    });

    const enableAmbientAudio = async () => {
      if (!ambientAudioController || ambientAudioController.isEnabled()) {
        return;
      }
      try {
        await ambientAudioController.enable();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Ambient audio failed to start', error);
      }
    };

    const onFirstInteraction = () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
      void enableAmbientAudio();
    };

    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction);
  }

  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;

  if (LIGHTING_OPTIONS.enableBloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      LIGHTING_OPTIONS.bloomStrength,
      LIGHTING_OPTIONS.bloomRadius,
      LIGHTING_OPTIONS.bloomThreshold
    );
    composer.addPass(bloomPass);
  }

  const lightingDebugController = createLightingDebugController({
    renderer,
    ambientLight,
    hemisphericLight,
    directionalLight,
    bloomPass,
    ledGroup: ledStripGroup,
    ledFillLights: ledFillLightGroup,
    debug: {
      exposure: 0.92,
      ambientIntensity: 0.55,
      hemisphericIntensity: 0.38,
      directionalIntensity: 0.35,
      ledVisible: false,
      bloomEnabled: false,
    },
  });

  lightingDebugController.setMode('cinematic');

  const lightingDebugIndicator = document.createElement('div');
  lightingDebugIndicator.className = 'lighting-debug-indicator';
  container.appendChild(lightingDebugIndicator);

  const updateLightingIndicator = (mode: LightingMode) => {
    const label = mode === 'cinematic' ? 'Cinematic' : 'Debug (flat)';
    lightingDebugIndicator.textContent = `Lighting: ${label} · Shift+L to toggle`;
    lightingDebugIndicator.setAttribute('data-mode', mode);
  };

  updateLightingIndicator(lightingDebugController.getMode());

  window.addEventListener('keydown', (event) => {
    if ((event.key === 'l' || event.key === 'L') && event.shiftKey) {
      event.preventDefault();
      const nextMode = lightingDebugController.toggle();
      updateLightingIndicator(nextMode);
    }
  });

  function onResize() {
    const nextAspect = window.innerWidth / window.innerHeight;
    camera.left = -cameraSize * nextAspect;
    camera.right = cameraSize * nextAspect;
    camera.top = cameraSize;
    camera.bottom = -cameraSize;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (composer && bloomPass) {
      composer.setSize(window.innerWidth, window.innerHeight);
      bloomPass.setSize(window.innerWidth, window.innerHeight);
    }

    cameraPanLimitX = Math.max(0, cameraSize * nextAspect - PLAYER_RADIUS);
    cameraPanLimitZ = Math.max(0, cameraSize - PLAYER_RADIUS);
    cameraPanTarget.x = MathUtils.clamp(
      cameraPanTarget.x,
      -cameraPanLimitX,
      cameraPanLimitX
    );
    cameraPanTarget.z = MathUtils.clamp(
      cameraPanTarget.z,
      -cameraPanLimitZ,
      cameraPanLimitZ
    );
    cameraPan.x = MathUtils.clamp(
      cameraPan.x,
      -cameraPanLimitX,
      cameraPanLimitX
    );
    cameraPan.z = MathUtils.clamp(
      cameraPan.z,
      -cameraPanLimitZ,
      cameraPanLimitZ
    );
  }

  window.addEventListener('resize', onResize);
  onResize();

  function updateMovement(delta: number) {
    const rightInput =
      Number(controls.isPressed('d') || controls.isPressed('ArrowRight')) -
      Number(controls.isPressed('a') || controls.isPressed('ArrowLeft'));
    const forwardInput =
      Number(controls.isPressed('w') || controls.isPressed('ArrowUp')) -
      Number(controls.isPressed('s') || controls.isPressed('ArrowDown'));

    const joystickMovement = joystick.getMovement();
    const combinedRight = rightInput + joystickMovement.x;
    const combinedForward = forwardInput - joystickMovement.y;

    getCameraRelativeMovementVector(
      camera,
      combinedRight,
      combinedForward,
      moveDirection
    );

    const lengthSq = moveDirection.lengthSq();
    if (lengthSq > 1) {
      moveDirection.multiplyScalar(1 / Math.sqrt(lengthSq));
    }

    targetVelocity.copy(moveDirection).multiplyScalar(PLAYER_SPEED);

    velocity.set(
      MathUtils.damp(velocity.x, targetVelocity.x, MOVEMENT_SMOOTHING, delta),
      0,
      MathUtils.damp(velocity.z, targetVelocity.z, MOVEMENT_SMOOTHING, delta)
    );

    const stepX = velocity.x * delta;
    const stepZ = velocity.z * delta;

    if (stepX !== 0) {
      const candidateX = player.position.x + stepX;
      if (
        isInsideAnyRoom(candidateX, player.position.z) &&
        !collidesWithColliders(
          candidateX,
          player.position.z,
          PLAYER_RADIUS,
          staticColliders
        )
      ) {
        player.position.x = candidateX;
      } else {
        targetVelocity.x = 0;
        velocity.x = 0;
      }
    }

    if (stepZ !== 0) {
      const candidateZ = player.position.z + stepZ;
      if (
        isInsideAnyRoom(player.position.x, candidateZ) &&
        !collidesWithColliders(
          player.position.x,
          candidateZ,
          PLAYER_RADIUS,
          staticColliders
        )
      ) {
        player.position.z = candidateZ;
      } else {
        targetVelocity.z = 0;
        velocity.z = 0;
      }
    }

    player.position.y = PLAYER_RADIUS;
  }

  function updateCamera(delta: number) {
    const cameraInput = joystick.getCamera();
    cameraPanTarget.set(
      cameraInput.x * cameraPanLimitX,
      0,
      cameraInput.y * cameraPanLimitZ
    );

    cameraPan.x = MathUtils.damp(
      cameraPan.x,
      cameraPanTarget.x,
      CAMERA_PAN_SMOOTHING,
      delta
    );
    cameraPan.z = MathUtils.damp(
      cameraPan.z,
      cameraPanTarget.z,
      CAMERA_PAN_SMOOTHING,
      delta
    );

    cameraPan.x = MathUtils.clamp(
      cameraPan.x,
      -cameraPanLimitX,
      cameraPanLimitX
    );
    cameraPan.z = MathUtils.clamp(
      cameraPan.z,
      -cameraPanLimitZ,
      cameraPanLimitZ
    );

    cameraCenter.set(
      player.position.x + cameraPan.x,
      player.position.y,
      player.position.z + cameraPan.z
    );

    camera.position.set(
      cameraCenter.x + cameraBaseOffset.x,
      cameraCenter.y + cameraBaseOffset.y,
      cameraCenter.z + cameraBaseOffset.z
    );
    camera.lookAt(cameraCenter.x, cameraCenter.y, cameraCenter.z);
  }

  const POI_ACTIVATION_RESPONSE = 5.5;

  function updatePois(elapsedTime: number, delta: number) {
    const smoothing =
      delta > 0 ? 1 - Math.exp(-delta * POI_ACTIVATION_RESPONSE) : 1;
    let closestPoi: PoiInstance | null = null;
    let highestActivation = 0;
    for (const poi of poiInstances) {
      const floatOffset = Math.sin(
        elapsedTime * poi.floatSpeed + poi.floatPhase
      );
      const scaledOffset = floatOffset * poi.floatAmplitude;
      poi.orb.position.y = poi.orbBaseHeight + scaledOffset;
      poi.label.position.y = poi.labelBaseHeight + scaledOffset * 0.4;
      poi.label.getWorldPosition(poi.labelWorldPosition);
      poiLabelLookTarget.set(
        camera.position.x,
        poi.labelWorldPosition.y,
        camera.position.z
      );
      poi.label.lookAt(poiLabelLookTarget);

      poiPlayerOffset.set(
        player.position.x - poi.group.position.x,
        player.position.z - poi.group.position.z
      );
      const planarDistance = poiPlayerOffset.length();
      const maxRadius = poi.definition.interactionRadius;
      const targetActivation = MathUtils.clamp(
        1 - planarDistance / maxRadius,
        0,
        1
      );
      poi.activation = MathUtils.lerp(
        poi.activation,
        targetActivation,
        smoothing
      );
      poi.focus = MathUtils.lerp(poi.focus, poi.focusTarget, smoothing);
      const emphasis = Math.max(poi.activation, poi.focus);

      if (poi.activation > highestActivation) {
        highestActivation = poi.activation;
        closestPoi = poi;
      }

      const labelOpacity = MathUtils.lerp(0.32, 1, emphasis);
      poi.labelMaterial.opacity = labelOpacity;
      poi.label.visible = labelOpacity > 0.05;

      const orbEmissive = MathUtils.lerp(0.85, 1.7, emphasis);
      poi.orbMaterial.emissiveIntensity = orbEmissive;
      poi.orbMaterial.emissive.lerpColors(
        poi.orbEmissiveBase,
        poi.orbEmissiveHighlight,
        poi.focus
      );

      const accentEmissive = MathUtils.lerp(0.65, 1.05, emphasis);
      poi.accentMaterial.emissiveIntensity = accentEmissive;
      poi.accentMaterial.color.lerpColors(
        poi.accentBaseColor,
        poi.accentFocusColor,
        poi.focus
      );

      const haloPulse =
        1 + Math.sin(elapsedTime * 1.8 + poi.pulseOffset) * 0.08;
      const haloScale = MathUtils.lerp(1, 1.18, emphasis) * haloPulse;
      poi.halo.scale.setScalar(haloScale);
      const haloOpacity = MathUtils.lerp(0.18, 0.62, emphasis);
      poi.haloMaterial.opacity = haloOpacity;
      poi.halo.visible = haloOpacity > 0.04;
      poi.haloMaterial.color.lerpColors(
        poi.haloBaseColor,
        poi.haloFocusColor,
        poi.focus
      );
    }
    if (closestPoi && highestActivation >= 0.6) {
      setInteractablePoi(closestPoi);
    } else {
      setInteractablePoi(null);
    }
  }

  function setInteractablePoi(poi: PoiInstance | null) {
    if (interactablePoi === poi) {
      return;
    }
    interactablePoi = poi;
    if (!interactControl || !interactDescription) {
      return;
    }
    if (poi) {
      interactControl.hidden = false;
      interactDescription.textContent = `Interact with ${poi.definition.title}`;
    } else {
      interactControl.hidden = true;
      interactDescription.textContent = 'Interact';
    }
  }

  function handleInteractionInput() {
    const pressed = controls.isPressed('f');
    if (pressed && !interactKeyWasPressed && interactablePoi) {
      poiInteractionManager.selectPoiById(interactablePoi.definition.id);
    }
    interactKeyWasPressed = pressed;
  }

  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const elapsedTime = clock.elapsedTime;
    updateMovement(delta);
    updateCamera(delta);
    updatePois(elapsedTime, delta);
    handleInteractionInput();
    if (ambientAudioController) {
      ambientAudioController.update(player.position, delta);
    }
    if (flywheelShowpiece) {
      const activation = flywheelPoi?.activation ?? 0;
      const focus = flywheelPoi?.focus ?? 0;
      flywheelShowpiece.update({
        elapsed: elapsedTime,
        delta,
        emphasis: Math.max(activation, focus),
      });
    }
    if (jobbotTerminal) {
      const activation = jobbotPoi?.activation ?? 0;
      const focus = jobbotPoi?.focus ?? 0;
      jobbotTerminal.update({
        elapsed: elapsedTime,
        delta,
        emphasis: Math.max(activation, focus),
      });
    }
    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  });
}
