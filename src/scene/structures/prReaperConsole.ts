import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  RingGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';

export interface PrReaperConsoleBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface PrReaperConsoleOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
}

interface LogSurface {
  material: MeshBasicMaterial;
  axis: 'x' | 'y';
  speed: number;
  baseOpacity: number;
}

interface IncidentLogEntry {
  code: string;
  status: 'stable' | 'investigating' | 'escalated';
  summary: string;
}

interface SeveritySegment {
  material: MeshStandardMaterial;
  baseIntensity: number;
  baseOpacity: number;
  threshold: number;
}

interface CautionBeacon {
  coreMaterial: MeshStandardMaterial;
  halo: Mesh;
  haloMaterial: MeshBasicMaterial;
  baseIntensity: number;
  baseOpacity: number;
}

const INCIDENT_COLORS: Record<IncidentLogEntry['status'], string> = {
  stable: 'rgba(102, 212, 255, 0.92)',
  investigating: 'rgba(255, 198, 102, 0.95)',
  escalated: 'rgba(255, 112, 102, 0.95)',
};

const INCIDENT_SEVERITY: Record<IncidentLogEntry['status'], number> = {
  stable: 0.3,
  investigating: 0.65,
  escalated: 1,
};

function createIncidentLogTexture(entries: IncidentLogEntry[]): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create PR Reaper incident log texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const background = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  background.addColorStop(0, 'rgba(10, 22, 34, 0.92)');
  background.addColorStop(1, 'rgba(18, 40, 58, 0.88)');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(85, 207, 255, 0.22)';
  context.fillRect(
    canvas.width * 0.05,
    canvas.height * 0.09,
    canvas.width * 0.9,
    4
  );

  context.font = '600 48px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(158, 224, 255, 0.92)';
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillText(
    'Incident review queue',
    canvas.width * 0.08,
    canvas.height * 0.16
  );

  context.font = '500 30px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(112, 178, 220, 0.9)';
  context.fillText(
    'Auto-triage highlights • Recent Codex signals',
    canvas.width * 0.08,
    canvas.height * 0.22
  );

  const rowHeight = canvas.height * 0.14;
  const rowLeft = canvas.width * 0.06;
  const rowWidth = canvas.width * 0.88;
  entries.forEach((entry, index) => {
    const top = canvas.height * 0.26 + index * rowHeight;
    const bottom = top + rowHeight * 0.88;
    context.fillStyle =
      index % 2 === 0 ? 'rgba(20, 44, 68, 0.38)' : 'rgba(26, 56, 82, 0.42)';
    context.fillRect(rowLeft, top, rowWidth, bottom - top);

    context.fillStyle = INCIDENT_COLORS[entry.status];
    context.font = '600 38px "Inter", "Segoe UI", sans-serif';
    const badgeX = rowLeft + 24;
    const badgeY = top + (bottom - top) / 2 + 10;
    context.fillText(entry.code, badgeX, badgeY);

    context.font = '500 26px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = 'rgba(173, 219, 255, 0.86)';
    context.fillText(entry.summary, badgeX + 140, badgeY);

    context.font = '500 24px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = INCIDENT_COLORS[entry.status];
    context.textAlign = 'right';
    context.fillText(
      entry.status.toUpperCase(),
      rowLeft + rowWidth - 20,
      badgeY
    );
    context.textAlign = 'left';
  });

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createIncidentTickerTexture(messages: string[]): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create PR Reaper ticker texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, 'rgba(12, 32, 54, 0.92)');
  gradient.addColorStop(1, 'rgba(18, 52, 80, 0.85)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = '600 48px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(105, 223, 255, 0.94)';
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  const laneY = canvas.height / 2;
  const segment = canvas.width / Math.max(messages.length, 1);
  messages.forEach((message, index) => {
    const x = 24 + index * segment;
    context.fillText(message, x, laneY);
  });

  context.fillText(messages[0] ?? '', 24 + messages.length * segment, laneY);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
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

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  corners.forEach((corner) => {
    const worldX = center.x + corner.x * cos + corner.z * sin;
    const worldZ = center.z - corner.x * sin + corner.z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  });

  return { minX, maxX, minZ, maxZ };
}

