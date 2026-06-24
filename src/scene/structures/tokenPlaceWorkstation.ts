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
  Vector3,
} from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

export interface TokenPlaceWorkstationBuild {
  group: Group;
  colliders: RectCollider[];
  terminals: [TokenPlaceTerminalState, TokenPlaceTerminalState];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  dispose(): void;
}

export interface TokenPlaceWorkstationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
}

export interface TerminalGlyphRun {
  x: number;
  width: number;
  shade: number;
  heightScale: number;
}

export interface TerminalPatternRow {
  indent: number;
  runs: TerminalGlyphRun[];
  blank: boolean;
  cursor: boolean;
}

export interface TokenPlaceTerminalState {
  readonly texture: CanvasTexture;
  readonly seed: number;
  readonly speed: number;
  readonly redrawInterval: number;
  readonly rows: TerminalPatternRow[];
  scrollOffset: number;
  accumulator: number;
  redrawAccumulator: number;
  disposed: boolean;
  update(delta: number, animate: boolean): boolean;
  fingerprint(): string;
  dispose(): void;
}

const TERMINAL_CANONICAL_WIDTH = 256;
const TERMINAL_CANONICAL_HEIGHT = 144;
const ROW_HEIGHT = 8;
const DESK_WIDTH = 1.9;
const DESK_DEPTH = 1.08;
const DESK_HEIGHT = 0.82;
const DESK_TOP_THICKNESS = 0.12;

type WorkstationDetail = {
  terminalSize: { width: number; height: number };
  terminalFps: number;
  cylinderSegments: number;
  wheelSegments: number;
  keyboardRows: number;
  keyboardColumns: number;
  fanRings: number;
  vents: number;
  chairWheels: number;
  groupedKeys: boolean;
  extraPolish: boolean;
};

const DETAILS: Record<SceneDetailPolicy['level'], WorkstationDetail> = {
  cinematic: {
    terminalSize: { width: 512, height: 288 },
    terminalFps: 18,
    cylinderSegments: 24,
    wheelSegments: 12,
    keyboardRows: 4,
    keyboardColumns: 12,
    fanRings: 2,
    vents: 8,
    chairWheels: 5,
    groupedKeys: false,
    extraPolish: true,
  },
  balanced: {
    terminalSize: { width: 384, height: 216 },
    terminalFps: 9,
    cylinderSegments: 12,
    wheelSegments: 8,
    keyboardRows: 3,
    keyboardColumns: 6,
    fanRings: 1,
    vents: 5,
    chairWheels: 4,
    groupedKeys: true,
    extraPolish: false,
  },
  performance: {
    terminalSize: { width: 256, height: 144 },
    terminalFps: 4,
    cylinderSegments: 4,
    wheelSegments: 4,
    keyboardRows: 2,
    keyboardColumns: 3,
    fanRings: 0,
    vents: 2,
    chairWheels: 2,
    groupedKeys: true,
    extraPolish: false,
  },
};

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

const range = (random: () => number, min: number, max: number): number =>
  min + (max - min) * random();

const integer = (random: () => number, min: number, max: number): number =>
  Math.floor(range(random, min, max + 1));

export function createTerminalPatternRow(
  random: () => number
): TerminalPatternRow {
  const blank = random() < 0.1;
  const divider = !blank && random() < 0.08;
  const cursor = !blank && random() < 0.12;
  const indent = divider ? integer(random, 0, 12) : integer(random, 2, 48);
  const runs: TerminalGlyphRun[] = [];

  if (!blank) {
    if (divider) {
      runs.push({
        x: indent,
        width: integer(random, 68, 190),
        shade: range(random, 0.26, 0.46),
        heightScale: range(random, 0.24, 0.42),
      });
    } else {
      let cursorX = indent;
      const promptMarks = random() < 0.24 ? integer(random, 1, 3) : 0;
      for (let mark = 0; mark < promptMarks; mark += 1) {
        runs.push({
          x: cursorX,
          width: integer(random, 3, 8),
          shade: range(random, 0.72, 0.96),
          heightScale: range(random, 0.38, 0.72),
        });
        cursorX += integer(random, 5, 10);
      }
      cursorX += promptMarks > 0 ? integer(random, 5, 14) : 0;
      const groupCount = integer(random, 2, 12);
      for (let index = 0; index < groupCount && cursorX < 238; index += 1) {
        const sparse = random() < 0.22;
        const width = integer(random, sparse ? 5 : 12, sparse ? 24 : 46);
        runs.push({
          x: cursorX,
          width: Math.min(width, 246 - cursorX),
          shade: range(random, 0.38, 0.92),
          heightScale: range(random, 0.42, 0.86),
        });
        cursorX += width + integer(random, sparse ? 8 : 4, sparse ? 22 : 13);
      }
    }
  }

  if (cursor) {
    runs.push({
      x: integer(random, 180, 238),
      width: integer(random, 4, 8),
      shade: 0.98,
      heightScale: 0.86,
    });
  }

  return { indent, runs, blank, cursor };
}

