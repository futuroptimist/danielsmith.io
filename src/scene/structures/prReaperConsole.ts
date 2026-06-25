import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { SCENE_DETAIL_POLICIES } from '../graphics/sceneDetailPolicy';

import {
  PR_REAPER_ARM_LINK_LENGTH,
  PR_REAPER_EMITTER_LOCAL_Z,
  PR_REAPER_FOOTPRINT_DEPTH,
  PR_REAPER_FOOTPRINT_WIDTH,
  PR_REAPER_INTENDED_BOUNDS,
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_PROJECTOR_CENTER_Y,
  PR_REAPER_PROJECTOR_CENTER_Z,
  PR_REAPER_PROJECTOR_DEPTH,
  PR_REAPER_PROJECTOR_HEIGHT,
  PR_REAPER_PROJECTOR_WIDTH,
  PR_REAPER_ROBOT_BASE_HEIGHT,
  PR_REAPER_ROBOT_BASE_RADIUS,
  PR_REAPER_ROBOT_BASE_Z,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_CENTER_Y,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_PLANE_Z,
  PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_SHOULDER_Y,
  PR_REAPER_SHOULDER_Z,
  PR_REAPER_TOOL_FORWARD,
  PR_REAPER_YAW_LIMITS,
} from './prReaperInstallationContract';

export interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  getDebugState(): {
    detailLevel: string;
    constants: typeof PR_REAPER_INTENDED_BOUNDS & {
      screenWidth: number;
      screenHeight: number;
      screenToEmitterStandOff: number;
    };
    yaw: number;
    pitch: number;
  };
  dispose(): void;
}

export interface PrReaperInstallationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
}

export type PrReaperConsoleBuild = PrReaperInstallationBuild;
export type PrReaperConsoleOptions = PrReaperInstallationOptions;

type DisposableMaterial = MeshBasicMaterial | MeshStandardMaterial;

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

function detailConfig(policy: SceneDetailPolicy) {
  const scale = Math.max(0, 4 - policy.detailIndex);
  return {
    cylinderSegments: Math.max(6, policy.geometry.cylinderSegments),
    ringSegments: Math.max(8, policy.geometry.ringSegments),
    frameSegments: scale + 1,
    fasteners: scale >= 3 ? 10 : scale >= 2 ? 6 : scale >= 1 ? 2 : 0,
    vents: scale >= 3 ? 5 : scale >= 2 ? 3 : scale >= 1 ? 1 : 0,
    cable: scale >= 2,
  };
}

function addMesh<T extends Mesh>(
  parent: Group,
  mesh: T,
  geometries: Set<{ dispose(): void }>,
  materials: Set<DisposableMaterial>
): T {
  parent.add(mesh);
  geometries.add(mesh.geometry);
  const material = mesh.material;
  if (Array.isArray(material)) {
    material.forEach((entry) => materials.add(entry as DisposableMaterial));
  } else {
    materials.add(material as DisposableMaterial);
  }
  return mesh;
}