function offsetLocal(
  base: Vector3,
  right: Vector3,
  forward: Vector3,
  offsetX: number,
  offsetZ: number
): Vector3 {
  return new Vector3(
    base.x + right.x * offsetX + forward.x * offsetZ,
    base.y,
    base.z + right.z * offsetX + forward.z * offsetZ
  );
}

export function createPrReaperConsole(
  options: PrReaperConsoleOptions
): PrReaperConsoleBuild {
  const { position, orientationRadians = 0 } = options;
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);

  const group = new Group();
  group.name = 'PrReaperConsole';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const right = new Vector3(
    Math.cos(orientationRadians),
    0,
    -Math.sin(orientationRadians)
  );
  const forward = new Vector3(
    Math.sin(orientationRadians),
    0,
    Math.cos(orientationRadians)
  );

  const colliders: RectCollider[] = [];
  const logSurfaces: LogSurface[] = [];
  const severitySegments: SeveritySegment[] = [];
  const cautionBeacons: CautionBeacon[] = [];

  const deckWidth = 2.6;
  const deckDepth = 1.6;
  const deckHeight = 0.18;
  const deckMaterial = new MeshStandardMaterial({
    color: new Color(0x101c28),
    roughness: 0.62,
    metalness: 0.24,
  });
  const deck = new Mesh(
    new BoxGeometry(deckWidth, deckHeight, deckDepth),
    deckMaterial
  );
  deck.name = 'PrReaperConsoleDeck';
  deck.position.y = deckHeight / 2;
  group.add(deck);

  const riserMaterial = new MeshStandardMaterial({
    color: new Color(0x17283a),
    emissive: new Color(0x123456),
    emissiveIntensity: 0.32,
    roughness: 0.44,
    metalness: 0.28,
  });
  const riser = new Mesh(new BoxGeometry(1.4, 0.24, 0.9), riserMaterial);
  riser.name = 'PrReaperConsoleRiser';
  riser.position.set(0, deckHeight + 0.12, -0.1);
  group.add(riser);

  const consoleBaseMaterial = new MeshStandardMaterial({
    color: new Color(0x1b2d3f),
    emissive: new Color(0x133a63),
    emissiveIntensity: 0.42,
    roughness: 0.38,
    metalness: 0.34,
  });
  const consoleBase = new Mesh(
    new BoxGeometry(1.24, 0.5, 0.62),
    consoleBaseMaterial
  );
  consoleBase.name = 'PrReaperConsoleBase';
  consoleBase.position.set(0, deckHeight + 0.5, -0.08);
  group.add(consoleBase);

  const consoleBridgeMaterial = new MeshStandardMaterial({
    color: new Color(0x1f3c56),
    emissive: new Color(0x1c83ff),
    emissiveIntensity: 0.58,
    roughness: 0.32,
    metalness: 0.28,
  });
  const consoleBridge = new Mesh(
    new BoxGeometry(1.26, 0.18, 0.68),
    consoleBridgeMaterial
  );
  consoleBridge.name = 'PrReaperConsoleBridge';
  consoleBridge.position.set(0, deckHeight + 0.94, -0.04);
  group.add(consoleBridge);

  const screenMaterial = new MeshStandardMaterial({
    color: new Color(0x0b1626),
    emissive: new Color(0x33aaff),
    emissiveIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.12,
  });
  const screen = new Mesh(new BoxGeometry(1.18, 0.9, 0.08), screenMaterial);
  screen.name = 'PrReaperConsoleScreen';
  screen.position.set(0, deckHeight + 1.4, 0.02);
  group.add(screen);

  const screenGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x4cd6ff),
    transparent: true,
    opacity: 0.38,
    side: DoubleSide,
  });
  const screenGlow = new Mesh(new PlaneGeometry(1.3, 1.08), screenGlowMaterial);
  screenGlow.name = 'PrReaperConsoleScreenGlow';
  screenGlow.position.set(0, screen.position.y, 0.08);
  group.add(screenGlow);

  const holoRingMaterial = new MeshStandardMaterial({
    color: new Color(0x102a40),
    emissive: new Color(0x33d7ff),
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.24,
  });
  const holoRing = new Mesh(
    new TorusGeometry(0.52, 0.04, 16, 64),
    holoRingMaterial
  );
  holoRing.name = 'PrReaperConsoleHologram';
  holoRing.rotation.x = Math.PI / 2;
  holoRing.position.set(0, deckHeight + 1.08, -0.36);
  group.add(holoRing);

  const sweepMaterial = new MeshBasicMaterial({
    color: new Color(0x55d1ff),
    transparent: true,
    opacity: 0.5,
    side: DoubleSide,
  });
  const sweep = new Mesh(new PlaneGeometry(1.02, 0.22), sweepMaterial);
  sweep.name = 'PrReaperConsoleSweep';
  sweep.position.copy(holoRing.position);
  sweep.rotation.x = Math.PI / 2;
  group.add(sweep);

  const severityDefinitions: Array<{
    color: number;
    emissive: number;
    threshold: number;
  }> = [
    { color: 0x1f7aff, emissive: 0x39c5ff, threshold: 0.25 },
    { color: 0xffc24f, emissive: 0xffd67f, threshold: 0.55 },
    { color: 0xff6b6b, emissive: 0xff8a8a, threshold: 0.85 },
  ];
  const severityRadius = 0.74;
  const severityThickness = 0.06;
  const segmentArc = Math.PI / 3.2;
  const segmentGap = Math.PI / 20;
  const totalArc =
    segmentArc * severityDefinitions.length +
    segmentGap * (severityDefinitions.length - 1);
  const segmentStart = -totalArc / 2;
  severityDefinitions.forEach((definition, index) => {
    const geometry = new RingGeometry(
      severityRadius - severityThickness,
      severityRadius,
      48,
      1,
      segmentStart + index * (segmentArc + segmentGap),
      segmentArc
    );
    const material = new MeshStandardMaterial({
      color: new Color(definition.color),
      emissive: new Color(definition.emissive),
      emissiveIntensity: 0.38 + index * 0.08,
      roughness: 0.38,
      metalness: 0.28,
      transparent: true,
      opacity: 0.32 + index * 0.04,
      side: DoubleSide,
    });
    const segment = new Mesh(geometry, material);
    segment.name = `PrReaperSeveritySegment-${index}`;
    segment.position.copy(holoRing.position);
    segment.position.y += 0.02;
    segment.rotation.x = Math.PI / 2;
    segment.renderOrder = 12 + index;
    group.add(segment);
    severitySegments.push({
      material,
      baseIntensity: material.emissiveIntensity ?? 0,
      baseOpacity: material.opacity ?? 0,
      threshold: definition.threshold,
    });
  });

  const logTableMaterial = new MeshStandardMaterial({
    color: new Color(0x233645),
    emissive: new Color(0x114488),
    emissiveIntensity: 0.36,
    roughness: 0.46,
    metalness: 0.26,
  });
  const logTable = new Mesh(new BoxGeometry(1.8, 0.12, 0.54), logTableMaterial);
  logTable.name = 'PrReaperConsoleLogTable';
  logTable.position.set(0, deckHeight + 0.36, -0.86);
  group.add(logTable);

  const incidentEntries: IncidentLogEntry[] = [
    {
      code: 'PR-187',
      status: 'investigating',
      summary: 'Codex queue spike flagged by console budget monitor.',
    },
    {
      code: 'INF-042',
      status: 'stable',
      summary: 'Telemetry sweep confirms guided tour reset is healthy.',
    },
    {
      code: 'OPS-311',
      status: 'escalated',
      summary: 'Nightly release triage stalled — awaiting maintainer signoff.',
    },
  ];
  const highestIncidentSeverity = incidentEntries.reduce((max, entry) => {
    return Math.max(max, INCIDENT_SEVERITY[entry.status]);
  }, 0);
  const logTexture = createIncidentLogTexture(incidentEntries);
  const logMaterial = new MeshBasicMaterial({
    map: logTexture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  logTexture.repeat.set(1, 1.1);
  const logPanel = new Mesh(new PlaneGeometry(1.18, 0.64), logMaterial);
  logPanel.name = 'PrReaperConsoleLogPanel';
  logPanel.position.set(0.12, deckHeight + 0.78, logTable.position.z + 0.04);
  logPanel.rotation.x = -Math.PI / 11;
  logPanel.rotation.y = Math.PI * 0.03;
  group.add(logPanel);
  logSurfaces.push({
    material: logMaterial,
    axis: 'y',
    speed: 0.055,
    baseOpacity: logMaterial.opacity,
  });

  const tickerTexture = createIncidentTickerTexture([
    '[ops] PR backlog triage sync running',
    '[alerts] 0 blocking incidents • 3 informational pings',
    '[automation] Codex pass rate steady at 99.4%',
  ]);
  const tickerMaterial = new MeshBasicMaterial({
    map: tickerTexture,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });
  tickerTexture.repeat.set(1.6, 1);
  const ticker = new Mesh(new PlaneGeometry(1.72, 0.18), tickerMaterial);
  ticker.name = 'PrReaperConsoleLogTicker';
  ticker.position.set(0, deckHeight + 0.5, logTable.position.z + 0.28);
  ticker.rotation.x = -Math.PI / 2.15;
  group.add(ticker);
  logSurfaces.push({
    material: tickerMaterial,
    axis: 'x',
    speed: 0.12,
    baseOpacity: tickerMaterial.opacity,
  });

  const intakeMaterial = new MeshStandardMaterial({
    color: new Color(0x182330),
    emissive: new Color(0x0f65ff),
    emissiveIntensity: 0.48,
    roughness: 0.38,
    metalness: 0.3,
  });
  const intake = new Mesh(
    new CylinderGeometry(0.22, 0.22, 0.18, 24),
    intakeMaterial
  );
  intake.name = 'PrReaperConsoleIntake';
  intake.rotation.x = Math.PI / 2;
  intake.position.copy(logTable.position).add(new Vector3(0, 0.12, -0.08));
  group.add(intake);

  const walkwayMaterial = new MeshStandardMaterial({
    color: new Color(0x0f171f),
    emissive: new Color(0x135c88),
    emissiveIntensity: 0.22,
    roughness: 0.7,
    metalness: 0.18,
  });
  const walkwayDepth = 0.7;
  const walkway = new Mesh(
    new BoxGeometry(1.6, 0.12, walkwayDepth),
    walkwayMaterial
  );
  walkway.name = 'PrReaperConsoleWalkway';
  walkway.position.set(0, 0.06, deckDepth / 2 + walkwayDepth / 2 - 0.12);
  group.add(walkway);

  const cautionMaterial = new MeshBasicMaterial({
    color: new Color(0xffc561),
    transparent: true,
    opacity: 0.6,
  });
  const cautionStrip = new Mesh(new PlaneGeometry(1.5, 0.14), cautionMaterial);
  cautionStrip.name = 'PrReaperConsoleCautionStrip';
  cautionStrip.rotation.x = -Math.PI / 2;
  cautionStrip.position.set(0, walkway.position.y + 0.07, walkway.position.z);
  group.add(cautionStrip);

  const beaconGeometry = new CylinderGeometry(0.16, 0.22, 0.46, 14);
  const beaconMaterial = new MeshStandardMaterial({
    color: new Color(0x132031),
    emissive: new Color(0x1f8cff),
    emissiveIntensity: 0.32,
    roughness: 0.42,
    metalness: 0.28,
  });
  const beaconHaloGeometry = new RingGeometry(0.28, 0.4, 40);
  const beaconHaloMaterial = new MeshBasicMaterial({
    color: new Color(0x5cd4ff),
    transparent: true,
    opacity: 0.36,
    side: DoubleSide,
  });
  const beaconForward = deckDepth / 2 + walkwayDepth - 0.05;
  const beaconOffsets = [-0.58, 0.58];
  beaconOffsets.forEach((offset, index) => {
    const center = offsetLocal(
      basePosition,
      right,
      forward,
      offset,
      beaconForward
    );
    const coreMaterial = beaconMaterial.clone();
    const beacon = new Mesh(beaconGeometry, coreMaterial);
    beacon.name = `PrReaperConsoleBeacon-${index}`;
    beacon.position.set(center.x, 0.23, center.z);
    group.add(beacon);

    const haloMaterial = beaconHaloMaterial.clone();
    const halo = new Mesh(beaconHaloGeometry, haloMaterial);
    halo.name = `PrReaperConsoleBeaconHalo-${index}`;
    halo.position.set(center.x, 0.48, center.z);
    halo.rotation.x = -Math.PI / 2;
    halo.renderOrder = 14 + index;
    group.add(halo);

    cautionBeacons.push({
      coreMaterial,
      halo,
      haloMaterial,
      baseIntensity: coreMaterial.emissiveIntensity ?? 0,
      baseOpacity: haloMaterial.opacity ?? 0,
    });
  });

  const deckCollider = createCollider(
    basePosition,
    deckWidth,
    deckDepth,
    orientationRadians
  );
  colliders.push(deckCollider);
  const walkwayOffset = deckDepth / 2 + walkwayDepth / 2 - 0.12;
  const walkwayCenter = offsetLocal(
    basePosition,
    right,
    forward,
    0,
    walkwayOffset
  );
  colliders.push(
    createCollider(walkwayCenter, 1.6, walkwayDepth, orientationRadians)
  );

  const update = ({
    elapsed,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    const clampedEmphasis = MathUtils.clamp(emphasis, 0, 1);
    const pulse = (Math.sin(elapsed * 2.2) + 1) / 2;
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const walkwayBase = MathUtils.lerp(
      0.2,
      0.68,
      Math.min(1, clampedEmphasis + 0.2)
    );
    const walkwayPulse =
      MathUtils.lerp(0, 0.42, pulseScale) * (0.45 + pulse * 0.55);
    walkwayMaterial.emissiveIntensity = walkwayBase + walkwayPulse;

    const cautionBase = MathUtils.lerp(0.38, 0.82, clampedEmphasis);
    const cautionPulse =
      MathUtils.lerp(0, 0.4, pulseScale) * (0.5 + pulse * 0.5);
    cautionMaterial.opacity = MathUtils.clamp(
      cautionBase + cautionPulse,
      0.2,
      0.95
    );
    const intensity = MathUtils.lerp(
      0.35,
      1.25,
      Math.min(1, clampedEmphasis + pulse * 0.55)
    );
    screenMaterial.emissiveIntensity = intensity;
    consoleBridgeMaterial.emissiveIntensity = MathUtils.lerp(
      0.4,
      1.1,
      Math.min(1, clampedEmphasis + pulse * 0.6)
    );
    holoRingMaterial.emissiveIntensity = MathUtils.lerp(
      0.45,
      1.2,
      Math.min(1, clampedEmphasis * 0.8 + pulse * 0.65)
    );
    intakeMaterial.emissiveIntensity = MathUtils.lerp(
      0.32,
      1.6,
      Math.min(1, clampedEmphasis + pulse * 0.8)
    );
    riserMaterial.emissiveIntensity = MathUtils.lerp(
      0.18,
      0.58,
      Math.min(1, clampedEmphasis * 0.7 + pulse * 0.4)
    );
    sweepMaterial.opacity = MathUtils.clamp(
      MathUtils.lerp(0.25, 0.85, clampedEmphasis) * (0.5 + pulse * 0.6),
      0.12,
      1
    );
    sweep.rotation.z = elapsed * MathUtils.lerp(1, 2.4, clampedEmphasis + 0.2);

    const severityLevel = highestIncidentSeverity;
    severitySegments.forEach((segment) => {
      const severityActivation = MathUtils.clamp(
        (severityLevel - segment.threshold) / 0.34,
        0,
        1
      );
      const severityBase =
        segment.baseIntensity +
        severityActivation * MathUtils.lerp(0.22, 0.82, clampedEmphasis);
      const pulseContribution =
        severityActivation *
        MathUtils.lerp(0, 0.62, pulseScale) *
        (0.5 + pulse * 0.5);
      segment.material.emissiveIntensity = Math.max(
        segment.baseIntensity,
        severityBase + pulseContribution
      );

      const baseOpacityTarget =
        segment.baseOpacity +
        severityActivation * MathUtils.lerp(0.1, 0.42, clampedEmphasis);
      const pulseOpacity =
        severityActivation *
        MathUtils.lerp(0, 0.22, pulseScale) *
        (0.4 + pulse * 0.6);
      segment.material.opacity = MathUtils.clamp(
        baseOpacityTarget + pulseOpacity,
        segment.baseOpacity * 0.85,
        1
      );
    });

    const logScrollScale = MathUtils.lerp(0.35, 1, pulseScale);
    logSurfaces.forEach((surface) => {
      const map = surface.material.map;
      if (map) {
        const offset = (elapsed * surface.speed * logScrollScale) % 1;
        if (surface.axis === 'x') {
          map.offset.x = 1 - offset;
        } else {
          map.offset.y = offset;
        }
      }

      const emphasisMix = Math.max(clampedEmphasis, pulseScale * 0.6);
      const brightness = 0.55 + pulse * 0.45;
      const targetOpacity = MathUtils.clamp(
        surface.baseOpacity + emphasisMix * 0.35 * brightness,
        surface.baseOpacity * 0.85,
        1
      );
      surface.material.opacity = targetOpacity;
    });

    cautionBeacons.forEach((beacon, index) => {
      const activation = MathUtils.clamp(
        clampedEmphasis + 0.25 + index * 0.08,
        0,
        1
      );
      const intensityBase =
        beacon.baseIntensity +
        MathUtils.lerp(0.22, 0.72, clampedEmphasis) * activation;
      const intensityPulse =
        MathUtils.lerp(0, 0.85, pulseScale) *
        (0.45 + pulse * 0.55) *
        activation;
      beacon.coreMaterial.emissiveIntensity = Math.max(
        beacon.baseIntensity,
        intensityBase + intensityPulse
      );

      const haloBase = beacon.baseOpacity + Math.min(1, activation) * 0.42;
      const haloPulse =
        MathUtils.lerp(0, 0.5, pulseScale) * (0.4 + pulse * 0.6) * activation;
      beacon.haloMaterial.opacity = MathUtils.clamp(
        haloBase + haloPulse,
        beacon.baseOpacity,
        1
      );

      const haloScale =
        1 +
        activation * 0.3 +
        MathUtils.lerp(0, 0.32, pulseScale) * (0.4 + pulse * 0.6);
      beacon.halo.scale.setScalar(haloScale);
      beacon.halo.rotation.z =
        elapsed * MathUtils.lerp(0.6, 1.3, Math.min(1, clampedEmphasis + 0.2));
    });
  };

  return { group, colliders, update };
}
