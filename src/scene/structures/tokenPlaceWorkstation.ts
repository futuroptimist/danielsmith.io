import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

export interface TerminalGlyphRun {
  x: number;
  width: number;
  tone: number;
}

export interface TerminalPatternRow {
  height: number;
  runs: TerminalGlyphRun[];
}

export interface TokenPlaceTerminalState {
  readonly seed: number;
  readonly speed: number;
  readonly redrawInterval: number;
  readonly texture: CanvasTexture;
  readonly rows: TerminalPatternRow[];
  scroll: number;
  accumulator: number;
  disposed: boolean;
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

interface TerminalGenerator {
  nextRow(): TerminalPatternRow;
}

const TERMINAL_WIDTH = 320;
const TERMINAL_HEIGHT = 180;
const DESK_WIDTH = 1.72;
const DESK_DEPTH = 0.92;
const DESK_HEIGHT = 0.72;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function range(random: () => number, min: number, max: number): number {
  return min + (max - min) * random();
}

function integer(random: () => number, min: number, max: number): number {
  return Math.floor(range(random, min, max + 1));
}

export function createTerminalPatternGenerator(
  seed: number
): TerminalGenerator {
  const random = mulberry32(seed);
  return {
    nextRow() {
      const row: TerminalPatternRow = {
        height: integer(random, 7, 12),
        runs: [],
      };
      if (random() < 0.12) return row;
      let x = integer(random, 4, 48);
      if (random() < 0.22) {
        row.runs.push({
          x,
          width: integer(random, 5, 12),
          tone: range(random, 0.55, 1),
        });
        x += integer(random, 14, 26);
      }
      const groups = random() < 0.08 ? 1 : integer(random, 2, 12);
      for (
        let index = 0;
        index < groups && x < TERMINAL_WIDTH - 8;
        index += 1
      ) {
        const width = Math.min(integer(random, 6, 54), TERMINAL_WIDTH - x - 4);
        row.runs.push({ x, width, tone: range(random, 0.42, 1) });
        x += width + integer(random, 4, 18);
      }
      if (random() < 0.1)
        row.runs.push({ x: integer(random, 250, 304), width: 8, tone: 1 });
      return row;
    },
  };
}

export function fingerprintTerminalRows(rows: TerminalPatternRow[]): string {
  return rows
    .map(
      (row) =>
        `${row.height}:${row.runs.map((run) => `${run.x}-${run.width}`).join('.')}`
    )
    .join('|');
}

function createCollider(
  center: Vector3,
  width: number,
  depth: number,
  rotation: number
): RectCollider {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const corners = [
    new Vector3(-halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, halfDepth),
    new Vector3(-halfWidth, 0, halfDepth),
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  corners.forEach((corner) => {
    const worldX = center.x + corner.x * cos - corner.z * sin;
    const worldZ = center.z + corner.x * sin + corner.z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  });
  return { minX, maxX, minZ, maxZ };
}

function material(color: number, metalness = 0.1): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(color),
    roughness: 0.55,
    metalness,
  });
}

