import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

import {
  getFlickerScale,
  getPulseScale,
} from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';

export interface MultiplayerProjectionConfig {
  basePosition: Vector3;
  orientationRadians?: number;
  width?: number;
  depth?: number;
  screenHeight?: number;
}

export interface MultiplayerProjectionBuild {
  group: Group;
  collider: RectCollider;
  update(context: { elapsed: number; delta: number }): void;
  getCurrentTour(): MultiplayerProjectionTourSnapshot;
}

export interface MultiplayerProjectionTourSnapshot {
  id: string;
  title: string;
  concurrentVisitors: number;
  region: string;
  latencyMs: number;
  latencyP95Ms: number;
  host: string;
  transition: number;
  nextId: string;
  nextTitle: string;
  nextHost: string;
}

interface TourDefinition {
  id: string;
  title: string;
  concurrentVisitors: number;
  region: string;
  latencyMs: number;
  latencyP95Ms: number;
  host: string;
}

const TOUR_ROTATION: TourDefinition[] = [
  {
    id: 'atlantic-collab',
    title: 'Atlantic Collab Studio',
    concurrentVisitors: 128,
    region: 'NA-East',
    latencyMs: 74,
    latencyP95Ms: 118,
    host: 'Aveline (Automation)',
  },
  {
    id: 'aurora-showcase',
    title: 'Aurora Automation Walkthrough',
    concurrentVisitors: 96,
    region: 'EU-North',
    latencyMs: 112,
    latencyP95Ms: 168,
    host: 'Milo (Ops)',
  },
  {
    id: 'pacific-lab',
    title: 'Pacific Lab Build Party',
    concurrentVisitors: 142,
    region: 'APAC-Singapore',
    latencyMs: 128,
    latencyP95Ms: 186,
    host: 'Sana (Realtime)',
  },
  {
    id: 'midnight-sprint',
    title: 'Midnight Sprint Retrospective',
    concurrentVisitors: 84,
    region: 'NA-West',
    latencyMs: 63,
    latencyP95Ms: 104,
    host: 'Jules (Experience)',
  },
];

const TOTAL_ROTATION_SECONDS = 28;
const TEXTURE_REFRESH_INTERVAL = 0.12;
const SCAN_BAND_WIDTH = 0.16;
const LATENCY_PANEL_WIDTH = 168;
const LATENCY_PANEL_HEIGHT = 216;
const LATENCY_BAR_WIDTH = 44;
const MIN_LATENCY_BAR_HEIGHT = 10;
const LATENCY_MEDIAN_RANGE = 220;
const LATENCY_P95_RANGE = 320;

interface ProjectionTexture {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
}

function createProjectionTexture(): ProjectionTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create multiplayer projection texture context.');
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return { canvas, context, texture };
}

