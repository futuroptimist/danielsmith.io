import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

import type { RectCollider } from '../collision';
import type { Bounds2D } from '../floorPlan';

interface MediaWallTextures {
  center: CanvasTexture;
  left: CanvasTexture;
  right: CanvasTexture;
  badge: CanvasTexture;
}

function createEditingSuiteTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create media wall screen context.');
  }

  context.save();
  context.fillStyle = '#091421';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const background = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  background.addColorStop(0, '#13243b');
  background.addColorStop(1, '#0b1728');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const previewWidth = canvas.width * 0.38;
  const previewHeight = canvas.height * 0.52;
  const previewX = canvas.width * 0.06;
  const previewY = canvas.height * 0.18;

  const previewGradient = context.createLinearGradient(
    previewX,
    previewY,
    previewX + previewWidth,
    previewY + previewHeight
  );
  previewGradient.addColorStop(0, '#1f4d6e');
  previewGradient.addColorStop(1, '#10263b');
  context.fillStyle = previewGradient;
  context.fillRect(previewX, previewY, previewWidth, previewHeight);

  context.strokeStyle = 'rgba(151, 229, 255, 0.8)';
  context.lineWidth = 6;
  context.strokeRect(
    previewX + 8,
    previewY + 8,
    previewWidth - 16,
    previewHeight - 16
  );

  context.fillStyle = 'rgba(255, 255, 255, 0.72)';
  context.font = '600 86px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.fillText('Futuroptimist Episode Edit', previewX, previewY - 36);

  context.fillStyle = '#83e8ff';
  context.font = '48px "Inter", "Segoe UI", sans-serif';
  context.fillText(
    'Scene: Rocket telemetry breakdown',
    previewX,
    previewY + previewHeight + 70
  );

  const timelineY = canvas.height * 0.78;
  const timelineHeight = canvas.height * 0.16;
  context.fillStyle = '#0b1e30';
  context.fillRect(
    canvas.width * 0.04,
    timelineY,
    canvas.width * 0.92,
    timelineHeight
  );

  context.fillStyle = '#16324b';
  const clipCount = 6;
  const clipWidth = (canvas.width * 0.92 - 60) / clipCount;
  for (let i = 0; i < clipCount; i += 1) {
    const clipX = canvas.width * 0.04 + 30 + i * clipWidth;
    const clipHeight = timelineHeight * (0.35 + (i % 2) * 0.2);
    const clipY = timelineY + timelineHeight * 0.5 - clipHeight / 2;
    context.fillRect(clipX, clipY, clipWidth * 0.86, clipHeight);
  }

  const playheadX = canvas.width * 0.52;
  context.strokeStyle = '#ff6f61';
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(playheadX, timelineY - 12);
  context.lineTo(playheadX, timelineY + timelineHeight + 12);
  context.stroke();

  context.fillStyle = '#ffb347';
  context.font = '46px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.fillText('02:14 / 07:52', playheadX, timelineY - 34);

  const metadataX = canvas.width * 0.48;
  const metadataY = canvas.height * 0.24;
  const metadataWidth = canvas.width * 0.46;
  const metadataHeight = canvas.height * 0.42;
  context.fillStyle = 'rgba(15, 35, 54, 0.9)';
  context.fillRect(metadataX, metadataY, metadataWidth, metadataHeight);

  context.fillStyle = '#7ff0ff';
  context.font = '56px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.fillText('Automation Notes', metadataX + 36, metadataY + 72);

  context.font = '44px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#d6f4ff';
  const notes = [
    '• Flywheel triggers smoke + docs + lint',
    '• token.place rack lights sync to render queue',
    '• Gabriel sentry clears studio before launch',
  ];
  notes.forEach((line, index) => {
    context.fillText(line, metadataX + 36, metadataY + 140 + index * 96);
  });

  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createTelemetryTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create telemetry texture.');
  }

  context.fillStyle = '#08121f';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gridSpacing = 64;
  context.strokeStyle = 'rgba(120, 180, 255, 0.15)';
  context.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += gridSpacing) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += gridSpacing) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  context.strokeStyle = '#62e5ff';
  context.lineWidth = 6;
  context.beginPath();
  const points = 12;
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const x = canvas.width * (0.08 + t * 0.84);
    const y = canvas.height * (0.7 - Math.sin(t * Math.PI * 1.4) * 0.32);
    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();

  context.fillStyle = '#ff6f61';
  context.beginPath();
  context.arc(canvas.width * 0.82, canvas.height * 0.28, 40, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#a6f2ff';
  context.font = 'bold 88px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.fillText(
    'Cluster Telemetry',
    canvas.width * 0.08,
    canvas.height * 0.18
  );

  context.font = '58px "Inter", "Segoe UI", sans-serif';
  const metrics = [
    'Render queue: 3 pending',
    'Pi temps: 48°C avg',
    'Bandwidth: 1.4 Gbps burst',
  ];
  metrics.forEach((line, index) => {
    context.fillText(
      line,
      canvas.width * 0.08,
      canvas.height * (0.32 + index * 0.12)
    );
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createStoryboardTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create storyboard texture.');
  }

  context.fillStyle = '#0b1625';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const columns = 3;
  const rows = 2;
  const padding = 32;
  const cellWidth = (canvas.width - padding * (columns + 1)) / columns;
  const cellHeight = (canvas.height - padding * (rows + 1)) / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = padding + col * (cellWidth + padding);
      const y = padding + row * (cellHeight + padding);
      const gradient = context.createLinearGradient(
        x,
        y,
        x + cellWidth,
        y + cellHeight
      );
      gradient.addColorStop(0, '#1e3d5a');
      gradient.addColorStop(1, '#102439');
      context.fillStyle = gradient;
      context.fillRect(x, y, cellWidth, cellHeight);

      context.strokeStyle = 'rgba(146, 222, 255, 0.7)';
      context.lineWidth = 6;
      context.strokeRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);

      context.fillStyle = '#ffffff';
      context.font = 'bold 48px "Inter", "Segoe UI", sans-serif';
      context.textAlign = 'left';
      context.fillText(`Shot ${row * columns + col + 1}`, x + 24, y + 64);
    }
  }

  context.fillStyle = '#8ae1ff';
  context.font = '64px "Inter", "Segoe UI", sans-serif';
  context.fillText('Storyboard · Launch Day', padding, canvas.height - 48);

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
    center: createEditingSuiteTexture(),
    left: createTelemetryTexture(),
    right: createStoryboardTexture(),
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
  group.name = 'LivingRoomCreatorDesk';
  const colliders: RectCollider[] = [];

  const wallInteriorX = bounds.minX + 0.12;
  const anchorZ = MathUtils.clamp(-14.2, bounds.minZ + 3, bounds.maxZ - 3);

  const textures = getMediaWallTextures();

  const matGeometry = new PlaneGeometry(3.8, 2.8);
  const matMaterial = new MeshStandardMaterial({
    color: 0x0f1826,
    roughness: 0.85,
    metalness: 0.06,
  });
  const mat = new Mesh(matGeometry, matMaterial);
  mat.name = 'CreatorDeskMat';
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(wallInteriorX + 1.7, 0.01, anchorZ);
  group.add(mat);

  const deskDepth = 1.52;
  const deskWidth = 3.2;
  const deskThickness = 0.12;
  const deskHeight = 0.9;

  const deskMaterial = new MeshStandardMaterial({
    color: 0x1a2433,
    roughness: 0.42,
    metalness: 0.24,
  });
  const deskGeometry = new BoxGeometry(deskDepth, deskThickness, deskWidth);
  const deskTop = new Mesh(deskGeometry, deskMaterial);
  deskTop.name = 'CreatorDeskTop';
  deskTop.position.set(
    wallInteriorX + deskDepth / 2,
    deskHeight + deskThickness / 2,
    anchorZ
  );
  group.add(deskTop);

  const legGeometry = new BoxGeometry(0.16, deskHeight, 0.16);
  const legMaterial = new MeshStandardMaterial({
    color: 0x101923,
    roughness: 0.38,
    metalness: 0.2,
  });
  const legOffsetX = deskDepth / 2 - 0.18;
  const legOffsetZ = deskWidth / 2 - 0.24;
  const legAnchors: Array<[number, number]> = [
    [-legOffsetX, -legOffsetZ],
    [legOffsetX, -legOffsetZ],
    [-legOffsetX, legOffsetZ],
    [legOffsetX, legOffsetZ],
  ];
  legAnchors.forEach(([offsetX, offsetZ], index) => {
    const leg = new Mesh(legGeometry, legMaterial);
    leg.name = `CreatorDeskLeg-${index}`;
    leg.position.set(offsetX, deskHeight / 2, offsetZ);
    deskTop.add(leg);
  });

  const supportGeometry = new BoxGeometry(deskDepth * 0.86, 0.08, 0.2);
  const supportMaterial = new MeshStandardMaterial({
    color: 0x152033,
    roughness: 0.5,
    metalness: 0.22,
  });
  const rearSupport = new Mesh(supportGeometry, supportMaterial);
  rearSupport.position.set(0, -deskHeight * 0.3, -deskWidth / 2 + 0.24);
  deskTop.add(rearSupport);

  const underGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x2fb7ff),
    transparent: true,
    opacity: 0.32,
    toneMapped: false,
  });
  const underGlow = new Mesh(
    new PlaneGeometry(deskWidth * 0.96, 0.3),
    underGlowMaterial
  );
  underGlow.rotation.x = -Math.PI / 2;
  underGlow.position.set(0, -deskHeight * 0.55, -0.2);
  deskTop.add(underGlow);

  const monitorWidth = 1.3;
  const monitorHeight = 0.78;
  const monitorElevation = deskHeight + 0.72;
  const monitorOffsetX = wallInteriorX + deskDepth + 0.08;
  const monitorSpacing = deskWidth * 0.34;

  const createMonitor = (
    texture: CanvasTexture,
    offsetZ: number,
    rotationOffset: number,
    name: string
  ) => {
    const standMaterial = new MeshStandardMaterial({
      color: 0x121c2a,
      roughness: 0.38,
      metalness: 0.24,
    });
    const stand = new Mesh(new BoxGeometry(0.14, 0.5, 0.26), standMaterial);
    stand.position.set(
      monitorOffsetX - 0.42,
      deskHeight + 0.25,
      anchorZ + offsetZ
    );
    stand.rotation.y = rotationOffset;
    stand.name = `${name}Stand`;
    group.add(stand);

    const screenMaterial = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
    });
    const screen = new Mesh(
      new PlaneGeometry(monitorWidth, monitorHeight),
      screenMaterial
    );
    screen.name = name;
    screen.position.set(monitorOffsetX, monitorElevation, anchorZ + offsetZ);
    screen.rotation.y = Math.PI / 2 + rotationOffset;
    screen.renderOrder = 10;
    group.add(screen);

    return { screen, screenMaterial };
  };

  const leftMonitor = createMonitor(
    textures.left,
    -monitorSpacing,
    Math.PI / 16,
    'CreatorDeskLeftMonitor'
  );
  const rightMonitor = createMonitor(
    textures.right,
    monitorSpacing,
    -Math.PI / 16,
    'CreatorDeskRightMonitor'
  );

  const centerMonitorMaterial = new MeshBasicMaterial({
    map: textures.center,
    transparent: true,
    toneMapped: false,
  });
  const centerMonitor = new Mesh(
    new PlaneGeometry(monitorWidth * 1.1, monitorHeight * 1.05),
    centerMonitorMaterial
  );
  centerMonitor.name = 'CreatorDeskCenterMonitor';
  centerMonitor.position.set(monitorOffsetX, monitorElevation + 0.04, anchorZ);
  centerMonitor.rotation.y = Math.PI / 2;
  centerMonitor.renderOrder = 12;
  group.add(centerMonitor);

  const glowMaterial = new MeshBasicMaterial({
    color: new Color(0x48d9ff),
    transparent: true,
    opacity: 0.22,
    toneMapped: false,
  });
  const glow = new Mesh(
    new PlaneGeometry(monitorWidth * 1.28, monitorHeight * 1.28),
    glowMaterial
  );
  glow.name = 'CreatorDeskCenterGlow';
  glow.position.set(monitorOffsetX - 0.02, monitorElevation + 0.04, anchorZ);
  glow.rotation.y = Math.PI / 2;
  glow.renderOrder = 8;
  group.add(glow);

  const badgeMaterial = new MeshBasicMaterial({
    map: textures.badge,
    transparent: true,
    toneMapped: false,
  });
  const badgeMesh = new Mesh(new PlaneGeometry(0.86, 0.46), badgeMaterial);
  badgeMesh.name = 'CreatorDeskLiveBadge';
  badgeMesh.position.set(
    monitorOffsetX - 0.02,
    monitorElevation + 0.62,
    anchorZ + monitorWidth * 0.22
  );
  badgeMesh.rotation.y = Math.PI / 2;
  badgeMesh.renderOrder = 13;
  group.add(badgeMesh);

  const deskAccessoryMaterial = new MeshStandardMaterial({
    color: 0x121b28,
    roughness: 0.48,
    metalness: 0.2,
  });
  const keyboard = new Mesh(
    new BoxGeometry(0.32, 0.04, 1.12),
    deskAccessoryMaterial
  );
  keyboard.name = 'CreatorDeskKeyboard';
  keyboard.position.set(
    wallInteriorX + deskDepth * 0.52,
    deskHeight + 0.06,
    anchorZ - 0.12
  );
  deskTop.add(keyboard);

  const mouse = new Mesh(
    new BoxGeometry(0.16, 0.06, 0.26),
    deskAccessoryMaterial
  );
  mouse.name = 'CreatorDeskMouse';
  mouse.position.set(0.1, 0.02, 0.68);
  keyboard.add(mouse);

  const streamDeck = new Mesh(
    new BoxGeometry(0.12, 0.08, 0.24),
    new MeshStandardMaterial({
      color: 0x182a42,
      emissive: new Color(0x2f9dff),
      emissiveIntensity: 0.6,
      roughness: 0.32,
      metalness: 0.24,
    })
  );
  streamDeck.name = 'CreatorDeskStreamDeck';
  streamDeck.position.set(
    wallInteriorX + deskDepth * 0.4,
    deskHeight + 0.1,
    anchorZ + 0.82
  );
  group.add(streamDeck);

  const chairBase = new Mesh(
    new CylinderGeometry(0.42, 0.38, 0.12, 24),
    new MeshStandardMaterial({
      color: 0x0d141f,
      roughness: 0.48,
      metalness: 0.22,
    })
  );
  chairBase.name = 'CreatorDeskChairBase';
  const chairX = wallInteriorX + deskDepth * 0.35;
  const chairZ = anchorZ + 0.18;
  chairBase.position.set(chairX, 0.12, chairZ);
  group.add(chairBase);

  const chairSeat = new Mesh(
    new BoxGeometry(0.56, 0.12, 0.7),
    new MeshStandardMaterial({
      color: 0x152235,
      emissive: new Color(0x0f65ff),
      emissiveIntensity: 0.4,
      roughness: 0.36,
      metalness: 0.28,
    })
  );
  chairSeat.name = 'CreatorDeskChairSeat';
  chairSeat.position.set(0, 0.24, 0);
  chairBase.add(chairSeat);

  const chairBack = new Mesh(
    new BoxGeometry(0.54, 0.9, 0.16),
    new MeshStandardMaterial({
      color: 0x1c2f4a,
      emissive: new Color(0x173dff),
      emissiveIntensity: 0.35,
      roughness: 0.42,
      metalness: 0.24,
    })
  );
  chairBack.name = 'CreatorDeskChairBack';
  chairBack.position.set(0, 0.6, -0.2);
  chairSeat.add(chairBack);

  const chairArms = new Mesh(
    new BoxGeometry(0.66, 0.08, 0.52),
    new MeshStandardMaterial({
      color: 0x0f1d30,
      roughness: 0.46,
      metalness: 0.2,
    })
  );
  chairArms.name = 'CreatorDeskChairArms';
  chairArms.position.set(0, 0.24, 0);
  chairSeat.add(chairArms);

  const poiBindings: LivingRoomMediaWallPoiBindings = {
    futuroptimistTv: {
      screen: centerMonitor,
      screenMaterial: centerMonitorMaterial,
      glow,
      glowMaterial,
    },
  };

  colliders.push({
    minX: wallInteriorX,
    maxX: wallInteriorX + deskDepth + 0.3,
    minZ: anchorZ - deskWidth / 2 - 0.15,
    maxZ: anchorZ + deskWidth / 2 + 0.15,
  });
  colliders.push({
    minX: chairX - 0.6,
    maxX: chairX + 0.6,
    minZ: chairZ - 0.7,
    maxZ: chairZ + 0.7,
  });

  // Ensure side monitor materials persist for tone mapping consistency.
  void leftMonitor.screenMaterial;
  void rightMonitor.screenMaterial;

  return { group, colliders, poiBindings };
}
