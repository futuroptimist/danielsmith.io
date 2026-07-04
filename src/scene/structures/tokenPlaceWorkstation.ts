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
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

import { createRequiredTightPoiCollider } from './poiColliderBounds';

export interface TerminalGlyphRun {
  x: number;
  width: number;
  shade: number;
  heightScale: number;
}

export interface TerminalPatternRow {
  indent: number;
  height: number;
  runs: TerminalGlyphRun[];
  divider?: boolean;
  cursor?: { x: number; width: number };
}

export interface TokenPlaceTerminalState {
  rows: TerminalPatternRow[];
  speed: number;
  phase: number;
  scroll: number;
  rowHeight: number;
  fingerprint: string;
  advance(delta: number): number;
}

export interface TokenPlaceWorkstationBuild {
  group: Group;
  colliders: RectCollider[];
  terminals: TokenPlaceTerminalState[];
  update(context: {
    elapsed: number;
    delta: number;
    emphasis: number;
    animateTerminals?: boolean;
  }): void;
  dispose(): void;
}

export interface TokenPlaceWorkstationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
}

export const SUGARKUBE_PI_BOARD_SCENE_WIDTH = 0.31;
export const RASPBERRY_PI_5_REAL_WIDTH_METERS = 0.085;
export const MONITOR_27_INCH_16_9_REAL_WIDTH_METERS = 0.598;
export const EXPECTED_27_INCH_MONITOR_TO_PI_WIDTH_RATIO =
  MONITOR_27_INCH_16_9_REAL_WIDTH_METERS / RASPBERRY_PI_5_REAL_WIDTH_METERS;
export const MONITOR_SCREEN_WIDTH =
  SUGARKUBE_PI_BOARD_SCENE_WIDTH * EXPECTED_27_INCH_MONITOR_TO_PI_WIDTH_RATIO;
export const MONITOR_SCREEN_HEIGHT = MONITOR_SCREEN_WIDTH * (9 / 16);

const MONITOR_CENTER_GAP = 0.18;
const MONITOR_BEZEL_PADDING_X = 0.16;
const MONITOR_BEZEL_PADDING_Y = 0.12;
const MONITOR_BEZEL_DEPTH = 0.08;
const MONITOR_BEZEL_WIDTH = MONITOR_SCREEN_WIDTH + MONITOR_BEZEL_PADDING_X;
const MONITOR_BEZEL_HEIGHT = MONITOR_SCREEN_HEIGHT + MONITOR_BEZEL_PADDING_Y;
const MONITOR_X_OFFSET = MONITOR_SCREEN_WIDTH / 2 + MONITOR_CENTER_GAP / 2;

interface DetailConfig {
  level: SceneDetailPolicy['level'];
  terminalWidth: number;
  terminalHeight: number;
  redrawFps: number;
  monitorSegments: number;
  chairSegments: number;
  keyRows: number;
  keyColumns: number;
  pcVentCount: number;
  wheelCount: number;
}

const DETAIL_CONFIG: Record<SceneDetailPolicy['level'], DetailConfig> = {
  cinematic: {
    level: 'cinematic',
    terminalWidth: 512,
    terminalHeight: 256,
    redrawFps: 18,
    monitorSegments: 24,
    chairSegments: 18,
    keyRows: 5,
    keyColumns: 12,
    pcVentCount: 10,
    wheelCount: 5,
  },
  balanced: {
    level: 'balanced',
    terminalWidth: 384,
    terminalHeight: 192,
    redrawFps: 9,
    monitorSegments: 12,
    chairSegments: 10,
    keyRows: 3,
    keyColumns: 8,
    pcVentCount: 6,
    wheelCount: 4,
  },
  performance: {
    level: 'performance',
    terminalWidth: 256,
    terminalHeight: 128,
    redrawFps: 4,
    monitorSegments: 6,
    chairSegments: 5,
    keyRows: 2,
    keyColumns: 3,
    pcVentCount: 2,
    wheelCount: 3,
  },
  low: {
    level: 'low',
    terminalWidth: 192,
    terminalHeight: 96,
    redrawFps: 2,
    monitorSegments: 4,
    chairSegments: 4,
    keyRows: 1,
    keyColumns: 3,
    pcVentCount: 1,
    wheelCount: 0,
  },
  micro: {
    level: 'micro',
    terminalWidth: 128,
    terminalHeight: 64,
    redrawFps: 1,
    monitorSegments: 3,
    chairSegments: 3,
    keyRows: 1,
    keyColumns: 2,
    pcVentCount: 0,
    wheelCount: 0,
  },
};

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

