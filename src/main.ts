import './styles.css';

import {
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { KeyboardControls } from './controls/KeyboardControls';

const CAMERA_SIZE = 20;
const ROOM_HALF_WIDTH = 10;
const ROOM_HALF_DEPTH = 14;
const WALL_HEIGHT = 6;
const WALL_THICKNESS = 0.5;
const PLAYER_RADIUS = 0.75;
const PLAYER_SPEED = 6;
const MOVEMENT_SMOOTHING = 8;
const JOYSTICK_RADIUS = 80;
const CAMERA_PAN_SPEED = 12;
const CAMERA_SMOOTHING = 6;

const container = document.getElementById('app');

if (!container) {
  throw new Error('Missing #app container element.');
}

const renderer = new WebGLRenderer({ antialias: true });
renderer.outputColorSpace = SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(new Color(0x0d121c));
container.appendChild(renderer.domElement);
renderer.domElement.style.touchAction = 'none';

const joystickLayer = document.createElement('div');
joystickLayer.className = 'joystick-layer';
document.body.appendChild(joystickLayer);

const scene = new Scene();
scene.background = new Color(0x111826);

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
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const ambientLight = new AmbientLight(0xffffff, 0.55);
const directionalLight = new DirectionalLight(0xffffff, 0.75);
directionalLight.position.set(20, 30, 10);
directionalLight.target.position.set(0, 0, 0);
scene.add(ambientLight);
scene.add(directionalLight);
scene.add(directionalLight.target);

const floorMaterial = new MeshStandardMaterial({ color: 0x2a3547 });
const floorGeometry = new PlaneGeometry(
  ROOM_HALF_WIDTH * 2,
  ROOM_HALF_DEPTH * 2
);
const floor = new Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const wallMaterial = new MeshStandardMaterial({ color: 0x3d4a63 });
const wallNorth = new Mesh(
  new BoxGeometry(
    ROOM_HALF_WIDTH * 2 + WALL_THICKNESS * 2,
    WALL_HEIGHT,
    WALL_THICKNESS
  ),
  wallMaterial
);
wallNorth.position.set(
  0,
  WALL_HEIGHT / 2,
  ROOM_HALF_DEPTH + WALL_THICKNESS / 2
);

const wallSouth = wallNorth.clone();
wallSouth.position.set(
  0,
  WALL_HEIGHT / 2,
  -ROOM_HALF_DEPTH - WALL_THICKNESS / 2
);

const wallEast = new Mesh(
  new BoxGeometry(
    WALL_THICKNESS,
    WALL_HEIGHT,
    ROOM_HALF_DEPTH * 2 + WALL_THICKNESS * 2
  ),
  wallMaterial
);
wallEast.position.set(ROOM_HALF_WIDTH + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);

const wallWest = wallEast.clone();
wallWest.position.set(
  -ROOM_HALF_WIDTH - WALL_THICKNESS / 2,
  WALL_HEIGHT / 2,
  0
);

scene.add(wallNorth, wallSouth, wallEast, wallWest);

const playerMaterial = new MeshStandardMaterial({ color: 0xffc857 });
const playerGeometry = new SphereGeometry(PLAYER_RADIUS, 32, 32);
const player = new Mesh(playerGeometry, playerMaterial);
player.position.set(0, PLAYER_RADIUS, 0);
scene.add(player);

const controls = new KeyboardControls();
const clock = new Clock();
const targetVelocity = new Vector3();
const velocity = new Vector3();
const moveDirection = new Vector3();
const playerJoystickInput = new Vector2();
const cameraJoystickInput = new Vector2();
const cameraVelocity = new Vector3();
const cameraFocus = new Vector3().copy(player.position);
const cameraOffset = camera.position.clone();
camera.position.copy(cameraFocus).add(cameraOffset);
camera.lookAt(cameraFocus);
const previousPlayerPosition = new Vector3().copy(player.position);

type JoystickType = 'player' | 'camera';

interface ActiveJoystick {
  type: JoystickType;
  pointerId: number;
  startX: number;
  startY: number;
  outer: HTMLDivElement;
  thumb: HTMLDivElement;
}

const activeJoysticks = new Map<number, ActiveJoystick>();
let playerJoystickPointer: number | null = null;
let cameraJoystickPointer: number | null = null;

function createJoystickElement(x: number, y: number, type: JoystickType) {
  const outer = document.createElement('div');
  outer.className = `joystick joystick--${type}`;
  outer.style.left = `${x}px`;
  outer.style.top = `${y}px`;
  outer.style.width = `${JOYSTICK_RADIUS * 2}px`;
  outer.style.height = `${JOYSTICK_RADIUS * 2}px`;
  outer.style.marginLeft = `${-JOYSTICK_RADIUS}px`;
  outer.style.marginTop = `${-JOYSTICK_RADIUS}px`;

  const thumb = document.createElement('div');
  thumb.className = 'joystick__thumb';
  thumb.style.transform = 'translate(-50%, -50%)';
  outer.appendChild(thumb);

  joystickLayer.appendChild(outer);

  return { outer, thumb };
}

function updateJoystickInput(type: JoystickType, x: number, y: number) {
  if (type === 'player') {
    playerJoystickInput.set(x, y);
  } else {
    cameraJoystickInput.set(x, y);
  }
}

function resetJoystick(type: JoystickType) {
  updateJoystickInput(type, 0, 0);
  if (type === 'player') {
    playerJoystickPointer = null;
  } else {
    cameraJoystickPointer = null;
  }
}

function handlePointerDown(event: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const type: JoystickType = relativeX < rect.width / 2 ? 'player' : 'camera';

  if ((type === 'player' && playerJoystickPointer !== null) || (type === 'camera' && cameraJoystickPointer !== null)) {
    return;
  }

  const { outer, thumb } = createJoystickElement(event.clientX, event.clientY, type);

  const joystick: ActiveJoystick = {
    type,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    outer,
    thumb,
  };

  activeJoysticks.set(event.pointerId, joystick);
  updateJoystickInput(type, 0, 0);

  if (type === 'player') {
    playerJoystickPointer = event.pointerId;
  } else {
    cameraJoystickPointer = event.pointerId;
  }

  renderer.domElement.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
  const joystick = activeJoysticks.get(event.pointerId);
  if (!joystick) {
    return;
  }

  const dx = event.clientX - joystick.startX;
  const dy = event.clientY - joystick.startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const clampedDistance = Math.min(distance, JOYSTICK_RADIUS);
  const angle = Math.atan2(dy, dx);
  const offsetX = Math.cos(angle) * clampedDistance;
  const offsetY = Math.sin(angle) * clampedDistance;

  joystick.thumb.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;

  const normalizedX = MathUtils.clamp(offsetX / JOYSTICK_RADIUS, -1, 1);
  const normalizedY = MathUtils.clamp(offsetY / JOYSTICK_RADIUS, -1, 1);

  updateJoystickInput(joystick.type, normalizedX, normalizedY);
}

function removeJoystick(pointerId: number) {
  const joystick = activeJoysticks.get(pointerId);
  if (!joystick) {
    return;
  }

  joystick.outer.remove();
  resetJoystick(joystick.type);
  activeJoysticks.delete(pointerId);
}

function handlePointerUp(event: PointerEvent) {
  removeJoystick(event.pointerId);

  if (renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
}

renderer.domElement.addEventListener('pointerdown', handlePointerDown);
renderer.domElement.addEventListener('pointermove', handlePointerMove);
renderer.domElement.addEventListener('pointerup', handlePointerUp);
renderer.domElement.addEventListener('pointercancel', handlePointerUp);
renderer.domElement.addEventListener('pointerleave', handlePointerUp);

function onResize() {
  const nextAspect = window.innerWidth / window.innerHeight;
  camera.left = -CAMERA_SIZE * nextAspect;
  camera.right = CAMERA_SIZE * nextAspect;
  camera.top = CAMERA_SIZE;
  camera.bottom = -CAMERA_SIZE;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  updateCameraBounds();
}

window.addEventListener('resize', onResize);
onResize();

const minX = -ROOM_HALF_WIDTH + PLAYER_RADIUS;
const maxX = ROOM_HALF_WIDTH - PLAYER_RADIUS;
const minZ = -ROOM_HALF_DEPTH + PLAYER_RADIUS;
const maxZ = ROOM_HALF_DEPTH - PLAYER_RADIUS;

function updateMovement(delta: number) {
  const horizontal =
    Number(controls.isPressed('d') || controls.isPressed('ArrowRight')) -
    Number(controls.isPressed('a') || controls.isPressed('ArrowLeft')) +
    playerJoystickInput.x;
  const vertical =
    Number(controls.isPressed('s') || controls.isPressed('ArrowDown')) -
    Number(controls.isPressed('w') || controls.isPressed('ArrowUp')) +
    playerJoystickInput.y;

  moveDirection.set(horizontal, 0, vertical);

  if (moveDirection.lengthSq() > 0) {
    moveDirection.normalize();
  }

  targetVelocity.copy(moveDirection).multiplyScalar(PLAYER_SPEED);

  velocity.set(
    MathUtils.damp(velocity.x, targetVelocity.x, MOVEMENT_SMOOTHING, delta),
    0,
    MathUtils.damp(velocity.z, targetVelocity.z, MOVEMENT_SMOOTHING, delta)
  );

  player.position.x += velocity.x * delta;
  player.position.z += velocity.z * delta;
  player.position.x = MathUtils.clamp(player.position.x, minX, maxX);
  player.position.z = MathUtils.clamp(player.position.z, minZ, maxZ);
  player.position.y = PLAYER_RADIUS;
}

let cameraHalfWidth = CAMERA_SIZE * (window.innerWidth / window.innerHeight);
let cameraHalfHeight = CAMERA_SIZE;

function updateCameraBounds() {
  const aspectRatio = window.innerWidth / window.innerHeight;
  cameraHalfWidth = CAMERA_SIZE * aspectRatio;
  cameraHalfHeight = CAMERA_SIZE;
}

function updateCamera(delta: number) {
  const deltaPlayerX = player.position.x - previousPlayerPosition.x;
  const deltaPlayerZ = player.position.z - previousPlayerPosition.z;
  cameraFocus.x += deltaPlayerX;
  cameraFocus.z += deltaPlayerZ;
  previousPlayerPosition.copy(player.position);

  const targetX = cameraJoystickInput.x * CAMERA_PAN_SPEED;
  const targetZ = cameraJoystickInput.y * CAMERA_PAN_SPEED;

  cameraVelocity.set(
    MathUtils.damp(cameraVelocity.x, targetX, CAMERA_SMOOTHING, delta),
    0,
    MathUtils.damp(cameraVelocity.z, targetZ, CAMERA_SMOOTHING, delta)
  );

  cameraFocus.x += cameraVelocity.x * delta;
  cameraFocus.z += cameraVelocity.z * delta;
  cameraFocus.y = player.position.y;

  const maxOffsetX = Math.max(0, cameraHalfWidth - PLAYER_RADIUS * 2);
  const maxOffsetZ = Math.max(0, cameraHalfHeight - PLAYER_RADIUS * 2);

  cameraFocus.x = MathUtils.clamp(
    cameraFocus.x,
    player.position.x - maxOffsetX,
    player.position.x + maxOffsetX
  );
  cameraFocus.z = MathUtils.clamp(
    cameraFocus.z,
    player.position.z - maxOffsetZ,
    player.position.z + maxOffsetZ
  );

  camera.position.copy(cameraFocus).add(cameraOffset);
  camera.lookAt(cameraFocus);
}

updateCameraBounds();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  updateMovement(delta);
  updateCamera(delta);
  renderer.render(scene, camera);
});
