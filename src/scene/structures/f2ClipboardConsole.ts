import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  Texture,
  RepeatWrapping,
} from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';

export interface F2ClipboardConsoleBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface F2ClipboardConsoleOptions {
  position: { x: number; z: number; y?: number };
  orientationRadians?: number;
  deck?: {
    width?: number;
    depth?: number;
  };
}

interface FloatingLog {
  mesh: Mesh;
  baseHeight: number;
  baseRotation: number;
}

export function createF2ClipboardConsole(
  options: F2ClipboardConsoleOptions
): F2ClipboardConsoleBuild {
  const { position, orientationRadians = 0, deck } = options;
  const baseY = position.y ?? 0;
  const deckWidth = deck?.width ?? 2.4;
  const deckDepth = deck?.depth ?? 1.4;
  const deckHeight = 0.82;

  const group = new Group();
  group.name = 'F2ClipboardConsole';
  group.position.set(position.x, baseY, position.z);
  group.rotation.y = orientationRadians;

  const colliders: RectCollider[] = [];

  const daisRadius = Math.max(deckWidth, deckDepth) * 0.75;
  const daisHeight = 0.16;
  const daisGeometry = new CylinderGeometry(
    daisRadius,
    daisRadius,
    daisHeight,
    32
  );
  const daisMaterial = new MeshStandardMaterial({
    color: new Color(0x0f1a26),
    roughness: 0.52,
    metalness: 0.18,
  });
  const dais = new Mesh(daisGeometry, daisMaterial);
  dais.name = 'F2ClipboardDais';
  dais.position.set(0, daisHeight / 2, 0);
  group.add(dais);

  const daisGlowGeometry = new CylinderGeometry(
    daisRadius * 1.05,
    daisRadius * 1.05,
    0.01,
    48
  );
  const daisGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x4cc9ff),
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const daisGlow = new Mesh(daisGlowGeometry, daisGlowMaterial);
  daisGlow.name = 'F2ClipboardDaisGlow';
  daisGlow.position.set(0, daisHeight + 0.02, 0);
  group.add(daisGlow);

  const deckGeometry = new BoxGeometry(deckWidth, 0.14, deckDepth);
  const deckMaterial = new MeshStandardMaterial({
    color: new Color(0x121f2d),
    roughness: 0.46,
    metalness: 0.22,
  });
  const deckMesh = new Mesh(deckGeometry, deckMaterial);
  deckMesh.name = 'F2ClipboardDeck';
  deckMesh.position.set(0, deckHeight + 0.07, 0);
  group.add(deckMesh);

  const supportGeometry = new CylinderGeometry(0.12, 0.12, deckHeight, 16);
  const supportMaterial = new MeshStandardMaterial({
    color: new Color(0x0c161f),
    roughness: 0.48,
    metalness: 0.24,
  });
  const support = new Mesh(supportGeometry, supportMaterial);
  support.name = 'F2ClipboardSupport';
  support.position.set(0, deckHeight / 2, 0);
  group.add(support);

  const consoleGeometry = new BoxGeometry(
    deckWidth * 0.7,
    0.18,
    deckDepth * 0.6
  );
  const consoleMaterial = new MeshStandardMaterial({
    color: new Color(0x182a3a),
    roughness: 0.5,
    metalness: 0.2,
  });
  const console = new Mesh(consoleGeometry, consoleMaterial);
  console.name = 'F2ClipboardConsoleTop';
  console.position.set(0, deckHeight + 0.18 / 2 + 0.04, 0);
  group.add(console);

  const screenTexture = createConsoleScreenTexture();
  const screenMaterial = new MeshBasicMaterial({
    map: screenTexture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const screenGeometry = new PlaneGeometry(deckWidth * 0.86, deckDepth * 0.58);
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.name = 'F2ClipboardScreen';
  screen.rotation.x = -Math.PI / 2.2;
  screen.position.set(0, deckHeight + 0.18, -deckDepth * 0.12);
  screen.renderOrder = 12;
  group.add(screen);

  const screenGlowGeometry = new PlaneGeometry(
    deckWidth * 0.9,
    deckDepth * 0.62
  );
  const screenGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x5ad7ff),
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const screenGlow = new Mesh(screenGlowGeometry, screenGlowMaterial);
  screenGlow.name = 'F2ClipboardScreenGlow';
  screenGlow.rotation.copy(screen.rotation);
  screenGlow.position.copy(screen.position).setY(screen.position.y + 0.01);
  screenGlow.renderOrder = 11;
  group.add(screenGlow);

  const hologramGroup = new Group();
  hologramGroup.name = 'F2ClipboardHologramGroup';
  hologramGroup.position.set(0, deckHeight + 0.54, deckDepth * 0.16);
  group.add(hologramGroup);

  const beamGeometry = new CylinderGeometry(0.12, 0.12, 0.8, 24);
  const beamMaterial = new MeshStandardMaterial({
    color: new Color(0x1f6bff),
    emissive: new Color(0x62d7ff),
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.9,
  });
  const beam = new Mesh(beamGeometry, beamMaterial);
  beam.name = 'F2ClipboardBeam';
  beam.position.set(0, 0.36, 0);
  hologramGroup.add(beam);

  const ringGeometry = new RingGeometry(0.4, 0.6, 64, 1);
  const ringMaterial = new MeshBasicMaterial({
    color: new Color(0x7be3ff),
    transparent: true,
    opacity: 0.16,
    side: DoubleSide,
    depthWrite: false,
  });
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.name = 'F2ClipboardRing';
  ring.rotation.x = Math.PI / 2;
  hologramGroup.add(ring);

  const tickerTexture = createTickerTexture();
  tickerTexture.wrapS = RepeatWrapping;
  tickerTexture.wrapT = RepeatWrapping;
  tickerTexture.repeat.set(2, 1);
  const tickerMaterial = new MeshBasicMaterial({
    map: tickerTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const tickerGeometry = new PlaneGeometry(1.4, 0.42);
  const ticker = new Mesh(tickerGeometry, tickerMaterial);
  ticker.name = 'F2ClipboardTicker';
  ticker.position.set(0, 0.05, 0);
  ticker.renderOrder = 13;
  hologramGroup.add(ticker);

  const floatingLogs: FloatingLog[] = [];
  const logEntries: Array<{ title: string; status: string }> = [
    { title: 'Incident 204', status: 'SLA recovered · 00:32' },
    { title: 'Triage queue', status: '3 items → clipboard' },
    { title: 'Codex sync', status: 'Diff summarized ✓' },
  ];
  logEntries.forEach((entry, index) => {
    const texture = createLogCardTexture(entry.title, entry.status);
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const geometry = new PlaneGeometry(0.68, 0.34);
    const log = new Mesh(geometry, material);
    log.name = `F2ClipboardLogCard-${index}`;
    log.position.set(0, 0.22 + index * 0.16, 0.22 + index * 0.12);
    log.rotation.y = Math.PI * 0.35 * (index % 2 === 0 ? 1 : -1);
    log.renderOrder = 14 + index;
    hologramGroup.add(log);
    floatingLogs.push({
      mesh: log,
      baseHeight: log.position.y,
      baseRotation: log.rotation.y,
    });
  });

  const haloGeometry = new RingGeometry(0.75, 0.95, 64, 1);
  const haloMaterial = new MeshBasicMaterial({
    color: new Color(0x46baff),
    transparent: true,
    opacity: 0.1,
    side: DoubleSide,
    depthWrite: false,
  });
  const halo = new Mesh(haloGeometry, haloMaterial);
  halo.name = 'F2ClipboardHalo';
  halo.rotation.x = Math.PI / 2;
  halo.position.y = daisHeight + 0.01;
  group.add(halo);

  colliders.push(
    createRectCollider({
      center: { x: position.x, z: position.z },
      rotation: orientationRadians,
      width: deckWidth + 0.6,
      depth: deckDepth + 0.6,
    })
  );

  let tickerOffset = 0;
  let logPhase = 0;

  function update(context: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) {
    const smoothing =
      context.delta > 0 ? 1 - Math.exp(-context.delta * 4.2) : 1;
    const emphasis = MathUtils.clamp(context.emphasis, 0, 1);
    const pulseScale = getPulseScale();

    screenMaterial.opacity = MathUtils.lerp(
      screenMaterial.opacity,
      MathUtils.lerp(0.62, 0.95, emphasis),
      smoothing
    );
    screenGlowMaterial.opacity = MathUtils.lerp(
      screenGlowMaterial.opacity,
      MathUtils.lerp(0.04, 0.28, emphasis),
      smoothing
    );

    daisGlowMaterial.opacity = MathUtils.lerp(
      daisGlowMaterial.opacity,
      MathUtils.lerp(0.08, 0.32, emphasis) * pulseScale,
      smoothing
    );

    const beamTarget =
      MathUtils.lerp(0.4, 1.6, emphasis) * MathUtils.lerp(0.35, 1, pulseScale);
    beamMaterial.emissiveIntensity = MathUtils.lerp(
      beamMaterial.emissiveIntensity,
      beamTarget,
      smoothing
    );

    const tickerTarget =
      MathUtils.lerp(0.16, 0.82, emphasis) *
      MathUtils.lerp(0.25, 1, pulseScale);
    tickerMaterial.opacity = MathUtils.lerp(
      tickerMaterial.opacity,
      tickerTarget,
      smoothing
    );

    const tickerSpeed = MathUtils.lerp(0.05, 0.32, emphasis);
    tickerOffset = (tickerOffset - context.delta * tickerSpeed + 10) % 1;
    const map = tickerMaterial.map as Texture | null;
    if (map) {
      map.offset.x = tickerOffset;
      map.needsUpdate = true;
    }

    logPhase += context.delta * MathUtils.lerp(0.4, 1.3, emphasis);

    floatingLogs.forEach((log, index) => {
      const mesh = log.mesh;
      const material = mesh.material as MeshBasicMaterial;
      const hoverAmount = Math.sin(logPhase + index * 0.9) * 0.1 * pulseScale;
      mesh.position.y = MathUtils.lerp(
        mesh.position.y,
        log.baseHeight + hoverAmount,
        smoothing
      );
      const targetRotation = log.baseRotation + logPhase * 0.25;
      mesh.rotation.y = MathUtils.lerp(
        mesh.rotation.y,
        targetRotation,
        smoothing
      );
      material.opacity = MathUtils.lerp(
        material.opacity,
        MathUtils.lerp(0.14, 0.66, emphasis),
        smoothing
      );
    });

    hologramGroup.rotation.y +=
      context.delta * MathUtils.lerp(0.18, 0.82, emphasis);
    ringMaterial.opacity = MathUtils.lerp(
      ringMaterial.opacity,
      MathUtils.lerp(0.1, 0.3, emphasis),
      smoothing
    );
    haloMaterial.opacity = MathUtils.lerp(
      haloMaterial.opacity,
      MathUtils.lerp(0.06, 0.22, emphasis) * pulseScale,
      smoothing
    );
  }

  return {
    group,
    colliders,
    update,
  };
}

function createConsoleScreenTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create f2clipboard screen texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const background = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  background.addColorStop(0, '#0b1a2a');
  background.addColorStop(1, '#11253b');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#7ee9ff';
  context.font = 'bold 120px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText('f2clipboard', 70, 56);

  context.font = '52px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#b7f3ff';
  context.fillText('Incident digest pipeline', 70, 180);

  context.font = '42px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#8ad4ff';
  const bullets = [
    'Tail logs → summarise in Markdown',
    'Copy to clipboard in 3 seconds',
    'Annotate follow-up actions automatically',
  ];
  bullets.forEach((line, index) => {
    const y = 260 + index * 80;
    context.fillText(`• ${line}`, 90, y);
  });

  context.fillStyle = '#ffffff';
  context.font = 'bold 64px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'right';
  context.fillText('⌘ + ⇧ + C', canvas.width - 80, canvas.height - 120);
  context.font = '36px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#9edfff';
  context.fillText('Clipboard primed', canvas.width - 80, canvas.height - 70);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createTickerTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create f2clipboard ticker texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(12, 24, 36, 0.9)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = 'bold 92px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#6fe4ff';
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  const messages = [
    'Queue synced',
    'Clipboard primed',
    'Incident resolved',
    'Codex summary ready',
  ];
  const spacing = canvas.width / messages.length;
  messages.forEach((message, index) => {
    context.fillText(message, 40 + spacing * index, canvas.height / 2);
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createLogCardTexture(title: string, status: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create f2clipboard log texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.fillStyle = 'rgba(10, 28, 42, 0.88)';
  context.strokeStyle = 'rgba(87, 213, 255, 0.65)';
  context.lineWidth = 4;
  roundRect(context, 24, 24, canvas.width - 48, canvas.height - 48, 28);
  context.fill();
  context.stroke();
  context.restore();

  context.fillStyle = '#e4f9ff';
  context.font = '700 84px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText(title, 48, 60);

  context.fillStyle = '#a1e8ff';
  context.font = '48px "Inter", "Segoe UI", sans-serif';
  context.fillText(status, 48, 152);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function createRectCollider(options: {
  center: { x: number; z: number };
  width: number;
  depth: number;
  rotation: number;
}): RectCollider {
  const halfWidth = options.width / 2;
  const halfDepth = options.depth / 2;
  const corners = [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ];

  const cos = Math.cos(options.rotation);
  const sin = Math.sin(options.rotation);

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const corner of corners) {
    const worldX = options.center.x + corner.x * cos - corner.z * sin;
    const worldZ = options.center.z + corner.x * sin + corner.z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  }

  return {
    minX,
    maxX,
    minZ,
    maxZ,
  };
}