export function createTokenPlaceTerminalRow(
  random: () => number,
  width = 1
): TerminalPatternRow {
  if (random() < 0.08)
    return { indent: 0, height: range(random, 0.45, 0.8), runs: [] };

  const divider = random() < 0.08;
  const indent = divider ? range(random, 0.02, 0.08) : range(random, 0, 0.28);
  const groups = divider ? 1 : Math.floor(range(random, 2, 13));
  const runs: TerminalGlyphRun[] = [];
  let x = indent;

  for (let index = 0; index < groups && x < width - 0.03; index += 1) {
    const runWidth = divider
      ? range(random, 0.52, 0.9)
      : range(random, 0.025, 0.18);
    runs.push({
      x,
      width: Math.min(runWidth, width - x - 0.02),
      shade: range(random, 0.58, 1),
      heightScale: range(random, 0.45, 1),
    });
    x += runWidth + range(random, 0.018, 0.075);
  }

  const cursor =
    random() < 0.16
      ? { x: Math.min(x + 0.02, 0.94), width: range(random, 0.025, 0.055) }
      : undefined;
  return { indent, height: range(random, 0.5, 0.9), runs, divider, cursor };
}

export function createTokenPlaceTerminalState(options: {
  seed: number;
  speed: number;
  phase: number;
  rowCount?: number;
  rowHeight?: number;
}): TokenPlaceTerminalState {
  const random = mulberry32(options.seed);
  const rowCount = options.rowCount ?? 34;
  const rows = Array.from({ length: rowCount }, () =>
    createTokenPlaceTerminalRow(random)
  );
  const state: TokenPlaceTerminalState = {
    rows,
    speed: options.speed,
    phase: options.phase,
    scroll: options.phase,
    rowHeight: options.rowHeight ?? 10,
    fingerprint: fingerprintRows(rows),
    advance(delta) {
      this.scroll += this.speed * delta;
      let recycled = 0;
      while (this.scroll >= this.rowHeight) {
        this.scroll -= this.rowHeight;
        this.rows.pop();
        this.rows.unshift(createTokenPlaceTerminalRow(random));
        recycled += 1;
      }
      if (recycled > 0) this.fingerprint = fingerprintRows(this.rows);
      return recycled;
    },
  };
  return state;
}

export function fingerprintRows(rows: TerminalPatternRow[]): string {
  return rows
    .map(
      (row) =>
        `${row.runs.length}:${row.indent.toFixed(2)}:${row.runs.map((run) => run.width.toFixed(2)).join(',')}:${row.cursor ? 'c' : '-'}`
    )
    .join('|');
}

function drawTerminalTexture(
  texture: CanvasTexture,
  state: TokenPlaceTerminalState,
  width: number,
  height: number
): void {
  const canvas = texture.image as HTMLCanvasElement;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#030303';
  context.fillRect(0, 0, width, height);
  const rowHeight = state.rowHeight;
  state.rows.forEach((row, index) => {
    const y = height - (index + 1) * rowHeight - state.scroll;
    if (y < -rowHeight || y > height) return;
    row.runs.forEach((run) => {
      const lightness = Math.round(150 + run.shade * 88);
      context.fillStyle = `rgb(${lightness}, ${lightness}, ${lightness})`;
      context.fillRect(
        run.x * width,
        y + 2,
        run.width * width,
        rowHeight * row.height * run.heightScale
      );
    });
    if (row.cursor) {
      context.fillStyle = '#f5f5f5';
      context.fillRect(
        row.cursor.x * width,
        y + 1,
        row.cursor.width * width,
        rowHeight * 0.8
      );
    }
  });
  texture.needsUpdate = true;
}

function createTerminalTexture(
  width: number,
  height: number,
  state: TokenPlaceTerminalState
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  drawTerminalTexture(texture, state, width, height);
  return texture;
}

