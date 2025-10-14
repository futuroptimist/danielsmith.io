import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';

export interface ModelRocketConfig {
  basePosition: Vector3;
  orientationRadians?: number;
  scale?: number;
}

export interface ModelRocketBuild {
  group: Group;
  collider: RectCollider;
}

const DEFAULT_SCALE = 1;
const FIN_COUNT = 3;

export function createModelRocket(config: ModelRocketConfig): ModelRocketBuild {
  const scale = config.scale ?? DEFAULT_SCALE;
  const orientation = config.orientationRadians ?? 0;
  const basePosition = config.basePosition.clone();

  const group = new Group();
  group.name = 'BackyardModelRocket';
  group.position.copy(basePosition);
  group.rotation.y = orientation;

  const standRadius = 0.85 * scale;
  const standHeight = 0.32 * scale;
  const standGeometry = new CylinderGeometry(
    standRadius,
    standRadius,
    standHeight,
    32
  );
  const standMaterial = new MeshStandardMaterial({
    color: new Color(0x2c3442),
    roughness: 0.58,
    metalness: 0.28,
  });
  const stand = new Mesh(standGeometry, standMaterial);
  stand.name = 'ModelRocketStand';
  stand.position.y = standHeight / 2;
  group.add(stand);

  const standTrimGeometry = new CylinderGeometry(
    standRadius * 0.98,
    standRadius * 1.04,
    standHeight * 0.38,
    32
  );
  const standTrimMaterial = new MeshStandardMaterial({
    color: new Color(0x39475b),
    emissive: new Color(0x172033),
    emissiveIntensity: 0.4,
    roughness: 0.46,
    metalness: 0.38,
  });
  const standTrim = new Mesh(standTrimGeometry, standTrimMaterial);
  standTrim.name = 'ModelRocketStandTrim';
  standTrim.position.y = standHeight * 0.72;
  group.add(standTrim);

  const bodyRadius = 0.36 * scale;
  const bodyHeight = 2.48 * scale;
  const bodyGeometry = new CylinderGeometry(
    bodyRadius * 1.02,
    bodyRadius * 0.94,
    bodyHeight,
    40
  );
  const bodyMaterial = new MeshStandardMaterial({
    color: new Color(0xe7eefc),
    roughness: 0.32,
    metalness: 0.16,
    emissive: new Color(0x102446),
    emissiveIntensity: 0.12,
  });
  const body = new Mesh(bodyGeometry, bodyMaterial);
  body.name = 'ModelRocketBody';
  body.position.y = standHeight + bodyHeight / 2;
  group.add(body);

  const stripeHeight = 0.24 * scale;
  const stripeGeometry = new CylinderGeometry(
    bodyRadius * 1.06,
    bodyRadius * 1.06,
    stripeHeight,
    40
  );
  const stripeMaterial = new MeshStandardMaterial({
    color: new Color(0xff6b6b),
    emissive: new Color(0xa02424),
    emissiveIntensity: 0.5,
    roughness: 0.42,
    metalness: 0.22,
  });
  const stripe = new Mesh(stripeGeometry, stripeMaterial);
  stripe.name = 'ModelRocketStripe';
  stripe.position.y = standHeight + bodyHeight * 0.45;
  group.add(stripe);

  const noseHeight = 1.1 * scale;
  const noseGeometry = new ConeGeometry(bodyRadius * 0.92, noseHeight, 40);
  const noseMaterial = new MeshStandardMaterial({
    color: new Color(0xff8976),
    emissive: new Color(0xb33a2d),
    emissiveIntensity: 0.55,
    roughness: 0.38,
    metalness: 0.24,
  });
  const nose = new Mesh(noseGeometry, noseMaterial);
  nose.name = 'ModelRocketNose';
  nose.position.y = standHeight + bodyHeight + noseHeight / 2;
  group.add(nose);

  const thrusterHeight = 0.38 * scale;
  const thrusterGeometry = new CylinderGeometry(
    bodyRadius * 0.78,
    bodyRadius * 0.62,
    thrusterHeight,
    32
  );
  const thrusterMaterial = new MeshStandardMaterial({
    color: new Color(0x1f2734),
    emissive: new Color(0x0f65ff),
    emissiveIntensity: 0.75,
    roughness: 0.48,
    metalness: 0.36,
  });
  const thruster = new Mesh(thrusterGeometry, thrusterMaterial);
  thruster.name = 'ModelRocketThruster';
  thruster.position.y = standHeight + thrusterHeight / 2 - 0.02 * scale;
  group.add(thruster);

  const finHeight = 0.78 * scale;
  const finLength = 0.96 * scale;
  const finThickness = 0.12 * scale;
  const finGeometry = new BoxGeometry(finLength, finHeight, finThickness);
  const finMaterial = new MeshStandardMaterial({
    color: new Color(0x1a2435),
    emissive: new Color(0x0c1d33),
    emissiveIntensity: 0.38,
    roughness: 0.44,
    metalness: 0.26,
  });
  const finRadius = bodyRadius + finLength / 2 - finThickness * 0.5;
  for (let i = 0; i < FIN_COUNT; i += 1) {
    const fin = new Mesh(finGeometry, finMaterial);
    fin.name = `ModelRocketFin-${i}`;
    const angle = (Math.PI * 2 * i) / FIN_COUNT;
    fin.rotation.y = angle;
    fin.position.set(
      Math.cos(angle) * finRadius,
      standHeight + finHeight / 2,
      Math.sin(angle) * finRadius
    );
    group.add(fin);
  }

  const safetyRingGeometry = new RingGeometry(
    standRadius * 1.18,
    standRadius * 1.52,
    48
  );
  const safetyRingMaterial = new MeshBasicMaterial({
    color: new Color(0xffd166),
    transparent: true,
    opacity: 0.62,
  });
  const safetyRing = new Mesh(safetyRingGeometry, safetyRingMaterial);
  safetyRing.name = 'ModelRocketSafetyRing';
  safetyRing.rotation.x = -Math.PI / 2;
  safetyRing.position.y = 0.02 * scale;
  group.add(safetyRing);

  const footprintRadius = standRadius * 1.45;
  const collider: RectCollider = {
    minX: basePosition.x - footprintRadius,
    maxX: basePosition.x + footprintRadius,
    minZ: basePosition.z - footprintRadius,
    maxZ: basePosition.z + footprintRadius,
  };

  return { group, collider };
}
