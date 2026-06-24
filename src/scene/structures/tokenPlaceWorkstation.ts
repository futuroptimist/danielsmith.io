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
        this.rows.shift();
        this.rows.push(createTokenPlaceTerminalRow(random));
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
  addBox(desk, 'TokenPlaceDeskTop', [1.85, 0.12, 0.82], [0, 0.76, 0], wood);
  addBox(
    desk,
    'TokenPlaceDeskBackBrace',
    [1.7, 0.08, 0.08],
    [0, 0.45, -0.34],
    charcoal
  );
  const legPositions: Array<[number, number]> = [
    [-0.78, -0.31],
    [0.78, -0.31],
    [-0.78, 0.31],
    [0.78, 0.31],
  ];
  legPositions.forEach(([x, z], index) =>
    addBox(
      desk,
      `TokenPlaceDeskLeg-${index}`,
      [0.08, 0.72, 0.08],
      [x, 0.36, z],
      charcoal
    )
  );
  if (config.level !== 'performance') {
    addBox(
      desk,
      'TokenPlaceDeskGrommet',
      [0.14, 0.014, 0.08],
      [0.55, 0.828, -0.25],
      charcoal
    );
    addBox(
      desk,
      'TokenPlaceCableBundle',
      [0.05, 0.24, 0.04],
      [0.6, 0.62, -0.28],
      charcoal
    );
  }

  const tower = new Group();
  tower.name = 'TokenPlacePcTower';
  tower.position.set(-0.64, 0.35, 0.14);
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
    [0.35, 0.56, 0.035],
    [0, 0.02, 0.23],
    dark
  );
  addBox(
    tower,
    'TokenPlacePcPowerIndicator',
    [0.04, 0.04, 0.04],
    [0.1, 0.2, 0.255],
    amber
  );
  for (let i = 0; i < config.pcVentCount; i += 1)
    addBox(
      tower,
      `TokenPlacePcVent-${i}`,
      [0.2, 0.012, 0.018],
      [0, 0.1 - i * 0.035, 0.255],
      accent
    );
  if (config.level === 'cinematic') {
    const fan = new Mesh(new CylinderGeometry(0.1, 0.1, 0.018, 24), accent);
    fan.name = 'TokenPlacePcFanRing';
    fan.rotation.x = Math.PI / 2;
    fan.position.set(-0.07, -0.18, 0.255);
    tower.add(fan);
    addBox(
      tower,
      'TokenPlacePcSidePanel',
      [0.02, 0.48, 0.28],
      [0.18, 0, 0],
      dark
    );
  }

  const chair = new Group();
  chair.name = 'TokenPlaceGamingChair';
  chair.position.set(0.04, 0, 0.86);
  chair.rotation.y = -0.08;
  group.add(chair);
  addBox(chair, 'TokenPlaceChairSeat', [0.58, 0.14, 0.52], [0, 0.43, 0], dark);
  addBox(
    chair,
    'TokenPlaceChairBack',
    [0.56, 0.82, 0.12],
    [0, 0.91, 0.23],
    dark
  );
  addBox(
    chair,
    'TokenPlaceChairHeadrest',
    [0.36, 0.16, 0.13],
    [0, 1.28, 0.18],
    charcoal
  );
  addBox(
    chair,
    'TokenPlaceChairLeftArm',
    [0.08, 0.32, 0.36],
    [-0.36, 0.6, 0.02],
    charcoal
  );
  addBox(
    chair,
    'TokenPlaceChairRightArm',
    [0.08, 0.32, 0.36],
    [0.36, 0.6, 0.02],
    charcoal
  );
  const post = new Mesh(
    new CylinderGeometry(0.055, 0.055, 0.35, config.chairSegments),
    charcoal
  );
  post.name = 'TokenPlaceChairCentralSupport';
  post.position.set(0, 0.2, 0);
  chair.add(post);
  for (let i = 0; i < config.wheelCount; i += 1) {
    const angle = (i / config.wheelCount) * Math.PI * 2;
    addBox(
      chair,
      `TokenPlaceChairRollingBase-${i}`,
      [0.38, 0.045, 0.07],
      [Math.cos(angle) * 0.18, 0.05, Math.sin(angle) * 0.18],
      charcoal
    ).rotation.y = -angle;
  }
  if (config.level !== 'performance')
    addBox(
      chair,
      'TokenPlaceChairAccentStitch',
      [0.06, 0.72, 0.025],
      [0, 0.92, 0.3],
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
  const monitorXs = [-0.44, 0.44];
  monitorXs.forEach((x, index) => {
    const monitor = new Group();
    monitor.name = `TokenPlaceMonitor-${index}`;
    monitor.position.set(x, 1.16, -0.24);
    monitor.rotation.y = index === 0 ? -0.18 : 0.18;
    group.add(monitor);
    addBox(
      monitor,
      `TokenPlaceMonitorBezel-${index}`,
      [0.66, 0.42, 0.045],
      [0, 0, 0],
      charcoal
    );
    const screen = new Mesh(
      new PlaneGeometry(0.58, 0.32),
      screenMaterialBase.clone()
    );
    screen.name = `TokenPlaceMonitorScreen-${index}`;
    (screen.material as MeshBasicMaterial).map = textures[index];
    screen.position.set(0, 0, 0.027);
    monitor.add(screen);
    addBox(
      monitor,
      `TokenPlaceMonitorStand-${index}`,
      [0.07, 0.32, 0.055],
      [0, -0.34, 0],
      charcoal
    );
    addBox(
      monitor,
      `TokenPlaceMonitorBase-${index}`,
      [0.32, 0.045, 0.22],
      [0, -0.52, 0.03],
      charcoal
    );
    if (config.level === 'cinematic')
      addBox(
        monitor,
        `TokenPlaceMonitorBackVent-${index}`,
        [0.32, 0.04, 0.015],
        [0, 0.12, -0.03],
        accent
      );
  });

  const keyboard = new Group();
  keyboard.name = 'TokenPlaceKeyboard';
  keyboard.position.set(-0.08, 0.86, 0.1);
  group.add(keyboard);
  addBox(
    keyboard,
    'TokenPlaceKeyboardBase',
    [0.7, 0.04, 0.22],
    [0, 0, 0],
    charcoal
  );
  for (let row = 0; row < config.keyRows; row += 1) {
    for (let col = 0; col < config.keyColumns; col += 1) {
      addBox(
        keyboard,
        `TokenPlaceKey-${row}-${col}`,
        [0.04, 0.018, 0.028],
        [
          -0.28 + col * (0.56 / Math.max(1, config.keyColumns - 1)),
          0.032,
          -0.07 + row * 0.06,
        ],
        dark
      );
    }
  }
  addBox(
    group,
    'TokenPlaceMousePad',
    [0.34, 0.018, 0.28],
    [0.58, 0.842, 0.1],
    dark
  );
  const mouse = new Mesh(
    new SphereGeometry(
      0.08,
      config.monitorSegments,
      Math.max(4, Math.floor(config.monitorSegments / 2))
    ),
    charcoal
  );
  mouse.name = 'TokenPlaceMouse';
  mouse.scale.set(1.05, 0.34, 1.45);
  mouse.position.set(0.58, 0.89, 0.08);
  group.add(mouse);

  const token = new Mesh(
    new CylinderGeometry(0.08, 0.08, 0.018, config.monitorSegments),
    amber
  );
  token.name = 'TokenPlaceCoinMotif';
  token.rotation.x = Math.PI / 2;
  token.position.set(0.82, 0.84, -0.24);
  group.add(token);

  const colliders = [
    createCollider(
      basePosition.clone().add(new Vector3(0, 0, 0.02)),
      2.05,
      1.05,
      orientationRadians
    ),
    createCollider(
      basePosition.clone().add(new Vector3(0.04, 0, 0.86)),
      0.7,
      0.62,
      orientationRadians - 0.08
    ),
  ];

  let redrawAccumulator = 0;
  const redrawInterval = 1 / config.redrawFps;
  const reducedMotion = getPulseScale() <= 0;

  const update = ({
    delta,
    animateTerminals = true,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
    animateTerminals?: boolean;
  }) => {
    if (reducedMotion || !animateTerminals) return;
    redrawAccumulator += delta;
    if (redrawAccumulator < redrawInterval) return;
    const step = redrawAccumulator;
    redrawAccumulator = 0;
    let redrew = false;
    terminals.forEach((terminal) => {
      terminal.advance(step);
      redrew = true;
    });
    if (redrew)
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

  return { group, colliders, terminals, update, dispose };
}
