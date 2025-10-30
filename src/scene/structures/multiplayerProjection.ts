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
  transition: number;
  nextId: string;
  nextTitle: string;
}

interface TourDefinition {
  id: string;
  title: string;
  concurrentVisitors: number;
  region: string;
  latencyMs: number;
}

const TOUR_ROTATION: TourDefinition[] = [
  {
    id: 'atlantic-collab',
    title: 'Atlantic Collab Studio',
    concurrentVisitors: 128,
    region: 'NA-East',
    latencyMs: 74,
  },
  {
    id: 'aurora-showcase',
    title: 'Aurora Automation Walkthrough',
    concurrentVisitors: 96,
    region: 'EU-North',
    latencyMs: 112,
  },
  {
    id: 'pacific-lab',
    title: 'Pacific Lab Build Party',
    concurrentVisitors: 142,
    region: 'APAC-Singapore',
    latencyMs: 128,
  },
  {
    id: 'midnight-sprint',
    title: 'Midnight Sprint Retrospective',
    concurrentVisitors: 84,
    region: 'NA-West',
    latencyMs: 63,
  },
];

const TOTAL_ROTATION_SECONDS = 28;
const TEXTURE_REFRESH_INTERVAL = 0.12;
const SCAN_BAND_WIDTH = 0.16;

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

  context.font = '700 112px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(110, 240, 255, 0.95)';
  context.fillText(`${tour.concurrentVisitors} visitors`, 48, 280);

  context.font = '600 36px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(150, 230, 255, 0.8)';
  context.fillText(`Region: ${tour.region}`, 48, 330);
  context.fillText(`Median latency: ${tour.latencyMs} ms`, 48, 372);

  const progressWidth = canvas.width - 96;
  const progressHeight = 26;
  const remaining = 1 - MathUtils.clamp(transition, 0, 1);
  context.fillStyle = 'rgba(42, 98, 145, 0.8)';
  context.fillRect(48, 392, progressWidth, progressHeight);
  context.fillStyle = 'rgba(120, 248, 255, 0.9)';
  context.fillRect(48, 392, progressWidth * remaining, progressHeight);

  context.fillStyle = 'rgba(170, 235, 255, 0.75)';
  context.font = '600 34px "Inter", "Segoe UI", sans-serif';
  context.fillText('Next up', 48, 450);
  context.font = '600 40px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(205, 245, 255, 0.85)';
  context.fillText(`${nextTour.title} · ${nextTour.region}`, 48, 492);

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
    transition: 0,
    nextId: tours[1 % tours.length].id,
    nextTitle: tours[1 % tours.length].title,
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
      transition,
      nextId: tours[nextIndex].id,
      nextTitle: tours[nextIndex].title,
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
