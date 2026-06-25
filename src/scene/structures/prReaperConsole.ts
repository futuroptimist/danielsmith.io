import {
  AdditiveBlending,
  BoxGeometry,
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

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { SCENE_DETAIL_POLICIES } from '../graphics/sceneDetailPolicy';

import {
  PR_REAPER_ARM_LINK_LENGTH,
  PR_REAPER_EMITTER_OFFSET,
  PR_REAPER_FOOTPRINT_DEPTH,
  PR_REAPER_FOOTPRINT_WIDTH,
  PR_REAPER_FRONT_DEPTH,
  PR_REAPER_INTENDED_BOUNDS,
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PITCH_PIVOT,
  PR_REAPER_PROJECTOR_CENTER_Y,
  PR_REAPER_PROJECTOR_CENTER_Z,
  PR_REAPER_PROJECTOR_DEPTH,
  PR_REAPER_PROJECTOR_HEIGHT,
  PR_REAPER_PROJECTOR_WIDTH,
  PR_REAPER_REAR_DEPTH,
  PR_REAPER_ROBOT_BASE_HEIGHT,
  PR_REAPER_ROBOT_BASE_RADIUS,
  PR_REAPER_ROBOT_BASE_Z,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_CENTER_Y,
  PR_REAPER_SCREEN_HEIGHT,
  PR_REAPER_SCREEN_PLANE_Z,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_TOOL_FLANGE_OFFSET,
  PR_REAPER_YAW_PIVOT,
} from './prReaperInstallationContract';

export interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  getDebugState(): PrReaperDebugState;
  dispose(): void;
}

export interface PrReaperDebugState {
  constants: typeof PR_REAPER_INTENDED_BOUNDS & {
    screenWidth: number;
    screenHeight: number;
    robotBaseZ: number;
  };
  detailLevel: string;
  parkedPose: typeof PR_REAPER_PARKED_POSE;
}

export interface PrReaperInstallationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
}

export type PrReaperConsoleBuild = PrReaperInstallationBuild;
export type PrReaperConsoleOptions = PrReaperInstallationOptions;

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

function collectDisposable(
  root: Group,
  materials: Set<{ dispose(): void }>,
  geometries: Set<{ dispose(): void }>
) {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      geometries.add(object.geometry);
      const material = object.material;
      (Array.isArray(material) ? material : [material]).forEach((entry) =>
        materials.add(entry)
      );
    }
  });
}

function policyConfig(policy: SceneDetailPolicy) {
  const detail = policy.detailIndex;
  return {
    segments: Math.max(
      6,
      Math.round(
        policy.geometry.cylinderSegments *
          (detail === 0 ? 1 : detail === 1 ? 0.65 : 1)
      )
    ),
    ringSegments: Math.max(
      8,
      Math.round(
        policy.geometry.ringSegments *
          (detail === 0 ? 1 : detail === 1 ? 0.65 : 1)
      )
    ),
    sphereSegments: Math.max(
      6,
      Math.round(
        policy.geometry.sphereWidthSegments *
          (detail === 0 ? 1 : detail === 1 ? 0.65 : 1)
      )
    ),
    vents:
      detail === 0
        ? 6
        : detail === 1
          ? 4
          : detail === 2
            ? 3
            : detail === 3
              ? 1
              : 0,
    frameSegments:
      detail === 0
        ? 12
        : detail === 1
          ? 8
          : detail === 2
            ? 6
            : detail === 3
              ? 4
              : 2,
    fasteners: detail === 0 ? 10 : detail === 1 ? 6 : detail === 2 ? 4 : 0,
    cable: detail <= 2,
  };
}

