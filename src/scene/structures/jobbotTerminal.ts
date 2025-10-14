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
  SphereGeometry,
  SRGBColorSpace,
} from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';

export interface JobbotTerminalBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface JobbotTerminalOptions {
  position: { x: number; z: number; y?: number };
  orientationRadians?: number;
  desk?: {
    width?: number;
    depth?: number;
  };
}

function createTerminalScreenTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = '#07111f';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const background = context.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    background.addColorStop(0, '#0d253f');
    background.addColorStop(0.6, '#10203a');
    background.addColorStop(1, '#0c1728');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#7cf1ff';
    context.font = 'bold 220px "Inter", "Segoe UI", sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillText('jobbot3000', canvas.width * 0.08, canvas.height * 0.46);

    context.font = '64px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = '#9ce9ff';
    context.fillText(
      'Automation orchestrator · live diagnostics stream',
      canvas.width * 0.08,
      canvas.height * 0.68
    );

    context.font = '52px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = '#fede72';
    context.fillText(
      'Status: nominal · queue depth 0 · SLA 99.98%',
      canvas.width * 0.08,
      canvas.height * 0.82
    );

    const rightColumnX = canvas.width * 0.7;
    context.font = '600 56px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = '#ffffff';
    context.fillText('Ops timeline', rightColumnX, canvas.height * 0.32);

    context.font = '42px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = '#b6d8ff';
    const logLines = [
      '• 05:32 · cron sync complete',
      '• 05:35 · drift audit clean',
      '• 05:38 · queue drained',
    ];
    logLines.forEach((line, index) => {
      context.fillText(line, rightColumnX, canvas.height * (0.4 + index * 0.1));
    });
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createCollider(
  center: { x: number; z: number },
  width: number,
  depth: number,
  rotation: number
): RectCollider {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const corners = [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ];

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const corner of corners) {
    const worldX = center.x + corner.x * cos - corner.z * sin;
    const worldZ = center.z + corner.x * sin + corner.z * cos;
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

export function createJobbotTerminal(
  options: JobbotTerminalOptions
): JobbotTerminalBuild {
  const { position, orientationRadians = 0, desk } = options;
  const baseY = position.y ?? 0;
  const deskWidth = desk?.width ?? 3.6;
  const deskDepth = desk?.depth ?? 1.6;
  const deskThickness = 0.12;
  const deskHeight = 0.92;

  const group = new Group();
  group.name = 'JobbotTerminal';
  group.position.set(position.x, baseY, position.z);
  group.rotation.y = orientationRadians;

  const colliders: RectCollider[] = [];

  const topGeometry = new BoxGeometry(deskWidth, deskThickness, deskDepth);
  const topMaterial = new MeshStandardMaterial({
    color: new Color(0x111b2b),
    roughness: 0.48,
    metalness: 0.22,
  });
  const deskTop = new Mesh(topGeometry, topMaterial);
  deskTop.name = 'JobbotTerminalDeskTop';
  deskTop.position.set(0, deskHeight + deskThickness / 2, 0);
  group.add(deskTop);

  const legGeometry = new BoxGeometry(0.16, deskHeight, 0.16);
  const legMaterial = new MeshStandardMaterial({
    color: new Color(0x0b141f),
    roughness: 0.4,
    metalness: 0.18,
  });
  const legOffsetX = deskWidth / 2 - 0.18;
  const legOffsetZ = deskDepth / 2 - 0.22;
  const legPositions: Array<[number, number]> = [
    [-legOffsetX, -legOffsetZ],
    [legOffsetX, -legOffsetZ],
    [-legOffsetX, legOffsetZ],
    [legOffsetX, legOffsetZ],
  ];
  legPositions.forEach(([x, z]) => {
    const leg = new Mesh(legGeometry, legMaterial);
    leg.position.set(x, deskHeight / 2, z);
    group.add(leg);
  });

  const consoleGeometry = new BoxGeometry(
    deskWidth * 0.62,
    0.18,
    deskDepth * 0.54
  );
  const consoleMaterial = new MeshStandardMaterial({
    color: new Color(0x151f2c),
    roughness: 0.55,
    metalness: 0.18,
  });
  const console = new Mesh(consoleGeometry, consoleMaterial);
  console.position.set(0, deskHeight + 0.18 / 2, 0);
  group.add(console);

  const accentGeometry = new BoxGeometry(
    deskWidth * 0.94,
    0.06,
    deskDepth * 0.18
  );
  const accentMaterial = new MeshStandardMaterial({
    color: new Color(0x113044),
    emissive: new Color(0x1c84ff),
    emissiveIntensity: 0.48,
    roughness: 0.26,
    metalness: 0.28,
  });
  const accent = new Mesh(accentGeometry, accentMaterial);
  accent.position.set(
    0,
    deskHeight + 0.03,
    deskDepth / 2 - accentGeometry.parameters.depth / 2
  );
  group.add(accent);

  const screenTexture = createTerminalScreenTexture();
  const screenMaterial = new MeshBasicMaterial({
    map: screenTexture,
    transparent: true,
    toneMapped: false,
  });
  const screenWidth = deskWidth * 0.86;
  const screenHeight = 1.12;
  const screenGeometry = new PlaneGeometry(screenWidth, screenHeight);
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.name = 'JobbotTerminalScreen';
  screen.position.set(
    0,
    deskHeight + deskThickness + screenHeight / 2 + 0.1,
    -deskDepth / 2 + 0.05
  );
  screen.renderOrder = 6;
  group.add(screen);

  const screenGlowMaterial = new MeshStandardMaterial({
    color: new Color(0x133045),
    emissive: new Color(0x2494ff),
    emissiveIntensity: 0.32,
    roughness: 0.3,
    metalness: 0.24,
    transparent: true,
    opacity: 0.85,
  });
  const screenGlow = new Mesh(screenGeometry.clone(), screenGlowMaterial);
  screenGlow.position.copy(screen.position);
  screenGlow.position.z += 0.02;
  screenGlow.renderOrder = 5;
  group.add(screenGlow);

  const tickerHeight = 0.22;
  const tickerGeometry = new PlaneGeometry(screenWidth, tickerHeight);
  const tickerMaterial = new MeshBasicMaterial({
    color: new Color(0x0ff5ff),
    transparent: true,
    opacity: 0.55,
    toneMapped: false,
  });
  const ticker = new Mesh(tickerGeometry, tickerMaterial);
  ticker.name = 'JobbotTerminalTicker';
  ticker.position.set(
    0,
    screen.position.y - screenHeight / 2 + tickerHeight / 2,
    screen.position.z + 0.04
  );
  ticker.renderOrder = 7;
  group.add(ticker);

  const hologramBaseGeometry = new CylinderGeometry(0.42, 0.5, 0.18, 48);
  const hologramBaseMaterial = new MeshStandardMaterial({
    color: new Color(0x152335),
    emissive: new Color(0x1b5dff),
    emissiveIntensity: 0.36,
    roughness: 0.32,
    metalness: 0.28,
  });
  const hologramBase = new Mesh(hologramBaseGeometry, hologramBaseMaterial);
  hologramBase.position.set(
    0,
    deskHeight + deskThickness + hologramBaseGeometry.parameters.height / 2,
    0
  );
  group.add(hologramBase);

  const hologramGroup = new Group();
  hologramGroup.name = 'JobbotTerminalHologram';
  const hologramBaseHeight =
    hologramBase.position.y + hologramBaseGeometry.parameters.height / 2;
  hologramGroup.position.set(0, hologramBaseHeight + 0.06, 0);
  group.add(hologramGroup);

  const hologramMaterial = new MeshBasicMaterial({
    color: new Color(0x65eaff),
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    toneMapped: false,
  });
  const hologramGeometry = new CylinderGeometry(0.12, 0.4, 0.8, 36, 1, true);
  const hologram = new Mesh(hologramGeometry, hologramMaterial);
  hologram.position.y = 0.3;
  hologramGroup.add(hologram);

  const hologramCoreMaterial = new MeshStandardMaterial({
    color: new Color(0x1b3d5a),
    emissive: new Color(0x52f0ff),
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.45,
  });
  const hologramCoreGeometry = new SphereGeometry(0.18, 32, 32);
  const hologramCore = new Mesh(hologramCoreGeometry, hologramCoreMaterial);
  hologramCore.name = 'JobbotTerminalCore';
  hologramCore.position.set(0, 0.55, 0);
  hologramGroup.add(hologramCore);

  const hologramPanelGeometry = new PlaneGeometry(0.9, 0.52);
  const hologramPanelMaterial = new MeshBasicMaterial({
    color: new Color(0x7efbff),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    toneMapped: false,
  });
  const hologramPanel = new Mesh(hologramPanelGeometry, hologramPanelMaterial);
  hologramPanel.position.set(0, 0.6, 0.24);
  hologramPanel.rotation.x = MathUtils.degToRad(-18);
  hologramGroup.add(hologramPanel);

  const statusBeaconGeometry = new SphereGeometry(0.08, 24, 24);
  const statusBeaconMaterial = new MeshStandardMaterial({
    color: new Color(0x1a2f40),
    emissive: new Color(0x3cb6ff),
    emissiveIntensity: 0.6,
    roughness: 0.24,
    metalness: 0.36,
  });
  const beaconOffsets = [
    [-deskWidth / 2 + 0.4, 0.18],
    [0, 0.24],
    [deskWidth / 2 - 0.4, 0.18],
  ];
  const beacons: Mesh[] = [];
  beaconOffsets.forEach(([x, z]) => {
    const beacon = new Mesh(statusBeaconGeometry, statusBeaconMaterial.clone());
    beacon.name = `JobbotTerminalBeacon-${beacons.length}`;
    beacon.position.set(x, deskHeight + deskThickness + 0.12, z);
    group.add(beacon);
    beacons.push(beacon);
  });

  colliders.push(
    createCollider(
      { x: position.x, z: position.z },
      deskWidth + 0.4,
      deskDepth + 0.2,
      orientationRadians
    )
  );

  return {
    group,
    colliders,
    update({ elapsed, emphasis }) {
      const pulseScale = getPulseScale();
      const bobAmplitude = MathUtils.lerp(0.012, 0.08, pulseScale);
      const spinScale = MathUtils.lerp(0.15, 1, pulseScale);
      const bob = Math.sin(elapsed * 2.1 * spinScale) * bobAmplitude;
      hologramGroup.position.y = hologramBaseHeight + 0.06 + bob;
      hologramGroup.rotation.y = elapsed * 0.8 * spinScale;

      const opacityDriver = MathUtils.lerp(
        0.3,
        Math.max(emphasis, 0.25),
        pulseScale
      );
      const hologramOpacity = MathUtils.lerp(0.28, 0.72, opacityDriver);
      hologramMaterial.opacity = hologramOpacity;
      hologramPanelMaterial.opacity = MathUtils.lerp(
        0.28,
        MathUtils.lerp(0.42, 0.6, pulseScale),
        Math.max(emphasis, 0.1)
      );

      const coreIntensity = MathUtils.lerp(
        MathUtils.lerp(0.7, 0.9, pulseScale),
        MathUtils.lerp(1.1, 1.9, pulseScale),
        emphasis
      );
      hologramCoreMaterial.emissiveIntensity = coreIntensity;

      const glowDriver = MathUtils.lerp(
        0.24,
        Math.max(emphasis, 0.35),
        pulseScale
      );
      const glowIntensity = MathUtils.lerp(0.32, 0.78, glowDriver);
      screenGlowMaterial.emissiveIntensity = glowIntensity;

      const tickerPulse = (Math.sin(elapsed * 3.4 * spinScale) + 1) / 2;
      const tickerDriver = MathUtils.lerp(
        0.2,
        Math.max(emphasis, tickerPulse * 0.7),
        pulseScale
      );
      tickerMaterial.opacity = MathUtils.lerp(0.35, 0.95, tickerDriver);
      screenMaterial.opacity = MathUtils.lerp(
        0.82,
        MathUtils.lerp(0.92, 1, pulseScale),
        Math.max(emphasis, 0.4)
      );

      beacons.forEach((beacon, index) => {
        const material = beacon.material as MeshStandardMaterial;
        const pulse = (Math.sin(elapsed * 2.3 * spinScale + index) + 1) / 2;
        const beaconDriver = MathUtils.lerp(
          0.3,
          Math.max(emphasis, pulse),
          pulseScale
        );
        material.emissiveIntensity = MathUtils.lerp(0.4, 1.25, beaconDriver);
        beacon.position.y =
          deskHeight +
          deskThickness +
          0.12 +
          Math.sin(elapsed * 1.6 * spinScale + index) * 0.05 * pulseScale;
      });
    },
  } satisfies JobbotTerminalBuild;
}
