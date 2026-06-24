import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

export interface TerminalGlyphRun {
  x: number;
  width: number;
  shade: number;
}

export interface TerminalRowPattern {
  indent: number;
  height: number;
  runs: TerminalGlyphRun[];
  cursor?: { x: number; width: number };
}

export interface TokenPlaceTerminalState {
  seed: number;
  speed: number;
  phase: number;
  rows: TerminalRowPattern[];
  scroll: number;
  rowHeight: number;
  redrawHz: number;
}

export interface TokenPlaceWorkstationBuild {
  group: Group;
  colliders: RectCollider[];
  terminals: TokenPlaceTerminalState[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  dispose(): void;
}

export interface TokenPlaceWorkstationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
}

interface TerminalRuntime {
  state: TokenPlaceTerminalState;
  texture: CanvasTexture;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  prng: () => number;
  redrawAccumulator: number;
}

const DESK_WIDTH = 1.75;
const DESK_DEPTH = 1.05;
const DESK_HEIGHT = 0.82;
const DESK_TOP_THICKNESS = 0.1;

export function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(prng: () => number, min: number, max: number): number {
  return min + (max - min) * prng();
}

function randomInt(prng: () => number, min: number, max: number): number {
  return Math.floor(randomRange(prng, min, max + 1));
}

export function createTerminalRowPattern(
  prng: () => number
): TerminalRowPattern {
  if (prng() < 0.1)
    return { indent: 0, height: randomRange(prng, 0.45, 0.85), runs: [] };

  const indent = randomRange(prng, 0.02, 0.2);
  const groups = prng() < 0.12 ? 1 : randomInt(prng, 2, 12);
  const runs: TerminalGlyphRun[] = [];
  let x = indent;

  if (prng() < 0.28) {
    runs.push({
      x,
      width: randomRange(prng, 0.015, 0.035),
      shade: randomRange(prng, 0.75, 1),
    });
    x += randomRange(prng, 0.04, 0.08);
  }

  for (let index = 0; index < groups && x < 0.94; index += 1) {
    const width = Math.min(
      randomRange(prng, 0.025, prng() < 0.16 ? 0.42 : 0.16),
      0.96 - x
    );
    runs.push({ x, width, shade: randomRange(prng, 0.45, 1) });
    x += width + randomRange(prng, 0.012, 0.055);
  }

  const cursor =
    prng() < 0.16
      ? { x: Math.min(x, 0.92), width: randomRange(prng, 0.018, 0.035) }
      : undefined;
  return { indent, height: randomRange(prng, 0.42, 0.82), runs, cursor };
}

export function createTerminalRows(
  seed: number,
  count: number
): TerminalRowPattern[] {
  const prng = createMulberry32(seed);
  return Array.from({ length: count }, () => createTerminalRowPattern(prng));
}

export function fingerprintTerminalRow(row: TerminalRowPattern): string {
  return [
    row.indent.toFixed(3),
    row.height.toFixed(3),
    ...row.runs.map(
      (run) =>
        `${run.x.toFixed(3)}:${run.width.toFixed(3)}:${run.shade.toFixed(2)}`
    ),
    row.cursor
      ? `c:${row.cursor.x.toFixed(3)}:${row.cursor.width.toFixed(3)}`
      : '',
  ].join('|');
}

function advanceTerminalRows(runtime: TerminalRuntime, delta: number): void {
  const state = runtime.state;
  state.scroll += state.speed * delta;
  while (state.scroll >= state.rowHeight) {
    state.scroll -= state.rowHeight;
    state.rows.shift();
    state.rows.push(createTerminalRowPattern(runtime.prng));
  }
}

export function advanceTerminalStateForTest(
  state: TokenPlaceTerminalState,
  seed = state.seed
): void {
  const prng = createMulberry32(seed);
  for (let index = 0; index < state.rows.length + 1; index += 1)
    createTerminalRowPattern(prng);
  const runtime = { state, prng } as TerminalRuntime;
  advanceTerminalRows(runtime, state.rowHeight / state.speed);
}

function drawTerminal(runtime: TerminalRuntime): void {
  const { canvas, context, state } = runtime;
  if (!context) return;
  context.fillStyle = '#020202';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const rowPixels = state.rowHeight * canvas.height;
  state.rows.forEach((row, index) => {
    const y =
      index * rowPixels -
      state.scroll * canvas.height +
      state.phase * rowPixels;
    if (y < -rowPixels || y > canvas.height) return;
    row.runs.forEach((run) => {
      const shade = Math.round(MathUtils.lerp(110, 245, run.shade));
      context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      context.fillRect(
        run.x * canvas.width,
        y,
        run.width * canvas.width,
        row.height * rowPixels
      );
    });
    if (row.cursor) {
      context.fillStyle = '#ffffff';
      context.fillRect(
        row.cursor.x * canvas.width,
        y,
        row.cursor.width * canvas.width,
        rowPixels * 0.8
      );
    }
  });
  runtime.texture.needsUpdate = true;
}