function renderProjection(
  texture: ProjectionTexture,
  tour: TourDefinition,
  nextTour: TourDefinition,
  transition: number,
  scanPhase: number,
  pulseScale: number
): void {
  const { canvas, context } = texture;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const background = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  background.addColorStop(0, 'rgba(14, 32, 58, 0.96)');
  background.addColorStop(1, 'rgba(22, 76, 126, 0.66)');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const header = 'Live showroom tours';
  context.fillStyle = 'rgba(170, 235, 255, 0.9)';
  context.font = '600 46px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.fillText(header, 48, 86);

  context.font = '700 80px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(255, 255, 255, 0.94)';
  context.fillText(tour.title, 48, 168);

  context.font = '700 108px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(110, 240, 255, 0.95)';
  context.fillText(`${tour.concurrentVisitors} visitors`, 48, 260);

  context.font = '600 36px "Inter", "Segoe UI", sans-serif';
  const hostLabel = `Host: ${tour.host}`;
  const hostPulse = MathUtils.lerp(
    0.32,
    0.72,
    MathUtils.clamp(pulseScale, 0, 1)
  );
  const hostHighlight = `rgba(32, 80, 118, ${hostPulse.toFixed(3)})`;
  const hostTextWidth =
    typeof context.measureText === 'function'
      ? Math.max(0, context.measureText(hostLabel).width)
      : hostLabel.length * 16;
  const hostBoxWidth = Math.max(0, hostTextWidth + 32);
  context.fillStyle = hostHighlight;
  context.fillRect(40, 276, hostBoxWidth, 44);
  context.fillStyle = 'rgba(160, 236, 255, 0.88)';
  context.fillText(hostLabel, 48, 310);

  context.fillStyle = 'rgba(150, 230, 255, 0.82)';
  context.fillText(`Region: ${tour.region}`, 48, 346);
  context.fillText(`Median latency: ${tour.latencyMs} ms`, 48, 382);
  context.fillText(`p95 latency: ${tour.latencyP95Ms} ms`, 48, 418);

  const progressWidth = canvas.width - 96;
  const progressHeight = 24;
  const remaining = 1 - MathUtils.clamp(transition, 0, 1);
  context.fillStyle = 'rgba(42, 98, 145, 0.8)';
  context.fillRect(48, 440, progressWidth, progressHeight);
  context.fillStyle = 'rgba(120, 248, 255, 0.9)';
  context.fillRect(48, 440, progressWidth * remaining, progressHeight);

  const nextLabel = `Next: ${nextTour.title} · Host: ${nextTour.host} · ${nextTour.region}`;
  const nextPulse = MathUtils.lerp(
    0.24,
    0.58,
    MathUtils.clamp(pulseScale, 0, 1)
  );
  context.fillStyle = `rgba(205, 245, 255, ${nextPulse.toFixed(3)})`;
  context.font = '600 32px "Inter", "Segoe UI", sans-serif';
  const nextTextWidth =
    typeof context.measureText === 'function'
      ? Math.max(0, context.measureText(nextLabel).width)
      : nextLabel.length * 14;
  const nextBoxWidth = Math.max(0, nextTextWidth + 28);
  context.fillRect(40, 450, nextBoxWidth, 40);
  context.fillStyle = 'rgba(230, 250, 255, 0.92)';
  context.fillText(nextLabel, 48, 482);

  const telemetryPanelX = canvas.width - LATENCY_PANEL_WIDTH - 48;
  const telemetryPanelY = 140;
  context.fillStyle = 'rgba(18, 52, 86, 0.78)';
  context.fillRect(
    telemetryPanelX,
    telemetryPanelY,
    LATENCY_PANEL_WIDTH,
    LATENCY_PANEL_HEIGHT
  );

  const medianBarX = telemetryPanelX + 20;
  const p95BarX = medianBarX + LATENCY_BAR_WIDTH + 20;
  const medianNormalized = MathUtils.clamp(
    tour.latencyMs / LATENCY_MEDIAN_RANGE,
    0,
    1
  );
  const p95Normalized = MathUtils.clamp(
    tour.latencyP95Ms / LATENCY_P95_RANGE,
    0,
    1
  );
  const medianHeight = Math.max(
    MIN_LATENCY_BAR_HEIGHT,
    LATENCY_PANEL_HEIGHT * medianNormalized
  );
  const p95Height = Math.max(
    MIN_LATENCY_BAR_HEIGHT,
    LATENCY_PANEL_HEIGHT * p95Normalized
  );
  const medianTop = telemetryPanelY + LATENCY_PANEL_HEIGHT - medianHeight;
  const p95Top = telemetryPanelY + LATENCY_PANEL_HEIGHT - p95Height;

  context.fillStyle = 'rgba(110, 240, 255, 0.88)';
  context.fillRect(medianBarX, medianTop, LATENCY_BAR_WIDTH, medianHeight);

  const p95Pulse = MathUtils.lerp(
    0.28,
    0.66,
    MathUtils.clamp(pulseScale, 0, 1)
  );
  context.fillStyle = `rgba(192, 168, 255, ${p95Pulse.toFixed(3)})`;
  context.fillRect(p95BarX, p95Top, LATENCY_BAR_WIDTH, p95Height);

  context.fillStyle = 'rgba(185, 235, 255, 0.8)';
  context.font = '600 28px "Inter", "Segoe UI", sans-serif';
  context.fillText('Latency (ms)', telemetryPanelX - 8, telemetryPanelY - 16);
  context.font = '600 26px "Inter", "Segoe UI", sans-serif';
  context.fillText(`${tour.latencyMs}`, medianBarX, medianTop - 12);
  context.fillText(`${tour.latencyP95Ms}`, p95BarX, p95Top - 12);
  context.font = '600 24px "Inter", "Segoe UI", sans-serif';
  context.fillText(
    'Median',
    medianBarX,
    telemetryPanelY + LATENCY_PANEL_HEIGHT + 24
  );
  context.fillText('p95', p95BarX, telemetryPanelY + LATENCY_PANEL_HEIGHT + 24);

  const scanWidth = canvas.width * SCAN_BAND_WIDTH;
  const scanX =
    MathUtils.euclideanModulo(scanPhase, 1) * (canvas.width + scanWidth) -
    scanWidth;
  const scanGradient = context.createLinearGradient(
    scanX,
    0,
    scanX + scanWidth,
    0
  );
  const highlightAlpha = 0.3 * pulseScale + 0.1;
  scanGradient.addColorStop(0, 'rgba(120, 248, 255, 0)');
  scanGradient.addColorStop(
    0.5,
    `rgba(120, 248, 255, ${highlightAlpha.toFixed(3)})`
  );
  scanGradient.addColorStop(1, 'rgba(120, 248, 255, 0)');
  context.fillStyle = scanGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

export function createMultiplayerProjection(
  config: MultiplayerProjectionConfig
): MultiplayerProjectionBuild {
  const width = config.width ?? 1.86;
  const depth = config.depth ?? 1.22;
  const screenHeight = config.screenHeight ?? 1.18;
  const orientation = config.orientationRadians ?? 0;
  const basePosition = config.basePosition.clone();

  const { canvas, context, texture } = createProjectionTexture();

  const group = new Group();
  group.name = 'BackyardMultiplayerProjection';
  group.position.copy(basePosition);
  group.rotation.y = orientation;

  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const orientationCos = Math.cos(orientation);
  const orientationSin = Math.sin(orientation);
  const extentX =
    Math.abs(orientationCos) * halfWidth + Math.abs(orientationSin) * halfDepth;
  const extentZ =
    Math.abs(orientationSin) * halfWidth + Math.abs(orientationCos) * halfDepth;

  const collider: RectCollider = {
    minX: basePosition.x - extentX,
    maxX: basePosition.x + extentX,
    minZ: basePosition.z - extentZ,
    maxZ: basePosition.z + extentZ,
  };

  const daisGeometry = new BoxGeometry(width, 0.16, depth);
  const daisMaterial = new MeshStandardMaterial({
    color: new Color(0x1f2930),
    roughness: 0.52,
    metalness: 0.34,
  });
  const dais = new Mesh(daisGeometry, daisMaterial);
  dais.name = 'MultiplayerProjectionDais';
  dais.position.y = 0.08;
  group.add(dais);

  const haloGeometry = new PlaneGeometry(width * 1.05, depth * 1.05);
  const haloMaterial = new MeshBasicMaterial({
    color: new Color(0x54d8ff),
    transparent: true,
    opacity: 0.42,
  });
  const halo = new Mesh(haloGeometry, haloMaterial);
  halo.name = 'MultiplayerProjectionHalo';
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.09;
  group.add(halo);

  const columnGeometry = new BoxGeometry(0.22, screenHeight, 0.18);
  const columnMaterial = new MeshStandardMaterial({
    color: new Color(0x2f3d46),
    roughness: 0.38,
    metalness: 0.42,
  });
  const column = new Mesh(columnGeometry, columnMaterial);
  column.name = 'MultiplayerProjectionColumn';
  column.position.set(0, screenHeight / 2 + 0.16, 0);
  group.add(column);

  const frameGeometry = new BoxGeometry(0.08, screenHeight * 1.2, depth * 0.92);
  const frameMaterial = new MeshStandardMaterial({
    color: new Color(0x375a68),
    roughness: 0.32,
    metalness: 0.68,
  });
  const frame = new Mesh(frameGeometry, frameMaterial);
  frame.name = 'MultiplayerProjectionFrame';
  frame.position.set(0.48, screenHeight / 2 + 0.22, 0);
  group.add(frame);

  const screenGeometry = new PlaneGeometry(1.62, screenHeight * 0.88);
  const screenMaterial = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.88,
    color: new Color(0xffffff),
  });
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.name = 'MultiplayerProjectionScreen';
  screen.position.set(0.54, screenHeight / 2 + 0.26, 0);
  screen.rotation.y = MathUtils.degToRad(-6);
  group.add(screen);

  const glowGeometry = new PlaneGeometry(1.66, screenHeight * 0.92);
  const glowMaterial = new MeshBasicMaterial({
    color: new Color(0x7feaff),
    transparent: true,
    opacity: 0.3,
  });
  const glow = new Mesh(glowGeometry, glowMaterial);
  glow.name = 'MultiplayerProjectionGlow';
  glow.position.copy(screen.position);
  glow.rotation.copy(screen.rotation);
  group.add(glow);

  const tours = TOUR_ROTATION;
  const perTourDuration = TOTAL_ROTATION_SECONDS / tours.length;
  let lastTextureUpdate = -TEXTURE_REFRESH_INTERVAL;
  let scanPhase = 0;
  let currentSnapshot: MultiplayerProjectionTourSnapshot = {
    id: tours[0].id,
    title: tours[0].title,
    concurrentVisitors: tours[0].concurrentVisitors,
    region: tours[0].region,
    latencyMs: tours[0].latencyMs,
    latencyP95Ms: tours[0].latencyP95Ms,
    host: tours[0].host,
    transition: 0,
    nextId: tours[1 % tours.length].id,
    nextTitle: tours[1 % tours.length].title,
    nextHost: tours[1 % tours.length].host,
  };

  const update = ({ elapsed, delta }: { elapsed: number; delta: number }) => {
    const pulseScale = getPulseScale();
    const flickerScale = getFlickerScale();

    const rotationPosition = MathUtils.euclideanModulo(
      elapsed / perTourDuration,
      tours.length
    );
    const activeIndex = Math.floor(rotationPosition);
    const nextIndex = (activeIndex + 1) % tours.length;
    const transition = rotationPosition - activeIndex;

    currentSnapshot = {
      id: tours[activeIndex].id,
      title: tours[activeIndex].title,
      concurrentVisitors: tours[activeIndex].concurrentVisitors,
      region: tours[activeIndex].region,
      latencyMs: tours[activeIndex].latencyMs,
      latencyP95Ms: tours[activeIndex].latencyP95Ms,
      host: tours[activeIndex].host,
      transition,
      nextId: tours[nextIndex].id,
      nextTitle: tours[nextIndex].title,
      nextHost: tours[nextIndex].host,
    };

    const opacityBase = 0.78;
    const opacityRange = 0.16 * pulseScale;
    screenMaterial.opacity =
      opacityBase + opacityRange * Math.sin(elapsed * 1.2);

    const glowBase = 0.22;
    const glowRange = 0.18 * pulseScale;
    glowMaterial.opacity = glowBase + glowRange * Math.sin(elapsed * 0.9 + 0.6);

    const haloBase = 0.38;
    const haloRange = 0.22 * flickerScale;
    haloMaterial.opacity =
      haloBase + haloRange * Math.max(0, Math.sin(elapsed * 1.6));

    scanPhase += delta * (0.4 + flickerScale * 0.8);

    if (elapsed - lastTextureUpdate >= TEXTURE_REFRESH_INTERVAL) {
      lastTextureUpdate = elapsed;
      renderProjection(
        { canvas, context, texture },
        tours[activeIndex],
        tours[nextIndex],
        transition,
        scanPhase,
        pulseScale
      );
      texture.needsUpdate = true;
    }
  };

  return {
    group,
    collider,
    update,
    getCurrentTour: () => currentSnapshot,
  };
}