export function createTerminalRows(
  seed: number,
  count: number
): TerminalPatternRow[] {
  const random = createMulberry32(seed);
  return Array.from({ length: count }, () => createTerminalPatternRow(random));
}

export function fingerprintTerminalRows(rows: TerminalPatternRow[]): string {
  return rows
    .map((row) =>
      row.blank
        ? 'blank'
        : `${row.indent}:${row.runs
            .map((run) => `${Math.round(run.x)}-${Math.round(run.width)}`)
            .join(',')}:${row.cursor ? 'cursor' : 'idle'}`
    )
    .join('|');
}

function drawTerminalRows(
  context: CanvasRenderingContext2D,
  rows: TerminalPatternRow[],
  scrollOffset: number,
  width: number,
  height: number
): void {
  context.fillStyle = '#020202';
  context.fillRect(0, 0, width, height);
  const scaleX = width / TERMINAL_CANONICAL_WIDTH;
  const scaleY = height / TERMINAL_CANONICAL_HEIGHT;

  rows.forEach((row, index) => {
    const y = (index * ROW_HEIGHT - scrollOffset) * scaleY;
    if (y < -ROW_HEIGHT * scaleY || y > height) return;
    row.runs.forEach((run) => {
      const luminance = Math.round(120 + run.shade * 118);
      context.fillStyle = `rgb(${luminance}, ${luminance}, ${luminance})`;
      context.fillRect(
        run.x * scaleX,
        y + ROW_HEIGHT * scaleY * 0.22,
        run.width * scaleX,
        Math.max(1, ROW_HEIGHT * run.heightScale * scaleY)
      );
    });
  });
}

export function createTokenPlaceTerminalState(options: {
  seed: number;
  speed: number;
  phase: number;
  redrawFps: number;
  size: { width: number; height: number };
}): TokenPlaceTerminalState {
  const canvas = document.createElement('canvas');
  canvas.width = options.size.width;
  canvas.height = options.size.height;
  const context = canvas.getContext('2d');
  if (!context)
    throw new Error('Unable to create token.place terminal canvas.');

  const random = createMulberry32(options.seed);
  const rows = Array.from({ length: 28 }, () =>
    createTerminalPatternRow(random)
  );
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const state: TokenPlaceTerminalState = {
    texture,
    seed: options.seed,
    speed: options.speed,
    redrawInterval: 1 / options.redrawFps,
    rows,
    scrollOffset: options.phase,
    accumulator: 0,
    redrawAccumulator: 0,
    disposed: false,
    update(delta, animate) {
      if (!animate) return false;
      this.accumulator += Math.max(0, delta) * this.speed;
      this.redrawAccumulator += Math.max(0, delta);
      let advanced = false;
      while (this.accumulator >= ROW_HEIGHT) {
        this.accumulator -= ROW_HEIGHT;
        this.rows.shift();
        this.rows.push(createTerminalPatternRow(random));
        advanced = true;
      }
      this.scrollOffset = (options.phase + this.accumulator) % ROW_HEIGHT;
      if (this.redrawAccumulator >= this.redrawInterval || advanced) {
        this.redrawAccumulator %= this.redrawInterval;
        drawTerminalRows(
          context,
          this.rows,
          this.scrollOffset,
          canvas.width,
          canvas.height
        );
        this.texture.needsUpdate = true;
        return true;
      }
      return false;
    },
    fingerprint() {
      return fingerprintTerminalRows(this.rows);
    },
    dispose() {
      this.texture.dispose();
      this.disposed = true;
    },
  };

  drawTerminalRows(
    context,
    rows,
    state.scrollOffset,
    canvas.width,
    canvas.height
  );
  texture.needsUpdate = true;
  return state;
}

