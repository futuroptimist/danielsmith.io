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

import * as C from './prReaperInstallationContract';

export interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  getDebugState(): {
    constants: typeof C;
    detailLevel: string;
    parkedPose: { yaw: number; pitch: number };
    animatedJointNames: string[];
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

const ownedGeometries = new WeakSet<object>();
const ownedMaterials = new WeakSet<object>();

function ownGeometry<T extends { dispose(): void }>(geometry: T): T {
  ownedGeometries.add(geometry);
  return geometry;
}

function ownMaterial<T extends { dispose(): void }>(material: T): T {
  ownedMaterials.add(material);
  return material;
}

function createCollider(
  center: Vector3,
  width: number,
  depth: number,
  rotation: number
): RectCollider {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const corners = [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  corners.forEach(([x, z]) => {
    const worldX = center.x + x * cos + z * sin;
    const worldZ = center.z - x * sin + z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  });
  return { minX, maxX, minZ, maxZ };
}

function localToWorldFlat(
  base: Vector3,
  rotation: number,
  x: number,
  z: number
): Vector3 {
  return new Vector3(
    base.x + x * Math.cos(rotation) + z * Math.sin(rotation),
    base.y,
    base.z - x * Math.sin(rotation) + z * Math.cos(rotation)
  );
}

const detailFor = (policy: SceneDetailPolicy) => {
  const scale = Math.max(0, 4 - policy.detailIndex);
  return {
    cylinder: Math.max(6, policy.geometry.cylinderSegments),
    sphereW: Math.max(6, policy.geometry.sphereWidthSegments),
    sphereH: Math.max(4, policy.geometry.sphereHeightSegments),
    ring: Math.max(8, policy.geometry.ringSegments),
    accents: [10, 7, 4, 2, 1][policy.detailIndex] ?? Math.max(1, scale),
    fasteners: [12, 8, 4, 0, 0][policy.detailIndex] ?? 0,
    cable: policy.detailIndex <= 1,
  };
};

export function createPrReaperInstallation(
  options: PrReaperInstallationOptions
): PrReaperInstallationBuild {
  const { position, orientationRadians = 0 } = options;
  const detailPolicy = options.detailPolicy ?? getSceneDetailPolicy('balanced');
  const detail = detailFor(detailPolicy);
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);
  const group = new Group();
  group.name = 'PrReaperInstallation';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;
  group.scale.set(1, 1, 1);
  group.userData.activeDetailLevel = detailPolicy.level;

  const blueEdge = ownMaterial(
    new MeshBasicMaterial({
      color: 0x66d9ff,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    })
  );
  const screenMaterial = ownMaterial(
    new MeshBasicMaterial({
      color: new Color(0x3abdf5),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: DoubleSide,
    })
  );
  const metal = ownMaterial(
    new MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.5,
      metalness: 0.35,
    })
  );
  const dark = ownMaterial(
    new MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.62,
      metalness: 0.25,
    })
  );
  const green = ownMaterial(
    new MeshBasicMaterial({
      color: 0x60ff91,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: AdditiveBlending,
    })
  );

  const projector = new Group();
  projector.name = 'PrReaperProjectorBase';
  group.add(projector);
  const projectorBody = new Mesh(
    ownGeometry(
      new BoxGeometry(
        C.PR_REAPER_PROJECTOR_WIDTH,
        C.PR_REAPER_PROJECTOR_HEIGHT,
        C.PR_REAPER_PROJECTOR_DEPTH
      )
    ),
    metal
  );
  projectorBody.name = 'PrReaperProjectorHousing';
  projectorBody.position.set(
    0,
    C.PR_REAPER_PROJECTOR_CENTER_Y,
    C.PR_REAPER_PROJECTOR_CENTER_Z
  );
  projector.add(projectorBody);
  const lens = new Mesh(
    ownGeometry(new CylinderGeometry(0.16, 0.18, 0.035, detail.cylinder)),
    blueEdge
  );
  lens.name = 'PrReaperProjectorLens';
  lens.position.set(
    0,
    C.PR_REAPER_PROJECTOR_HEIGHT + 0.018,
    C.PR_REAPER_SCREEN_PLANE_Z
  );
  lens.rotation.x = Math.PI / 2;
  projector.add(lens);
  for (let index = 0; index < detail.accents; index += 1) {
    const accent = new Mesh(
      ownGeometry(
        new RingGeometry(
          0.2 + index * 0.045,
          0.215 + index * 0.045,
          detail.ring
        )
      ),
      blueEdge
    );
    accent.name = `PrReaperProjectorAccent-${index}`;
    accent.position.copy(lens.position);
    accent.rotation.x = -Math.PI / 2;
    projector.add(accent);
  }

  const holo = new Group();
  holo.name = 'PrReaperHologramRoot';
  group.add(holo);
  const screen = new Mesh(
    ownGeometry(
      new PlaneGeometry(C.PR_REAPER_SCREEN_WIDTH, C.PR_REAPER_SCREEN_HEIGHT)
    ),
    screenMaterial
  );
  screen.name = 'PrReaperHologramScreen';
  screen.position.set(
    0,
    C.PR_REAPER_SCREEN_CENTER_Y,
    C.PR_REAPER_SCREEN_PLANE_Z
  );
  screen.renderOrder = 20;
  holo.add(screen);
  const frameSpecs = [
    [
      'Top',
      0,
      C.PR_REAPER_SCREEN_BOTTOM_Y + C.PR_REAPER_SCREEN_HEIGHT,
      C.PR_REAPER_SCREEN_WIDTH,
      0.035,
    ],
    ['Bottom', 0, C.PR_REAPER_SCREEN_BOTTOM_Y, C.PR_REAPER_SCREEN_WIDTH, 0.035],
    [
      'Left',
      -C.PR_REAPER_SCREEN_WIDTH / 2,
      C.PR_REAPER_SCREEN_CENTER_Y,
      0.035,
      C.PR_REAPER_SCREEN_HEIGHT,
    ],
    [
      'Right',
      C.PR_REAPER_SCREEN_WIDTH / 2,
      C.PR_REAPER_SCREEN_CENTER_Y,
      0.035,
      C.PR_REAPER_SCREEN_HEIGHT,
    ],
  ] as const;
  frameSpecs.forEach(([name, x, y, w, h]) => {
    const edge = new Mesh(ownGeometry(new BoxGeometry(w, h, 0.025)), blueEdge);
    edge.name = `PrReaperHologramFrame-${name}`;
    edge.position.set(x, y, 0.012);
    holo.add(edge);
  });
  const circleRoot = new Group();
  circleRoot.name = 'PrReaperPrCircleRoot';
  holo.add(circleRoot);

  const particleRoot = new Group();
  particleRoot.name = 'PrReaperParticleRoot';
  group.add(particleRoot);

  const robotBase = new Group();
  robotBase.name = 'PrReaperRobotBase';
  robotBase.position.set(0, 0, C.PR_REAPER_ROBOT_BASE_Z);
  group.add(robotBase);
  const pedestal = new Mesh(
    ownGeometry(new CylinderGeometry(0.34, 0.4, 0.32, detail.cylinder)),
    dark
  );
  pedestal.name = 'PrReaperRobotPedestal';
  pedestal.position.y = 0.16;
  robotBase.add(pedestal);
  const yawJoint = new Group();
  yawJoint.name = 'PrReaperYawJoint';
  yawJoint.userData.animatedJointAxis = 'yaw';
  yawJoint.position.y = C.PR_REAPER_YAW_PIVOT.y;
  yawJoint.rotation.y = C.PR_REAPER_PARKED_POSE.yaw;
  robotBase.add(yawJoint);
  const yawBearing = new Mesh(
    ownGeometry(new CylinderGeometry(0.3, 0.3, 0.16, detail.cylinder)),
    metal
  );
  yawBearing.name = 'PrReaperYawBearing';
  yawJoint.add(yawBearing);
  const pitchJoint = new Group();
  pitchJoint.name = 'PrReaperPitchJoint';
  pitchJoint.userData.animatedJointAxis = 'pitch';
  pitchJoint.position.set(
    0,
    C.PR_REAPER_PITCH_PIVOT.y - C.PR_REAPER_YAW_PIVOT.y,
    0
  );
  pitchJoint.rotation.x = C.PR_REAPER_PARKED_POSE.pitch;
  yawJoint.add(pitchJoint);
  const pitchHousing = new Mesh(
    ownGeometry(new SphereGeometry(0.26, detail.sphereW, detail.sphereH)),
    metal
  );
  pitchHousing.name = 'PrReaperPitchHousing';
  pitchJoint.add(pitchHousing);
  const arm = new Mesh(
    ownGeometry(new BoxGeometry(0.22, 0.18, C.PR_REAPER_ARM_LINK_LENGTH)),
    metal
  );
  arm.name = 'PrReaperArmLink';
  arm.position.z = -C.PR_REAPER_ARM_LINK_LENGTH / 2;
  pitchJoint.add(arm);
  const flange = new Group();
  flange.name = 'PrReaperToolFlange';
  flange.position.set(0, 0, -C.PR_REAPER_ARM_LINK_LENGTH);
  pitchJoint.add(flange);
  const flangeMesh = new Mesh(
    ownGeometry(new CylinderGeometry(0.16, 0.16, 0.12, detail.cylinder)),
    dark
  );
  flangeMesh.name = 'PrReaperToolFlangePlate';
  flangeMesh.rotation.x = Math.PI / 2;
  flange.add(flangeMesh);
  const emitter = new Group();
  emitter.name = 'PrReaperLaserEmitter';
  emitter.position.set(0, 0, -C.PR_REAPER_TOOL_FORWARD);
  flange.add(emitter);
  const gun = new Mesh(ownGeometry(new BoxGeometry(0.16, 0.14, 0.34)), dark);
  gun.name = 'PrReaperLaserGun';
  gun.position.z = -0.08;
  emitter.add(gun);
  const aperture = new Mesh(
    ownGeometry(new CylinderGeometry(0.055, 0.065, 0.04, detail.cylinder)),
    blueEdge
  );
  aperture.name = 'PrReaperLaserAperture';
  aperture.rotation.x = Math.PI / 2;
  aperture.position.z = -0.27;
  emitter.add(aperture);
  const laserCore = new Mesh(
    ownGeometry(new BoxGeometry(0.02, 0.02, 1)),
    green
  );
  laserCore.name = 'PrReaperLaserCore';
  laserCore.visible = false;
  emitter.add(laserCore);
  const laserGlow = new Mesh(
    ownGeometry(new BoxGeometry(0.07, 0.07, 1)),
    green
  );
  laserGlow.name = 'PrReaperLaserGlow';
  laserGlow.visible = false;
  emitter.add(laserGlow);

  for (let index = 0; index < detail.fasteners; index += 1) {
    const fastener = new Mesh(
      ownGeometry(new CylinderGeometry(0.025, 0.025, 0.025, 8)),
      dark
    );
    fastener.name = `PrReaperArmFastener-${index}`;
    fastener.position.set(
      index % 2 === 0 ? -0.14 : 0.14,
      0.12,
      -0.1 - index * 0.035
    );
    pitchJoint.add(fastener);
  }

  const colliders = [
    createCollider(
      localToWorldFlat(
        basePosition,
        orientationRadians,
        0,
        C.PR_REAPER_PROJECTOR_CENTER_Z
      ),
      C.PR_REAPER_PROJECTOR_WIDTH,
      C.PR_REAPER_PROJECTOR_DEPTH,
      orientationRadians
    ),
    createCollider(
      localToWorldFlat(
        basePosition,
        orientationRadians,
        0,
        C.PR_REAPER_ROBOT_BASE_Z
      ),
      0.82,
      0.82,
      orientationRadians
    ),
  ];

  let disposed = false;
  return {
    group,
    colliders,
    update({ elapsed, emphasis }) {
      const pulse = getPulseScale();
      screenMaterial.opacity = 0.18 + emphasis * 0.08 * pulse;
      lens.rotation.z = elapsed * 0.2;
      blueEdge.opacity = 0.72 + emphasis * 0.14 * pulse;
    },
    getDebugState() {
      return {
        constants: C,
        detailLevel: detailPolicy.level,
        parkedPose: { ...C.PR_REAPER_PARKED_POSE },
        animatedJointNames: ['PrReaperYawJoint', 'PrReaperPitchJoint'],
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.geometry && ownedGeometries.has(mesh.geometry))
          mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : mesh.material
            ? [mesh.material]
            : [];
        materials.forEach((material) => {
          if (ownedMaterials.has(material)) material.dispose();
        });
      });
    },
  };
}

export function createPrReaperConsole(
  options: PrReaperConsoleOptions
): PrReaperConsoleBuild {
  return createPrReaperInstallation(options);
}
