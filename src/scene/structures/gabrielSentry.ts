import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';

export interface GabrielSentryBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface GabrielSentryOptions {
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
    const worldX = center.x + corner.x * cos - corner.z * sin;
    const worldZ = center.z + corner.x * sin + corner.z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  });

  return { minX, maxX, minZ, maxZ };
}

export function createGabrielSentry(
  options: GabrielSentryOptions
): GabrielSentryBuild {
  const { position, orientationRadians = 0 } = options;
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);

  const group = new Group();
  group.name = 'GabrielSentry';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const colliders: RectCollider[] = [];

  const baseRadius = 0.9;
  const baseHeight = 0.22;
  const baseMaterial = new MeshStandardMaterial({
    color: new Color(0x141f2a),
    roughness: 0.58,
    metalness: 0.26,
  });
  const base = new Mesh(
    new CylinderGeometry(baseRadius, baseRadius, baseHeight, 32),
    baseMaterial
  );
  base.name = 'GabrielSentryBase';
  base.position.y = baseHeight / 2;
  group.add(base);

  const coreMaterial = new MeshStandardMaterial({
    color: new Color(0x1b2d3f),
    emissive: new Color(0x123c74),
    emissiveIntensity: 0.45,
    roughness: 0.42,
    metalness: 0.32,
  });
  const core = new Mesh(new CylinderGeometry(0.38, 0.5, 1.6, 24), coreMaterial);
  core.name = 'GabrielSentryCore';
  core.position.y = baseHeight + 0.8;
  group.add(core);

  const sensorMaterial = new MeshStandardMaterial({
    color: new Color(0x2a8cff),
    emissive: new Color(0x1448ff),
    emissiveIntensity: 0.55,
    roughness: 0.38,
    metalness: 0.28,
  });
  const sensor = new Mesh(new SphereGeometry(0.32, 24, 24), sensorMaterial);
  sensor.name = 'GabrielSentrySensor';
  sensor.position.y = core.position.y + 0.64;
  group.add(sensor);

  const headGroup = new Group();
  headGroup.name = 'GabrielSentryScanner';
  headGroup.position.y = sensor.position.y + 0.42;
  group.add(headGroup);

  const ringMaterial = new MeshStandardMaterial({
    color: new Color(0x1a1d2a),
    emissive: new Color(0x1828ff),
    emissiveIntensity: 0.4,
    roughness: 0.35,
    metalness: 0.3,
  });
  const ring = new Mesh(new TorusGeometry(0.6, 0.08, 16, 48), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  headGroup.add(ring);

  const scannerMaterial = new MeshStandardMaterial({
    color: new Color(0x272f3f),
    emissive: new Color(0xff2e45),
    emissiveIntensity: 0.7,
    roughness: 0.28,
    metalness: 0.36,
  });
  const scannerBar = new Mesh(
    new BoxGeometry(0.12, 0.42, 1.1),
    scannerMaterial
  );
  scannerBar.name = 'GabrielSentryScannerBar';
  scannerBar.position.y = 0.12;
  headGroup.add(scannerBar);

  const beaconMaterial = new MeshStandardMaterial({
    color: new Color(0xff4b4b),
    emissive: new Color(0xff1a1a),
    emissiveIntensity: 1.2,
    roughness: 0.22,
    metalness: 0.4,
  });
  const beacon = new Mesh(
    new CylinderGeometry(0.14, 0.12, 0.24, 20),
    beaconMaterial
  );
  beacon.name = 'GabrielSentryBeacon';
  beacon.position.y = 0.44;
  headGroup.add(beacon);

  const beaconLight = new PointLight(0xff3a3a, 4.5, 6.5, 2.4);
  beaconLight.name = 'GabrielSentryBeaconLight';
  beaconLight.position.set(0, 0.64, 0);
  headGroup.add(beaconLight);

  const shieldMaterial = new MeshStandardMaterial({
    color: new Color(0x101828),
    roughness: 0.54,
    metalness: 0.22,
  });
  const shield = new Mesh(new BoxGeometry(0.9, 0.3, 0.16), shieldMaterial);
  shield.name = 'GabrielSentryShield';
  shield.position.set(0, 0.32, 0);
  core.add(shield);

  const update = ({
    elapsed,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    const rotationSpeed = MathUtils.lerp(1.4, 2.4, Math.min(1, emphasis + 0.2));
    headGroup.rotation.y = (elapsed * rotationSpeed) % (Math.PI * 2);

    const pulse = Math.max(0, Math.sin(elapsed * Math.PI * 2));
    const flashIntensity = Math.pow(pulse, 3);
    const scaled = MathUtils.lerp(0.4, 1.4, flashIntensity);
    beaconMaterial.emissiveIntensity =
      scaled * MathUtils.lerp(1, 1.8, emphasis);
    beaconLight.intensity = MathUtils.lerp(
      2.5,
      9,
      flashIntensity * (0.6 + emphasis)
    );
    scannerMaterial.emissiveIntensity = MathUtils.lerp(
      0.4,
      1.1,
      emphasis + pulse * 0.6
    );
    ringMaterial.emissiveIntensity = MathUtils.lerp(0.35, 0.85, emphasis);
  };

  const colliderCenter = new Vector3(basePosition.x, 0, basePosition.z);
  colliders.push(
    createCollider(
      colliderCenter,
      baseRadius * 2.2,
      baseRadius * 2,
      orientationRadians
    )
  );

  return { group, colliders, update };
}
