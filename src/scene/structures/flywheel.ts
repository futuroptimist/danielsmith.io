import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  TorusGeometry,
} from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import {
  getFlickerScale,
  getPulseScale,
} from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

import {
  FLYWHEEL_AXLE,
  FLYWHEEL_BASE_COLLIDER,
  FLYWHEEL_BASE_DIMENSIONS,
  FLYWHEEL_BEARING_STAND,
  FLYWHEEL_EMPHASIS_SPEED_BOOST,
  FLYWHEEL_ENERGY_PORT,
  FLYWHEEL_SPIN_RAD_PER_SECOND,
  FLYWHEEL_WHEEL,
} from './flywheelEnergyContract';
import {
  createSeededFlywheelEnergyNetwork,
  getFlywheelEnergyVisibleWindow,
  sampleFlywheelEnergyArc,
  type FlywheelEnergyTarget,
} from './flywheelEnergyNetwork';

export interface FlywheelShowpieceBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: {
    elapsed: number;
    delta?: number;
    emphasis: number;
    runDecorativeEffects?: boolean;
  }): void;
  setEnergyTargets(
    targets: readonly FlywheelEnergyTarget[],
    diagnostics?: readonly string[]
  ): void;
  getDebugState(): FlywheelDebugState;
  dispose(): void;
}

export interface FlywheelShowpieceOptions {
  position?: { x: number; y?: number; z: number };
  centerX?: number;
  centerZ?: number;
  roomBounds: Bounds2D;
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
}

export interface FlywheelDebugState {
  flywheelAngle: number;
  spinVelocity: number;
  triangleCount: number;
  energy: {
    targetCount: number;
    missingTargetDiagnostics: string[];
    cycleIndex: number;
    direction: string | null;
    selectedTargetId: string | null;
    phase: number;
    visibleWindowStart: number | null;
    visibleWindowEnd: number | null;
    incomingCompletedCount: number;
    outgoingCompletedCount: number;
    sourceWorldPosition: { x: number; y: number; z: number } | null;
    destinationWorldPosition: { x: number; y: number; z: number } | null;
    sourceLocalPosition: { x: number; y: number; z: number } | null;
    destinationLocalPosition: { x: number; y: number; z: number } | null;
    activeNodeCount: number;
    detailLevel: string;
    pulseScale: number;
    flickerScale: number;
  };
}

const MATERIALS = {
  dark: new Color(0x17202a),
  metal: new Color(0x7c8794),
  glow: new Color(0x4dd8ff),
  brass: new Color(0xd19a3a),
};

