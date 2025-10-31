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
  update(context: {
    elapsed: number;
    delta: number;
    emphasis: number;
    analyticsGlow?: number;
    analyticsWave?: number;
  }): void;
}

export interface JobbotTerminalOptions {
  position: { x: number; z: number; y?: number };
  orientationRadians?: number;
  desk?: {
    width?: number;
    depth?: number;
  };
}

interface DataShardState {
  mesh: Mesh;
  radius: number;
  baseHeight: number;
  bobAmplitude: number;
  orbitAngle: number;
  orbitSpeed: number;
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

function createTelemetryPanelTexture(
  heading: string,
  primary: string,
  metrics: string[]
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create telemetry panel canvas.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(5, 18, 32, 0.9)';
  context.fillRect(48, 48, canvas.width - 96, canvas.height - 96);

  context.strokeStyle = 'rgba(124, 241, 255, 0.4)';
  context.lineWidth = 6;
  context.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  context.fillStyle = '#7cf1ff';
  context.font = 'bold 156px "Inter", "Segoe UI", sans-serif';
  context.fillText(heading, 88, 220);

  context.font = '600 94px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#d9fbff';
  context.fillText(primary, 88, 320);

  context.font = '52px "Inter", "Segoe UI", sans-serif';
  metrics.forEach((metric, index) => {
    const y = 380 + index * 64;
    context.fillStyle = 'rgba(124, 241, 255, 0.65)';
    context.fillRect(88, y - 32, 32, 32);
    context.fillStyle = '#f1fdff';
    context.fillText(metric, 136, y - 6);
  });

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

  const dataShardGroup = new Group();
  dataShardGroup.name = 'JobbotTerminalDataShards';
  dataShardGroup.position.set(0, hologramBaseHeight + 0.24, 0);
  group.add(dataShardGroup);

  const shardGeometry = new BoxGeometry(0.12, 0.34, 0.04);
  const shardMaterial = new MeshStandardMaterial({
    color: new Color(0x162f44),
    emissive: new Color(0x52f0ff),
    emissiveIntensity: 0.8,
    roughness: 0.32,
    metalness: 0.48,
    transparent: true,
    opacity: 0.72,
  });
  const dataShards: DataShardState[] = [];
  const shardCount = 6;
  for (let index = 0; index < shardCount; index += 1) {
    const mesh = new Mesh(shardGeometry, shardMaterial.clone());
    mesh.name = `JobbotTerminalDataShard-${index}`;
    const radius = MathUtils.lerp(0.32, 0.58, index / shardCount);
    const baseHeight = MathUtils.lerp(0.12, 0.34, (index % 3) / 2);
    const bobAmplitude = MathUtils.lerp(0.05, 0.12, (index % 2) / 1);
    const orbitAngle = (Math.PI * 2 * index) / shardCount;
    const orbitSpeed = MathUtils.lerp(0.5, 1.15, (index % 4) / 3);
    dataShards.push({
      mesh,
      radius,
      baseHeight,
      bobAmplitude,
      orbitAngle,
      orbitSpeed,
    });
    dataShardGroup.add(mesh);
  }

  const telemetryGroup = new Group();
  telemetryGroup.name = 'JobbotTerminalTelemetryGroup';
  const telemetryBaseHeight = deskHeight + deskThickness + 0.58;
  telemetryGroup.position.set(0, telemetryBaseHeight, 0);
  group.add(telemetryGroup);

  const telemetryDescriptors = [
    {
      heading: 'Deploy',
      primary: 'Queue · 0',
      metrics: ['Checks stable', 'Latency 52 ms'],
    },
    {
      heading: 'Cron',
      primary: 'Sync · ok',
      metrics: ['Nightly ✓', 'Seeding ✓'],
    },
    {
      heading: 'Alerts',
      primary: 'Open · 0',
      metrics: ['Last 05:35', 'Status green'],
    },
  ];
  const telemetryRadius = deskDepth * 0.54 + 0.12;
  const telemetryPanelMaterials: MeshBasicMaterial[] = [];
  telemetryDescriptors.forEach((descriptor, index) => {
    const texture = createTelemetryPanelTexture(
      descriptor.heading,
      descriptor.primary,
      descriptor.metrics
    );
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
    });
    const panel = new Mesh(new PlaneGeometry(0.72, 0.38), material);
    panel.name = `JobbotTerminalTelemetry-${index}`;
    const angle = (Math.PI * 2 * index) / telemetryDescriptors.length;
    panel.position.set(
      Math.cos(angle) * telemetryRadius,
      0.18,
      Math.sin(angle) * telemetryRadius
    );
    panel.lookAt(0, 0.18, 0);
    panel.rotateY(Math.PI);
    panel.renderOrder = 9;
    telemetryGroup.add(panel);
    telemetryPanelMaterials.push(material);
  });

  const telemetryAuraMaterial = new MeshStandardMaterial({
    color: new Color(0x0d273b),
    emissive: new Color(0x1f7aff),
    emissiveIntensity: 0.34,
    roughness: 0.42,
    metalness: 0.24,
    transparent: true,
    opacity: 0.52,
  });
  const telemetryAura = new Mesh(
    new CylinderGeometry(
      telemetryRadius * 1.06,
      telemetryRadius * 1.06,
      0.04,
      48
    ),
    telemetryAuraMaterial
  );
  telemetryAura.name = 'JobbotTerminalTelemetryAura';
  telemetryAura.rotation.x = Math.PI / 2;
  telemetryAura.position.set(0, telemetryBaseHeight - 0.16, 0);
  telemetryAura.renderOrder = 2;
  group.add(telemetryAura);

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

  let telemetryRotation = 0;
  let lastElapsed = 0;

  return {
    group,
    colliders,
    update({ elapsed, emphasis, analyticsGlow, analyticsWave }) {
      const delta = Math.max(0, elapsed - lastElapsed);
      lastElapsed = elapsed;
      const smoothing = delta > 0 ? 1 - Math.exp(-delta * 3.8) : 1;
      const pulseScale = getPulseScale();
      const analyticsGlowValue = MathUtils.clamp(analyticsGlow ?? 0, 0, 1);
      const analyticsWaveValue = MathUtils.clamp(
        analyticsWave ?? analyticsGlowValue,
        0,
        1
      );
      const combinedEmphasis = Math.max(emphasis, analyticsGlowValue);
      const analyticsBlend =
        pulseScale <= 0
          ? 0
          : Math.min(1, analyticsGlowValue * pulseScale * 0.85);
      const analyticsPhase = analyticsWaveValue * Math.PI * 2;
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
        Math.max(combinedEmphasis, 0.35),
        pulseScale
      );
      const glowIntensity = MathUtils.lerp(0.32, 0.78, glowDriver);
      screenGlowMaterial.emissiveIntensity = glowIntensity;

      const tickerPulse = (Math.sin(elapsed * 3.4 * spinScale) + 1) / 2;
      const tickerDriver = MathUtils.lerp(
        0.2,
        Math.max(combinedEmphasis, tickerPulse * 0.7),
        pulseScale
      );
      tickerMaterial.opacity = MathUtils.lerp(0.35, 0.95, tickerDriver);
      screenMaterial.opacity = MathUtils.lerp(
        0.82,
        MathUtils.lerp(0.92, 1, pulseScale),
        Math.max(combinedEmphasis, 0.4)
      );

      beacons.forEach((beacon, index) => {
        const material = beacon.material as MeshStandardMaterial;
        const pulse = (Math.sin(elapsed * 2.3 * spinScale + index) + 1) / 2;
        const beaconDriver = MathUtils.lerp(
          0.3,
          Math.max(combinedEmphasis, pulse),
          pulseScale
        );
        material.emissiveIntensity = MathUtils.lerp(0.4, 1.25, beaconDriver);
        beacon.position.y =
          deskHeight +
          deskThickness +
          0.12 +
          Math.sin(elapsed * 1.6 * spinScale + index) * 0.05 * pulseScale;
      });

      const shardOrbitDriver = MathUtils.lerp(0.42, 1.25, combinedEmphasis);
      const shardSpinScale = pulseScale <= 0 ? 0 : Math.max(spinScale, 0.15);
      const shardAmplitudeScale =
        pulseScale <= 0 ? 0 : MathUtils.lerp(0.4, 1, combinedEmphasis);
      dataShards.forEach((shard, index) => {
        shard.orbitAngle +=
          delta * shard.orbitSpeed * shardOrbitDriver * shardSpinScale;
        const baseWave = Math.sin(elapsed * 2.4 * spinScale + index);
        const syncedWave = Math.sin(analyticsPhase + index * 0.9);
        const wave = MathUtils.lerp(baseWave, syncedWave, analyticsBlend);
        const altitude =
          shard.baseHeight + wave * shard.bobAmplitude * shardAmplitudeScale;
        shard.mesh.position.set(
          Math.cos(shard.orbitAngle) * shard.radius,
          altitude,
          Math.sin(shard.orbitAngle) * shard.radius
        );
        shard.mesh.lookAt(0, shard.baseHeight, 0);
        shard.mesh.rotation.z =
          MathUtils.degToRad(12) * Math.sin(elapsed * 1.7 + index);
        const shardMaterial = shard.mesh.material as MeshStandardMaterial;
        const emissiveBase = MathUtils.lerp(
          0.4,
          1.35,
          Math.max(combinedEmphasis, pulseScale * 0.55)
        );
        const glowWave =
          analyticsBlend > 0
            ? ((Math.sin(analyticsPhase + index * 0.9) + 1) / 2) *
              combinedEmphasis *
              analyticsBlend
            : 0;
        const targetIntensity = MathUtils.clamp(
          emissiveBase + MathUtils.lerp(0, 0.55, glowWave),
          0,
          2
        );
        shardMaterial.emissiveIntensity =
          pulseScale <= 0
            ? emissiveBase
            : MathUtils.lerp(
                shardMaterial.emissiveIntensity,
                targetIntensity,
                smoothing
              );
        const targetOpacity = MathUtils.lerp(
          0.5,
          0.92,
          Math.max(combinedEmphasis, pulseScale)
        );
        shardMaterial.opacity =
          pulseScale <= 0
            ? targetOpacity
            : MathUtils.lerp(shardMaterial.opacity, targetOpacity, smoothing);
      });

      const telemetrySpeed =
        MathUtils.lerp(0.42, 1.3, combinedEmphasis) * spinScale;
      telemetryRotation += delta * telemetrySpeed;
      telemetryGroup.rotation.y = telemetryRotation;
      telemetryGroup.position.y =
        telemetryBaseHeight + bob * MathUtils.lerp(0.26, 0.6, pulseScale);

      telemetryPanelMaterials.forEach((material, index) => {
        const wave = (Math.sin(elapsed * 2.6 + index) + 1) / 2;
        const driver = MathUtils.lerp(
          0.24,
          Math.max(combinedEmphasis, wave),
          pulseScale
        );
        const targetOpacity = MathUtils.lerp(0.08, 0.9, driver);
        material.opacity =
          pulseScale <= 0
            ? targetOpacity
            : MathUtils.lerp(material.opacity, targetOpacity, smoothing);
      });

      const auraTargetIntensity = MathUtils.lerp(0.34, 1.1, combinedEmphasis);
      telemetryAuraMaterial.emissiveIntensity = MathUtils.lerp(
        telemetryAuraMaterial.emissiveIntensity,
        auraTargetIntensity,
        smoothing
      );
      const auraOpacityDriver = MathUtils.lerp(0.42, 0.8, pulseScale);
      const targetAuraOpacity = MathUtils.lerp(
        MathUtils.lerp(0.28, 0.36, pulseScale),
        MathUtils.lerp(0.6, 0.84, pulseScale),
        Math.max(emphasis, auraOpacityDriver)
      );
      telemetryAuraMaterial.opacity = MathUtils.lerp(
        telemetryAuraMaterial.opacity,
        targetAuraOpacity,
        smoothing
      );
    },
  } satisfies JobbotTerminalBuild;
}
