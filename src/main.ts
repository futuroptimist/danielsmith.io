import './styles.css';

import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
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

import { KeyboardControls } from './controls/KeyboardControls';
import { VirtualJoystick } from './controls/VirtualJoystick';
import {
  FLOOR_PLAN,
  getCombinedWallSegments,
  getFloorBounds,
  RoomWall,
  WALL_THICKNESS,
} from './floorPlan';

const CAMERA_SIZE = 20;
const WALL_HEIGHT = 6;
const PLAYER_RADIUS = 0.75;
const PLAYER_SPEED = 6;
const MOVEMENT_SMOOTHING = 8;
const CAMERA_PAN_SMOOTHING = 6;
const CEILING_COVE_OFFSET = 0.35;
const LED_STRIP_THICKNESS = 0.12;
const LED_STRIP_DEPTH = 0.22;
const LED_STRIP_EDGE_BUFFER = 0.3;
const POSITION_EPSILON = 1e-4;

const LIGHTING_OPTIONS = {
  enableLedStrips: true,
  enableBloom: true,
  ledEmissiveIntensity: 3.2,
  ledLightIntensity: 1.4,
  bloomStrength: 0.55,
  bloomRadius: 0.85,
  bloomThreshold: 0.2,
} as const;

interface WallCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const wallColliders: WallCollider[] = [];

function isInsideAnyRoom(x: number, z: number): boolean {
  return FLOOR_PLAN.rooms.some(
    (room) =>
      x >= room.bounds.minX - POSITION_EPSILON &&
      x <= room.bounds.maxX + POSITION_EPSILON &&
      z >= room.bounds.minZ - POSITION_EPSILON &&
      z <= room.bounds.maxZ + POSITION_EPSILON
  );
}

function collidesWithWalls(x: number, z: number, radius: number): boolean {
  for (const collider of wallColliders) {
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
scene.background = new Color(0x111826);

const aspect = window.innerWidth / window.innerHeight;
const s = CAMERA_SIZE;
const camera = new OrthographicCamera(-s * aspect, s * aspect, s, -s, 0.1, 1000);
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

const ambientLight = new AmbientLight(0xf5f7ff, 0.45);
const directionalLight = new DirectionalLight(0xf1f0ff, 0.7);
directionalLight.position.set(20, 30, 10);
directionalLight.target.position.set(floorCenter.x, 0, floorCenter.z);
scene.add(ambientLight);
scene.add(directionalLight);
scene.add(directionalLight.target);

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

  const isInterior = segment.rooms.length > 1;
  const extension = isInterior ? WALL_THICKNESS * 0.5 : WALL_THICKNESS;
  const width = segment.orientation === 'horizontal' ? length + extension : WALL_THICKNESS;
  const depth = segment.orientation === 'horizontal' ? WALL_THICKNESS : length + extension;

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

  const geometry = new BoxGeometry(width, WALL_HEIGHT, depth);
  const wall = new Mesh(geometry, wallMaterial);
  wall.position.set(baseX + offsetX, WALL_HEIGHT / 2, baseZ + offsetZ);
  wallGroup.add(wall);

  wallColliders.push({
    minX: wall.position.x - width / 2,
    maxX: wall.position.x + width / 2,
    minZ: wall.position.z - depth / 2,
    maxZ: wall.position.z + depth / 2,
  });
});

scene.add(wallGroup);

if (LIGHTING_OPTIONS.enableLedStrips) {
  const ledHeight = WALL_HEIGHT - CEILING_COVE_OFFSET;
  const ledBaseColor = new Color(0x101623);
  const ledGroup = new Group();
  const ledFillLights = new Group();
  const roomLedGroups = new Map<string, Group>();
  const roomLedMaterials = new Map<string, MeshStandardMaterial>();

  FLOOR_PLAN.rooms.forEach((room) => {
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
      Math.max(room.bounds.maxX - room.bounds.minX, room.bounds.maxZ - room.bounds.minZ) * 1.1,
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
      new Vector3(room.bounds.minX + inset, ledHeight - 0.1, room.bounds.minZ + inset),
      new Vector3(room.bounds.maxX - inset, ledHeight - 0.1, room.bounds.minZ + inset),
      new Vector3(room.bounds.minX + inset, ledHeight - 0.1, room.bounds.maxZ - inset),
      new Vector3(room.bounds.maxX - inset, ledHeight - 0.1, room.bounds.maxZ - inset),
    ];

    cornerOffsets.forEach((offset) => {
      const cornerLight = new PointLight(
        emissiveColor,
        LIGHTING_OPTIONS.ledLightIntensity * 0.35,
        Math.max(room.bounds.maxX - room.bounds.minX, room.bounds.maxZ - room.bounds.minZ) * 0.9,
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

    const width = segment.orientation === 'horizontal' ? effectiveLength : LED_STRIP_DEPTH;
    const depth = segment.orientation === 'horizontal' ? LED_STRIP_DEPTH : effectiveLength;
    const baseX =
      segment.orientation === 'horizontal'
        ? (segment.start.x + segment.end.x) / 2
        : segment.start.x;
    const baseZ =
      segment.orientation === 'horizontal'
        ? segment.start.z
        : (segment.start.z + segment.end.z) / 2;

    segment.rooms.forEach((roomInfo) => {
      const material = roomLedMaterials.get(roomInfo.id);
      const group = roomLedGroups.get(roomInfo.id);
      if (!material || !group) {
        return;
      }
      const direction = getOutwardDirectionForWall(roomInfo.wall);
      const inwardOffset = segment.rooms.length > 1
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
  cameraPanTarget.x = MathUtils.clamp(cameraPanTarget.x, -cameraPanLimitX, cameraPanLimitX);
  cameraPanTarget.z = MathUtils.clamp(cameraPanTarget.z, -cameraPanLimitZ, cameraPanLimitZ);
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
  moveDirection.set(horizontal + joystickMovement.x, 0, vertical + joystickMovement.y);

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
      !collidesWithWalls(candidateX, player.position.z, PLAYER_RADIUS)
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
      !collidesWithWalls(player.position.x, candidateZ, PLAYER_RADIUS)
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
  cameraPanTarget.set(cameraInput.x * cameraPanLimitX, 0, cameraInput.y * cameraPanLimitZ);

  cameraPan.x = MathUtils.damp(cameraPan.x, cameraPanTarget.x, CAMERA_PAN_SMOOTHING, delta);
  cameraPan.z = MathUtils.damp(cameraPan.z, cameraPanTarget.z, CAMERA_PAN_SMOOTHING, delta);

  cameraPan.x = MathUtils.clamp(cameraPan.x, -cameraPanLimitX, cameraPanLimitX);
  cameraPan.z = MathUtils.clamp(cameraPan.z, -cameraPanLimitZ, cameraPanLimitZ);

  cameraCenter.set(player.position.x + cameraPan.x, player.position.y, player.position.z + cameraPan.z);

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
