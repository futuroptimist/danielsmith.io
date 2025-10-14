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

interface MediaWallTextures {
  screen: CanvasTexture;
  badge: CanvasTexture;
}

function createScreenTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create media wall screen context.');
  }

  context.save();
  context.fillStyle = '#0f1724';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const baseGradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  baseGradient.addColorStop(0, '#182a47');
  baseGradient.addColorStop(0.55, '#0f233c');
  baseGradient.addColorStop(1, '#192339');
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.6;
  const accentGradient = context.createLinearGradient(0, 0, canvas.width, 0);
  accentGradient.addColorStop(0, 'rgba(75, 217, 255, 0.8)');
  accentGradient.addColorStop(0.45, 'rgba(83, 146, 255, 0.35)');
  accentGradient.addColorStop(1, 'rgba(255, 82, 82, 0.6)');
  context.fillStyle = accentGradient;

  const accentX = canvas.width * 0.05;
  const accentY = canvas.height * 0.16;
  const accentWidth = canvas.width * 0.9;
  const accentHeight = canvas.height * 0.68;
  context.fillRect(accentX, accentY, accentWidth, accentHeight);
  context.globalAlpha = 1;

  const leftTextAnchor = canvas.width * 0.08;
  const headerY = canvas.height * 0.44;
  const platformY = canvas.height * 0.62;
  const taglineY = canvas.height * 0.74;
  const episodeY = canvas.height * 0.84;
  const rightTextAnchor = canvas.width * 0.92;

  context.fillStyle = '#ffffff';
  context.font = 'bold 180px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillText('Futuroptimist', leftTextAnchor, headerY);

  context.font = 'bold 120px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#ff4c4c';
  context.fillText('YouTube', leftTextAnchor, platformY);

  const tagline =
    'Designing resilient automation, live devlogs, and deep dives.';
  context.font = '48px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#dbe7ff';
  context.fillText(tagline, leftTextAnchor, taglineY);

  const latestEpisode = 'Latest Episode · Async Flywheel Blueprints';
  context.fillStyle = '#9ddcff';
  context.fillText(latestEpisode, leftTextAnchor, episodeY);

  context.font = '600 72px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'right';
  context.fillText('Watch now →', rightTextAnchor, episodeY);

  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
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
    screen: createScreenTexture(),
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

export interface LivingRoomMediaWallBuild {
  group: Group;
  colliders: RectCollider[];
  poiBindings: LivingRoomMediaWallPoiBindings;
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
    map: screen,
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
    opacity: 0.18,
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

  return { group, colliders, poiBindings };
}
