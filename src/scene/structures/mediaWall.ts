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
} from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../collision';

const SCREEN_WIDTH = 2048;
const SCREEN_HEIGHT = 1024;
const BASE_GLOW_OPACITY = 0.18;
const EMPHASISED_GLOW_OPACITY = 0.62;

export const DEFAULT_MEDIA_WALL_STAR_COUNT = 1280;

interface MediaWallScreenRendererOptions {
  starCount: number;
}

class MediaWallScreenRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private highlight = 0;
  private starCount: number;

  constructor(options: MediaWallScreenRendererOptions) {
    const canvas = document.createElement('canvas');
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to create media wall screen context.');
    }

    this.canvas = canvas;
    this.context = context;
    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.starCount = options.starCount;

    this.render();
  }

  getTexture(): CanvasTexture {
    return this.texture;
  }

  setStarCount(count: number) {
    if (!Number.isFinite(count) || count < 0) {
      this.starCount = 0;
    } else {
      this.starCount = count;
    }
    this.render();
  }

  updateHighlight(target: number) {
    const clamped = MathUtils.clamp(target, 0, 1);
    if (Math.abs(clamped - this.highlight) < 1e-4) {
      return;
    }
    this.highlight = clamped;
    this.render();
  }

  dispose() {
    this.texture.dispose();
  }

  private render() {
    this.context.save();
    this.context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    this.drawBase();
    this.drawStarHighlight();
    this.context.restore();
    this.texture.needsUpdate = true;
  }

  private drawBase() {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = '#0f1724';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const baseGradient = ctx.createLinearGradient(
      0,
      0,
      SCREEN_WIDTH,
      SCREEN_HEIGHT
    );
    baseGradient.addColorStop(0, '#182a47');
    baseGradient.addColorStop(0.55, '#0f233c');
    baseGradient.addColorStop(1, '#192339');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.globalAlpha = 0.6;
    const accentGradient = ctx.createLinearGradient(0, 0, SCREEN_WIDTH, 0);
    accentGradient.addColorStop(0, 'rgba(75, 217, 255, 0.8)');
    accentGradient.addColorStop(0.45, 'rgba(83, 146, 255, 0.35)');
    accentGradient.addColorStop(1, 'rgba(255, 82, 82, 0.6)');
    ctx.fillStyle = accentGradient;

    const accentX = SCREEN_WIDTH * 0.05;
    const accentY = SCREEN_HEIGHT * 0.16;
    const accentWidth = SCREEN_WIDTH * 0.9;
    const accentHeight = SCREEN_HEIGHT * 0.68;
    ctx.fillRect(accentX, accentY, accentWidth, accentHeight);
    ctx.globalAlpha = 1;

    const leftTextAnchor = SCREEN_WIDTH * 0.08;
    const headerY = SCREEN_HEIGHT * 0.44;
    const platformY = SCREEN_HEIGHT * 0.62;
    const taglineY = SCREEN_HEIGHT * 0.74;
    const episodeY = SCREEN_HEIGHT * 0.84;
    const rightTextAnchor = SCREEN_WIDTH * 0.92;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 180px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Futuroptimist', leftTextAnchor, headerY);

    ctx.font = 'bold 120px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ff4c4c';
    ctx.fillText('YouTube', leftTextAnchor, platformY);

    const tagline =
      'Designing resilient automation, live devlogs, and deep dives.';
    ctx.font = '48px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#dbe7ff';
    ctx.fillText(tagline, leftTextAnchor, taglineY);

    const latestEpisode = 'Latest Episode · Async Flywheel Blueprints';
    ctx.fillStyle = '#9ddcff';
    ctx.fillText(latestEpisode, leftTextAnchor, episodeY);

    ctx.font = '600 72px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText('Watch now →', rightTextAnchor, episodeY);
    ctx.restore();
  }

  private drawStarHighlight() {
    const ctx = this.context;
    const cardWidth = SCREEN_WIDTH * 0.26;
    const cardHeight = SCREEN_HEIGHT * 0.32;
    const cardX = SCREEN_WIDTH * 0.62;
    const cardY = SCREEN_HEIGHT * 0.18;
    const cardRadius = cardHeight * 0.16;

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(12, 26, 44, 0.82)';
    ctx.beginPath();
    const x = cardX;
    const y = cardY;
    const w = cardWidth;
    const h = cardHeight;
    const r = cardRadius;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();

    const glowStrength = 0.25 + this.highlight * 0.45;
    ctx.shadowColor = `rgba(74, 210, 255, ${glowStrength})`;
    ctx.shadowBlur = 120 * (0.35 + this.highlight * 0.55);
    ctx.fillStyle = `rgba(74, 210, 255, ${glowStrength})`;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const iconX = x + w * 0.16;
    const iconY = y + h * 0.48;
    const valueX = iconX + w * 0.12;
    const valueY = y + h * 0.68;
    const labelY = y + h * 0.86;

    ctx.fillStyle = '#ffdd63';
    ctx.font = 'bold 92px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('★', iconX, iconY);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 160px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(this.formatStarCount(), valueX, valueY);

    ctx.fillStyle = '#a7c5ff';
    ctx.font = '48px "Inter", "Segoe UI", sans-serif';
    ctx.fillText('GitHub stars', iconX, labelY);

    ctx.restore();
  }

  private formatStarCount(): string {
    if (this.starCount >= 1_000_000) {
      return `${(this.starCount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (this.starCount >= 1_000) {
      return `${(this.starCount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `${Math.round(this.starCount)}`;
  }
}

interface MediaWallTextures {
  screen: MediaWallScreenRenderer;
  badge: CanvasTexture;
}

function createScreenRenderer(): MediaWallScreenRenderer {
  return new MediaWallScreenRenderer({
    starCount: DEFAULT_MEDIA_WALL_STAR_COUNT,
  });
}

function createBadgeTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create media wall badge context.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const radius = 42;
  const badgeColor = '#ff0000';
  context.fillStyle = badgeColor;
  context.beginPath();
  context.moveTo(radius, 0);
  context.lineTo(canvas.width - radius, 0);
  context.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
  context.lineTo(canvas.width, canvas.height - radius);
  context.quadraticCurveTo(
    canvas.width,
    canvas.height,
    canvas.width - radius,
    canvas.height
  );
  context.lineTo(radius, canvas.height);
  context.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
  context.lineTo(0, radius);
  context.quadraticCurveTo(0, 0, radius, 0);
  context.closePath();
  context.fill();

  const playWidth = 120;
  const playHeight = 120;
  const playOriginX = canvas.width / 2 - playWidth / 4;
  const playOriginY = canvas.height / 2 - playHeight / 2;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(playOriginX, playOriginY);
  context.lineTo(playOriginX, playOriginY + playHeight);
  context.lineTo(canvas.width / 2 + playWidth / 2, canvas.height / 2);
  context.closePath();
  context.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function getMediaWallTextures(): MediaWallTextures {
  return {
    screen: createScreenRenderer(),
    badge: createBadgeTexture(),
  };
}

export interface LivingRoomMediaWallPoiBindings {
  futuroptimistTv: {
    screen: Mesh;
    screenMaterial: MeshBasicMaterial;
    glow: Mesh;
    glowMaterial: MeshBasicMaterial;
  };
}

export interface LivingRoomMediaWallController {
  update(options: { elapsed: number; delta: number; emphasis: number }): void;
  setStarCount(count: number): void;
  dispose(): void;
}

export interface LivingRoomMediaWallBuild {
  group: Group;
  colliders: RectCollider[];
  poiBindings: LivingRoomMediaWallPoiBindings;
  controller: LivingRoomMediaWallController;
}

interface MediaWallControllerOptions {
  screenRenderer: MediaWallScreenRenderer;
  glowMaterial: MeshBasicMaterial;
}

function createMediaWallController({
  screenRenderer,
  glowMaterial,
}: MediaWallControllerOptions): LivingRoomMediaWallController {
  let highlight = 0;
  return {
    update({ delta, emphasis }) {
      const target = MathUtils.clamp(emphasis, 0, 1);
      highlight = MathUtils.damp(highlight, target, 5.5, delta);
      const opacity = MathUtils.lerp(
        BASE_GLOW_OPACITY,
        EMPHASISED_GLOW_OPACITY,
        highlight
      );
      if (Math.abs(glowMaterial.opacity - opacity) > 1e-3) {
        glowMaterial.opacity = opacity;
        glowMaterial.needsUpdate = true;
      }
      screenRenderer.updateHighlight(highlight);
    },
    setStarCount(count) {
      screenRenderer.setStarCount(count);
    },
    dispose() {
      screenRenderer.dispose();
    },
  };
}

export function createLivingRoomMediaWall(
  bounds: Bounds2D
): LivingRoomMediaWallBuild {
  const group = new Group();
  group.name = 'LivingRoomMediaWall';
  const colliders: RectCollider[] = [];

  const wallInteriorX = bounds.minX + 0.12;
  const anchorZ = MathUtils.clamp(-14.2, bounds.minZ + 3, bounds.maxZ - 3);

  const boardWidth = 6.4;
  const boardHeight = 3.6;
  const boardDepth = 0.18;
  const boardMaterial = new MeshStandardMaterial({
    color: 0x141c26,
    roughness: 0.48,
    metalness: 0.16,
  });
  const boardGeometry = new BoxGeometry(boardDepth, boardHeight, boardWidth);
  const board = new Mesh(boardGeometry, boardMaterial);
  board.position.set(wallInteriorX + boardDepth / 2, 2.35, anchorZ);
  group.add(board);

  const trimMaterial = new MeshStandardMaterial({
    color: 0x1f2a3b,
    roughness: 0.35,
    metalness: 0.22,
  });
  const trimDepth = 0.12;
  const trimHeight = boardHeight + 0.2;
  const trimGeometry = new BoxGeometry(
    trimDepth,
    trimHeight,
    boardWidth + 0.24
  );
  const trim = new Mesh(trimGeometry, trimMaterial);
  trim.position.set(
    wallInteriorX + boardDepth / 2 - trimDepth / 2,
    2.35,
    anchorZ
  );
  group.add(trim);

  const { screen, badge } = getMediaWallTextures();

  const screenMaterial = new MeshBasicMaterial({
    map: screen.getTexture(),
    transparent: true,
    toneMapped: false,
  });
  const screenGeometry = new PlaneGeometry(
    boardWidth * 0.9,
    boardHeight * 0.68
  );
  const screenMesh = new Mesh(screenGeometry, screenMaterial);
  screenMesh.name = 'LivingRoomMediaWallScreen';
  screenMesh.position.set(wallInteriorX + boardDepth + 0.02, 2.36, anchorZ);
  screenMesh.rotation.y = Math.PI / 2;
  screenMesh.renderOrder = 10;
  group.add(screenMesh);

  const screenGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x3abfff),
    transparent: true,
    opacity: BASE_GLOW_OPACITY,
    toneMapped: false,
  });
  const screenGlowGeometry = new PlaneGeometry(
    boardWidth * 0.95,
    boardHeight * 0.74
  );
  const screenGlow = new Mesh(screenGlowGeometry, screenGlowMaterial);
  screenGlow.name = 'LivingRoomMediaWallGlow';
  screenGlow.position.set(wallInteriorX + boardDepth + 0.015, 2.36, anchorZ);
  screenGlow.rotation.y = Math.PI / 2;
  screenGlow.renderOrder = 9;
  group.add(screenGlow);

  const badgeMaterial = new MeshBasicMaterial({
    map: badge,
    transparent: true,
    toneMapped: false,
  });
  const badgeGeometry = new PlaneGeometry(1.4, 0.72);
  const badgeMesh = new Mesh(badgeGeometry, badgeMaterial);
  badgeMesh.name = 'LivingRoomMediaWallBadge';
  badgeMesh.position.set(
    wallInteriorX + boardDepth + 0.04,
    3.56,
    anchorZ + boardWidth * 0.32
  );
  badgeMesh.rotation.y = Math.PI / 2;
  badgeMesh.renderOrder = 11;
  group.add(badgeMesh);

  const shelfDepth = 0.58;
  const shelfWidth = boardWidth * 0.92;
  const shelfThickness = 0.12;
  const shelfMaterial = new MeshStandardMaterial({
    color: 0x1a212d,
    roughness: 0.4,
    metalness: 0.2,
  });
  const shelfGeometry = new BoxGeometry(shelfDepth, shelfThickness, shelfWidth);
  const shelf = new Mesh(shelfGeometry, shelfMaterial);
  shelf.position.set(
    wallInteriorX + boardDepth + shelfDepth / 2,
    shelfThickness / 2 + 0.46,
    anchorZ
  );
  group.add(shelf);

  const consoleMaterial = new MeshStandardMaterial({
    color: 0x0f1724,
    roughness: 0.55,
    metalness: 0.08,
  });
  const consoleHeight = 0.32;
  const consoleGeometry = new BoxGeometry(
    0.34,
    consoleHeight,
    shelfWidth * 0.72
  );
  const console = new Mesh(consoleGeometry, consoleMaterial);
  console.position.set(
    wallInteriorX + boardDepth + 0.22,
    0.46 + consoleHeight / 2,
    anchorZ
  );
  group.add(console);

  const soundbarGeometry = new BoxGeometry(0.16, 0.1, shelfWidth * 0.6);
  const soundbarMaterial = new MeshStandardMaterial({
    color: 0x111723,
    emissive: new Color(0x2a3550),
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.18,
  });
  const soundbar = new Mesh(soundbarGeometry, soundbarMaterial);
  soundbar.position.set(wallInteriorX + boardDepth + 0.28, 0.78, anchorZ);
  group.add(soundbar);

  const haloMaterial = new MeshStandardMaterial({
    color: new Color(0x1b2a3c),
    emissive: new Color(0x2d8cff),
    emissiveIntensity: 0.6,
    roughness: 0.28,
    metalness: 0.18,
  });
  const haloGeometry = new BoxGeometry(0.06, 0.24, shelfWidth * 0.85);
  const halo = new Mesh(haloGeometry, haloMaterial);
  halo.position.set(wallInteriorX + boardDepth + 0.37, 1.02, anchorZ);
  group.add(halo);

  colliders.push({
    minX: wallInteriorX + boardDepth,
    maxX: wallInteriorX + boardDepth + shelfDepth,
    minZ: anchorZ - shelfWidth / 2,
    maxZ: anchorZ + shelfWidth / 2,
  });

  const poiBindings: LivingRoomMediaWallPoiBindings = {
    futuroptimistTv: {
      screen: screenMesh,
      screenMaterial,
      glow: screenGlow,
      glowMaterial: screenGlowMaterial,
    },
  };

  const controller = createMediaWallController({
    screenRenderer: screen,
    glowMaterial: screenGlowMaterial,
  });
  controller.setStarCount(1280);

  return { group, colliders, poiBindings, controller };
}