function createTerminalRuntime(
  seed: number,
  policy: SceneDetailPolicy,
  monitorIndex: number
): TerminalRuntime {
  const size =
    policy.level === 'performance'
      ? { width: 128, height: 72 }
      : policy.level === 'balanced'
        ? { width: 192, height: 108 }
        : { width: 256, height: 144 };
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  const prng = createMulberry32(seed);
  const rowHeight = 0.072;
  const rows = Array.from({ length: 22 }, () => createTerminalRowPattern(prng));
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const state: TokenPlaceTerminalState = {
    seed,
    speed:
      (policy.level === 'performance'
        ? 0.17
        : policy.level === 'balanced'
          ? 0.24
          : 0.31) +
      monitorIndex * 0.045,
    phase: monitorIndex * 0.37,
    rows,
    scroll: 0,
    rowHeight,
    redrawHz:
      policy.level === 'performance' ? 4 : policy.level === 'balanced' ? 9 : 18,
  };
  const runtime = {
    state,
    texture,
    canvas,
    context,
    prng,
    redrawAccumulator: 0,
  };
  drawTerminal(runtime);
  return runtime;
}

function collider(
  center: Vector3,
  width: number,
  depth: number,
  rotation: number
): RectCollider {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ];
  const xs = corners.map(([x, z]) => center.x + x * cos - z * sin);
  const zs = corners.map(([x, z]) => center.z + x * sin + z * cos);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

function addBox(
  parent: Group,
  name: string,
  size: [number, number, number],
  pos: [number, number, number],
  material: MeshStandardMaterial | MeshBasicMaterial
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...pos);
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: Group,
  name: string,
  radius: number,
  height: number,
  segments: number,
  pos: [number, number, number],
  material: MeshStandardMaterial,
  rotation: [number, number, number] = [0, 0, 0]
): Mesh {
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, height, segments),
    material
  );
  mesh.name = name;
  mesh.position.set(...pos);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