function addBox(
  parent: Group,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  mat: MeshStandardMaterial | MeshBasicMaterial
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function createTerminalState(
  seed: number,
  level: SceneDetailPolicy['level'],
  phase: number
): TokenPlaceTerminalState {
  const canvas = document.createElement('canvas');
  const scale = level === 'performance' ? 0.5 : level === 'balanced' ? 0.75 : 1;
  canvas.width = TERMINAL_WIDTH * scale;
  canvas.height = TERMINAL_HEIGHT * scale;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const state: TokenPlaceTerminalState = {
    seed,
    speed:
      level === 'performance'
        ? 10 + phase
        : level === 'balanced'
          ? 18 + phase
          : 28 + phase,
    redrawInterval:
      level === 'performance' ? 0.24 : level === 'balanced' ? 0.11 : 0.055,
    texture,
    rows: [],
    scroll: phase,
    accumulator: 0,
    disposed: false,
  };
  const generator = createTerminalPatternGenerator(seed);
  while (
    state.rows.reduce((sum, row) => sum + row.height, 0) <
    TERMINAL_HEIGHT * 1.4
  ) {
    state.rows.push(generator.nextRow());
  }
  (
    state as TokenPlaceTerminalState & { generator: TerminalGenerator }
  ).generator = generator;
  redrawTerminal(state);
  return state;
}

function redrawTerminal(state: TokenPlaceTerminalState): void {
  const canvas = state.texture.image as HTMLCanvasElement;
  const context = canvas.getContext('2d');
  if (!context) return;
  const sx = canvas.width / TERMINAL_WIDTH;
  const sy = canvas.height / TERMINAL_HEIGHT;
  context.save();
  context.scale(sx, sy);
  context.fillStyle = '#030303';
  context.fillRect(0, 0, TERMINAL_WIDTH, TERMINAL_HEIGHT);
  let y = -state.scroll;
  state.rows.forEach((row) => {
    row.runs.forEach((run) => {
      const value = Math.round(120 + run.tone * 120);
      context.fillStyle = `rgb(${value}, ${value}, ${value})`;
      context.fillRect(run.x, y + 2, run.width, Math.max(2, row.height - 5));
    });
    y += row.height;
  });
  context.restore();
  state.texture.needsUpdate = true;
}

function advanceTerminal(state: TokenPlaceTerminalState, delta: number): void {
  state.scroll += state.speed * delta;
  state.accumulator += delta;
  const generator = (
    state as TokenPlaceTerminalState & { generator: TerminalGenerator }
  ).generator;
  while (state.rows.length > 0 && state.scroll >= state.rows[0].height) {
    state.scroll -= state.rows[0].height;
    state.rows.shift();
    state.rows.push(generator.nextRow());
  }
  if (state.accumulator >= state.redrawInterval) {
    state.accumulator = 0;
    redrawTerminal(state);
  }
}

function addMonitor(
  parent: Group,
  index: number,
  x: number,
  yaw: number,
  terminal: TokenPlaceTerminalState
): void {
  const monitor = new Group();
  monitor.name = `TokenPlaceMonitor-${index}`;
  monitor.position.set(x, DESK_HEIGHT + 0.34, -0.25);
  monitor.rotation.y = yaw;
  parent.add(monitor);
  addBox(
    monitor,
    `TokenPlaceMonitorBezel-${index}`,
    [0.55, 0.34, 0.035],
    [0, 0, 0],
    material(0x101418, 0.25)
  );
  const screen = new Mesh(
    new PlaneGeometry(0.49, 0.27),
    new MeshBasicMaterial({ map: terminal.texture })
  );
  screen.name = `TokenPlaceMonitorScreen-${index}`;
  screen.position.set(0, 0, 0.019);
  monitor.add(screen);
  addBox(
    monitor,
    `TokenPlaceMonitorStand-${index}`,
    [0.045, 0.28, 0.045],
    [0, -0.28, 0],
    material(0x15191d, 0.3)
  );
  addBox(
    monitor,
    `TokenPlaceMonitorBase-${index}`,
    [0.24, 0.035, 0.16],
    [0, -0.43, 0.02],
    material(0x15191d, 0.3)
  );
}

export function createTokenPlaceWorkstation(
  options: TokenPlaceWorkstationOptions
): TokenPlaceWorkstationBuild {
  const {
    position,
    orientationRadians = 0,
    detailPolicy = getSceneDetailPolicy('balanced'),
  } = options;
  const level = detailPolicy.level;
  const group = new Group();
  group.name = 'TokenPlaceWorkstation';
  group.position.set(position.x, position.y ?? 0, position.z);
  group.rotation.y = orientationRadians;

  const desk = new Group();
  desk.name = 'TokenPlaceDesk';
  group.add(desk);
  addBox(
    desk,
    'TokenPlaceDeskTop',
    [DESK_WIDTH, 0.1, DESK_DEPTH],
    [0, DESK_HEIGHT, 0],
    material(0x4b2f1f)
  );
  const supports = level === 'performance' ? 2 : 4;
  for (let index = 0; index < supports; index += 1) {
    const side = supports === 2 ? index * 2 - 1 : index < 2 ? -1 : 1;
    const back = supports === 2 ? 0 : index % 2 === 0 ? -1 : 1;
    addBox(
      desk,
      `TokenPlaceDeskSupport-${index}`,
      [0.08, DESK_HEIGHT, 0.08],
      [side * 0.72, DESK_HEIGHT / 2, back * 0.32],
      material(0x2f2118)
    );
  }
  addBox(
    desk,
    'TokenPlaceDeskBrace',
    [1.35, 0.045, 0.055],
    [0, 0.38, 0.34],
    material(0x2f2118)
  );

  const terminals = [
    createTerminalState(0x7051, level, 1.7),
    createTerminalState(0x9a23, level, 4.3),
  ];
  addMonitor(group, 0, -0.32, -0.16, terminals[0]);
  addMonitor(group, 1, 0.32, 0.16, terminals[1]);

  const tower = new Group();
  tower.name = 'TokenPlacePcTower';
  tower.position.set(-0.62, 0.31, -0.1);
  group.add(tower);
  addBox(
    tower,
    'TokenPlacePcCase',
    [0.34, 0.58, 0.34],
    [0, 0, 0],
    material(0x14181d, 0.35)
  );
  addBox(
    tower,
    'TokenPlacePcFrontPanel',
    [0.29, 0.46, 0.012],
    [0, 0, -0.176],
    material(0x222a31, 0.2)
  );
  const ventCount = level === 'cinematic' ? 7 : level === 'balanced' ? 4 : 2;
  for (let index = 0; index < ventCount; index += 1) {
    addBox(
      tower,
      `TokenPlacePcVent-${index}`,
      [0.2, 0.012, 0.014],
      [0, 0.16 - index * 0.045, -0.19],
      material(0x6f7f86)
    );
  }
  if (level === 'performance') {
    addBox(
      tower,
      'TokenPlacePcFanRing',
      [0.12, 0.05, 0.014],
      [0, -0.16, -0.19],
      material(0x44d6df)
    );
  } else {
    const fan = new Mesh(
      new TorusGeometry(0.085, 0.008, 6, level === 'cinematic' ? 24 : 12),
      material(0x44d6df)
    );
    fan.name = 'TokenPlacePcFanRing';
    fan.position.set(0, -0.16, -0.19);
    tower.add(fan);
  }

  const chair = new Group();
  chair.name = 'TokenPlaceGamingChair';
  chair.position.set(0.08, 0, 0.72);
  chair.rotation.y = -0.12;
  group.add(chair);
  addBox(
    chair,
    'TokenPlaceChairSeat',
    [0.5, 0.12, 0.45],
    [0, 0.34, 0],
    material(0x1c2028)
  );
  addBox(
    chair,
    'TokenPlaceChairBack',
    [0.52, 0.72, 0.12],
    [0, 0.74, 0.2],
    material(0x1b1f28)
  );
  addBox(
    chair,
    'TokenPlaceChairHeadrest',
    [0.34, 0.12, 0.13],
    [0, 1.05, 0.14],
    material(0x2d3440)
  );
  addBox(
    chair,
    'TokenPlaceChairLeftArm',
    [0.08, 0.26, 0.32],
    [-0.32, 0.48, 0],
    material(0x171b21)
  );
  addBox(
    chair,
    'TokenPlaceChairRightArm',
    [0.08, 0.26, 0.32],
    [0.32, 0.48, 0],
    material(0x171b21)
  );
  addBox(
    chair,
    'TokenPlaceChairPost',
    [0.08, 0.32, 0.08],
    [0, 0.16, 0],
    material(0x15191d, 0.35)
  );
  const wheels = level === 'performance' ? 1 : level === 'balanced' ? 4 : 5;
  for (let index = 0; index < wheels; index += 1) {
    const angle = (index / wheels) * Math.PI * 2;
    addBox(
      chair,
      `TokenPlaceChairCaster-${index}`,
      [0.22, 0.045, 0.06],
      [Math.cos(angle) * 0.2, 0.04, Math.sin(angle) * 0.2],
      material(0x101317, 0.25)
    );
  }

  addBox(
    group,
    'TokenPlaceKeyboard',
    [0.62, 0.035, 0.18],
    [0, DESK_HEIGHT + 0.075, 0.18],
    material(0x111418, 0.2)
  );
  const keyGroups = level === 'cinematic' ? 36 : level === 'balanced' ? 9 : 2;
  for (let index = 0; index < keyGroups; index += 1) {
    addBox(
      group,
      `TokenPlaceKeyGroup-${index}`,
      [0.045, 0.018, 0.055],
      [
        -0.27 + (index % 12) * 0.05,
        DESK_HEIGHT + 0.105,
        0.11 + Math.floor(index / 12) * 0.055,
      ],
      material(0x2e343a)
    );
  }
  addBox(
    group,
    'TokenPlaceMousePad',
    [0.32, 0.012, 0.24],
    [0.52, DESK_HEIGHT + 0.066, 0.19],
    material(0x101820)
  );
  if (level === 'performance') {
    addBox(
      group,
      'TokenPlaceMouse',
      [0.1, 0.045, 0.14],
      [0.52, DESK_HEIGHT + 0.095, 0.19],
      material(0x252b31)
    );
  } else {
    const mouse = new Mesh(
      new CylinderGeometry(0.055, 0.075, 0.12, 16),
      material(0x252b31)
    );
    mouse.name = 'TokenPlaceMouse';
    mouse.rotation.x = Math.PI / 2;
    mouse.position.set(0.52, DESK_HEIGHT + 0.11, 0.19);
    group.add(mouse);
  }

  if (level === 'cinematic') {
    for (let index = 0; index < 2; index += 1) {
      const grommet = new Mesh(
        new CylinderGeometry(0.025, 0.025, 0.01, 24),
        material(0x1b1510)
      );
      grommet.name = `TokenPlaceDeskCableGrommet-${index}`;
      grommet.position.set(-0.56 + index * 0.16, DESK_HEIGHT + 0.058, -0.36);
      group.add(grommet);
    }
    const coin = new Mesh(
      new CylinderGeometry(0.08, 0.08, 0.018, 32),
      material(0xd29a45, 0.25)
    );
    coin.name = 'TokenPlaceCoinMotif';
    coin.rotation.x = Math.PI / 2;
    coin.position.set(0.73, DESK_HEIGHT + 0.07, -0.18);
    group.add(coin);
  }

  const colliderCenter = (localX: number, localZ: number) => {
    const cos = Math.cos(orientationRadians);
    const sin = Math.sin(orientationRadians);
    return new Vector3(
      position.x + localX * cos - localZ * sin,
      0,
      position.z + localX * sin + localZ * cos
    );
  };
  const colliders = [
    createCollider(
      colliderCenter(0, -0.03),
      DESK_WIDTH + 0.08,
      DESK_DEPTH + 0.1,
      orientationRadians
    ),
    createCollider(colliderCenter(0.08, 0.72), 0.72, 0.62, orientationRadians),
  ];

  return {
    group,
    colliders,
    terminals,
    update({ delta }) {
      if (getPulseScale() <= 0) return;
      terminals.forEach((terminal) => advanceTerminal(terminal, delta));
    },
    dispose() {
      terminals.forEach((terminal) => {
        terminal.texture.dispose();
        terminal.disposed = true;
      });
    },
  };
}
