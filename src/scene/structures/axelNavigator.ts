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
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';

export interface AxelNavigatorBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface AxelNavigatorOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
}

interface RingLayer {
  wrapper: Group;
  material: MeshBasicMaterial;
  baseOpacity: number;
}

interface BeaconNode {
  mesh: Mesh;
  material: MeshStandardMaterial;
  baseIntensity: number;
  phase: number;
}

export type QuestMomentumStage = 'discover' | 'build' | 'qa' | 'ship';

export interface QuestMomentumPreset {
  readonly id: string;
  readonly label: string;
  readonly progress: number;
  readonly stage: QuestMomentumStage;
}

export const QUEST_MOMENTUM_PRESETS: readonly QuestMomentumPreset[] = [
  {
    id: 'lighting-finale',
    label: 'Lighting pass finale',
    progress: 0.82,
    stage: 'ship',
  },
  {
    id: 'hud-accessibility',
    label: 'HUD accessibility polish',
    progress: 0.67,
    stage: 'qa',
  },
  {
    id: 'backyard-expansion',
    label: 'Backyard exhibit expansion',
    progress: 0.54,
    stage: 'build',
  },
  {
    id: 'narrative-cards',
    label: 'Narrative case cards',
    progress: 0.36,
    stage: 'discover',
  },
];

interface QuestIndicator {
  mesh: Mesh;
  material: MeshStandardMaterial;
  halo: Mesh;
  haloMaterial: MeshBasicMaterial;
  baseIntensity: number;
  baseOpacity: number;
  baseHaloOpacity: number;
  orbitRadius: number;
  baseHeight: number;
  progress: number;
  pulsePhase: number;
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
    const rotatedX = corner.x * cos - corner.z * sin;
    const rotatedZ = corner.x * sin + corner.z * cos;
    const worldX = center.x + rotatedX;
    const worldZ = center.z + rotatedZ;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  }

  return { minX, maxX, minZ, maxZ };
}

