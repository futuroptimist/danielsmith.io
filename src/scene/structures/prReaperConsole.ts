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

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

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
  PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
  PR_REAPER_SCREEN_WIDTH,
  PR_REAPER_TOOL_FLANGE_OFFSET,
  PR_REAPER_YAW_PIVOT,
} from './prReaperInstallationContract';

export interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  getDebugState(): {
    detailLevel: SceneDetailPolicy['level'];
    parkedPose: typeof PR_REAPER_PARKED_POSE;
    screenToEmitterStandoff: number;
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

function addOwned<T extends Mesh>(owned: Mesh[], mesh: T): T {
  owned.push(mesh);
  return mesh;
}

function disposeMesh(mesh: Mesh): void {
  mesh.geometry.dispose();
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  materials.forEach((material) => material.dispose());
}

function detailCounts(policy: SceneDetailPolicy) {
  const scale = Math.max(0, 4 - policy.detailIndex);
  return {
    cylinder: Math.max(3, policy.geometry.cylinderSegments),
    ring: Math.max(3, policy.geometry.ringSegments),
    sphereW: Math.max(4, policy.geometry.sphereWidthSegments),
    sphereH: Math.max(3, policy.geometry.sphereHeightSegments),
    accents: scale,
    fasteners: scale > 2 ? 6 : scale > 1 ? 4 : 0,
  };
}

export function createPrReaperInstallation(
  options: PrReaperInstallationOptions
): PrReaperInstallationBuild {
  const {
    position,
    orientationRadians = 0,
    detailPolicy = getSceneDetailPolicy('balanced'),
  } = options;
  const counts = detailCounts(detailPolicy);
  const group = new Group();
  group.name = 'PrReaperInstallation';
  group.position.set(position.x, position.y ?? 0, position.z);
  group.rotation.y = orientationRadians;
  group.scale.set(1, 1, 1);
  group.userData.detailLevel = detailPolicy.level;
  group.userData.anchor = 'bottom-center';

  const owned: Mesh[] = [];
  const screenMaterial = new MeshBasicMaterial({
    color: new Color(0x55cfff),
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
  const edgeMaterial = new MeshBasicMaterial({
    color: new Color(0x8ee9ff),
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const metal = new MeshStandardMaterial({
    color: 0x172033,
    metalness: 0.45,
    roughness: 0.42,
  });
  const darkMetal = new MeshStandardMaterial({
    color: 0x0f1724,
    metalness: 0.5,
    roughness: 0.38,
  });
  const green = new MeshBasicMaterial({
    color: 0x4dff8f,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  const projector = new Group();
  projector.name = 'PrReaperProjectorBase';
  group.add(projector);
  const projectorBody = addOwned(
    owned,
    new Mesh(
      new BoxGeometry(
        PR_REAPER_PROJECTOR_WIDTH,
        PR_REAPER_PROJECTOR_HEIGHT,
        PR_REAPER_PROJECTOR_DEPTH
      ),
      metal
    )
  );
  projectorBody.name = 'PrReaperProjectorHousing';
  projectorBody.position.set(
    0,
    PR_REAPER_PROJECTOR_CENTER_Y,
    PR_REAPER_PROJECTOR_CENTER_Z
  );
  projector.add(projectorBody);
  const lens = addOwned(
    owned,
    new Mesh(new CylinderGeometry(0.18, 0.18, 0.035, counts.cylinder), green)
  );
  lens.name = 'PrReaperProjectorLens';
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, PR_REAPER_PROJECTOR_HEIGHT + 0.02, 0);
  projector.add(lens);
  for (let i = 0; i < counts.accents; i += 1) {
    const ring = addOwned(
      owned,
      new Mesh(
        new RingGeometry(0.22 + i * 0.05, 0.24 + i * 0.05, counts.ring),
        edgeMaterial
      )
    );
    ring.name = `PrReaperProjectorAccent-${i}`;
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(lens.position);
    ring.position.y += 0.004 + i * 0.002;
    projector.add(ring);
  }

  const hologram = new Group();
  hologram.name = 'PrReaperHologramRoot';
  group.add(hologram);
  const screen = addOwned(
    owned,
    new Mesh(
      new PlaneGeometry(PR_REAPER_SCREEN_WIDTH, PR_REAPER_SCREEN_HEIGHT),
      screenMaterial
    )
  );
  screen.name = 'PrReaperHologramScreen';
  screen.position.set(0, PR_REAPER_SCREEN_CENTER_Y, PR_REAPER_SCREEN_PLANE_Z);
  screen.renderOrder = 20;
  hologram.add(screen);
  const edgeThickness = 0.025;
  const frameParts: Array<
    [string, [number, number, number], [number, number, number]]
  > = [
    [
      'top',
      [PR_REAPER_SCREEN_WIDTH, edgeThickness, edgeThickness],
      [0, PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT, 0.012],
    ],
    [
      'bottom',
      [PR_REAPER_SCREEN_WIDTH, edgeThickness, edgeThickness],
      [0, PR_REAPER_SCREEN_BOTTOM_Y, 0.012],
    ],
    [
      'left',
      [edgeThickness, PR_REAPER_SCREEN_HEIGHT, edgeThickness],
      [-PR_REAPER_SCREEN_WIDTH / 2, PR_REAPER_SCREEN_CENTER_Y, 0.012],
    ],
    [
      'right',
      [edgeThickness, PR_REAPER_SCREEN_HEIGHT, edgeThickness],
      [PR_REAPER_SCREEN_WIDTH / 2, PR_REAPER_SCREEN_CENTER_Y, 0.012],
    ],
  ];
  frameParts.forEach(([name, size, pos]) => {
    const frame = addOwned(
      owned,
      new Mesh(new BoxGeometry(...size), edgeMaterial)
    );
    frame.name = `PrReaperHologramFrame-${name}`;
    frame.position.set(...pos);
    frame.renderOrder = 21;
    hologram.add(frame);
  });
  for (let i = 0; i < counts.accents; i += 1) {
    const y =
      PR_REAPER_SCREEN_BOTTOM_Y +
      ((i + 1) / (counts.accents + 1)) * PR_REAPER_SCREEN_HEIGHT;
    const tick = addOwned(
      owned,
      new Mesh(new BoxGeometry(0.18, 0.012, 0.018), edgeMaterial)
    );
    tick.name = `PrReaperHologramFrame-segment-${i}`;
    tick.position.set(PR_REAPER_SCREEN_WIDTH / 2 + 0.08, y, 0.018);
    hologram.add(tick);
  }
  const prRoot = new Group();
  prRoot.name = 'PrReaperPrCircleRoot';
  hologram.add(prRoot);

  const robotBase = new Group();
  robotBase.name = 'PrReaperRobotBase';
  group.add(robotBase);
  const base = addOwned(
    owned,
    new Mesh(
      new CylinderGeometry(
        PR_REAPER_ROBOT_BASE_RADIUS,
        PR_REAPER_ROBOT_BASE_RADIUS,
        PR_REAPER_ROBOT_BASE_HEIGHT,
        counts.cylinder
      ),
      darkMetal
    )
  );
  base.name = 'PrReaperRobotPedestal';
  base.position.set(0, PR_REAPER_ROBOT_BASE_HEIGHT / 2, PR_REAPER_ROBOT_BASE_Z);
  robotBase.add(base);
  const yawJoint = new Group();
  yawJoint.name = 'PrReaperYawJoint';
  yawJoint.userData.animatedJoint = 'yaw';
  yawJoint.position.set(
    PR_REAPER_YAW_PIVOT.x,
    PR_REAPER_YAW_PIVOT.y,
    PR_REAPER_YAW_PIVOT.z
  );
  yawJoint.rotation.y = PR_REAPER_PARKED_POSE.yaw;
  robotBase.add(yawJoint);
  const yawBearing = addOwned(
    owned,
    new Mesh(new CylinderGeometry(0.22, 0.24, 0.16, counts.cylinder), metal)
  );
  yawBearing.name = 'PrReaperYawBearing';
  yawBearing.position.y = 0.08;
  yawJoint.add(yawBearing);
  const pitchJoint = new Group();
  pitchJoint.name = 'PrReaperPitchJoint';
  pitchJoint.userData.animatedJoint = 'pitch';
  pitchJoint.position.set(
    PR_REAPER_PITCH_PIVOT.x,
    PR_REAPER_PITCH_PIVOT.y - PR_REAPER_YAW_PIVOT.y,
    PR_REAPER_PITCH_PIVOT.z
  );
  pitchJoint.rotation.x = PR_REAPER_PARKED_POSE.pitch;
  yawJoint.add(pitchJoint);
  const shoulder = addOwned(
    owned,
    new Mesh(new SphereGeometry(0.22, counts.sphereW, counts.sphereH), metal)
  );
  shoulder.name = 'PrReaperPitchHousing';
  pitchJoint.add(shoulder);
  const arm = addOwned(
    owned,
    new Mesh(new BoxGeometry(0.18, 0.18, PR_REAPER_ARM_LINK_LENGTH), metal)
  );
  arm.name = 'PrReaperArmLink';
  arm.position.z = -PR_REAPER_ARM_LINK_LENGTH / 2;
  pitchJoint.add(arm);
  const flange = addOwned(
    owned,
    new Mesh(new CylinderGeometry(0.14, 0.14, 0.12, counts.cylinder), darkMetal)
  );
  flange.name = 'PrReaperToolFlange';
  flange.rotation.x = Math.PI / 2;
  flange.position.set(
    PR_REAPER_TOOL_FLANGE_OFFSET.x,
    PR_REAPER_TOOL_FLANGE_OFFSET.y,
    PR_REAPER_TOOL_FLANGE_OFFSET.z
  );
  pitchJoint.add(flange);
  const emitter = new Group();
  emitter.name = 'PrReaperLaserEmitter';
  emitter.position.set(
    PR_REAPER_EMITTER_OFFSET.x,
    PR_REAPER_EMITTER_OFFSET.y,
    PR_REAPER_EMITTER_OFFSET.z
  );
  flange.add(emitter);
  const gun = addOwned(
    owned,
    new Mesh(new BoxGeometry(0.16, 0.12, 0.28), darkMetal)
  );
  gun.name = 'PrReaperLaserGunHousing';
  gun.position.z = 0.08;
  emitter.add(gun);
  const aperture = addOwned(
    owned,
    new Mesh(new CylinderGeometry(0.045, 0.045, 0.035, counts.cylinder), green)
  );
  aperture.name = 'PrReaperLaserAperture';
  aperture.rotation.x = Math.PI / 2;
  aperture.position.z = -0.08;
  emitter.add(aperture);
  const laserCore = new Group();
  laserCore.name = 'PrReaperLaserCore';
  laserCore.visible = false;
  emitter.add(laserCore);
  const laserGlow = new Group();
  laserGlow.name = 'PrReaperLaserGlow';
  laserGlow.visible = false;
  emitter.add(laserGlow);
  for (let i = 0; i < counts.fasteners; i += 1) {
    const fastener = addOwned(
      owned,
      new Mesh(new CylinderGeometry(0.025, 0.025, 0.018, 6), edgeMaterial)
    );
    fastener.name = `PrReaperArmFastener-${i}`;
    fastener.rotation.x = Math.PI / 2;
    fastener.position.set(
      i % 2 === 0 ? -0.11 : 0.11,
      0,
      -0.12 - Math.floor(i / 2) * 0.18
    );
    pitchJoint.add(fastener);
  }

  const particles = new Group();
  particles.name = 'PrReaperParticleRoot';
  particles.visible = false;
  group.add(particles);

  const centerOffsetZ = (PR_REAPER_FRONT_DEPTH - PR_REAPER_REAR_DEPTH) / 2;
  const right = new Vector3(
    Math.cos(orientationRadians),
    0,
    -Math.sin(orientationRadians)
  );
  const forward = new Vector3(
    Math.sin(orientationRadians),
    0,
    Math.cos(orientationRadians)
  );
  const footprintCenter = new Vector3(
    position.x + forward.x * centerOffsetZ,
    position.y ?? 0,
    position.z + forward.z * centerOffsetZ
  );
  const colliders = [
    createCollider(
      footprintCenter,
      PR_REAPER_FOOTPRINT_WIDTH,
      PR_REAPER_FOOTPRINT_DEPTH,
      orientationRadians
    ),
  ];
  void right;

  let disposed = false;
  return {
    group,
    colliders,
    update({ elapsed, emphasis }) {
      const pulse = getPulseScale();
      const amount =
        (0.18 + Math.sin(elapsed * 1.7) * 0.04 + emphasis * 0.2) * pulse;
      screenMaterial.opacity = 0.22 + amount;
      edgeMaterial.opacity = 0.62 + amount;
    },
    getDebugState() {
      return {
        detailLevel: detailPolicy.level,
        parkedPose: PR_REAPER_PARKED_POSE,
        screenToEmitterStandoff: PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      owned.forEach(disposeMesh);
    },
  };
}

export const createPrReaperConsole = createPrReaperInstallation;
export { PR_REAPER_INTENDED_BOUNDS };
