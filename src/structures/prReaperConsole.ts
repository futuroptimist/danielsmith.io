import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';

export interface PrReaperConsoleBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface PrReaperConsoleOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
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

  corners.forEach((corner) => {
    const worldX = center.x + corner.x * cos + corner.z * sin;
    const worldZ = center.z - corner.x * sin + corner.z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  });

  return { minX, maxX, minZ, maxZ };
}

function offsetLocal(
  base: Vector3,
  right: Vector3,
  forward: Vector3,
  offsetX: number,
  offsetZ: number
): Vector3 {
  return new Vector3(
    base.x + right.x * offsetX + forward.x * offsetZ,
    base.y,
    base.z + right.z * offsetX + forward.z * offsetZ
  );
}

export function createPrReaperConsole(
  options: PrReaperConsoleOptions
): PrReaperConsoleBuild {
  const { position, orientationRadians = 0 } = options;
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);

  const group = new Group();
  group.name = 'PrReaperConsole';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const right = new Vector3(Math.cos(orientationRadians), 0, -Math.sin(orientationRadians));
  const forward = new Vector3(Math.sin(orientationRadians), 0, Math.cos(orientationRadians));

  const colliders: RectCollider[] = [];

  const deckWidth = 2.6;
  const deckDepth = 1.6;
  const deckHeight = 0.18;
  const deckMaterial = new MeshStandardMaterial({
    color: new Color(0x101c28),
    roughness: 0.62,
    metalness: 0.24,
  });
  const deck = new Mesh(
    new BoxGeometry(deckWidth, deckHeight, deckDepth),
    deckMaterial
  );
  deck.name = 'PrReaperConsoleDeck';
  deck.position.y = deckHeight / 2;
  group.add(deck);

  const riserMaterial = new MeshStandardMaterial({
    color: new Color(0x17283a),
    emissive: new Color(0x123456),
    emissiveIntensity: 0.32,
    roughness: 0.44,
    metalness: 0.28,
  });
  const riser = new Mesh(new BoxGeometry(1.4, 0.24, 0.9), riserMaterial);
  riser.name = 'PrReaperConsoleRiser';
  riser.position.set(0, deckHeight + 0.12, -0.1);
  group.add(riser);

  const consoleBaseMaterial = new MeshStandardMaterial({
    color: new Color(0x1b2d3f),
    emissive: new Color(0x133a63),
    emissiveIntensity: 0.42,
    roughness: 0.38,
    metalness: 0.34,
  });
  const consoleBase = new Mesh(new BoxGeometry(1.24, 0.5, 0.62), consoleBaseMaterial);
  consoleBase.name = 'PrReaperConsoleBase';
  consoleBase.position.set(0, deckHeight + 0.5, -0.08);
  group.add(consoleBase);

  const consoleBridgeMaterial = new MeshStandardMaterial({
    color: new Color(0x1f3c56),
    emissive: new Color(0x1c83ff),
    emissiveIntensity: 0.58,
    roughness: 0.32,
    metalness: 0.28,
  });
  const consoleBridge = new Mesh(new BoxGeometry(1.26, 0.18, 0.68), consoleBridgeMaterial);
  consoleBridge.name = 'PrReaperConsoleBridge';
  consoleBridge.position.set(0, deckHeight + 0.94, -0.04);
  group.add(consoleBridge);

  const screenMaterial = new MeshStandardMaterial({
    color: new Color(0x0b1626),
    emissive: new Color(0x33aaff),
    emissiveIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.12,
  });
  const screen = new Mesh(new BoxGeometry(1.18, 0.9, 0.08), screenMaterial);
  screen.name = 'PrReaperConsoleScreen';
  screen.position.set(0, deckHeight + 1.4, 0.02);
  group.add(screen);

  const screenGlowMaterial = new MeshBasicMaterial({
    color: new Color(0x4cd6ff),
    transparent: true,
    opacity: 0.38,
    side: DoubleSide,
  });
  const screenGlow = new Mesh(new PlaneGeometry(1.3, 1.08), screenGlowMaterial);
  screenGlow.name = 'PrReaperConsoleScreenGlow';
  screenGlow.position.set(0, screen.position.y, 0.08);
  group.add(screenGlow);

  const holoRingMaterial = new MeshStandardMaterial({
    color: new Color(0x102a40),
    emissive: new Color(0x33d7ff),
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.24,
  });
  const holoRing = new Mesh(new TorusGeometry(0.52, 0.04, 16, 64), holoRingMaterial);
  holoRing.name = 'PrReaperConsoleHologram';
  holoRing.rotation.x = Math.PI / 2;
  holoRing.position.set(0, deckHeight + 1.08, -0.36);
  group.add(holoRing);

  const sweepMaterial = new MeshBasicMaterial({
    color: new Color(0x55d1ff),
    transparent: true,
    opacity: 0.5,
    side: DoubleSide,
  });
  const sweep = new Mesh(new PlaneGeometry(1.02, 0.22), sweepMaterial);
  sweep.name = 'PrReaperConsoleSweep';
  sweep.position.copy(holoRing.position);
  sweep.rotation.x = Math.PI / 2;
  group.add(sweep);

  const logTableMaterial = new MeshStandardMaterial({
    color: new Color(0x233645),
    emissive: new Color(0x114488),
    emissiveIntensity: 0.36,
    roughness: 0.46,
    metalness: 0.26,
  });
  const logTable = new Mesh(new BoxGeometry(1.8, 0.12, 0.54), logTableMaterial);
  logTable.name = 'PrReaperConsoleLogTable';
  logTable.position.set(0, deckHeight + 0.36, -0.86);
  group.add(logTable);

  const intakeMaterial = new MeshStandardMaterial({
    color: new Color(0x182330),
    emissive: new Color(0x0f65ff),
    emissiveIntensity: 0.48,
    roughness: 0.38,
    metalness: 0.3,
  });
  const intake = new Mesh(new CylinderGeometry(0.22, 0.22, 0.18, 24), intakeMaterial);
  intake.name = 'PrReaperConsoleIntake';
  intake.rotation.x = Math.PI / 2;
  intake.position.copy(logTable.position).add(new Vector3(0, 0.12, -0.08));
  group.add(intake);

  const walkwayMaterial = new MeshStandardMaterial({
    color: new Color(0x0f171f),
    roughness: 0.7,
    metalness: 0.18,
  });
  const walkwayDepth = 0.7;
  const walkway = new Mesh(new BoxGeometry(1.6, 0.12, walkwayDepth), walkwayMaterial);
  walkway.name = 'PrReaperConsoleWalkway';
  walkway.position.set(0, 0.06, deckDepth / 2 + walkwayDepth / 2 - 0.12);
  group.add(walkway);

  const cautionMaterial = new MeshBasicMaterial({
    color: new Color(0xffc561),
    transparent: true,
    opacity: 0.6,
  });
  const cautionStrip = new Mesh(new PlaneGeometry(1.5, 0.14), cautionMaterial);
  cautionStrip.name = 'PrReaperConsoleCautionStrip';
  cautionStrip.rotation.x = -Math.PI / 2;
  cautionStrip.position.set(0, walkway.position.y + 0.07, walkway.position.z);
  group.add(cautionStrip);

  const deckCollider = createCollider(basePosition, deckWidth, deckDepth, orientationRadians);
  colliders.push(deckCollider);
  const walkwayOffset = deckDepth / 2 + walkwayDepth / 2 - 0.12;
  const walkwayCenter = offsetLocal(basePosition, right, forward, 0, walkwayOffset);
  colliders.push(createCollider(walkwayCenter, 1.6, walkwayDepth, orientationRadians));

  const update = ({
    elapsed,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    const clampedEmphasis = MathUtils.clamp(emphasis, 0, 1);
    const pulse = (Math.sin(elapsed * 2.2) + 1) / 2;
    const intensity = MathUtils.lerp(0.35, 1.25, Math.min(1, clampedEmphasis + pulse * 0.55));
    screenMaterial.emissiveIntensity = intensity;
    consoleBridgeMaterial.emissiveIntensity = MathUtils.lerp(
      0.4,
      1.1,
      Math.min(1, clampedEmphasis + pulse * 0.6)
    );
    holoRingMaterial.emissiveIntensity = MathUtils.lerp(
      0.45,
      1.2,
      Math.min(1, clampedEmphasis * 0.8 + pulse * 0.65)
    );
    intakeMaterial.emissiveIntensity = MathUtils.lerp(
      0.32,
      1.6,
      Math.min(1, clampedEmphasis + pulse * 0.8)
    );
    riserMaterial.emissiveIntensity = MathUtils.lerp(
      0.18,
      0.58,
      Math.min(1, clampedEmphasis * 0.7 + pulse * 0.4)
    );
    sweepMaterial.opacity = MathUtils.clamp(
      MathUtils.lerp(0.25, 0.85, clampedEmphasis) * (0.5 + pulse * 0.6),
      0.12,
      1
    );
    sweep.rotation.z = elapsed * MathUtils.lerp(1, 2.4, clampedEmphasis + 0.2);
  };

  return { group, colliders, update };
}