export function createTokenPlaceWorkstation(
  options: TokenPlaceWorkstationOptions
): TokenPlaceWorkstationBuild {
  const {
    position,
    orientationRadians = 0,
    detailPolicy = getSceneDetailPolicy('balanced'),
  } = options;
  const group = new Group();
  group.name = 'TokenPlaceWorkstation';
  group.position.set(position.x, position.y ?? 0, position.z);
  group.rotation.y = orientationRadians;

  const wood = new MeshStandardMaterial({
    color: new Color(0x5b3724),
    roughness: 0.72,
    metalness: 0.05,
  });
  const dark = new MeshStandardMaterial({
    color: new Color(0x171a1f),
    roughness: 0.52,
    metalness: 0.28,
  });
  const charcoal = new MeshStandardMaterial({
    color: new Color(0x242a31),
    roughness: 0.5,
    metalness: 0.18,
  });
  const cyan = new MeshStandardMaterial({
    color: new Color(0x74e7ff),
    emissive: new Color(0x1b8fa4),
    emissiveIntensity: 0.45,
  });
  const amber = new MeshStandardMaterial({
    color: new Color(0xf0b35a),
    emissive: new Color(0x7a3d10),
    emissiveIntensity: 0.25,
  });

  const desk = new Group();
  desk.name = 'TokenPlaceDesk';
  group.add(desk);
  addBox(
    desk,
    'TokenPlaceDeskTop',
    [DESK_WIDTH, DESK_TOP_THICKNESS, DESK_DEPTH],
    [0, DESK_HEIGHT, 0],
    wood
  );
  const supports =
    detailPolicy.level === 'performance'
      ? [
          [-0.78, 0.38, 0],
          [0.78, 0.38, 0],
        ]
      : [
          [-0.76, 0.38, -0.42],
          [0.76, 0.38, -0.42],
          [-0.76, 0.38, 0.42],
          [0.76, 0.38, 0.42],
        ];
  supports.forEach((pos, index) =>
    addBox(
      desk,
      `TokenPlaceDeskSupport-${index}`,
      [0.08, 0.76, detailPolicy.level === 'performance' ? 0.86 : 0.08],
      pos as [number, number, number],
      dark
    )
  );
  addBox(
    desk,
    'TokenPlaceDeskCrossBrace',
    [1.35, 0.055, 0.055],
    [0, 0.48, -0.46],
    dark
  );
  if (detailPolicy.level !== 'performance')
    addCylinder(
      desk,
      'TokenPlaceDeskCableGrommet',
      0.055,
      0.012,
      detailPolicy.level === 'cinematic' ? 48 : 18,
      [0.62, 0.858, -0.22],
      dark,
      [Math.PI / 2, 0, 0]
    );

  const tower = new Group();
  tower.name = 'TokenPlacePcTower';
  tower.position.set(-0.63, 0.36, 0.04);
  group.add(tower);
  addBox(
    tower,
    'TokenPlacePcTowerCase',
    [0.34, 0.66, 0.42],
    [0, 0, 0],
    charcoal
  );
  addBox(
    tower,
    'TokenPlacePcTowerFrontPanel',
    [0.025, 0.56, 0.32],
    [0.183, 0, 0],
    dark
  );
  addCylinder(
    tower,
    'TokenPlacePcTowerIntakeFan',
    0.09,
    0.018,
    detailPolicy.geometry.cylinderSegments,
    [0.2, 0.08, 0],
    cyan,
    [0, 0, Math.PI / 2]
  );
  addCylinder(
    tower,
    'TokenPlacePcTowerPowerIndicator',
    0.025,
    0.012,
    12,
    [0.202, 0.25, -0.13],
    amber,
    [0, 0, Math.PI / 2]
  );
  const ventCount =
    detailPolicy.level === 'cinematic'
      ? 6
      : detailPolicy.level === 'balanced'
        ? 3
        : 1;
  for (let index = 0; index < ventCount; index += 1)
    addBox(
      tower,
      `TokenPlacePcTowerVent-${index}`,
      [0.028, 0.018, 0.22],
      [0.203, -0.22 + index * 0.055, 0],
      dark
    );
  if (detailPolicy.level === 'cinematic') {
    addBox(
      tower,
      'TokenPlacePcTowerGlassPanel',
      [0.018, 0.48, 0.3],
      [-0.18, 0, 0],
      dark
    );
    [-0.11, 0.11].forEach((offset, index) =>
      addCylinder(
        tower,
        `TokenPlacePcTowerFanRing-${index}`,
        0.07,
        0.012,
        48,
        [-0.19, offset, 0],
        cyan,
        [0, 0, Math.PI / 2]
      )
    );
  }
  if (detailPolicy.level === 'performance')
    addCylinder(
      tower,
      'TokenPlacePcTowerPerfStatusDial',
      0.04,
      0.01,
      12,
      [0.203, -0.08, -0.12],
      cyan,
      [0, 0, Math.PI / 2]
    );

  const terminals = [
    createTerminalRuntime(0x706cace, detailPolicy, 0),
    createTerminalRuntime(0x706cacf, detailPolicy, 1),
  ];
  terminals.forEach((terminal, index) => {
    const monitor = new Group();
    monitor.name = `TokenPlaceMonitor-${index}`;
    monitor.position.set(index === 0 ? -0.36 : 0.36, 1.24, -0.29);
    monitor.rotation.y = index === 0 ? -0.16 : 0.16;
    group.add(monitor);
    addBox(
      monitor,
      `TokenPlaceMonitorBezel-${index}`,
      [0.58, 0.36, 0.035],
      [0, 0, 0],
      dark
    );
    const screen = new Mesh(
      new PlaneGeometry(0.5, 0.28),
      new MeshBasicMaterial({ map: terminal.texture, toneMapped: false })
    );
    screen.name = `TokenPlaceMonitorScreen-${index}`;
    screen.position.set(0, 0, 0.019);
    monitor.add(screen);
    addBox(
      monitor,
      `TokenPlaceMonitorStand-${index}`,
      [0.045, 0.25, 0.045],
      [0, -0.3, 0],
      dark
    );
    addBox(
      monitor,
      `TokenPlaceMonitorBase-${index}`,
      [0.28, 0.035, 0.2],
      [0, -0.44, 0.04],
      dark
    );
    if (detailPolicy.level === 'cinematic')
      addBox(
        monitor,
        `TokenPlaceMonitorBackVents-${index}`,
        [0.32, 0.025, 0.018],
        [0, 0.11, -0.024],
        charcoal
      );
  });

  addBox(
    group,
    'TokenPlaceKeyboard',
    [0.62, 0.045, 0.19],
    [0, 0.895, 0.18],
    dark
  );
  const keyRows =
    detailPolicy.level === 'performance'
      ? 2
      : detailPolicy.level === 'balanced'
        ? 4
        : 5;
  const keyCols =
    detailPolicy.level === 'performance'
      ? 4
      : detailPolicy.level === 'balanced'
        ? 7
        : 10;
  for (let row = 0; row < keyRows; row += 1)
    for (let col = 0; col < keyCols; col += 1)
      addBox(
        group,
        `TokenPlaceKeyboardKey-${row}-${col}`,
        [0.04, 0.012, 0.025],
        [-0.25 + col * 0.055, 0.925, 0.12 + row * 0.035],
        charcoal
      );
  addBox(
    group,
    'TokenPlaceMousePad',
    [0.32, 0.012, 0.24],
    [0.53, 0.872, 0.19],
    new MeshStandardMaterial({ color: new Color(0x101114), roughness: 0.8 })
  );
  addBox(
    group,
    'TokenPlaceMouse',
    [0.105, 0.045, 0.15],
    [0.53, 0.905, 0.17],
    charcoal
  );
  if (detailPolicy.level !== 'performance')
    addCylinder(
      group,
      'TokenPlaceCoinMotif',
      0.06,
      0.016,
      24,
      [-0.52, 0.872, 0.21],
      amber,
      [Math.PI / 2, 0, 0]
    );

  const chair = new Group();
  chair.name = 'TokenPlaceGamingChair';
  chair.position.set(0.05, 0, 0.86);
  chair.rotation.y = -0.08;
  group.add(chair);
  addBox(chair, 'TokenPlaceChairSeat', [0.58, 0.14, 0.52], [0, 0.42, 0], dark);
  addBox(
    chair,
    'TokenPlaceChairBack',
    [0.58, 0.78, 0.12],
    [0, 0.86, 0.22],
    dark
  );
  addBox(
    chair,
    'TokenPlaceChairHeadrest',
    [0.4, 0.14, 0.13],
    [0, 1.16, 0.17],
    charcoal
  );
  addBox(
    chair,
    'TokenPlaceChairLeftArm',
    [0.08, 0.28, 0.36],
    [-0.36, 0.58, 0],
    charcoal
  );
  addBox(
    chair,
    'TokenPlaceChairRightArm',
    [0.08, 0.28, 0.36],
    [0.36, 0.58, 0],
    charcoal
  );
  addCylinder(
    chair,
    'TokenPlaceChairPedestal',
    0.055,
    0.36,
    detailPolicy.geometry.cylinderSegments,
    [0, 0.23, 0],
    charcoal
  );
  const spokes = detailPolicy.level === 'performance' ? 3 : 5;
  for (let index = 0; index < spokes; index += 1) {
    const spoke = addBox(
      chair,
      `TokenPlaceChairRollingBase-${index}`,
      [0.08, 0.045, 0.42],
      [0, 0.08, 0],
      charcoal
    );
    spoke.rotation.y = (Math.PI * 2 * index) / spokes;
  }
  if (detailPolicy.level === 'cinematic') {
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5;
      addCylinder(
        chair,
        `TokenPlaceChairCaster-${index}`,
        0.045,
        0.035,
        48,
        [Math.sin(angle) * 0.23, 0.055, Math.cos(angle) * 0.23],
        charcoal,
        [Math.PI / 2, 0, 0]
      );
    }
  }
  if (detailPolicy.level === 'cinematic')
    addBox(
      chair,
      'TokenPlaceChairStitching',
      [0.48, 0.025, 0.02],
      [0, 0.98, 0.153],
      amber
    );

  const colliders = [
    collider(
      new Vector3(position.x, 0, position.z),
      1.9,
      1.25,
      orientationRadians
    ),
    collider(
      new Vector3(position.x, 0, position.z + 0.86),
      0.75,
      0.65,
      orientationRadians
    ),
  ];

  const update = ({
    delta,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    if (getPulseScale() <= 0) return;
    terminals.forEach((terminal) => {
      advanceTerminalRows(terminal, delta);
      terminal.redrawAccumulator += delta;
      const cadence = 1 / terminal.state.redrawHz;
      if (terminal.redrawAccumulator >= cadence) {
        terminal.redrawAccumulator %= cadence;
        drawTerminal(terminal);
      }
    });
  };

  const dispose = () => {
    terminals.forEach((terminal) => terminal.texture.dispose());
    group.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
  };

  return {
    group,
    colliders,
    terminals: terminals.map((terminal) => terminal.state),
    update,
    dispose,
  };
}
