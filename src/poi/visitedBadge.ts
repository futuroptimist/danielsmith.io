import {
  CanvasTexture,
  DoubleSide,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

export interface PoiVisitedBadge {
  mesh: Mesh;
  material: MeshBasicMaterial;
  baseHeight: number;
  rotationSpeed: number;
}

export interface CreateVisitedBadgeOptions {
  baseHeight: number;
  width?: number;
  height?: number;
  rotationSpeedRange?: { min: number; max: number };
  random?: (min: number, max: number) => number;
}

export interface UpdateVisitedBadgeContext {
  elapsedTime: number;
  delta: number;
  visitedEmphasis: number;
  floatPhase: number;
}

function createVisitedBadgeTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to acquire 2D context for visited badge texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 220;

  context.fillStyle = 'rgba(10, 36, 24, 0.78)';
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.closePath();
  context.fill();

  context.strokeStyle = 'rgba(112, 244, 196, 0.42)';
  context.lineWidth = 28;
  context.beginPath();
  context.arc(centerX, centerY, radius * 0.92, 0, Math.PI * 2);
  context.stroke();

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = 'rgba(172, 255, 214, 0.95)';
  context.lineWidth = 42;
  context.beginPath();
  context.moveTo(centerX - 80, centerY - 8);
  context.lineTo(centerX - 22, centerY + 70);
  context.lineTo(centerX + 120, centerY - 90);
  context.stroke();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function createVisitedBadge(
  options: CreateVisitedBadgeOptions
): PoiVisitedBadge {
  const width = options.width ?? 0.9;
  const height = options.height ?? 0.9;
  const geometry = new PlaneGeometry(width, height);
  const texture = createVisitedBadgeTexture();
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
  });

  const mesh = new Mesh(geometry, material);
  mesh.name = 'POI_VisitedBadge';
  mesh.visible = false;
  mesh.renderOrder = 16;
  mesh.position.y = options.baseHeight;

  const range = options.rotationSpeedRange ?? { min: 0.55, max: 0.9 };
  const random = options.random ?? MathUtils.randFloat;
  const rotationSpeed = random(range.min, range.max);

  return {
    mesh,
    material,
    baseHeight: options.baseHeight,
    rotationSpeed,
  } satisfies PoiVisitedBadge;
}

export function updateVisitedBadge(
  badge: PoiVisitedBadge,
  context: UpdateVisitedBadgeContext
): void {
  const visited = MathUtils.clamp(context.visitedEmphasis, 0, 1);
  const bob = Math.sin(context.elapsedTime * 1.4 + context.floatPhase) * 0.12;
  const hoverLift = MathUtils.lerp(0, 0.24, visited);
  badge.mesh.position.y = badge.baseHeight + hoverLift + bob * visited;

  const scale = MathUtils.lerp(0.68, 0.95, visited);
  badge.mesh.scale.setScalar(scale);

  const opacity = MathUtils.lerp(0, 0.88, visited);
  badge.material.opacity = opacity;
  badge.mesh.visible = opacity > 0.035;

  if (context.delta > 0) {
    badge.mesh.rotation.y += badge.rotationSpeed * context.delta;
  }
}

export const _testables = {
  createVisitedBadgeTexture,
};
