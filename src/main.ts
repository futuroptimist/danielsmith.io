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
  PlaneGeometry,
  PointLight,
  Scene,
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

const CAMERA_SIZE = 20;
const ROOM_HALF_WIDTH = 10;
const ROOM_HALF_DEPTH = 14;
const WALL_HEIGHT = 6;
const WALL_THICKNESS = 0.5;
const PLAYER_RADIUS = 0.75;
const PLAYER_SPEED = 6;
const MOVEMENT_SMOOTHING = 8;
const CAMERA_PAN_SMOOTHING = 6;
const CEILING_COVE_OFFSET = 0.35;
const LED_STRIP_THICKNESS = 0.12;
const LED_STRIP_DEPTH = 0.22;
const LIGHTING_OPTIONS = {
  enableLedStrips: true,
  enableBloom: true,
  ledEmissiveIntensity: 3.2,
  ledLightIntensity: 1.4,
  bloomStrength: 0.55,
  bloomRadius: 0.85,
  bloomThreshold: 0.2,
} as const;

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
const camera = new OrthographicCamera(
  -s * aspect,
  s * aspect,
  s,
  -s,
  0.1,
  1000
);
const cameraBaseOffset = new Vector3(20, 20, 20);
const cameraCenter = new Vector3(0, PLAYER_RADIUS, 0);
camera.position.copy(cameraCenter).add(cameraBaseOffset);
camera.lookAt(cameraCenter.x, cameraCenter.y, cameraCenter.z);

const ambientLight = new AmbientLight(0xf5f7ff, 0.45);
const directionalLight = new DirectionalLight(0xf1f0ff, 0.7);
directionalLight.position.set(20, 30, 10);
directionalLight.target.position.set(0, 0, 0);
scene.add(ambientLight);
scene.add(directionalLight);
scene.add(directionalLight.target);

if (LIGHTING_OPTIONS.enableLedStrips) {
  const ledStripColor = new Color(0x5ad7ff);
  const ledStripMaterial = new MeshStandardMaterial({
    color: new Color(0x101623),
    emissive: ledStripColor,
    emissiveIntensity: LIGHTING_OPTIONS.ledEmissiveIntensity,
    roughness: 0.35,
    metalness: 0.15,
  });
  const ledGroup = new Group();
  const ledHeight = WALL_HEIGHT - CEILING_COVE_OFFSET;
  const stripDefs: Array<{
    length: number;
    position: Vector3;
    rotationY?: number;
  }> = [
    {
      length: ROOM_HALF_WIDTH * 2 - 0.6,
      position: new Vector3(
        0,
        ledHeight,
        ROOM_HALF_DEPTH - LED_STRIP_DEPTH / 2
      ),
    },
    {
      length: ROOM_HALF_WIDTH * 2 - 0.6,
      position: new Vector3(
        0,
        ledHeight,
        -ROOM_HALF_DEPTH + LED_STRIP_DEPTH / 2
      ),
    },
    {
      length: ROOM_HALF_DEPTH * 2 - 0.6,
      position: new Vector3(
        ROOM_HALF_WIDTH - LED_STRIP_DEPTH / 2,
        ledHeight,
        0
      ),
      rotationY: Math.PI / 2,
    },
    {
      length: ROOM_HALF_DEPTH * 2 - 0.6,
      position: new Vector3(
        -ROOM_HALF_WIDTH + LED_STRIP_DEPTH / 2,
        ledHeight,
        0
      ),
      rotationY: Math.PI / 2,
    },
  ];

  stripDefs.forEach((definition) => {
    const geometry = new BoxGeometry(
      definition.length,
      LED_STRIP_THICKNESS,
      LED_STRIP_DEPTH
    );
    const strip = new Mesh(geometry, ledStripMaterial);
    strip.position.copy(definition.position);
    if (definition.rotationY) {
      strip.rotation.y = definition.rotationY;
    }
    strip.renderOrder = 1;
    ledGroup.add(strip);
  });

  scene.add(ledGroup);

  const ledFillLights = new Group();
  const ledLightDistance = Math.max(ROOM_HALF_WIDTH, ROOM_HALF_DEPTH) * 0.9;
  const cornerOffsets = [
    new Vector3(ROOM_HALF_WIDTH - 1.1, ledHeight - 0.1, ROOM_HALF_DEPTH - 1.1),
    new Vector3(
      -(ROOM_HALF_WIDTH - 1.1),
      ledHeight - 0.1,
      ROOM_HALF_DEPTH - 1.1
    ),
    new Vector3(
      ROOM_HALF_WIDTH - 1.1,
      ledHeight - 0.1,
      -(ROOM_HALF_DEPTH - 1.1)
    ),
    new Vector3(
      -(ROOM_HALF_WIDTH - 1.1),
      ledHeight - 0.1,
      -(ROOM_HALF_DEPTH - 1.1)
    ),
  ];

  cornerOffsets.forEach((offset) => {
    const light = new PointLight(
      ledStripColor,
      LIGHTING_OPTIONS.ledLightIntensity,
      ledLightDistance,
      2
    );
    light.position.copy(offset);
    light.castShadow = false;
    ledFillLights.add(light);
  });

  scene.add(ledFillLights);
}

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

  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass?.setSize(window.innerWidth, window.innerHeight);
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

const minX = -ROOM_HALF_WIDTH + PLAYER_RADIUS;
const maxX = ROOM_HALF_WIDTH - PLAYER_RADIUS;
const minZ = -ROOM_HALF_DEPTH + PLAYER_RADIUS;
const maxZ = ROOM_HALF_DEPTH - PLAYER_RADIUS;

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

  player.position.x += velocity.x * delta;
  player.position.z += velocity.z * delta;
  player.position.x = MathUtils.clamp(player.position.x, minX, maxX);
  player.position.z = MathUtils.clamp(player.position.z, minZ, maxZ);
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
