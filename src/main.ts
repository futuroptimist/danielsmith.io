import './styles.css';

import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Clock,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
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

import { KeyboardControls } from './controls/KeyboardControls';
import { VirtualJoystick } from './controls/VirtualJoystick';
import {
  FLOOR_PLAN,
  getCombinedWallSegments,
  getFloorBounds,
  RoomWall,
  WALL_THICKNESS,
  type Bounds2D,
  type RoomCategory,
} from './floorPlan';
import {
  createStaircase,
  type RectCollider,
  type StaircaseConfig,
} from './structures/staircase';

const CAMERA_SIZE = 20;
const WALL_HEIGHT = 6;
const FENCE_HEIGHT = 2.4;
const FENCE_THICKNESS = 0.28;
const PLAYER_RADIUS = 0.75;
const PLAYER_SPEED = 6;
const MOVEMENT_SMOOTHING = 8;
const CAMERA_PAN_SMOOTHING = 6;
const CEILING_COVE_OFFSET = 0.35;
const LED_STRIP_THICKNESS = 0.12;
const LED_STRIP_DEPTH = 0.22;
const LED_STRIP_EDGE_BUFFER = 0.3;
const POSITION_EPSILON = 1e-4;
const BACKYARD_ROOM_ID = 'backyard';

const STAIRCASE_CONFIG = {
  name: 'LivingRoomStaircase',
  basePosition: new Vector3(6.2, 0, -18),
  step: {
    count: 9,
    rise: 0.42,
    run: 0.85,
    width: 3.1,
    material: {
      color: 0x708091,
      roughness: 0.6,
      metalness: 0.12,
    },
    colliderInset: 0.05,
  },
  landing: {
    depth: 2.6,
    thickness: 0.38,
    material: {
      color: 0x5b6775,
      roughness: 0.55,
      metalness: 0.08,
    },
    colliderInset: 0.05,
    guard: {
      height: 0.55,
      thickness: 0.14,
      inset: 0.07,
      widthScale: 0.95,
      material: {
        color: 0x2c343f,
        roughness: 0.7,
        metalness: 0.05,
      },
    },
  },
  supports: {
    material: {
      color: 0x2c343f,
      roughness: 0.7,
      metalness: 0.05,
    },
    definitions: [
      { offsetX: -(3.1 / 2 - 0.16), width: 0.32, depth: 3.1 * 0.6 },
      { offsetX: 3.1 / 2 - 0.16, width: 0.32, depth: 3.1 * 0.6 },
    ],
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

const roomDefinitions = new Map(FLOOR_PLAN.rooms.map((room) => [room.id, room]));

function getRoomCategory(roomId: string): RoomCategory {
  const room = roomDefinitions.get(roomId);
  return room?.category ?? 'interior';
}

function createVerticalGradientTexture(topHex: number, bottomHex: number): CanvasTexture {
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

function createBackyardEnvironment(bounds: Bounds2D): Group {
  const group = new Group();
  group.name = 'BackyardEnvironment';

  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  const terrainSegments = 32;
  const terrainGeometry = new PlaneGeometry(width, depth, terrainSegments, terrainSegments);
  const terrainPositions = terrainGeometry.attributes.position as BufferAttribute;
  for (let i = 0; i < terrainPositions.count; i += 1) {
    const x = terrainPositions.getX(i);
    const y = terrainPositions.getY(i);
    const normalizedX = (x / width) + 0.5;
    const normalizedY = (y / depth) + 0.5;
    const swell = Math.sin(normalizedY * Math.PI) * 0.38;
    const ripple = Math.cos(normalizedX * Math.PI * 2) * 0.18;
    const microVariation =
      (Math.sin(x * 1.7 + y * 0.9) + Math.cos(x * 0.85 - y * 1.3)) * 0.04;
    terrainPositions.setZ(i, (swell + ripple) * 0.12 + microVariation);
  }
  terrainPositions.needsUpdate = true;
  terrainGeometry.computeVertexNormals();
  terrainGeometry.rotateX(-Math.PI / 2);

  const terrainMaterial = new MeshStandardMaterial({
    color: 0x1d2f22,
    roughness: 0.92,
    metalness: 0.05,
  });
  const terrain = new Mesh(terrainGeometry, terrainMaterial);
  terrain.position.set(centerX, -0.05, centerZ);
  terrain.receiveShadow = false;
  group.add(terrain);

  const pathWidth = width * 0.48;
  const pathDepth = Math.min(6, depth * 0.55);
  const pathGeometry = new BoxGeometry(pathWidth, 0.08, pathDepth);
  const pathMaterial = new MeshStandardMaterial({
    color: 0x515c66,
    roughness: 0.65,
    metalness: 0.2,
  });
  const path = new Mesh(pathGeometry, pathMaterial);
  path.position.set(centerX, 0.04, bounds.minZ + pathDepth / 2 + 0.35);
  group.add(path);

  const steppingStoneGeometry = new BoxGeometry(pathWidth * 0.32, 0.12, 0.9);
  const steppingStoneMaterial = new MeshStandardMaterial({
    color: 0x676f78,
    roughness: 0.7,
    metalness: 0.18,
  });
  const steppingStoneCount = 4;
  for (let i = 0; i < steppingStoneCount; i += 1) {
    const stone = new Mesh(steppingStoneGeometry, steppingStoneMaterial);
    const offset = (i + 1) / (steppingStoneCount + 1);
    stone.position.set(
      centerX,
      0.08,
      bounds.minZ + pathDepth + (depth - pathDepth) * offset
    );
    stone.rotation.y = (i % 2 === 0 ? 1 : -1) * Math.PI * 0.03;
    group.add(stone);
  }

  const shrubGeometry = new SphereGeometry(1.05, 20, 20);
  const shrubMaterial = new MeshStandardMaterial({
    color: 0x2c6b3d,
    roughness: 0.78,
    metalness: 0.08,
  });
  const shrubPositions = [
    new Vector3(bounds.minX + 1.6, 0, bounds.maxZ - 3.2),
    new Vector3(centerX + 0.8, 0, centerZ + depth * 0.28),
    new Vector3(bounds.maxX - 1.4, 0, bounds.maxZ - 5.1),
  ];
  shrubPositions.forEach((position, index) => {
    const shrub = new Mesh(shrubGeometry, shrubMaterial);
    shrub.position.set(position.x, 0.9, position.z);
    const scale = 0.9 + (index % 3) * 0.12;
    shrub.scale.setScalar(scale);
    group.add(shrub);
  });

  const particleGeometry = new BufferGeometry();
  const particleCount = 24;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const px = bounds.minX + Math.random() * width;
    const pz = bounds.minZ + Math.random() * depth;
    const py = 1.6 + Math.random() * 1.4;
    particlePositions[i * 3] = px;
    particlePositions[i * 3 + 1] = py;
    particlePositions[i * 3 + 2] = pz;
  }
  particleGeometry.setAttribute('position', new BufferAttribute(particlePositions, 3));
  const particleMaterial = new PointsMaterial({
    color: 0x9ad7ff,
    size: 0.14,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const fireflies = new Points(particleGeometry, particleMaterial);
  fireflies.name = 'BackyardFireflies';
  group.add(fireflies);

  const duskLight = new PointLight(0x8fb8ff, 0.65, Math.max(width, depth) * 0.9, 2.4);
  duskLight.position.set(centerX - width * 0.18, 2.6, centerZ + depth * 0.18);
  duskLight.castShadow = false;
  group.add(duskLight);

  return group;
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

function collidesWithSceneGeometry(
  x: number,
  z: number,
  radius: number
): boolean {
  for (const collider of staticColliders) {
    const closestX = MathUtils.clamp(x, collider.minX, collider.maxX);
    const closestZ = MathUtils.clamp(z, collider.minZ, collider.maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz < radius * radius) {
      return true;
    }
  }
  return false;
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

const aspect = window.innerWidth / window.innerHeight;
const s = CAMERA_SIZE;
const camera = new OrthographicCamera(
  -s * aspect,
  s * aspect,
  s,
  -s,
  0.1,
  1000
);
const cameraBaseOffset = new Vector3(20, 20, 20);

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

const backyardRoom = FLOOR_PLAN.rooms.find((room) => room.id === BACKYARD_ROOM_ID);
if (backyardRoom) {
  const backyard = createBackyardEnvironment(backyardRoom.bounds);
  scene.add(backyard);
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

  const hasExterior = segment.rooms.some((roomInfo) => getRoomCategory(roomInfo.id) === 'exterior');
  const hasInterior = segment.rooms.some((roomInfo) => getRoomCategory(roomInfo.id) !== 'exterior');
  const isMixed = hasExterior && hasInterior;
  const segmentThickness = hasExterior && !isMixed ? FENCE_THICKNESS : WALL_THICKNESS;
  const segmentHeight = hasExterior && !isMixed ? FENCE_HEIGHT : WALL_HEIGHT;
  const material = hasExterior && !isMixed ? fenceMaterial : wallMaterial;

  const isInterior = segment.rooms.length > 1;
  const extension = isInterior ? segmentThickness * 0.5 : segmentThickness;
  const width =
    segment.orientation === 'horizontal' ? length + extension : segmentThickness;
  const depth =
    segment.orientation === 'horizontal' ? segmentThickness : length + extension;

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

const staircase = createStaircase(STAIRCASE_CONFIG);
scene.add(staircase.group);
// Block the player from rolling onto the vertical geometry until slope handling lands.
staircase.colliders.forEach((collider) => staticColliders.push(collider));

if (LIGHTING_OPTIONS.enableLedStrips) {
  const ledHeight = WALL_HEIGHT - CEILING_COVE_OFFSET;
  const ledBaseColor = new Color(0x101623);
  const ledGroup = new Group();
  const ledFillLights = new Group();
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
      segment.orientation === 'horizontal' ? effectiveLength : LED_STRIP_DEPTH;
    const depth =
      segment.orientation === 'horizontal' ? LED_STRIP_DEPTH : effectiveLength;
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

const playerMaterial = new MeshStandardMaterial({ color: 0xffc857 });
const playerGeometry = new SphereGeometry(PLAYER_RADIUS, 32, 32);
const player = new Mesh(playerGeometry, playerMaterial);
player.position.copy(initialPlayerPosition);
scene.add(player);

const controls = new KeyboardControls();
const joystick = new VirtualJoystick(renderer.domElement);
const clock = new Clock();
const targetVelocity = new Vector3();
const velocity = new Vector3();
const moveDirection = new Vector3();
const cameraPan = new Vector3();
const cameraPanTarget = new Vector3();
let cameraPanLimitX = 0;
let cameraPanLimitZ = 0;

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

function onResize() {
  const nextAspect = window.innerWidth / window.innerHeight;
  camera.left = -CAMERA_SIZE * nextAspect;
  camera.right = CAMERA_SIZE * nextAspect;
  camera.top = CAMERA_SIZE;
  camera.bottom = -CAMERA_SIZE;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (composer && bloomPass) {
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.setSize(window.innerWidth, window.innerHeight);
  }

  cameraPanLimitX = Math.max(0, CAMERA_SIZE * nextAspect - PLAYER_RADIUS);
  cameraPanLimitZ = Math.max(0, CAMERA_SIZE - PLAYER_RADIUS);
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
  cameraPan.x = MathUtils.clamp(cameraPan.x, -cameraPanLimitX, cameraPanLimitX);
  cameraPan.z = MathUtils.clamp(cameraPan.z, -cameraPanLimitZ, cameraPanLimitZ);
}

window.addEventListener('resize', onResize);
onResize();

function updateMovement(delta: number) {
  const horizontal =
    Number(controls.isPressed('d') || controls.isPressed('ArrowRight')) -
    Number(controls.isPressed('a') || controls.isPressed('ArrowLeft'));
  const vertical =
    Number(controls.isPressed('s') || controls.isPressed('ArrowDown')) -
    Number(controls.isPressed('w') || controls.isPressed('ArrowUp'));

  const joystickMovement = joystick.getMovement();
  moveDirection.set(
    horizontal + joystickMovement.x,
    0,
    vertical + joystickMovement.y
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
      !collidesWithSceneGeometry(candidateX, player.position.z, PLAYER_RADIUS)
    ) {
      player.position.x = candidateX;
    } else {
      velocity.x = 0;
    }
  }

  if (stepZ !== 0) {
    const candidateZ = player.position.z + stepZ;
    if (
      isInsideAnyRoom(player.position.x, candidateZ) &&
      !collidesWithSceneGeometry(player.position.x, candidateZ, PLAYER_RADIUS)
    ) {
      player.position.z = candidateZ;
    } else {
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

  cameraPan.x = MathUtils.clamp(cameraPan.x, -cameraPanLimitX, cameraPanLimitX);
  cameraPan.z = MathUtils.clamp(cameraPan.z, -cameraPanLimitZ, cameraPanLimitZ);

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

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  updateMovement(delta);
  updateCamera(delta);
  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
});
