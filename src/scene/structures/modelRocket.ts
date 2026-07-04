import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  Vector3,
} from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

import { createRequiredTightPoiCollider } from './poiColliderBounds';

export interface ModelRocketConfig {
  basePosition: Vector3;
  orientationRadians?: number;
  scale?: number;
  detailPolicy?: SceneDetailPolicy;
}

export interface ModelRocketBuild {
  group: Group;
  collider: RectCollider;
  update(context: { elapsed: number; delta: number }): void;
}

const DEFAULT_SCALE = 1;
const FIN_COUNT = 3;
const PHYSICAL_ROCKET_MESH_NAMES =
  /^(ModelRocketBody|ModelRocketStripe|ModelRocketNose|ModelRocketThruster|ModelRocketFin-\d+)$/;

export const isDspaceRocketPhysicalColliderMesh = (
  objectName: string
): boolean => PHYSICAL_ROCKET_MESH_NAMES.test(objectName);

export function createModelRocket(config: ModelRocketConfig): ModelRocketBuild {
  const detailPolicy = config.detailPolicy ?? getSceneDetailPolicy('balanced');
  const isPerformance = detailPolicy.level === 'performance';
  const cylinderSegments = detailPolicy.geometry.cylinderSegments;
  const ringSegments = detailPolicy.geometry.ringSegments;
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
    cylinderSegments
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
    cylinderSegments
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
    cylinderSegments
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
    cylinderSegments
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
  const noseGeometry = new ConeGeometry(
    bodyRadius * 0.92,
    noseHeight,
    cylinderSegments
  );
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
    cylinderSegments
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

  const thrusterLightBaseIntensity = 3.6 * scale;
  const thrusterLight = new PointLight(
    new Color(0xffa46b),
    thrusterLightBaseIntensity,
    4.2 * scale,
    1.6
  );
  thrusterLight.name = 'ModelRocketThrusterLight';
  thrusterLight.position.set(0, standHeight + thrusterHeight * 0.24, 0);
  thrusterLight.visible = detailPolicy.effects.dynamicPointLights;
  group.add(thrusterLight);

  const flameGeometry = new ConeGeometry(
    bodyRadius * 0.42,
    0.88 * scale,
    cylinderSegments,
    1,
    true
  );
  const flameMaterial = new MeshBasicMaterial({
    color: new Color(0xffa45b),
    transparent: true,
    opacity: 0.32,
    side: DoubleSide,
  });
  const flame = new Mesh(flameGeometry, flameMaterial);
  flame.name = 'ModelRocketThrusterFlame';
  flame.position.set(0, standHeight - thrusterHeight * 0.32, 0);
  flame.rotation.x = Math.PI;
  flame.scale.set(0.75, 0.5, 0.75);
  flame.visible = !isPerformance;
  group.add(flame);

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
    ringSegments
  );
  const safetyRingMaterial = new MeshBasicMaterial({
    color: new Color(0xffd166),
    transparent: true,
    opacity: 0.62,
    side: DoubleSide,
  });
  const safetyRing = new Mesh(safetyRingGeometry, safetyRingMaterial);
  safetyRing.name = 'ModelRocketSafetyRing';
  safetyRing.rotation.x = -Math.PI / 2;
  safetyRing.position.y = 0.02 * scale;
  safetyRing.visible = !isPerformance;
  group.add(safetyRing);

  const countdownPanelMaterial = new MeshBasicMaterial({
    color: new Color(0xffe3a7),
    transparent: true,
    opacity: 0.36,
    side: DoubleSide,
  });
  const countdownPanel = new Mesh(
    new BoxGeometry(0.32 * scale, bodyHeight * 0.38, 0.04 * scale),
    countdownPanelMaterial
  );
  countdownPanel.name = 'ModelRocketCountdownPanel';
  countdownPanel.position.set(
    0,
    standHeight + bodyHeight * 0.52,
    bodyRadius + 0.12 * scale
  );
  countdownPanel.rotation.y = Math.PI;
  countdownPanel.visible = !isPerformance;
  group.add(countdownPanel);

  const collider = createRequiredTightPoiCollider(group, {
    debugName: 'DspaceRocketCollider',
    include: (object) => isDspaceRocketPhysicalColliderMesh(object.name),
    includeOnly: true,
  });

  const thrusterBaseEmissive = thrusterMaterial.emissiveIntensity;
  const standTrimBaseEmissive = standTrimMaterial.emissiveIntensity;
  const flameBaseOpacity = flameMaterial.opacity;
  const safetyRingBaseOpacity = safetyRingMaterial.opacity;
  const countdownBaseOpacity = countdownPanelMaterial.opacity;
  const countdownBaseScaleY = countdownPanel.scale.y;
  const thrusterLightBaseDistance = thrusterLight.distance;

  const update = ({ elapsed }: { elapsed: number; delta: number }) => {
    if (isPerformance) {
      return;
    }
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const thrusterPulse =
      ((Math.sin(elapsed * 2.1) + 1) / 2) * MathUtils.lerp(0.45, 1, pulseScale);
    const haloPulse =
      ((Math.sin(elapsed * 1.08 + Math.PI / 3) + 1) / 2) *
      MathUtils.lerp(0.35, 1, pulseScale);
    const countdownPhase = (((elapsed % 4.5) + 4.5) % 4.5) / 4.5;
    const countdownStrength = MathUtils.lerp(0.4, 1, pulseScale);

    thrusterMaterial.emissiveIntensity = MathUtils.lerp(
      thrusterBaseEmissive * 0.72,
      thrusterBaseEmissive * 1.9,
      thrusterPulse
    );

    standTrimMaterial.emissiveIntensity = MathUtils.lerp(
      standTrimBaseEmissive * 0.85,
      standTrimBaseEmissive * 1.42,
      haloPulse
    );

    thrusterLight.intensity =
      thrusterLightBaseIntensity * MathUtils.lerp(0.78, 1.62, thrusterPulse);
    thrusterLight.distance =
      thrusterLightBaseDistance * MathUtils.lerp(0.82, 1.24, thrusterPulse);

    flameMaterial.opacity = MathUtils.clamp(
      MathUtils.lerp(flameBaseOpacity * 0.25, 0.9, thrusterPulse),
      0,
      0.95
    );
    const flameScale = MathUtils.lerp(0.55, 1.08, thrusterPulse);
    flame.scale.set(
      flameScale,
      MathUtils.lerp(0.45, 1.18, thrusterPulse),
      flameScale
    );

    safetyRingMaterial.opacity = MathUtils.clamp(
      safetyRingBaseOpacity * (0.62 + haloPulse * 0.55),
      0.12,
      0.95
    );
    safetyRing.scale.setScalar(MathUtils.lerp(1, 1.14, haloPulse));
    safetyRing.rotation.z = -Math.PI * 2 * countdownPhase;

    const countdownWeight = (1 - countdownPhase) * countdownStrength;
    countdownPanel.scale.y = MathUtils.lerp(
      countdownBaseScaleY * 0.5,
      countdownBaseScaleY * 1.08,
      countdownWeight
    );
    countdownPanelMaterial.opacity = MathUtils.clamp(
      MathUtils.lerp(countdownBaseOpacity * 0.45, 0.92, countdownWeight),
      0.14,
      0.92
    );
  };

  return { group, collider, update };
}