function createCollider(
  basePosition: Vector3,
  localCenter: { x: number; z: number },
  width: number,
  depth: number,
  rotation: number
): RectCollider {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const center = {
    x: basePosition.x + localCenter.x * cos - localCenter.z * sin,
    z: basePosition.z + localCenter.x * sin + localCenter.z * cos,
  };
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const corners = [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ];
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };
  corners.forEach((corner) => {
    const x = center.x + corner.x * cos - corner.z * sin;
    const z = center.z + corner.x * sin + corner.z * cos;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  });
  return bounds;
}

function addBox(
  parent: Group,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  material: MeshStandardMaterial | MeshBasicMaterial
): Mesh {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function createWorkstationMaterials() {
  return {
    wood: new MeshStandardMaterial({
      color: new Color(0x5a341d),
      roughness: 0.72,
    }),
    woodEdge: new MeshStandardMaterial({
      color: new Color(0x2f1d14),
      roughness: 0.68,
    }),
    charcoal: new MeshStandardMaterial({
      color: new Color(0x171b20),
      roughness: 0.5,
      metalness: 0.18,
    }),
    black: new MeshStandardMaterial({
      color: new Color(0x08090b),
      roughness: 0.55,
      metalness: 0.12,
    }),
    cushion: new MeshStandardMaterial({
      color: new Color(0x101318),
      roughness: 0.76,
    }),
    cyan: new MeshStandardMaterial({
      color: new Color(0x65d8ff),
      emissive: new Color(0x1d7892),
      emissiveIntensity: 0.42,
      roughness: 0.35,
    }),
    amber: new MeshStandardMaterial({
      color: new Color(0xffb457),
      emissive: new Color(0x6b3511),
      emissiveIntensity: 0.28,
      roughness: 0.45,
    }),
    screen: new MeshBasicMaterial({ color: 0xffffff }),
  };
}

export function createTokenPlaceWorkstation(
  options: TokenPlaceWorkstationOptions
): TokenPlaceWorkstationBuild {
  const { position, orientationRadians = 0 } = options;
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const detail = DETAILS[detailPolicy.level];
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);
  const group = new Group();
  group.name = 'TokenPlaceWorkstation';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const materials = createWorkstationMaterials();
  const desk = new Group();
  desk.name = 'TokenPlaceDesk';
  group.add(desk);
  addBox(
    desk,
    'TokenPlaceDeskTop',
    [DESK_WIDTH, DESK_TOP_THICKNESS, DESK_DEPTH],
    [0, DESK_HEIGHT, 0],
    materials.wood
  );
  addBox(
    desk,
    'TokenPlaceDeskFrontEdge',
    [DESK_WIDTH, 0.08, 0.08],
    [0, DESK_HEIGHT - 0.02, DESK_DEPTH / 2 - 0.02],
    materials.woodEdge
  );
  const legX = DESK_WIDTH / 2 - 0.14;
  const legZ = DESK_DEPTH / 2 - 0.13;
  [
    [-legX, -legZ],
    [legX, -legZ],
    [-legX, legZ],
    [legX, legZ],
  ].forEach(([x, z], index) => {
    addBox(
      desk,
      `TokenPlaceDeskLeg-${index}`,
      [0.09, DESK_HEIGHT, 0.09],
      [x, DESK_HEIGHT / 2, z],
      materials.charcoal
    );
  });
  addBox(
    desk,
    'TokenPlaceDeskCrossBrace',
    [DESK_WIDTH - 0.32, 0.055, 0.055],
    [0, 0.38, -legZ],
    materials.charcoal
  );
  if (detail.extraPolish) {
    addBox(
      desk,
      'TokenPlaceDeskCableGrommet',
      [0.16, 0.014, 0.16],
      [0.68, DESK_HEIGHT + 0.068, -0.3],
      materials.black
    );
    addBox(
      desk,
      'TokenPlaceDeskTokenAccent',
      [0.2, 0.018, 0.2],
      [-0.72, DESK_HEIGHT + 0.069, 0.34],
      materials.amber
    );
  }

  const tower = new Group();
  tower.name = 'TokenPlacePcTower';
  tower.position.set(-0.67, 0.39, 0.04);
  group.add(tower);
  addBox(
    tower,
    'TokenPlacePcTowerCase',
    [0.34, 0.72, 0.42],
    [0, 0, 0],
    materials.charcoal
  );
  addBox(
    tower,
    'TokenPlacePcTowerFrontPanel',
    [0.35, 0.64, 0.035],
    [0, 0.01, 0.229],
    materials.black
  );
  for (let index = 0; index < detail.vents; index += 1) {
    addBox(
      tower,
      `TokenPlacePcTowerVent-${index}`,
      [0.22, 0.018, 0.012],
      [0, -0.18 + index * 0.045, 0.252],
      materials.cyan
    );
  }
  addBox(
    tower,
    'TokenPlacePcTowerPowerIndicator',
    [0.05, 0.05, 0.014],
    [0.11, 0.25, 0.257],
    materials.amber
  );
  for (let index = 0; index < detail.fanRings; index += 1) {
    const fan = new Mesh(
      new CylinderGeometry(
        0.075 + index * 0.035,
        0.075 + index * 0.035,
        0.014,
        detail.cylinderSegments
      ),
      materials.cyan
    );
    fan.name = `TokenPlacePcTowerFanRing-${index}`;
    fan.rotation.x = Math.PI / 2;
    fan.position.set(-0.06, -0.25, 0.258);
    tower.add(fan);
  }

  const chair = new Group();
  chair.name = 'TokenPlaceGamingChair';
  chair.position.set(0.02, 0, 0.88);
  chair.rotation.y = -0.08;
  group.add(chair);
  addBox(
    chair,
    'TokenPlaceGamingChairSeat',
    [0.58, 0.16, 0.52],
    [0, 0.46, 0],
    materials.cushion
  );
  addBox(
    chair,
    'TokenPlaceGamingChairBack',
    [0.62, 0.86, 0.14],
    [0, 0.94, 0.22],
    materials.cushion
  );
  addBox(
    chair,
    'TokenPlaceGamingChairHeadrest',
    [0.42, 0.13, 0.16],
    [0, 1.28, 0.16],
    materials.black
  );
  addBox(
    chair,
    'TokenPlaceGamingChairLeftArm',
    [0.08, 0.1, 0.42],
    [-0.38, 0.66, -0.02],
    materials.charcoal
  );
  addBox(
    chair,
    'TokenPlaceGamingChairRightArm',
    [0.08, 0.1, 0.42],
    [0.38, 0.66, -0.02],
    materials.charcoal
  );
  const post = new Mesh(
    new CylinderGeometry(0.055, 0.055, 0.38, detail.cylinderSegments),
    materials.charcoal
  );
  post.name = 'TokenPlaceGamingChairCentralSupport';
  post.position.set(0, 0.24, 0);
  chair.add(post);
  for (let index = 0; index < detail.chairWheels; index += 1) {
    const angle = (index / detail.chairWheels) * Math.PI * 2;
    addBox(
      chair,
      `TokenPlaceGamingChairBaseArm-${index}`,
      [0.08, 0.055, 0.42],
      [Math.sin(angle) * 0.15, 0.08, Math.cos(angle) * 0.15],
      materials.charcoal
    ).rotation.y = angle;
    const wheel = new Mesh(
      new CylinderGeometry(0.055, 0.055, 0.045, detail.wheelSegments),
      materials.black
    );
    wheel.name = `TokenPlaceGamingChairWheel-${index}`;
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.sin(angle) * 0.34, 0.05, Math.cos(angle) * 0.34);
    chair.add(wheel);
  }

  const terminals: TokenPlaceTerminalState[] = [
    createTokenPlaceTerminalState({
      seed: 0x710ce001,
      speed: 22,
      phase: 1.5,
      redrawFps: detail.terminalFps,
      size: detail.terminalSize,
    }),
    createTokenPlaceTerminalState({
      seed: 0x710ce0f2,
      speed: 17.5,
      phase: 4.25,
      redrawFps: detail.terminalFps,
      size: detail.terminalSize,
    }),
  ];

  [-1, 1].forEach((side, index) => {
    const monitor = new Group();
    monitor.name = `TokenPlaceMonitor-${index}`;
    monitor.position.set(side * 0.34, DESK_HEIGHT + 0.42, -0.26);
    monitor.rotation.y = side * -0.14;
    group.add(monitor);
    addBox(
      monitor,
      `TokenPlaceMonitorBezel-${index}`,
      [0.58, 0.34, 0.045],
      [0, 0, 0],
      materials.black
    );
    const screen = new Mesh(
      new PlaneGeometry(0.5, 0.27),
      new MeshBasicMaterial({
        map: terminals[index].texture,
        toneMapped: false,
      })
    );
    screen.name = `TokenPlaceMonitorScreen-${index}`;
    screen.position.set(0, 0, 0.026);
    monitor.add(screen);
    addBox(
      monitor,
      `TokenPlaceMonitorStand-${index}`,
      [0.055, 0.34, 0.055],
      [0, -0.32, 0],
      materials.charcoal
    );
    addBox(
      monitor,
      `TokenPlaceMonitorBase-${index}`,
      [0.32, 0.045, 0.2],
      [0, -0.5, 0.04],
      materials.charcoal
    );
    if (detail.extraPolish) {
      addBox(
        monitor,
        `TokenPlaceMonitorBackVent-${index}`,
        [0.34, 0.055, 0.014],
        [0, 0.09, -0.033],
        materials.cyan
      );
    }
  });
  addBox(
    group,
    'TokenPlaceMonitorCableBundle',
    [0.08, 0.36, 0.08],
    [0, DESK_HEIGHT + 0.2, -0.32],
    materials.black
  );

  const keyboard = new Group();
  keyboard.name = 'TokenPlaceKeyboard';
  keyboard.position.set(0, DESK_HEIGHT + 0.1, 0.16);
  group.add(keyboard);
  addBox(
    keyboard,
    'TokenPlaceKeyboardBase',
    [0.74, 0.045, 0.24],
    [0, 0, 0],
    materials.black
  );
  for (let row = 0; row < detail.keyboardRows; row += 1) {
    for (let column = 0; column < detail.keyboardColumns; column += 1) {
      const keyWidth = detail.groupedKeys ? 0.09 : 0.042;
      addBox(
        keyboard,
        `TokenPlaceKeyboardKey-${row}-${column}`,
        [keyWidth, 0.018, 0.034],
        [
          (-detail.keyboardColumns / 2 + column + 0.5) * (keyWidth + 0.012),
          0.035,
          -0.075 + row * 0.052,
        ],
        materials.charcoal
      );
    }
  }
  addBox(
    group,
    'TokenPlaceMousePad',
    [0.34, 0.018, 0.26],
    [0.58, DESK_HEIGHT + 0.078, 0.16],
    materials.black
  );
  const mouse = new Mesh(
    new CylinderGeometry(0.065, 0.08, 0.12, detail.cylinderSegments),
    materials.charcoal
  );
  mouse.name = 'TokenPlaceMouse';
  mouse.scale.set(0.82, 0.42, 1);
  mouse.rotation.z = Math.PI / 2;
  mouse.position.set(0.58, DESK_HEIGHT + 0.125, 0.15);
  group.add(mouse);

  const colliders = [
    createCollider(
      basePosition,
      { x: 0, z: 0.02 },
      2.08,
      1.28,
      orientationRadians
    ),
    createCollider(
      basePosition,
      { x: 0.02, z: 0.88 },
      0.9,
      0.72,
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
    const animate = getPulseScale() > 0;
    terminals.forEach((terminal) => terminal.update(delta, animate));
  };

  return {
    group,
    colliders,
    terminals: terminals as [TokenPlaceTerminalState, TokenPlaceTerminalState],
    update,
    dispose() {
      terminals.forEach((terminal) => terminal.dispose());
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