function addBox(
  group: Group,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  material: MeshStandardMaterial | MeshBasicMaterial
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  group.add(mesh);
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
  const config = DETAIL_CONFIG[detailPolicy.level];
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);
  const group = new Group();
  group.name = 'TokenPlaceWorkstation';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const wood = new MeshStandardMaterial({
    color: new Color(0x5b3a22),
    roughness: 0.68,
    metalness: 0.06,
  });
  const charcoal = new MeshStandardMaterial({
    color: new Color(0x15171d),
    roughness: 0.48,
    metalness: 0.28,
  });
  const dark = new MeshStandardMaterial({
    color: new Color(0x252830),
    roughness: 0.72,
    metalness: 0.08,
  });
  const accent = new MeshStandardMaterial({
    color: new Color(0x24d6e8),
    emissive: new Color(0x0a5260),
    emissiveIntensity: 0.22,
  });
  const amber = new MeshStandardMaterial({
    color: new Color(0xffbf5b),
    emissive: new Color(0x5b3108),
    emissiveIntensity: 0.32,
  });
  const screenMaterialBase = new MeshBasicMaterial({ color: 0xffffff });

  const desk = new Group();
  desk.name = 'TokenPlaceDesk';
  group.add(desk);
  addBox(desk, 'TokenPlaceDeskTop', [5.35, 0.14, 1.28], [0, 0.78, 0], wood);
  addBox(
    desk,
    'TokenPlaceDeskBackBrace',
    [4.95, 0.09, 0.09],
    [0, 0.46, -0.56],
    charcoal
  );
  const legPositions: Array<[number, number]> = [
    [-2.46, -0.52],
    [2.46, -0.52],
    [-2.46, 0.52],
    [2.46, 0.52],
  ];
  legPositions.forEach(([x, z], index) =>
    addBox(
      desk,
      `TokenPlaceDeskLeg-${index}`,
      [0.09, 0.74, 0.09],
      [x, 0.37, z],
      charcoal
    )
  );
  if (config.level === 'cinematic' || config.level === 'balanced') {
    addBox(
      desk,
      'TokenPlaceDeskGrommet',
      [0.18, 0.014, 0.1],
      [1.78, 0.858, -0.48],
      charcoal
    );
    addBox(
      desk,
      'TokenPlaceCableBundle',
      [0.06, 0.28, 0.05],
      [1.88, 0.64, -0.52],
      charcoal
    );
  }

  const tower = new Group();
  tower.name = 'TokenPlacePcTower';
  tower.position.set(-2.12, 0.42, 0.22);
  group.add(tower);
  addBox(
    tower,
    'TokenPlacePcTowerCase',
    [0.58, 0.84, 0.62],
    [0, 0, 0],
    charcoal
  );
  addBox(
    tower,
    'TokenPlacePcTowerFrontPanel',
    [0.59, 0.72, 0.04],
    [0, 0.02, 0.335],
    dark
  );
  addBox(
    tower,
    'TokenPlacePcPowerIndicator',
    [0.04, 0.04, 0.04],
    [0.18, 0.26, 0.365],
    amber
  );
  for (let i = 0; i < config.pcVentCount; i += 1)
    addBox(
      tower,
      `TokenPlacePcVent-${i}`,
      [0.26, 0.014, 0.02],
      [0, 0.18 - i * 0.045, 0.365],
      accent
    );
  if (config.level === 'cinematic') {
    const fan = new Mesh(new CylinderGeometry(0.16, 0.16, 0.02, 24), accent);
    fan.name = 'TokenPlacePcFanRing';
    fan.rotation.x = Math.PI / 2;
    fan.position.set(-0.12, -0.22, 0.365);
    tower.add(fan);
    addBox(
      tower,
      'TokenPlacePcSidePanel',
      [0.025, 0.62, 0.4],
      [0.3, 0, 0],
      dark
    );
  }

  const chair = new Group();
  chair.name = 'TokenPlaceGamingChair';
  chair.position.set(0.08, 0, 1.48);
  chair.rotation.y = -0.08;
  group.add(chair);
  addBox(chair, 'TokenPlaceChairSeat', [0.9, 0.18, 0.78], [0, 0.43, 0], dark);
  addBox(
    chair,
    'TokenPlaceChairBack',
    [0.84, 1.04, 0.16],
    [0, 1.04, 0.36],
    dark
  );
  addBox(
    chair,
    'TokenPlaceChairHeadrest',
    [0.52, 0.2, 0.16],
    [0, 1.5, 0.3],
    charcoal
  );
  addBox(
    chair,
    'TokenPlaceChairLeftArm',
    [0.1, 0.38, 0.52],
    [-0.54, 0.68, 0.04],
    charcoal
  );
  addBox(
    chair,
    'TokenPlaceChairRightArm',
    [0.1, 0.38, 0.52],
    [0.54, 0.68, 0.04],
    charcoal
  );
  const post = new Mesh(
    new CylinderGeometry(0.065, 0.065, 0.4, config.chairSegments),
    charcoal
  );
  post.name = 'TokenPlaceChairCentralSupport';
  post.position.set(0, 0.22, 0);
  chair.add(post);
  for (let i = 0; i < config.wheelCount; i += 1) {
    const angle = (i / config.wheelCount) * Math.PI * 2;
    addBox(
      chair,
      `TokenPlaceChairRollingBase-${i}`,
      [0.46, 0.05, 0.08],
      [Math.cos(angle) * 0.22, 0.05, Math.sin(angle) * 0.22],
      charcoal
    ).rotation.y = -angle;
  }
  if (config.level === 'cinematic' || config.level === 'balanced')
    addBox(
      chair,
      'TokenPlaceChairAccentStitch',
      [0.07, 0.8, 0.03],
      [0, 1.08, 0.45],
      accent
    );

  const terminals = [
    createTokenPlaceTerminalState({
      seed: 0x70cace01,
      speed: 24,
      phase: 3,
      rowHeight: 10,
    }),
    createTokenPlaceTerminalState({
      seed: 0x70cace77,
      speed: 29,
      phase: 7,
      rowHeight: 10,
    }),
  ];
  const textures = terminals.map((terminal) =>
    createTerminalTexture(config.terminalWidth, config.terminalHeight, terminal)
  );
  const monitorXs = [-MONITOR_X_OFFSET, MONITOR_X_OFFSET];
  monitorXs.forEach((x, index) => {
    const monitor = new Group();
    monitor.name = `TokenPlaceMonitor-${index}`;
    monitor.position.set(x, 1.58, -0.48);
    monitor.rotation.y = index === 0 ? -0.18 : 0.18;
    group.add(monitor);
    addBox(
      monitor,
      `TokenPlaceMonitorBezel-${index}`,
      [MONITOR_BEZEL_WIDTH, MONITOR_BEZEL_HEIGHT, MONITOR_BEZEL_DEPTH],
      [0, 0, 0],
      charcoal
    );
    const screen = new Mesh(
      new PlaneGeometry(MONITOR_SCREEN_WIDTH, MONITOR_SCREEN_HEIGHT),
      screenMaterialBase.clone()
    );
    screen.name = `TokenPlaceMonitorScreen-${index}`;
    (screen.material as MeshBasicMaterial).map = textures[index];
    screen.position.set(0, 0, MONITOR_BEZEL_DEPTH / 2 + 0.003);
    monitor.add(screen);
    addBox(
      monitor,
      `TokenPlaceMonitorStand-${index}`,
      [0.12, 0.56, 0.09],
      [0, -0.78, 0],
      charcoal
    );
    addBox(
      monitor,
      `TokenPlaceMonitorBase-${index}`,
      [0.62, 0.06, 0.36],
      [0, -1.08, 0.05],
      charcoal
    );
    if (config.level === 'cinematic')
      addBox(
        monitor,
        `TokenPlaceMonitorBackVent-${index}`,
        [1.3, 0.055, 0.02],
        [0, 0.28, -0.05],
        accent
      );
  });

  const keyboard = new Group();
  keyboard.name = 'TokenPlaceKeyboard';
  keyboard.position.set(-0.25, 0.89, 0.22);
  group.add(keyboard);
  addBox(
    keyboard,
    'TokenPlaceKeyboardBase',
    [1.28, 0.045, 0.34],
    [0, 0, 0],
    charcoal
  );
  for (let row = 0; row < config.keyRows; row += 1) {
    for (let col = 0; col < config.keyColumns; col += 1) {
      addBox(
        keyboard,
        `TokenPlaceKey-${row}-${col}`,
        [0.05, 0.02, 0.034],
        [
          -0.54 + col * (1.08 / Math.max(1, config.keyColumns - 1)),
          0.032,
          -0.12 + row * 0.07,
        ],
        dark
      );
    }
  }
  addBox(
    group,
    'TokenPlaceMousePad',
    [0.68, 0.02, 0.46],
    [1.25, 0.872, 0.22],
    dark
  );
  const mouse = new Mesh(
    new SphereGeometry(
      0.12,
      config.monitorSegments,
      Math.max(4, Math.floor(config.monitorSegments / 2))
    ),
    charcoal
  );
  mouse.name = 'TokenPlaceMouse';
  mouse.scale.set(1.05, 0.34, 1.45);
  mouse.position.set(1.25, 0.94, 0.2);
  group.add(mouse);

  const token = new Mesh(
    new CylinderGeometry(0.13, 0.13, 0.025, config.monitorSegments),
    amber
  );
  token.name = 'TokenPlaceCoinMotif';
  token.rotation.x = Math.PI / 2;
  token.position.set(2.16, 0.875, -0.42);
  group.add(token);

  let redrawAccumulator = 0;
  const redrawInterval = 1 / config.redrawFps;

  const update = ({
    delta,
    animateTerminals = true,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
    animateTerminals?: boolean;
  }) => {
    if (getPulseScale() <= 0 || !animateTerminals) return;
    redrawAccumulator += delta;
    if (redrawAccumulator < redrawInterval) return;
    const step = redrawAccumulator;
    redrawAccumulator = 0;
    terminals.forEach((terminal) => {
      terminal.advance(step);
    });
    textures.forEach((texture, index) =>
      drawTerminalTexture(
        texture,
        terminals[index],
        config.terminalWidth,
        config.terminalHeight
      )
    );
  };

  const dispose = () => {
    textures.forEach((texture) => texture.dispose());
    screenMaterialBase.dispose();
    group.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material))
          material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
    });
  };

  const tightCollider = createRequiredTightPoiCollider(group, {
    debugName: 'TokenPlaceWorkstationCollider',
  });

  return { group, colliders: [tightCollider], terminals, update, dispose };
}
