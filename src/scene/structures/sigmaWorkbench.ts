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
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';

export interface SigmaWorkbenchBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface SigmaWorkbenchOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
}

interface EdgeStrip {
  material: MeshStandardMaterial;
  offset: number;
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

  for (const corner of corners) {
    const worldX = center.x + corner.x * cos - corner.z * sin;
    const worldZ = center.z + corner.x * sin + corner.z * cos;
    if (worldX < minX) {
      minX = worldX;
    }
    if (worldX > maxX) {
      maxX = worldX;
    }
    if (worldZ < minZ) {
      minZ = worldZ;
    }
    if (worldZ > maxZ) {
      maxZ = worldZ;
    }
  }

  return { minX, maxX, minZ, maxZ };
}

export function createSigmaWorkbench(
  options: SigmaWorkbenchOptions
): SigmaWorkbenchBuild {
  const { position, orientationRadians = 0 } = options;
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);

  const group = new Group();
  group.name = 'SigmaWorkbench';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const colliders: RectCollider[] = [];
  const edgeStrips: EdgeStrip[] = [];

  const tableWidth = 2.2;
  const tableDepth = 1.1;
  const tableHeight = 0.24;

  const baseMaterial = new MeshStandardMaterial({
    color: new Color(0x0f1722),
    roughness: 0.6,
    metalness: 0.24,
  });
  const base = new Mesh(
    new BoxGeometry(tableWidth, tableHeight, tableDepth),
    baseMaterial
  );
  base.name = 'SigmaWorkbenchBase';
  base.position.set(0, tableHeight / 2, 0);
  group.add(base);

  const legMaterial = new MeshStandardMaterial({
    color: new Color(0x152231),
    roughness: 0.4,
    metalness: 0.32,
  });
  const legGeometry = new CylinderGeometry(0.08, 0.08, 0.86, 16);
  const legOffsets: Array<[number, number]> = [
    [-tableWidth / 2 + 0.18, -tableDepth / 2 + 0.18],
    [tableWidth / 2 - 0.18, -tableDepth / 2 + 0.18],
    [-tableWidth / 2 + 0.18, tableDepth / 2 - 0.18],
    [tableWidth / 2 - 0.18, tableDepth / 2 - 0.18],
  ];
  for (const [offsetX, offsetZ] of legOffsets) {
    const leg = new Mesh(legGeometry, legMaterial);
    leg.name = `SigmaWorkbenchLeg-${offsetX.toFixed(2)}-${offsetZ.toFixed(2)}`;
    leg.position.set(
      offsetX,
      tableHeight + legGeometry.parameters.height / 2,
      offsetZ
    );
    group.add(leg);
  }

  const workSurfaceHeight = tableHeight + legGeometry.parameters.height;
  const workSurfaceMaterial = new MeshStandardMaterial({
    color: new Color(0x0b101a),
    emissive: new Color(0x0c3055),
    emissiveIntensity: 0.36,
    roughness: 0.32,
    metalness: 0.28,
    map: createWorkSurfaceTexture(),
  });
  const workSurface = new Mesh(
    new BoxGeometry(tableWidth * 0.98, 0.08, tableDepth * 0.96),
    workSurfaceMaterial
  );
  workSurface.name = 'SigmaWorkbenchSurface';
  workSurface.position.set(0, workSurfaceHeight + 0.04, 0);
  group.add(workSurface);

  const edgeStripMaterial = new MeshStandardMaterial({
    color: new Color(0x1af2ff),
    emissive: new Color(0x158dd4),
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.54,
  });
  const edgeStripGeometry = new BoxGeometry(tableWidth * 0.98, 0.02, 0.04);
  for (let i = 0; i < 2; i += 1) {
    const strip = new Mesh(edgeStripGeometry, edgeStripMaterial.clone());
    strip.name = `SigmaWorkbenchEdgeStrip-${i}`;
    const offset = i === 0 ? -tableDepth / 2 + 0.02 : tableDepth / 2 - 0.02;
    strip.position.set(0, workSurface.position.y + 0.05, offset);
    group.add(strip);
    edgeStrips.push({
      material: strip.material as MeshStandardMaterial,
      offset: i,
    });
  }

  const pinBaseMaterial = new MeshStandardMaterial({
    color: new Color(0x0d1926),
    roughness: 0.38,
    metalness: 0.42,
  });
  const pinBase = new Mesh(
    new CylinderGeometry(0.16, 0.2, 0.14, 24),
    pinBaseMaterial
  );
  pinBase.name = 'SigmaWorkbenchPinBase';
  pinBase.position.set(0, workSurface.position.y + 0.11, 0);
  group.add(pinBase);

  const pinCoreMaterial = new MeshStandardMaterial({
    color: new Color(0x48fff1),
    emissive: new Color(0x1dffe3),
    emissiveIntensity: 1.1,
    roughness: 0.22,
    metalness: 0.38,
  });
  const pinCore = new Mesh(
    new CylinderGeometry(0.12, 0.12, 0.24, 32),
    pinCoreMaterial
  );
  pinCore.name = 'SigmaWorkbenchPinCore';
  pinCore.position.set(0, pinBase.position.y + 0.19, 0);
  group.add(pinCore);

  const pinHaloMaterial = new MeshBasicMaterial({
    color: new Color(0x76fff8),
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: DoubleSide,
  });
  const pinHalo = new Mesh(
    new TorusGeometry(0.2, 0.02, 16, 48),
    pinHaloMaterial
  );
  pinHalo.name = 'SigmaWorkbenchPinHalo';
  pinHalo.rotation.x = Math.PI / 2;
  pinHalo.position.set(0, pinCore.position.y + 0.16, 0);
  group.add(pinHalo);

  const hologramGroup = new Group();
  hologramGroup.name = 'SigmaWorkbenchHologramGroup';
  hologramGroup.position.set(
    tableWidth * 0.32,
    workSurface.position.y + 0.2,
    0
  );
  group.add(hologramGroup);

  const hologramMaterial = new MeshBasicMaterial({
    map: createHologramTexture(),
    transparent: true,
    opacity: 0,
    side: DoubleSide,
    depthWrite: false,
  });
  const hologram = new Mesh(new PlaneGeometry(0.9, 0.6), hologramMaterial);
  hologram.name = 'SigmaWorkbenchHologram';
  hologram.renderOrder = 12;
  hologramGroup.add(hologram);

  const hologramGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x3cd6ff),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const hologramGlow = new Mesh(
    new PlaneGeometry(0.96, 0.66),
    hologramGlowMaterial
  );
  hologramGlow.name = 'SigmaWorkbenchHologramGlow';
  hologramGlow.renderOrder = 11;
  hologramGlow.position.set(0, 0, -0.01);
  hologramGroup.add(hologramGlow);

  const printerBridgeMaterial = new MeshStandardMaterial({
    color: new Color(0x122032),
    emissive: new Color(0x0d3c66),
    emissiveIntensity: 0.4,
    roughness: 0.34,
    metalness: 0.36,
  });
  const printerBridge = new Mesh(
    new BoxGeometry(0.08, 0.32, tableDepth * 0.72),
    printerBridgeMaterial
  );
  printerBridge.name = 'SigmaWorkbenchBridge';
  printerBridge.position.set(
    -tableWidth * 0.32,
    workSurface.position.y + 0.32,
    0
  );
  group.add(printerBridge);

  const armPivot = new Group();
  armPivot.name = 'SigmaWorkbenchArmPivot';
  armPivot.position.set(
    printerBridge.position.x,
    printerBridge.position.y + 0.18,
    0
  );
  group.add(armPivot);

  const armMaterial = new MeshStandardMaterial({
    color: new Color(0x1c354b),
    emissive: new Color(0x0a78ff),
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.44,
  });
  const arm = new Mesh(new BoxGeometry(0.04, 0.04, 0.7), armMaterial);
  arm.name = 'SigmaWorkbenchArm';
  arm.position.set(0, 0, 0);
  armPivot.add(arm);

  const printHeadMaterial = new MeshStandardMaterial({
    color: new Color(0x0c1825),
    emissive: new Color(0x14bfff),
    emissiveIntensity: 0.6,
    roughness: 0.28,
    metalness: 0.32,
  });
  const printHead = new Mesh(
    new BoxGeometry(0.12, 0.08, 0.12),
    printHeadMaterial
  );
  printHead.name = 'SigmaWorkbenchPrintHead';
  const printHeadBaseY = workSurface.position.y + 0.18;
  printHead.position.set(0, printHeadBaseY, 0);
  armPivot.add(printHead);

  const spoolGroup = new Group();
  spoolGroup.name = 'SigmaWorkbenchSpoolGroup';
  spoolGroup.position.set(
    -tableWidth * 0.28,
    workSurface.position.y + 0.24,
    -tableDepth * 0.32
  );
  group.add(spoolGroup);

  const spoolMaterial = new MeshStandardMaterial({
    color: new Color(0x0f1f2f),
    emissive: new Color(0x1457ff),
    emissiveIntensity: 0.45,
    roughness: 0.38,
    metalness: 0.4,
  });
  const spool = new Mesh(new TorusGeometry(0.22, 0.05, 18, 48), spoolMaterial);
  spool.name = 'SigmaWorkbenchSpool';
  spool.rotation.x = Math.PI / 2;
  spoolGroup.add(spool);

  colliders.push(
    createCollider(
      new Vector3(basePosition.x, 0, basePosition.z),
      tableWidth + 0.5,
      tableDepth + 0.6,
      orientationRadians
    )
  );

  let hologramBob = 0;

  const update = ({
    elapsed,
    delta,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    const smoothing = delta > 0 ? 1 - Math.exp(-delta * 4.6) : 1;
    const clampedEmphasis = MathUtils.clamp(emphasis, 0, 1);

    workSurfaceMaterial.emissiveIntensity = MathUtils.lerp(
      workSurfaceMaterial.emissiveIntensity,
      MathUtils.lerp(0.36, 1.12, clampedEmphasis),
      smoothing
    );

    const targetPinIntensity = MathUtils.lerp(1.1, 2.3, clampedEmphasis);
    pinCoreMaterial.emissiveIntensity = MathUtils.lerp(
      pinCoreMaterial.emissiveIntensity,
      targetPinIntensity,
      smoothing
    );

    pinHaloMaterial.opacity = MathUtils.lerp(
      pinHaloMaterial.opacity,
      MathUtils.lerp(0.12, 0.36, clampedEmphasis),
      smoothing
    );

    edgeStrips.forEach(({ material, offset }, index) => {
      const pulse = Math.max(
        0,
        Math.sin(elapsed * 2.4 + offset * Math.PI + index * 0.4)
      );
      const target =
        MathUtils.lerp(0.4, 1.5, clampedEmphasis) * (0.45 + pulse * 0.55);
      material.emissiveIntensity = MathUtils.lerp(
        material.emissiveIntensity,
        target,
        smoothing
      );
    });

    const hologramTargetOpacity = MathUtils.lerp(0, 0.58, clampedEmphasis);
    hologramMaterial.opacity = MathUtils.lerp(
      hologramMaterial.opacity,
      hologramTargetOpacity,
      smoothing
    );
    hologramGlowMaterial.opacity = MathUtils.lerp(
      hologramGlowMaterial.opacity,
      MathUtils.lerp(0, 0.32, clampedEmphasis),
      smoothing
    );
    hologram.visible = hologramMaterial.opacity > 0.02;
    hologramGlow.visible = hologram.visible;
    hologramBob += delta * MathUtils.lerp(1.2, 2.4, clampedEmphasis);
    hologramGroup.position.y = MathUtils.lerp(
      workSurface.position.y + 0.2,
      workSurface.position.y + 0.34,
      clampedEmphasis
    );
    hologramGroup.position.y += Math.sin(hologramBob) * 0.02;

    const armSwing = Math.sin(
      elapsed * MathUtils.lerp(1.2, 2, clampedEmphasis)
    );
    armPivot.rotation.y = armSwing * MathUtils.lerp(0.18, 0.6, clampedEmphasis);

    const printHeadTravel =
      Math.sin(elapsed * 3.1) * MathUtils.lerp(0.04, 0.12, clampedEmphasis);
    printHead.position.z = printHeadTravel;
    printHead.position.y = printHeadBaseY + Math.sin(elapsed * 2.6) * 0.04;

    spoolGroup.rotation.y = elapsed * MathUtils.lerp(0.4, 1.6, clampedEmphasis);
  };

  return { group, colliders, update };
}

function createWorkSurfaceTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.fillStyle = '#04101c';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, 'rgba(32, 148, 255, 0.6)');
  gradient.addColorStop(1, 'rgba(13, 214, 255, 0.25)');
  context.fillStyle = gradient;
  drawRoundedRect(context, 48, 48, canvas.width - 96, canvas.height - 96, 36);
  context.fill();
  context.restore();

  context.save();
  context.fillStyle = '#8fe9ff';
  context.font = '700 120px "Inter", "Segoe UI", sans-serif';
  context.fillText('Sigma Fabrication Bench', 96, 200);
  context.font = '500 60px "Inter", "Segoe UI", sans-serif';
  context.fillText('ESP32 AI Pin · Local inference demos', 96, 290);
  context.font = '48px "JetBrains Mono", monospace';
  context.fillText('Modes: push-to-talk · offline voice agent', 96, 360);
  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createHologramTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, 'rgba(19, 168, 255, 0.85)');
  gradient.addColorStop(1, 'rgba(10, 244, 255, 0.55)');
  context.fillStyle = gradient;
  drawRoundedRect(context, 32, 32, canvas.width - 64, canvas.height - 64, 40);
  context.fill();
  context.restore();

  context.save();
  context.fillStyle = '#ffffff';
  context.font = '700 96px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.fillText('Sigma AI Pin', canvas.width / 2, 190);
  context.font = '600 54px "Inter", "Segoe UI", sans-serif';
  context.fillText('On-device speech · ESP32', canvas.width / 2, 270);
  context.font = '500 46px "Inter", "Segoe UI", sans-serif';
  context.fillText('3D-printed shells ready for demo', canvas.width / 2, 340);
  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawRoundedRect(
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