export function createPrReaperInstallation(
  options: PrReaperInstallationOptions
): PrReaperInstallationBuild {
  const {
    position,
    orientationRadians = 0,
    detailPolicy = SCENE_DETAIL_POLICIES.balanced,
  } = options;
  const config = policyConfig(detailPolicy);
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);
  const group = new Group();
  group.name = 'PrReaperInstallation';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;
  group.scale.set(1, 1, 1);
  group.userData.detailLevel = detailPolicy.level;

  const ownedMaterials = new Set<{ dispose(): void }>();
  const ownedGeometries = new Set<{ dispose(): void }>();

  const projectorMaterial = new MeshStandardMaterial({
    color: 0x142033,
    emissive: 0x0b4f76,
    emissiveIntensity: 0.28,
    roughness: 0.5,
    metalness: 0.32,
  });
  const lensMaterial = new MeshBasicMaterial({
    color: 0x66dcff,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: DoubleSide,
  });
  const hologramMaterial = new MeshBasicMaterial({
    color: 0x55ccff,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: DoubleSide,
  });
  const edgeMaterial = new MeshBasicMaterial({
    color: 0x8be9ff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const robotMaterial = new MeshStandardMaterial({
    color: 0x263341,
    emissive: 0x0c2538,
    emissiveIntensity: 0.14,
    roughness: 0.42,
    metalness: 0.48,
  });
  const jointMaterial = new MeshStandardMaterial({
    color: 0x32475a,
    emissive: 0x123b58,
    emissiveIntensity: 0.18,
    roughness: 0.36,
    metalness: 0.56,
  });
  const laserMaterial = new MeshBasicMaterial({
    color: 0x5dff9b,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const projector = new Group();
  projector.name = 'PrReaperProjectorBase';
  projector.position.set(0, 0, PR_REAPER_PROJECTOR_CENTER_Z);
  group.add(projector);
  const housing = new Mesh(
    new BoxGeometry(
      PR_REAPER_PROJECTOR_WIDTH,
      PR_REAPER_PROJECTOR_HEIGHT,
      PR_REAPER_PROJECTOR_DEPTH
    ),
    projectorMaterial
  );
  housing.name = 'PrReaperProjectorHousing';
  housing.position.y = PR_REAPER_PROJECTOR_CENTER_Y;
  projector.add(housing);
  const lens = new Mesh(
    new CylinderGeometry(0.16, 0.2, 0.035, config.segments),
    lensMaterial
  );
  lens.name = 'PrReaperProjectorLens';
  lens.position.set(
    0,
    PR_REAPER_PROJECTOR_HEIGHT + 0.018,
    -PR_REAPER_PROJECTOR_CENTER_Z
  );
  projector.add(lens);
  for (let index = 0; index < config.vents; index += 1) {
    const vent = new Mesh(new BoxGeometry(0.12, 0.012, 0.38), edgeMaterial);
    vent.name = `PrReaperProjectorAccent-${index}`;
    vent.position.set(
      (index - (config.vents - 1) / 2) * 0.22,
      PR_REAPER_PROJECTOR_HEIGHT + 0.024,
      -0.12
    );
    projector.add(vent);
  }

  const hologramRoot = new Group();
  hologramRoot.name = 'PrReaperHologramRoot';
  hologramRoot.position.set(0, 0, PR_REAPER_SCREEN_PLANE_Z);
  group.add(hologramRoot);
  const screen = new Mesh(
    new PlaneGeometry(PR_REAPER_SCREEN_WIDTH, PR_REAPER_SCREEN_HEIGHT),
    hologramMaterial
  );
  screen.name = 'PrReaperHologramScreen';
  screen.position.set(0, PR_REAPER_SCREEN_CENTER_Y, 0.004);
  screen.renderOrder = 20;
  hologramRoot.add(screen);
  for (let index = 0; index < config.frameSegments; index += 1) {
    const vertical = index % 2 === 0;
    const frame = new Mesh(
      new BoxGeometry(
        vertical ? 0.018 : PR_REAPER_SCREEN_WIDTH,
        vertical
          ? PR_REAPER_SCREEN_HEIGHT / Math.ceil(config.frameSegments / 2)
          : 0.018,
        0.018
      ),
      edgeMaterial
    );
    frame.name = `PrReaperHologramFrame-${index}`;
    if (vertical) {
      frame.position.set(
        index % 4 === 0
          ? -PR_REAPER_SCREEN_WIDTH / 2
          : PR_REAPER_SCREEN_WIDTH / 2,
        PR_REAPER_SCREEN_BOTTOM_Y +
          PR_REAPER_SCREEN_HEIGHT * ((index + 1) / (config.frameSegments + 1)),
        0.02
      );
    } else {
      frame.position.set(
        0,
        index % 4 === 1
          ? PR_REAPER_SCREEN_BOTTOM_Y
          : PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT,
        0.02
      );
    }
    hologramRoot.add(frame);
  }
  const circleRoot = new Group();
  circleRoot.name = 'PrReaperPrCircleRoot';
  hologramRoot.add(circleRoot);

  const robotBase = new Group();
  robotBase.name = 'PrReaperRobotBase';
  robotBase.position.set(0, 0, PR_REAPER_ROBOT_BASE_Z);
  group.add(robotBase);
  const pedestal = new Mesh(
    new CylinderGeometry(
      PR_REAPER_ROBOT_BASE_RADIUS,
      PR_REAPER_ROBOT_BASE_RADIUS * 1.08,
      PR_REAPER_ROBOT_BASE_HEIGHT,
      config.segments
    ),
    robotMaterial
  );
  pedestal.name = 'PrReaperRobotPedestal';
  pedestal.position.y = PR_REAPER_ROBOT_BASE_HEIGHT / 2;
  robotBase.add(pedestal);
  const yawJoint = new Group();
  yawJoint.name = 'PrReaperYawJoint';
  yawJoint.userData.animatedJoint = 'yaw';
  yawJoint.rotation.y = PR_REAPER_PARKED_POSE.yaw;
  yawJoint.position.set(0, PR_REAPER_YAW_PIVOT.y, 0);
  robotBase.add(yawJoint);
  const bearing = new Mesh(
    new CylinderGeometry(0.28, 0.28, 0.18, config.segments),
    jointMaterial
  );
  bearing.name = 'PrReaperYawBearing';
  bearing.position.y = 0.09;
  yawJoint.add(bearing);
  const pitchJoint = new Group();
  pitchJoint.name = 'PrReaperPitchJoint';
  pitchJoint.userData.animatedJoint = 'pitch';
  pitchJoint.rotation.x = PR_REAPER_PARKED_POSE.pitch;
  pitchJoint.position.set(
    PR_REAPER_PITCH_PIVOT.x,
    PR_REAPER_PITCH_PIVOT.y - PR_REAPER_YAW_PIVOT.y,
    PR_REAPER_PITCH_PIVOT.z
  );
  yawJoint.add(pitchJoint);
  const shoulder = new Mesh(
    new SphereGeometry(
      0.22,
      config.sphereSegments,
      Math.max(4, Math.floor(config.sphereSegments / 2))
    ),
    jointMaterial
  );
  shoulder.name = 'PrReaperPitchHousing';
  pitchJoint.add(shoulder);
  const link = new Mesh(
    new BoxGeometry(0.22, 0.18, PR_REAPER_ARM_LINK_LENGTH),
    robotMaterial
  );
  link.name = 'PrReaperArmLink';
  link.position.z = -PR_REAPER_ARM_LINK_LENGTH / 2;
  pitchJoint.add(link);
  const flange = new Group();
  flange.name = 'PrReaperToolFlange';
  flange.position.set(
    PR_REAPER_TOOL_FLANGE_OFFSET.x,
    PR_REAPER_TOOL_FLANGE_OFFSET.y,
    PR_REAPER_TOOL_FLANGE_OFFSET.z
  );
  pitchJoint.add(flange);
  const flangeMesh = new Mesh(
    new CylinderGeometry(0.15, 0.15, 0.1, config.segments),
    jointMaterial
  );
  flangeMesh.name = 'PrReaperToolFlangeHousing';
  flangeMesh.rotation.x = Math.PI / 2;
  flange.add(flangeMesh);
  const emitter = new Group();
  emitter.name = 'PrReaperLaserEmitter';
  emitter.position.set(
    PR_REAPER_EMITTER_OFFSET.x,
    PR_REAPER_EMITTER_OFFSET.y,
    PR_REAPER_EMITTER_OFFSET.z
  );
  flange.add(emitter);
  const gun = new Mesh(new BoxGeometry(0.16, 0.12, 0.26), robotMaterial);
  gun.name = 'PrReaperLaserGun';
  gun.position.z = 0.08;
  emitter.add(gun);
  const aperture = new Mesh(
    new RingGeometry(0.045, 0.07, config.ringSegments),
    edgeMaterial
  );
  aperture.name = 'PrReaperLaserAperture';
  aperture.position.z = -0.075;
  emitter.add(aperture);
  const laserCore = new Mesh(
    new BoxGeometry(0.025, 0.025, 0.2),
    laserMaterial.clone()
  );
  laserCore.name = 'PrReaperLaserCore';
  laserCore.visible = false;
  emitter.add(laserCore);
  const laserGlow = new Mesh(
    new BoxGeometry(0.07, 0.07, 0.2),
    laserMaterial.clone()
  );
  laserGlow.name = 'PrReaperLaserGlow';
  laserGlow.visible = false;
  emitter.add(laserGlow);
  if (config.cable) {
    const cable = new Mesh(new BoxGeometry(0.035, 0.035, 0.72), edgeMaterial);
    cable.name = 'PrReaperArmCableAccent';
    cable.position.set(-0.14, 0.08, -0.34);
    pitchJoint.add(cable);
  }
  for (let index = 0; index < config.fasteners; index += 1) {
    const fastener = new Mesh(
      new CylinderGeometry(0.025, 0.025, 0.018, 8),
      edgeMaterial
    );
    fastener.name = `PrReaperRobotFastener-${index}`;
    fastener.position.set(Math.cos(index) * 0.22, 0.18, Math.sin(index) * 0.22);
    yawJoint.add(fastener);
  }

  const particleRoot = new Group();
  particleRoot.name = 'PrReaperParticleRoot';
  particleRoot.visible = false;
  group.add(particleRoot);

  collectDisposable(group, ownedMaterials, ownedGeometries);

  const localColliderCenterZ =
    (PR_REAPER_FRONT_DEPTH - PR_REAPER_REAR_DEPTH) / 2;
  const colliderCenter = new Vector3(
    basePosition.x + Math.sin(orientationRadians) * localColliderCenterZ,
    basePosition.y,
    basePosition.z + Math.cos(orientationRadians) * localColliderCenterZ
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
      const pulse = (Math.sin(elapsed * 1.4) + 1) / 2;
      const scale = Math.max(0, Math.min(1, getPulseScale()));
      const glow =
        0.18 + Math.max(0, Math.min(1, emphasis)) * 0.16 + pulse * scale * 0.05;
      hologramMaterial.opacity = glow;
      lensMaterial.opacity = 0.42 + glow;
      edgeMaterial.opacity = 0.54 + Math.max(0, Math.min(1, emphasis)) * 0.24;
    },
    getDebugState() {
      return {
        constants: {
          ...PR_REAPER_INTENDED_BOUNDS,
          screenWidth: PR_REAPER_SCREEN_WIDTH,
          screenHeight: PR_REAPER_SCREEN_HEIGHT,
          robotBaseZ: PR_REAPER_ROBOT_BASE_Z,
        },
        detailLevel: detailPolicy.level,
        parkedPose: PR_REAPER_PARKED_POSE,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
      group.clear();
    },
  };
}

export function createPrReaperConsole(
  options: PrReaperConsoleOptions
): PrReaperConsoleBuild {
  return createPrReaperInstallation(options);
}
