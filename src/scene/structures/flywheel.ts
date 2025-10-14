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
  RingGeometry,
  SRGBColorSpace,
  TorusGeometry,
  SphereGeometry,
} from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../collision';

export interface FlywheelShowpieceBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface FlywheelShowpieceOptions {
  centerX: number;
  centerZ: number;
  roomBounds: Bounds2D;
  orientationRadians?: number;
}

export function createFlywheelShowpiece(
  options: FlywheelShowpieceOptions
): FlywheelShowpieceBuild {
  const group = new Group();
  group.name = 'FlywheelShowpiece';

  const colliders: RectCollider[] = [];

  const daisRadius = 1.45;
  const daisHeight = 0.16;
  const daisGeometry = new CylinderGeometry(
    daisRadius,
    daisRadius,
    daisHeight,
    32
  );
  const daisMaterial = new MeshStandardMaterial({
    color: new Color(0x14202c),
    roughness: 0.48,
    metalness: 0.18,
  });
  const dais = new Mesh(daisGeometry, daisMaterial);
  dais.position.set(options.centerX, daisHeight / 2, options.centerZ);
  group.add(dais);

  const pedestalRadius = daisRadius * 0.68;
  const pedestalHeight = 0.6;
  const pedestalGeometry = new CylinderGeometry(
    pedestalRadius,
    pedestalRadius,
    pedestalHeight,
    48
  );
  const pedestalMaterial = new MeshStandardMaterial({
    color: new Color(0x182634),
    roughness: 0.32,
    metalness: 0.24,
  });
  const pedestal = new Mesh(pedestalGeometry, pedestalMaterial);
  pedestal.position.set(
    options.centerX,
    daisHeight + pedestalHeight / 2,
    options.centerZ
  );
  group.add(pedestal);

  const accentHeight = 0.12;
  const accentGeometry = new CylinderGeometry(
    pedestalRadius * 1.02,
    pedestalRadius * 1.02,
    accentHeight,
    48
  );
  const accentMaterial = new MeshStandardMaterial({
    color: new Color(0x5ad1ff),
    emissive: new Color(0x178aff),
    emissiveIntensity: 0.85,
    roughness: 0.22,
    metalness: 0.42,
  });
  const accent = new Mesh(accentGeometry, accentMaterial);
  accent.position.set(
    options.centerX,
    daisHeight + pedestalHeight + accentHeight / 2,
    options.centerZ
  );
  group.add(accent);

  const glassHeight = 1.3;
  const glassRadius = pedestalRadius * 0.92;
  const glassGeometry = new CylinderGeometry(
    glassRadius,
    glassRadius,
    glassHeight,
    32,
    1,
    true
  );
  const glassMaterial = new MeshStandardMaterial({
    color: new Color(0x1c2d3d),
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
    metalness: 0.05,
  });
  const glass = new Mesh(glassGeometry, glassMaterial);
  glass.position.set(
    options.centerX,
    daisHeight + pedestalHeight + glassHeight / 2,
    options.centerZ
  );
  group.add(glass);

  const rotorGroup = new Group();
  rotorGroup.position.set(
    options.centerX,
    daisHeight + pedestalHeight + glassHeight * 0.36,
    options.centerZ
  );
  group.add(rotorGroup);

  const rotorRingRadius = glassRadius * 0.85;
  const rotorRingTube = 0.09;
  const rotorRingGeometry = new TorusGeometry(
    rotorRingRadius,
    rotorRingTube,
    24,
    64
  );
  const rotorRingMaterial = new MeshStandardMaterial({
    color: new Color(0x2c95ff),
    emissive: new Color(0x65d0ff),
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.5,
  });
  const rotorRing = new Mesh(rotorRingGeometry, rotorRingMaterial);
  rotorRing.rotation.x = Math.PI / 2;
  rotorGroup.add(rotorRing);

  const innerDiscGeometry = new CylinderGeometry(0.38, 0.38, 0.06, 48);
  const innerDiscMaterial = new MeshStandardMaterial({
    color: new Color(0x101822),
    roughness: 0.34,
    metalness: 0.3,
  });
  const innerDisc = new Mesh(innerDiscGeometry, innerDiscMaterial);
  innerDisc.rotation.x = Math.PI / 2;
  rotorGroup.add(innerDisc);

  const spokesGroup = new Group();
  rotorGroup.add(spokesGroup);
  const spokeCount = 6;
  const spokeLength = rotorRingRadius * 1.6;
  const spokeGeometry = new BoxGeometry(spokeLength, 0.06, 0.08);
  const spokeMaterial = new MeshStandardMaterial({
    color: new Color(0x3fb8ff),
    emissive: new Color(0x1d74ff),
    emissiveIntensity: 0.75,
    roughness: 0.26,
    metalness: 0.46,
  });
  for (let i = 0; i < spokeCount; i += 1) {
    const spoke = new Mesh(spokeGeometry, spokeMaterial);
    spoke.position.x = spokeLength / 2 - 0.08;
    spoke.rotation.z = Math.PI / 2;
    const spokeWrapper = new Group();
    spokeWrapper.rotation.y = (Math.PI * 2 * i) / spokeCount;
    spokeWrapper.add(spoke);
    spokesGroup.add(spokeWrapper);
  }

  const counterGroup = new Group();
  counterGroup.position.copy(rotorGroup.position);
  group.add(counterGroup);

  const counterRingGeometry = new TorusGeometry(
    rotorRingRadius * 0.72,
    0.07,
    20,
    64
  );
  const counterRingMaterial = new MeshStandardMaterial({
    color: new Color(0x1f88ff),
    emissive: new Color(0x2bbcff),
    emissiveIntensity: 0.8,
    roughness: 0.24,
    metalness: 0.38,
  });
  const counterRing = new Mesh(counterRingGeometry, counterRingMaterial);
  counterRing.rotation.x = Math.PI / 2;
  counterGroup.add(counterRing);

  const glyphRingGeometry = new RingGeometry(
    rotorRingRadius * 0.58,
    rotorRingRadius * 0.72,
    64,
    1
  );
  const glyphRingMaterial = new MeshBasicMaterial({
    color: new Color(0x8ad9ff),
    transparent: true,
    opacity: 0.22,
    side: DoubleSide,
    depthWrite: false,
  });
  const glyphRing = new Mesh(glyphRingGeometry, glyphRingMaterial);
  glyphRing.rotation.x = Math.PI / 2;
  counterGroup.add(glyphRing);

  const orbitGroup = new Group();
  orbitGroup.position.copy(rotorGroup.position);
  group.add(orbitGroup);

  const orbitRadius = rotorRingRadius * 1.12;
  const orbitGeometry = new SphereGeometry(0.08, 24, 24);
  const orbitMaterial = new MeshStandardMaterial({
    color: new Color(0xffffff),
    emissive: new Color(0x7be9ff),
    emissiveIntensity: 1.1,
    roughness: 0.1,
    metalness: 0.18,
  });
  const orbitCount = 3;
  for (let i = 0; i < orbitCount; i += 1) {
    const orb = new Mesh(orbitGeometry, orbitMaterial);
    const wrapper = new Group();
    wrapper.rotation.y = (Math.PI * 2 * i) / orbitCount;
    orb.position.set(orbitRadius, 0, 0);
    wrapper.add(orb);
    orbitGroup.add(wrapper);
  }

  const kioskWidth = 0.6;
  const orientation = options.orientationRadians ?? 0;
  const panelRadius = daisRadius + 0.48;
  const targetPanelX = options.centerX + Math.cos(orientation) * panelRadius;
  const targetPanelZ = options.centerZ + Math.sin(orientation) * panelRadius;
  const clampedPanelX = MathUtils.clamp(
    targetPanelX,
    options.roomBounds.minX + kioskWidth / 2,
    options.roomBounds.maxX - kioskWidth / 2
  );
  const clampedPanelZ = MathUtils.clamp(
    targetPanelZ,
    options.roomBounds.minZ + kioskWidth / 2,
    options.roomBounds.maxZ - kioskWidth / 2
  );
  const infoPanelGroup = new Group();
  infoPanelGroup.position.set(clampedPanelX, daisHeight + 0.62, clampedPanelZ);
  infoPanelGroup.lookAt(options.centerX, daisHeight + 0.62, options.centerZ);
  infoPanelGroup.rotateY(Math.PI);
  group.add(infoPanelGroup);

  const panelTexture = createFlywheelTechStackTexture();
  const panelMaterial = new MeshBasicMaterial({
    map: panelTexture,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const panelGeometry = new PlaneGeometry(1.8, 1);
  const panel = new Mesh(panelGeometry, panelMaterial);
  panel.position.y = 0.4;
  panel.renderOrder = 14;
  infoPanelGroup.add(panel);

  const panelBackerGeometry = new PlaneGeometry(1.84, 1.04);
  const panelBackerMaterial = new MeshStandardMaterial({
    color: new Color(0x0c141d),
    emissive: new Color(0x1a2c3c),
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.12,
  });
  const panelBacker = new Mesh(panelBackerGeometry, panelBackerMaterial);
  panelBacker.position.set(0, 0.4, -0.02);
  infoPanelGroup.add(panelBacker);

  const panelGlowGeometry = new PlaneGeometry(1.9, 1.08);
  const panelGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x3ebaff),
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  const panelGlow = new Mesh(panelGlowGeometry, panelGlowMaterial);
  panelGlow.position.set(0, 0.4, 0.02);
  panelGlow.renderOrder = 13;
  infoPanelGroup.add(panelGlow);

  const plinthGeometry = new BoxGeometry(0.42, 0.5, 0.42);
  const plinthMaterial = new MeshStandardMaterial({
    color: new Color(0x101823),
    roughness: 0.36,
    metalness: 0.18,
  });
  const plinth = new Mesh(plinthGeometry, plinthMaterial);
  plinth.position.set(0, 0.25, 0);
  infoPanelGroup.add(plinth);

  colliders.push({
    minX: options.centerX - daisRadius,
    maxX: options.centerX + daisRadius,
    minZ: options.centerZ - daisRadius,
    maxZ: options.centerZ + daisRadius,
  });

  colliders.push({
    minX: infoPanelGroup.position.x - kioskWidth / 2,
    maxX: infoPanelGroup.position.x + kioskWidth / 2,
    minZ: infoPanelGroup.position.z - kioskWidth / 2,
    maxZ: infoPanelGroup.position.z + kioskWidth / 2,
  });

  let spinVelocity = 0.6;
  let infoReveal = 0.08;

  function update(context: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) {
    const smoothing =
      context.delta > 0 ? 1 - Math.exp(-context.delta * 3.8) : 1;
    const targetVelocity = MathUtils.lerp(0.55, 2.6, context.emphasis);
    spinVelocity = MathUtils.lerp(spinVelocity, targetVelocity, smoothing);
    rotorGroup.rotation.y += spinVelocity * context.delta;
    counterGroup.rotation.y -= spinVelocity * 0.42 * context.delta;
    orbitGroup.rotation.y += spinVelocity * 0.3 * context.delta;

    const targetEmissive = MathUtils.lerp(0.8, 2.4, context.emphasis);
    accentMaterial.emissiveIntensity = MathUtils.lerp(
      accentMaterial.emissiveIntensity,
      targetEmissive,
      smoothing
    );
    rotorRingMaterial.emissiveIntensity = MathUtils.lerp(
      rotorRingMaterial.emissiveIntensity,
      MathUtils.lerp(0.9, 2.1, context.emphasis),
      smoothing
    );
    spokeMaterial.emissiveIntensity = MathUtils.lerp(
      spokeMaterial.emissiveIntensity,
      MathUtils.lerp(0.75, 1.8, context.emphasis),
      smoothing
    );
    counterRingMaterial.emissiveIntensity = MathUtils.lerp(
      counterRingMaterial.emissiveIntensity,
      MathUtils.lerp(0.8, 1.9, context.emphasis),
      smoothing
    );

    infoReveal = MathUtils.lerp(
      infoReveal,
      MathUtils.lerp(0.08, 1, context.emphasis),
      smoothing
    );
    panelMaterial.opacity = infoReveal;
    panelGlowMaterial.opacity = MathUtils.lerp(0.05, 0.32, context.emphasis);
    panel.position.y = MathUtils.lerp(0.34, 0.56, context.emphasis);
    panelBacker.position.y = panel.position.y - 0.02;
    panelGlow.position.y = panel.position.y;
    panel.visible = panelMaterial.opacity > 0.04;
    panelGlow.visible = panel.visible;

    glyphRingMaterial.opacity = MathUtils.lerp(0.18, 0.36, context.emphasis);
    orbitGroup.children.forEach((wrapper, index) => {
      wrapper.rotation.y =
        context.elapsed * 0.65 + (Math.PI * 2 * index) / orbitCount;
    });
  }

  return {
    group,
    colliders,
    update,
  };
}

function createFlywheelTechStackTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create tech stack canvas.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, 'rgba(33, 139, 255, 0.92)');
  gradient.addColorStop(1, 'rgba(18, 196, 255, 0.62)');

  context.fillStyle = 'rgba(5, 16, 28, 0.85)';
  roundRect(context, 40, 40, canvas.width - 80, canvas.height - 80, 28);
  context.fill();

  context.strokeStyle = 'rgba(77, 197, 255, 0.7)';
  context.lineWidth = 6;
  context.stroke();

  context.fillStyle = gradient;
  context.font = 'bold 96px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText('Flywheel Automation', 80, 86);

  context.fillStyle = '#bde9ff';
  context.font = '48px "Inter", "Segoe UI", sans-serif';
  context.fillText(
    'CI templates · typed prompts · reproducible scaffolds',
    80,
    200
  );

  context.font = '40px "Inter", "Segoe UI", sans-serif';
  const bulletItems = [
    'Scripts: lint · test · deploy hooks',
    'Stacks: Node · Python · WebGL orchestrations',
    'Runtime: GitHub Actions · pnpm/npm parity',
  ];
  bulletItems.forEach((item, index) => {
    const y = 280 + index * 80;
    context.fillStyle = 'rgba(117, 221, 255, 0.9)';
    context.fillRect(80, y, 18, 18);
    context.fillStyle = '#e2f6ff';
    context.fillText(item, 120, y - 20);
  });

  context.fillStyle = '#ffffff';
  context.font = 'bold 64px "Inter", "Segoe UI", sans-serif';
  context.fillText('Docs →', canvas.width - 280, canvas.height - 120);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(
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