export function createFlywheelShowpiece(
  options: FlywheelShowpieceOptions
): FlywheelShowpieceBuild {
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const position = options.position ?? {
    x: options.centerX ?? 0,
    y: 0,
    z: options.centerZ ?? 0,
  };
  const group = new Group();
  group.name = 'FlywheelEnergyInstallation';
  group.position.set(position.x, position.y ?? 0, position.z);
  group.rotation.y = options.orientationRadians ?? 0;

  const ownedGeometries = new Set<{ dispose: () => void }>();
  const ownedMaterials = new Set<{ dispose: () => void }>();
  const own = <T extends { dispose: () => void }>(item: T): T => (
    ownedGeometries.add(item),
    item
  );
  const mat = <T extends { dispose: () => void }>(item: T): T => (
    ownedMaterials.add(item),
    item
  );
  const segmentScale =
    detailPolicy.level === 'cinematic'
      ? 1
      : detailPolicy.level === 'balanced'
        ? 0.75
        : detailPolicy.level === 'performance'
          ? 0.45
          : detailPolicy.level === 'low'
            ? 0.3
            : 0.2;
  const cylSeg = Math.max(
    6,
    Math.floor(detailPolicy.geometry.cylinderSegments * segmentScale)
  );
  const torusSeg = Math.max(
    8,
    Math.floor(detailPolicy.geometry.torusTubularSegments * segmentScale)
  );
  const spokeCount =
    detailPolicy.level === 'cinematic'
      ? 8
      : detailPolicy.level === 'balanced'
        ? 6
        : detailPolicy.level === 'performance'
          ? 5
          : 4;

  const steel = mat(
    new MeshStandardMaterial({
      color: MATERIALS.metal,
      roughness: 0.35,
      metalness: 0.8,
    })
  );
  const dark = mat(
    new MeshStandardMaterial({
      color: MATERIALS.dark,
      roughness: 0.5,
      metalness: 0.65,
    })
  );
  const brass = mat(
    new MeshStandardMaterial({
      color: MATERIALS.brass,
      roughness: 0.32,
      metalness: 0.75,
    })
  );
  const glow = mat(
    new MeshBasicMaterial({
      color: MATERIALS.glow,
      transparent: true,
      opacity: 0.62,
    })
  );

  const mesh = (
    name: string,
    geometry: BufferGeometry,
    material: Mesh['material']
  ) => {
    const item = new Mesh(own(geometry), material);
    item.name = name;
    return item;
  };

  const base = mesh(
    'FlywheelBase',
    new BoxGeometry(
      FLYWHEEL_BASE_DIMENSIONS.width,
      FLYWHEEL_BASE_DIMENSIONS.height,
      FLYWHEEL_BASE_DIMENSIONS.depth
    ),
    dark
  );
  base.position.y = FLYWHEEL_BASE_DIMENSIONS.height / 2;
  group.add(base);

  for (const [name, z] of [
    ['FlywheelBearingYokeFront', FLYWHEEL_WHEEL.centerZ + 0.36],
    ['FlywheelBearingYokeBack', FLYWHEEL_WHEEL.centerZ - 0.36],
  ] as const) {
    const yoke = new Group();
    yoke.name = name;
    yoke.position.set(FLYWHEEL_WHEEL.centerX, 0, z);
    for (const x of [-0.28, 0.28]) {
      const post = mesh(
        `${name}Post-${x > 0 ? 'Right' : 'Left'}`,
        new BoxGeometry(
          FLYWHEEL_BEARING_STAND.width,
          FLYWHEEL_BEARING_STAND.height,
          FLYWHEEL_BEARING_STAND.depth
        ),
        steel
      );
      post.position.set(
        x,
        FLYWHEEL_BASE_DIMENSIONS.height + FLYWHEEL_BEARING_STAND.height / 2,
        0
      );
      yoke.add(post);
    }
    const bridgeHeight = 0.12;
    const bridge = mesh(
      `${name}Bridge`,
      new BoxGeometry(0.72, bridgeHeight, FLYWHEEL_BEARING_STAND.depth),
      steel
    );
    bridge.position.y =
      FLYWHEEL_BASE_DIMENSIONS.height +
      FLYWHEEL_BEARING_STAND.height -
      bridgeHeight / 2;
    yoke.add(bridge);
    group.add(yoke);
  }

  const axle = mesh(
    'FlywheelAxle',
    new CylinderGeometry(
      FLYWHEEL_AXLE.radius,
      FLYWHEEL_AXLE.radius,
      FLYWHEEL_AXLE.length,
      cylSeg
    ),
    steel
  );
  axle.position.set(
    FLYWHEEL_WHEEL.centerX,
    FLYWHEEL_WHEEL.centerY,
    FLYWHEEL_WHEEL.centerZ
  );
  axle.rotation.x = Math.PI / 2;
  group.add(axle);
  for (const [name, z] of [
    ['FlywheelAxleCapFront', FLYWHEEL_WHEEL.centerZ + FLYWHEEL_AXLE.length / 2],
    ['FlywheelAxleCapBack', FLYWHEEL_WHEEL.centerZ - FLYWHEEL_AXLE.length / 2],
  ] as const) {
    const cap = mesh(
      name,
      new CylinderGeometry(0.14, 0.14, 0.05, cylSeg),
      brass
    );
    cap.position.set(FLYWHEEL_WHEEL.centerX, FLYWHEEL_WHEEL.centerY, z);
    cap.rotation.x = Math.PI / 2;
    group.add(cap);
  }

  const wheelGroup = new Group();
  wheelGroup.name = 'FlywheelWheelGroup';
  wheelGroup.position.set(
    FLYWHEEL_WHEEL.centerX,
    FLYWHEEL_WHEEL.centerY,
    FLYWHEEL_WHEEL.centerZ
  );
  group.add(wheelGroup);
  const rim = mesh(
    'FlywheelHeavyRim',
    new TorusGeometry(
      FLYWHEEL_WHEEL.radius,
      FLYWHEEL_WHEEL.rimTube,
      Math.max(5, cylSeg / 2),
      torusSeg
    ),
    dark
  );
  wheelGroup.add(rim);
  const hub = mesh(
    'FlywheelInnerHub',
    new CylinderGeometry(0.2, 0.2, FLYWHEEL_WHEEL.thickness, cylSeg),
    steel
  );
  hub.rotation.x = Math.PI / 2;
  wheelGroup.add(hub);
  for (let i = 0; i < spokeCount; i += 1) {
    const spoke = mesh(
      `FlywheelSpoke-${i}`,
      new BoxGeometry(FLYWHEEL_WHEEL.radius * 1.45, 0.045, 0.055),
      steel
    );
    spoke.rotation.z = (i / spokeCount) * Math.PI * 2;
    wheelGroup.add(spoke);
  }
  for (let i = 0; i < Math.max(2, Math.floor(spokeCount / 2)); i += 1) {
    const weight = mesh(
      `FlywheelCounterweight-${i}`,
      new BoxGeometry(0.2, 0.14, 0.16),
      brass
    );
    const a =
      (i / Math.max(2, Math.floor(spokeCount / 2))) * Math.PI * 2 + 0.25;
    weight.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0);
    weight.rotation.z = a;
    wheelGroup.add(weight);
  }
  const glowRing = mesh(
    'FlywheelEnergyGlowRing',
    new TorusGeometry(FLYWHEEL_WHEEL.radius * 0.82, 0.018, 4, torusSeg),
    glow
  );
  wheelGroup.add(glowRing);

  for (const [index, angle] of [0.2, 2.55].entries()) {
    const marker = mesh(
      `FlywheelRimMotionTick-${index}`,
      new BoxGeometry(0.09, 0.2, 0.045),
      brass
    );
    marker.position.set(
      Math.cos(angle) * FLYWHEEL_WHEEL.radius,
      Math.sin(angle) * FLYWHEEL_WHEEL.radius,
      FLYWHEEL_WHEEL.thickness / 2 + 0.025
    );
    marker.rotation.z = angle;
    wheelGroup.add(marker);
  }

  const port = mesh(
    'FlywheelEnergyPort',
    new SphereGeometry(
      FLYWHEEL_ENERGY_PORT.radius,
      cylSeg,
      Math.max(4, cylSeg / 2)
    ),
    glow
  );
  port.position.set(
    FLYWHEEL_ENERGY_PORT.x,
    FLYWHEEL_ENERGY_PORT.y,
    FLYWHEEL_ENERGY_PORT.z
  );
  group.add(port);

  const energyNetwork = createSeededFlywheelEnergyNetwork();
  let missingTargetDiagnostics: string[] = [];
  const energyPacket = new Group();
  energyPacket.name = 'FlywheelEnergyTransferPacket';
  group.add(energyPacket);
  const detailNodeCount =
    detailPolicy.level === 'cinematic'
      ? 12
      : detailPolicy.level === 'balanced'
        ? 10
        : detailPolicy.level === 'performance'
          ? 7
          : detailPolicy.level === 'low'
            ? 5
            : 4;
  const connectorCount = Math.max(0, detailNodeCount - 1);
  const packetNodeGeometry = own(
    new SphereGeometry(0.045, Math.max(6, cylSeg), 6)
  );
  const packetConnectorGeometry = own(
    new CylinderGeometry(0.018, 0.018, 1, Math.max(5, cylSeg / 2))
  );
  const packetMaterials = Array.from({ length: detailNodeCount }, (_, index) =>
    mat(
      new MeshBasicMaterial({
        color: MATERIALS.glow,
        transparent: true,
        opacity: index === 0 ? 0.7 : 0.5,
        depthWrite: false,
      })
    )
  );
  const connectorMaterial = mat(
    new MeshBasicMaterial({
      color: MATERIALS.glow,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  const packetNodes = packetMaterials.map((material, index) => {
    const node = new Mesh(packetNodeGeometry, material);
    node.name = `FlywheelEnergyPacketNode-${index}`;
    node.visible = false;
    energyPacket.add(node);
    return node;
  });
  const packetConnectors = Array.from(
    { length: connectorCount },
    (_, index) => {
      const connector = new Mesh(packetConnectorGeometry, connectorMaterial);
      connector.name = `FlywheelEnergyPacketConnector-${index}`;
      connector.visible = false;
      energyPacket.add(connector);
      return connector;
    }
  );

  const colliders = createFlywheelColliders(
    position.x,
    position.z,
    options.orientationRadians ?? 0
  );
  let state: FlywheelDebugState = {
    flywheelAngle: 0,
    spinVelocity: FLYWHEEL_SPIN_RAD_PER_SECOND,
    triangleCount: countTriangles(group),
    energy: {
      targetCount: 0,
      missingTargetDiagnostics: [],
      cycleIndex: 0,
      direction: null,
      selectedTargetId: null,
      phase: 0,
      visibleWindowStart: null,
      visibleWindowEnd: null,
      incomingCompletedCount: 0,
      outgoingCompletedCount: 0,
      sourceWorldPosition: null,
      destinationWorldPosition: null,
      sourceLocalPosition: null,
      destinationLocalPosition: null,
      activeNodeCount: 0,
      detailLevel: detailPolicy.level,
      pulseScale: 1,
      flickerScale: 1,
    },
  };
  let disposed = false;
  let flywheelAngle = 0;

  const vectorA = new Vector3();
  const vectorB = new Vector3();
  const vectorMid = new Vector3();
  const vectorDirection = new Vector3();
  const vectorUp = new Vector3(0, 1, 0);
  const portWorldPosition = new Vector3();
  const targetWorldPosition = new Vector3();
  const sourceWorldPosition = new Vector3();
  const destinationWorldPosition = new Vector3();
  const sourceLocalPosition = new Vector3();
  const destinationLocalPosition = new Vector3();
  const localPoint = new Vector3();

  const hideEnergyPacket = () => {
    packetNodes.forEach((node) => {
      node.visible = false;
    });
    packetConnectors.forEach((connector) => {
      connector.visible = false;
    });
  };

  const clonePoint = (point: Vector3) => ({
    x: point.x,
    y: point.y,
    z: point.z,
  });

  const renderEnergyTransfer = (
    transfer: ReturnType<typeof energyNetwork.getActiveTransfer>
  ) => {
    const pulseScale = getPulseScale();
    const flickerScale = getFlickerScale();
    const networkDebug = energyNetwork.getDebugSnapshot();
    if (!transfer) {
      hideEnergyPacket();
      return {
        targetCount: networkDebug.targetCount,
        missingTargetDiagnostics: [...missingTargetDiagnostics],
        cycleIndex: networkDebug.cycleIndex,
        direction: null,
        selectedTargetId: null,
        phase: 0,
        visibleWindowStart: null,
        visibleWindowEnd: null,
        incomingCompletedCount: networkDebug.incomingCompletedCount,
        outgoingCompletedCount: networkDebug.outgoingCompletedCount,
        sourceWorldPosition: null,
        destinationWorldPosition: null,
        sourceLocalPosition: null,
        destinationLocalPosition: null,
        activeNodeCount: 0,
        detailLevel: detailPolicy.level,
        pulseScale,
        flickerScale,
      };
    }
    const target = energyNetwork.getTarget(transfer.targetPoiId);
    if (!target) {
      hideEnergyPacket();
      return {
        targetCount: networkDebug.targetCount,
        missingTargetDiagnostics: [...missingTargetDiagnostics],
        cycleIndex: networkDebug.cycleIndex,
        direction: null,
        selectedTargetId: null,
        phase: 0,
        visibleWindowStart: null,
        visibleWindowEnd: null,
        incomingCompletedCount: networkDebug.incomingCompletedCount,
        outgoingCompletedCount: networkDebug.outgoingCompletedCount,
        sourceWorldPosition: null,
        destinationWorldPosition: null,
        sourceLocalPosition: null,
        destinationLocalPosition: null,
        activeNodeCount: 0,
        detailLevel: detailPolicy.level,
        pulseScale,
        flickerScale,
      };
    }
    port.getWorldPosition(portWorldPosition);
    targetWorldPosition.set(
      target.worldPosition.x,
      target.worldPosition.y + 0.95,
      target.worldPosition.z
    );
    sourceWorldPosition.copy(
      transfer.direction === 'incoming'
        ? targetWorldPosition
        : portWorldPosition
    );
    destinationWorldPosition.copy(
      transfer.direction === 'incoming'
        ? portWorldPosition
        : targetWorldPosition
    );
    const distance = sourceWorldPosition.distanceTo(destinationWorldPosition);
    const lift = Math.min(3.4, Math.max(1.1, distance * 0.18));
    const visible = getFlywheelEnergyVisibleWindow(transfer);
    const span = Math.max(0.001, visible.end - visible.start);
    const activeNodeCount = Math.max(
      2,
      Math.min(
        packetNodes.length,
        Math.ceil((packetNodes.length * span) / transfer.window)
      )
    );
    const strength = transfer.strength;
    sourceLocalPosition.copy(sourceWorldPosition);
    group.worldToLocal(sourceLocalPosition);
    destinationLocalPosition.copy(destinationWorldPosition);
    group.worldToLocal(destinationLocalPosition);
    for (let i = 0; i < packetNodes.length; i += 1) {
      const node = packetNodes[i];
      if (i >= activeNodeCount) {
        node.visible = false;
        continue;
      }
      const fraction = activeNodeCount === 1 ? 0.5 : i / (activeNodeCount - 1);
      const phase = visible.start + span * fraction;
      const world = sampleFlywheelEnergyArc(
        sourceWorldPosition,
        destinationWorldPosition,
        phase,
        lift
      );
      localPoint.set(world.x, world.y, world.z);
      group.worldToLocal(localPoint);
      node.position.copy(localPoint);
      const edgeFade = Math.sin(fraction * Math.PI);
      const scale =
        (0.75 + edgeFade * 0.45) * strength * (0.75 + pulseScale * 0.25);
      node.scale.setScalar(scale);
      node.visible = true;
      const material = node.material as MeshBasicMaterial;
      material.opacity = (0.18 + edgeFade * 0.54 * flickerScale) * strength;
    }
    for (let i = 0; i < packetConnectors.length; i += 1) {
      const connector = packetConnectors[i];
      if (i >= activeNodeCount - 1) {
        connector.visible = false;
        continue;
      }
      vectorA.copy(packetNodes[i].position);
      vectorB.copy(packetNodes[i + 1].position);
      vectorMid.copy(vectorA).add(vectorB).multiplyScalar(0.5);
      vectorDirection.copy(vectorB).sub(vectorA);
      const segmentLength = vectorDirection.length();
      if (segmentLength < 1e-6) {
        connector.visible = false;
        continue;
      }
      connector.position.copy(vectorMid);
      connector.scale.set(strength, segmentLength, strength);
      connector.quaternion.setFromUnitVectors(
        vectorUp,
        vectorDirection.multiplyScalar(1 / segmentLength)
      );
      connector.visible = detailPolicy.level !== 'micro';
    }
    return {
      targetCount: networkDebug.targetCount,
      missingTargetDiagnostics: [...missingTargetDiagnostics],
      cycleIndex: networkDebug.cycleIndex,
      direction: transfer.direction,
      selectedTargetId: transfer.targetPoiId,
      phase: transfer.phase,
      visibleWindowStart: visible.start,
      visibleWindowEnd: visible.end,
      incomingCompletedCount: networkDebug.incomingCompletedCount,
      outgoingCompletedCount: networkDebug.outgoingCompletedCount,
      sourceWorldPosition: clonePoint(sourceWorldPosition),
      destinationWorldPosition: clonePoint(destinationWorldPosition),
      sourceLocalPosition: clonePoint(sourceLocalPosition),
      destinationLocalPosition: clonePoint(destinationLocalPosition),
      activeNodeCount,
      detailLevel: detailPolicy.level,
      pulseScale,
      flickerScale,
    };
  };

  return {
    group,
    colliders,
    setEnergyTargets(targets, diagnostics = []) {
      missingTargetDiagnostics = [...diagnostics];
      energyNetwork.setTargets(targets);
    },
    update({ elapsed, delta = 0, emphasis, runDecorativeEffects = true }) {
      const emphasisBoost = Math.min(1, Math.max(0, emphasis));
      const spinVelocity =
        FLYWHEEL_SPIN_RAD_PER_SECOND *
        (1 + emphasisBoost * FLYWHEEL_EMPHASIS_SPEED_BOOST);
      flywheelAngle += spinVelocity * Math.max(0, delta);
      wheelGroup.rotation.z = flywheelAngle;
      if (runDecorativeEffects) {
        glow.opacity =
          0.45 + Math.min(0.4, emphasis * 0.35) + Math.sin(elapsed * 2) * 0.05;
      }
      const transfer = energyNetwork.update(delta);
      const energyDebug = renderEnergyTransfer(transfer);
      state = {
        flywheelAngle,
        spinVelocity,
        triangleCount: state.triangleCount,
        energy: energyDebug,
      };
    },
    getDebugState: () => ({
      ...state,
      energy: {
        ...state.energy,
        missingTargetDiagnostics: [...state.energy.missingTargetDiagnostics],
        sourceWorldPosition: state.energy.sourceWorldPosition
          ? { ...state.energy.sourceWorldPosition }
          : null,
        destinationWorldPosition: state.energy.destinationWorldPosition
          ? { ...state.energy.destinationWorldPosition }
          : null,
        sourceLocalPosition: state.energy.sourceLocalPosition
          ? { ...state.energy.sourceLocalPosition }
          : null,
        destinationLocalPosition: state.energy.destinationLocalPosition
          ? { ...state.energy.destinationLocalPosition }
          : null,
      },
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      ownedGeometries.forEach((g) => g.dispose());
      ownedMaterials.forEach((m) => m.dispose());
    },
  };
}

function createFlywheelColliders(
  x: number,
  z: number,
  orientationRadians: number
): RectCollider[] {
  return [
    createRotatedCollider(
      x,
      z,
      0,
      0,
      FLYWHEEL_BASE_COLLIDER.width,
      FLYWHEEL_BASE_COLLIDER.depth,
      orientationRadians
    ),
  ];
}

function createRotatedCollider(
  rootX: number,
  rootZ: number,
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  orientationRadians: number
): RectCollider {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const sin = Math.sin(orientationRadians);
  const cos = Math.cos(orientationRadians);
  const corners = [
    { x: centerX - halfWidth, z: centerZ - halfDepth },
    { x: centerX + halfWidth, z: centerZ - halfDepth },
    { x: centerX + halfWidth, z: centerZ + halfDepth },
    { x: centerX - halfWidth, z: centerZ + halfDepth },
  ].map((corner) => ({
    x: rootX + corner.x * cos + corner.z * sin,
    z: rootZ - corner.x * sin + corner.z * cos,
  }));
  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    minZ: Math.min(...corners.map((corner) => corner.z)),
    maxZ: Math.max(...corners.map((corner) => corner.z)),
  };
}

function countTriangles(root: Object3D): number {
  let count = 0;
  root.traverse((object) => {
    const mesh = object as Mesh;
    const geometry = mesh.geometry;
    if (!geometry) return;
    const index = geometry.index;
    const position = geometry.getAttribute('position');
    if (!index && !position) return;
    count += index ? index.count / 3 : position.count / 3;
  });
  return count;
}