export function createAxelNavigator(
  options: AxelNavigatorOptions
): AxelNavigatorBuild {
  const { position, orientationRadians = 0 } = options;
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);

  const group = new Group();
  group.name = 'AxelQuestNavigator';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const colliders: RectCollider[] = [];

  const daisHeight = 0.16;
  const daisRadius = 1.05;
  const dais = new Mesh(
    new CylinderGeometry(daisRadius * 1.05, daisRadius, daisHeight, 48),
    new MeshStandardMaterial({
      color: new Color(0x101720),
      roughness: 0.46,
      metalness: 0.22,
    })
  );
  dais.name = 'AxelNavigatorDais';
  dais.position.set(0, daisHeight / 2, 0);
  group.add(dais);

  const tableHeight = 0.32;
  const tableRadius = 0.78;
  const table = new Mesh(
    new CylinderGeometry(tableRadius, tableRadius * 1.02, tableHeight, 56),
    new MeshStandardMaterial({
      color: new Color(0x151f2c),
      roughness: 0.34,
      metalness: 0.28,
    })
  );
  table.name = 'AxelNavigatorTable';
  table.position.set(0, daisHeight + tableHeight / 2, 0);
  group.add(table);

  const slateThickness = 0.045;
  const slateMaterial = new MeshStandardMaterial({
    color: new Color(0x0b1621),
    emissive: new Color(0x1f9eff),
    emissiveIntensity: 0.42,
    roughness: 0.24,
    metalness: 0.3,
  });
  const slate = new Mesh(
    new BoxGeometry(tableRadius * 1.8, slateThickness, tableRadius * 1.2),
    slateMaterial
  );
  slate.name = 'AxelNavigatorSlate';
  slate.position.set(
    0,
    daisHeight + tableHeight + slateThickness / 2 + 0.02,
    0
  );
  group.add(slate);

  const glassMaterial = new MeshStandardMaterial({
    color: new Color(0x1b3a4d),
    transparent: true,
    opacity: 0.26,
    roughness: 0.14,
    metalness: 0.08,
    emissive: new Color(0x104a66),
    emissiveIntensity: 0.18,
  });
  const glass = new Mesh(
    new BoxGeometry(
      tableRadius * 1.88,
      slateThickness * 0.8,
      tableRadius * 1.28
    ),
    glassMaterial
  );
  glass.name = 'AxelNavigatorGlass';
  glass.position.set(0, slate.position.y + slateThickness / 2 + 0.01, 0);
  group.add(glass);

  const bezelMaterial = new MeshStandardMaterial({
    color: new Color(0x0d141b),
    roughness: 0.6,
    metalness: 0.16,
  });
  const bezel = new Mesh(
    new BoxGeometry(tableRadius * 1.9, 0.08, tableRadius * 1.32),
    bezelMaterial
  );
  bezel.name = 'AxelNavigatorBezel';
  bezel.position.set(0, slate.position.y - slateThickness / 2 - 0.02, 0);
  group.add(bezel);

  const consoleHeight = 0.32;
  const consoleMaterial = new MeshStandardMaterial({
    color: new Color(0x111b25),
    roughness: 0.38,
    metalness: 0.22,
  });
  const console = new Mesh(
    new BoxGeometry(0.36, consoleHeight, 0.24),
    consoleMaterial
  );
  console.name = 'AxelNavigatorConsole';
  console.position.set(
    0,
    slate.position.y + consoleHeight / 2 + 0.02,
    -tableRadius * 0.35
  );
  group.add(console);

  const consoleScreenMaterial = new MeshStandardMaterial({
    color: new Color(0x081926),
    emissive: new Color(0x35e8ff),
    emissiveIntensity: 0.48,
    roughness: 0.2,
    metalness: 0.32,
  });
  const consoleScreen = new Mesh(
    new PlaneGeometry(0.28, 0.18),
    consoleScreenMaterial
  );
  consoleScreen.name = 'AxelNavigatorConsoleScreen';
  consoleScreen.position.set(
    0,
    consoleHeight * 0.1,
    console.geometry.parameters.depth / 2 + 0.002
  );
  consoleScreen.rotation.x = Math.PI;
  console.add(consoleScreen);

  const hologramGroup = new Group();
  hologramGroup.name = 'AxelNavigatorHologram';
  const hologramBaseHeight = console.position.y + consoleHeight * 0.54;
  hologramGroup.position.set(0, hologramBaseHeight, 0);
  group.add(hologramGroup);

  const ringLayers: RingLayer[] = [];
  const ringCount = 3;
  for (let index = 0; index < ringCount; index += 1) {
    const innerRadius = 0.34 + index * 0.12;
    const outerRadius = innerRadius + 0.1;
    const material = new MeshBasicMaterial({
      color: new Color(0x6de9ff),
      transparent: true,
      opacity: 0.18 + index * 0.06,
      side: DoubleSide,
      depthWrite: false,
    });
    const ring = new Mesh(
      new RingGeometry(innerRadius, outerRadius, 64, 1),
      material
    );
    ring.name = `AxelNavigatorRing-${index}`;
    ring.rotation.x = Math.PI / 2;

    const wrapper = new Group();
    wrapper.name = `AxelNavigatorRingWrapper-${index}`;
    wrapper.add(ring);
    ring.position.y = index * 0.02;
    hologramGroup.add(wrapper);

    ringLayers.push({
      wrapper,
      material,
      baseOpacity: material.opacity,
    });
  }

  const arcMaterial = new MeshBasicMaterial({
    color: new Color(0x9ff8ff),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: DoubleSide,
  });
  const arc = new Mesh(
    new TorusGeometry(0.52, 0.015, 16, 64, Math.PI * 0.68),
    arcMaterial
  );
  arc.name = 'AxelNavigatorArc';
  arc.rotation.set(Math.PI / 2, 0, Math.PI / 3);
  hologramGroup.add(arc);

  const questStageColors: Record<QuestMomentumStage, Color> = {
    discover: new Color(0x44e4ff),
    build: new Color(0x6bfbd3),
    qa: new Color(0xffcf6a),
    ship: new Color(0xff8eff),
  };

  const questMomentumGroup = new Group();
  questMomentumGroup.name = 'AxelNavigatorQuestMomentum';
  hologramGroup.add(questMomentumGroup);

  const questIndicators: QuestIndicator[] = [];

  QUEST_MOMENTUM_PRESETS.forEach((quest, index) => {
    const stageColor = questStageColors[quest.stage];
    const indicatorMaterial = new MeshStandardMaterial({
      color: stageColor.clone().multiplyScalar(0.36),
      emissive: stageColor.clone(),
      emissiveIntensity: 0.44,
      roughness: 0.24,
      metalness: 0.32,
      transparent: true,
      opacity: 0.58,
    });

    const indicator = new Mesh(
      new SphereGeometry(0.055, 24, 24),
      indicatorMaterial
    );
    indicator.name = `AxelNavigatorQuestIndicator-${quest.id}`;

    const orbitRadius = 0.42 + (index % 2) * 0.08;
    const baseHeight = 0.18 + (index % 3) * 0.045;
    const baseAngle = quest.progress * Math.PI * 2;

    indicator.position.set(
      Math.cos(baseAngle) * orbitRadius,
      baseHeight,
      Math.sin(baseAngle) * orbitRadius
    );

    const haloMaterial = new MeshBasicMaterial({
      color: stageColor.clone(),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: DoubleSide,
    });
    const halo = new Mesh(new RingGeometry(0.09, 0.14, 32), haloMaterial);
    halo.name = `AxelNavigatorQuestHalo-${quest.id}`;
    halo.position.copy(indicator.position);
    halo.position.y = baseHeight - 0.04;
    halo.rotation.x = -Math.PI / 2;

    questMomentumGroup.add(indicator);
    questMomentumGroup.add(halo);

    questIndicators.push({
      mesh: indicator,
      material: indicatorMaterial,
      halo,
      haloMaterial,
      baseIntensity: indicatorMaterial.emissiveIntensity,
      baseOpacity: indicatorMaterial.opacity,
      baseHaloOpacity: haloMaterial.opacity,
      orbitRadius,
      baseHeight,
      progress: quest.progress,
      pulsePhase: index * Math.PI * 0.33,
    });
  });

  const beaconNodes: BeaconNode[] = [];
  const beaconMaterial = new MeshStandardMaterial({
    color: new Color(0xffffff),
    emissive: new Color(0x32f0ff),
    emissiveIntensity: 0.48,
    roughness: 0.12,
    metalness: 0.24,
  });
  const beaconGeometry = new CylinderGeometry(0.05, 0.05, 0.3, 16);
  const beaconOffsets: Array<[number, number]> = [
    [0.52, 0],
    [-0.52, 0],
    [0, 0.52],
    [0, -0.52],
  ];
  beaconOffsets.forEach(([offsetX, offsetZ], index) => {
    const material = beaconMaterial.clone();
    const beacon = new Mesh(beaconGeometry, material);
    beacon.name = `AxelNavigatorBeacon-${index}`;
    beacon.position.set(offsetX, 0.16, offsetZ);
    beacon.rotation.x = Math.PI / 2;
    hologramGroup.add(beacon);
    beaconNodes.push({
      mesh: beacon,
      material,
      baseIntensity: material.emissiveIntensity,
      phase: index * Math.PI * 0.5,
    });
  });

  const questCardMaterial = new MeshStandardMaterial({
    color: new Color(0x0c2333),
    emissive: new Color(0x1ca7ff),
    emissiveIntensity: 0.36,
    roughness: 0.28,
    metalness: 0.34,
  });
  const questCard = new Mesh(
    new BoxGeometry(0.32, 0.02, 0.52),
    questCardMaterial
  );
  questCard.name = 'AxelNavigatorQuestCard';
  questCard.position.set(0, slate.position.y + 0.08, 0.34);
  questCard.rotation.x = -Math.PI / 9;
  group.add(questCard);

  const questBadgeMaterial = new MeshStandardMaterial({
    color: new Color(0x102033),
    emissive: new Color(0x48faff),
    emissiveIntensity: 0.42,
    roughness: 0.22,
    metalness: 0.3,
  });
  const questBadge = new Mesh(
    new CylinderGeometry(0.11, 0.11, 0.04, 24),
    questBadgeMaterial
  );
  questBadge.name = 'AxelNavigatorQuestBadge';
  questBadge.position.set(
    questCard.position.x + 0.18,
    questCard.position.y + 0.08,
    questCard.position.z - 0.14
  );
  questBadge.rotation.x = Math.PI / 2;
  group.add(questBadge);

  const colliderCenter = new Vector3(basePosition.x, 0, basePosition.z);
  colliders.push(
    createCollider(
      colliderCenter,
      tableRadius * 2.4,
      tableRadius * 2.2,
      orientationRadians
    )
  );

  colliders.push(
    createCollider(
      new Vector3(
        basePosition.x + Math.sin(orientationRadians) * 0.9,
        0,
        basePosition.z - Math.cos(orientationRadians) * 0.9
      ),
      0.9,
      0.8,
      orientationRadians
    )
  );

  let wavePhase = 0;

  const update = ({
    elapsed,
    delta,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    const smoothing = delta > 0 ? 1 - Math.exp(-delta * 4) : 1;
    const targetSlateEmissive = MathUtils.lerp(0.42, 1.4, emphasis);
    slateMaterial.emissiveIntensity = MathUtils.lerp(
      slateMaterial.emissiveIntensity,
      targetSlateEmissive,
      smoothing
    );
    glassMaterial.opacity = MathUtils.lerp(
      glassMaterial.opacity,
      MathUtils.lerp(0.26, 0.52, emphasis),
      smoothing
    );
    consoleScreenMaterial.emissiveIntensity = MathUtils.lerp(
      consoleScreenMaterial.emissiveIntensity,
      MathUtils.lerp(0.48, 1.1, emphasis),
      smoothing
    );
    questCardMaterial.emissiveIntensity = MathUtils.lerp(
      questCardMaterial.emissiveIntensity,
      MathUtils.lerp(0.36, 0.96, emphasis),
      smoothing
    );
    questBadgeMaterial.emissiveIntensity = MathUtils.lerp(
      questBadgeMaterial.emissiveIntensity,
      MathUtils.lerp(0.42, 1.2, emphasis),
      smoothing
    );

    const spinSpeed = MathUtils.lerp(0.6, 2.2, emphasis);
    ringLayers.forEach((layer, index) => {
      layer.wrapper.rotation.y += delta * (spinSpeed + index * 0.24);
      const targetOpacity = MathUtils.lerp(
        layer.baseOpacity,
        0.38 + index * 0.12,
        emphasis
      );
      layer.material.opacity = MathUtils.lerp(
        layer.material.opacity,
        targetOpacity,
        smoothing
      );
    });

    wavePhase += delta * MathUtils.lerp(0.8, 1.6, emphasis);
    const bobHeight = MathUtils.lerp(0.02, 0.08, emphasis);
    hologramGroup.position.y =
      hologramBaseHeight + Math.sin(elapsed * 1.4) * bobHeight;

    const questPulseSpeed = MathUtils.lerp(0.6, 1.6, emphasis);
    questIndicators.forEach((indicator, index) => {
      indicator.pulsePhase += delta * (questPulseSpeed + index * 0.08);
      const swirlProgress = MathUtils.euclideanModulo(
        indicator.progress + Math.sin(indicator.pulsePhase) * 0.08,
        1
      );
      const angle = swirlProgress * Math.PI * 2;
      const heightOffset =
        Math.sin(elapsed * 1.6 + indicator.pulsePhase) *
        MathUtils.lerp(0.02, 0.08, emphasis);
      const bobHeight = indicator.baseHeight + heightOffset;
      indicator.mesh.position.set(
        Math.cos(angle) * indicator.orbitRadius,
        bobHeight,
        Math.sin(angle) * indicator.orbitRadius
      );
      const targetIntensity =
        indicator.baseIntensity +
        (0.6 + emphasis * 0.8) * (0.4 + Math.sin(indicator.pulsePhase) * 0.3);
      indicator.material.emissiveIntensity = MathUtils.lerp(
        indicator.material.emissiveIntensity,
        targetIntensity,
        smoothing
      );
      const targetOpacity =
        indicator.baseOpacity +
        (0.22 + emphasis * 0.4) *
          (0.5 + Math.sin(indicator.pulsePhase * 1.1) * 0.5);
      indicator.material.opacity = MathUtils.lerp(
        indicator.material.opacity,
        targetOpacity,
        smoothing
      );

      indicator.halo.position.set(
        indicator.mesh.position.x,
        bobHeight - 0.04,
        indicator.mesh.position.z
      );
      const haloTargetOpacity =
        indicator.baseHaloOpacity +
        MathUtils.clamp(0.4 + Math.sin(indicator.pulsePhase * 1.4) * 0.4, 0, 1);
      indicator.haloMaterial.opacity = MathUtils.lerp(
        indicator.haloMaterial.opacity,
        haloTargetOpacity,
        smoothing
      );
      indicator.halo.rotation.x = -Math.PI / 2;
      indicator.halo.rotation.z = angle;
    });

    beaconNodes.forEach((node, index) => {
      const pulse = 0.7 + Math.sin(wavePhase + node.phase + index * 0.35) * 0.3;
      const targetIntensity =
        MathUtils.lerp(node.baseIntensity, 1.6, emphasis) * pulse;
      node.material.emissiveIntensity = MathUtils.lerp(
        node.material.emissiveIntensity,
        targetIntensity,
        smoothing
      );
      node.mesh.rotation.y += delta * (0.6 + emphasis * 1.2);
    });

    arcMaterial.opacity = MathUtils.lerp(
      arcMaterial.opacity,
      MathUtils.lerp(0.22, 0.5, emphasis),
      smoothing
    );
  };

  return {
    group,
    colliders,
    update,
  };
}