export function createPrReaperInstallation(
  options: PrReaperInstallationOptions
): PrReaperInstallationBuild {
  const {
    position,
    orientationRadians = 0,
    detailPolicy = SCENE_DETAIL_POLICIES.balanced,
  } = options;
  const config = detailConfig(detailPolicy);
  const group = new Group();
  group.name = 'PrReaperInstallation';
  group.position.set(position.x, position.y ?? 0, position.z);
  group.rotation.y = orientationRadians;
  group.scale.set(1, 1, 1);
  group.userData.detailLevel = detailPolicy.level;
  group.userData.anchor = 'bottom-center';

  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<DisposableMaterial>();
  const screenMaterials: MeshBasicMaterial[] = [];

  const projector = new Group();
  projector.name = 'PrReaperProjectorBase';
  group.add(projector);
  const projectorMaterial = new MeshStandardMaterial({
    color: new Color(0x172033),
    emissive: new Color(0x0a3150),
    emissiveIntensity: 0.24,
    roughness: 0.42,
    metalness: 0.36,
  });
  addMesh(
    projector,
    new Mesh(
      new BoxGeometry(
        PR_REAPER_PROJECTOR_WIDTH,
        PR_REAPER_PROJECTOR_HEIGHT,
        PR_REAPER_PROJECTOR_DEPTH
      ),
      projectorMaterial
    ),
    geometries,
    materials
  ).position.set(0, PR_REAPER_PROJECTOR_CENTER_Y, PR_REAPER_PROJECTOR_CENTER_Z);
  const lens = addMesh(
    projector,
    new Mesh(
      new CylinderGeometry(0.16, 0.16, 0.025, config.cylinderSegments),
      new MeshStandardMaterial({
        color: new Color(0x3bdcff),
        emissive: new Color(0x31b7ff),
        emissiveIntensity: 0.9,
        roughness: 0.18,
        metalness: 0.12,
      })
    ),
    geometries,
    materials
  );
  lens.name = 'PrReaperProjectorLens';
  lens.position.set(
    0,
    PR_REAPER_PROJECTOR_HEIGHT + 0.018,
    PR_REAPER_SCREEN_PLANE_Z
  );
  lens.rotation.x = Math.PI / 2;
  for (let i = 0; i < config.vents; i += 1) {
    const vent = addMesh(
      projector,
      new Mesh(new BoxGeometry(0.08, 0.012, 0.36), projectorMaterial.clone()),
      geometries,
      materials
    );
    vent.name = `PrReaperProjectorAccent-${i}`;
    vent.position.set((i - (config.vents - 1) / 2) * 0.18, 0.335, -0.12);
  }

  const hologram = new Group();
  hologram.name = 'PrReaperHologramRoot';
  group.add(hologram);
  const screenMaterial = new MeshBasicMaterial({
    color: new Color(0x39c9ff),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: DoubleSide,
  });
  screenMaterials.push(screenMaterial);
  const screen = addMesh(
    hologram,
    new Mesh(
      new PlaneGeometry(PR_REAPER_SCREEN_WIDTH, PR_REAPER_SCREEN_HEIGHT),
      screenMaterial
    ),
    geometries,
    materials
  );
  screen.name = 'PrReaperHologramScreen';
  screen.position.set(0, PR_REAPER_SCREEN_CENTER_Y, PR_REAPER_SCREEN_PLANE_Z);
  screen.renderOrder = 20;
  const edgeMaterial = new MeshBasicMaterial({
    color: 0x7ee7ff,
    transparent: true,
    opacity: 0.74,
  });
  const edges: Array<
    [string, [number, number, number], [number, number, number]]
  > = [
    [
      'Top',
      [PR_REAPER_SCREEN_WIDTH, 0.025, 0.018],
      [0, PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT, 0.01],
    ],
    [
      'Bottom',
      [PR_REAPER_SCREEN_WIDTH, 0.025, 0.018],
      [0, PR_REAPER_SCREEN_BOTTOM_Y, 0.01],
    ],
    [
      'Left',
      [0.025, PR_REAPER_SCREEN_HEIGHT, 0.018],
      [-PR_REAPER_SCREEN_WIDTH / 2, PR_REAPER_SCREEN_CENTER_Y, 0.01],
    ],
    [
      'Right',
      [0.025, PR_REAPER_SCREEN_HEIGHT, 0.018],
      [PR_REAPER_SCREEN_WIDTH / 2, PR_REAPER_SCREEN_CENTER_Y, 0.01],
    ],
  ];
  edges.forEach(([name, size, pos]) => {
    const edge = addMesh(
      hologram,
      new Mesh(new BoxGeometry(...size), edgeMaterial.clone()),
      geometries,
      materials
    );
    edge.name = `PrReaperHologramFrame-${name}`;
    edge.position.set(...pos);
  });
  for (let i = 0; i < config.frameSegments; i += 1) {
    const accent = addMesh(
      hologram,
      new Mesh(new BoxGeometry(0.16, 0.018, 0.018), edgeMaterial.clone()),
      geometries,
      materials
    );
    accent.name = `PrReaperHologramFrame-Accent-${i}`;
    accent.position.set(
      -PR_REAPER_SCREEN_WIDTH / 2 + 0.25 + i * 0.32,
      PR_REAPER_SCREEN_CENTER_Y,
      0.018
    );
  }
  const prCircleRoot = new Group();
  prCircleRoot.name = 'PrReaperPrCircleRoot';
  hologram.add(prCircleRoot);

  const robotBase = new Group();
  robotBase.name = 'PrReaperRobotBase';
  robotBase.position.set(0, 0, PR_REAPER_ROBOT_BASE_Z);
  group.add(robotBase);
  const robotMaterial = new MeshStandardMaterial({
    color: 0x273244,
    roughness: 0.48,
    metalness: 0.42,
  });
  addMesh(
    robotBase,
    new Mesh(
      new CylinderGeometry(
        PR_REAPER_ROBOT_BASE_RADIUS,
        PR_REAPER_ROBOT_BASE_RADIUS,
        PR_REAPER_ROBOT_BASE_HEIGHT,
        config.cylinderSegments
      ),
      robotMaterial
    ),
    geometries,
    materials
  ).position.y = PR_REAPER_ROBOT_BASE_HEIGHT / 2;
  const yawJoint = new Group();
  yawJoint.name = 'PrReaperYawJoint';
  yawJoint.userData.animatedJoint = 'yaw';
  yawJoint.rotation.y = PR_REAPER_PARKED_POSE.yaw;
  yawJoint.position.set(0, PR_REAPER_ROBOT_BASE_HEIGHT, 0);
  robotBase.add(yawJoint);
  const yawBearing = addMesh(
    yawJoint,
    new Mesh(
      new CylinderGeometry(0.25, 0.25, 0.16, config.cylinderSegments),
      robotMaterial.clone()
    ),
    geometries,
    materials
  );
  yawBearing.name = 'PrReaperYawBearing';
  yawBearing.position.y = 0.08;
  const pitchJoint = new Group();
  pitchJoint.name = 'PrReaperPitchJoint';
  pitchJoint.userData.animatedJoint = 'pitch';
  pitchJoint.rotation.x = PR_REAPER_PARKED_POSE.pitch;
  pitchJoint.position.set(
    0,
    PR_REAPER_SHOULDER_Y - PR_REAPER_ROBOT_BASE_HEIGHT,
    PR_REAPER_SHOULDER_Z - PR_REAPER_ROBOT_BASE_Z
  );
  yawJoint.add(pitchJoint);
  const pitchHousing = addMesh(
    pitchJoint,
    new Mesh(
      new SphereGeometry(
        0.22,
        config.cylinderSegments,
        Math.max(4, config.cylinderSegments / 2)
      ),
      robotMaterial.clone()
    ),
    geometries,
    materials
  );
  pitchHousing.name = 'PrReaperPitchHousing';
  const arm = addMesh(
    pitchJoint,
    new Mesh(
      new BoxGeometry(0.18, 0.18, PR_REAPER_ARM_LINK_LENGTH),
      robotMaterial.clone()
    ),
    geometries,
    materials
  );
  arm.name = 'PrReaperArmLink';
  arm.position.z = -PR_REAPER_ARM_LINK_LENGTH / 2;
  const flange = addMesh(
    pitchJoint,
    new Mesh(new BoxGeometry(0.28, 0.24, 0.18), robotMaterial.clone()),
    geometries,
    materials
  );
  flange.name = 'PrReaperToolFlange';
  flange.position.z = -PR_REAPER_ARM_LINK_LENGTH - PR_REAPER_TOOL_FORWARD / 2;
  const emitter = new Group();
  emitter.name = 'PrReaperLaserEmitter';
  emitter.position.z =
    -PR_REAPER_ARM_LINK_LENGTH -
    PR_REAPER_TOOL_FORWARD -
    PR_REAPER_EMITTER_LOCAL_Z;
  pitchJoint.add(emitter);
  addMesh(
    emitter,
    new Mesh(
      new CylinderGeometry(0.07, 0.09, 0.22, config.cylinderSegments),
      new MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x16a34a,
        emissiveIntensity: 0.25,
        metalness: 0.3,
        roughness: 0.32,
      })
    ),
    geometries,
    materials
  ).rotation.x = Math.PI / 2;
  const laserCore = new Group();
  laserCore.name = 'PrReaperLaserCore';
  laserCore.visible = false;
  emitter.add(laserCore);
  const laserGlow = new Group();
  laserGlow.name = 'PrReaperLaserGlow';
  laserGlow.visible = false;
  emitter.add(laserGlow);
  if (config.cable) {
    const cable = addMesh(
      yawJoint,
      new Mesh(
        new RingGeometry(0.3, 0.315, config.ringSegments),
        new MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.5,
          blending: AdditiveBlending,
        })
      ),
      geometries,
      materials
    );
    cable.name = 'PrReaperArmCableAccent';
    cable.position.y = 0.19;
    cable.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < config.fasteners; i += 1) {
    const bolt = addMesh(
      robotBase,
      new Mesh(
        new CylinderGeometry(0.025, 0.025, 0.018, 6),
        robotMaterial.clone()
      ),
      geometries,
      materials
    );
    bolt.name = `PrReaperRobotFastener-${i}`;
    const angle = (i / config.fasteners) * Math.PI * 2;
    bolt.position.set(
      Math.cos(angle) * 0.27,
      PR_REAPER_ROBOT_BASE_HEIGHT + 0.01,
      Math.sin(angle) * 0.27
    );
  }
  const particleRoot = new Group();
  particleRoot.name = 'PrReaperParticleRoot';
  group.add(particleRoot);

  const forward = new Vector3(
    Math.sin(orientationRadians),
    0,
    Math.cos(orientationRadians)
  );
  const colliderCenter = new Vector3(
    position.x + forward.x * (PR_REAPER_FOOTPRINT_DEPTH / 2 - 0.42),
    position.y ?? 0,
    position.z + forward.z * (PR_REAPER_FOOTPRINT_DEPTH / 2 - 0.42)
  );
  const colliders = [
    createCollider(
      colliderCenter,
      PR_REAPER_FOOTPRINT_WIDTH,
      PR_REAPER_FOOTPRINT_DEPTH,
      orientationRadians
    ),
  ];

  let disposed = false;
  return {
    group,
    colliders,
    update({ elapsed, emphasis }) {
      const pulse =
        0.06 * Math.sin(elapsed * 2.2) + Math.max(0, emphasis) * 0.12;
      screenMaterials.forEach((material) => {
        material.opacity = 0.22 + pulse;
      });
    },
    getDebugState() {
      return {
        detailLevel: detailPolicy.level,
        constants: {
          ...PR_REAPER_INTENDED_BOUNDS,
          screenWidth: PR_REAPER_SCREEN_WIDTH,
          screenHeight: PR_REAPER_SCREEN_HEIGHT,
          screenToEmitterStandOff: PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
        },
        yaw: yawJoint.rotation.y,
        pitch: pitchJoint.rotation.x,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}

export const createPrReaperConsole = createPrReaperInstallation;
export {
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_LIMITS,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_YAW_LIMITS,
};
