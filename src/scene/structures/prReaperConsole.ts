import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';

import {
  getFlickerScale,
  getPulseScale,
} from '../../ui/accessibility/animationPreferences';
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
  PR_REAPER_LASER_DURATION_SECONDS,
  PR_REAPER_PARKED_POSE,
  PR_REAPER_PARTICLE_BURST_DURATION_MAX_SECONDS,
  PR_REAPER_PARTICLE_BURST_DURATION_MIN_SECONDS,
  PR_REAPER_PARTICLE_BURST_POOL_CAPACITY,
  PR_REAPER_PR_CIRCLE_POOL_CAPACITY,
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
  PR_REAPER_STREAM_CIRCLE_RADIUS,
  PR_REAPER_STREAM_Z,
  PR_REAPER_TOOL_FLANGE_OFFSET,
  PR_REAPER_YAW_PIVOT,
} from './prReaperInstallationContract';
import { PrReaperReapingController } from './prReaperReapingController';
import {
  createPrReaperSeededRandom,
  createPrReaperStream,
  PR_REAPER_STREAM_DEFAULT_SEED,
  type PrReaperCircleState,
  type PrReaperStreamDebugState,
} from './prReaperStream';

export interface PrReaperInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
  getDebugState(): {
    detailLevel: SceneDetailPolicy['level'];
    parkedPose: typeof PR_REAPER_PARKED_POSE;
    screenToEmitterStandoff: number;
    poolCapacity: number;
    stream: PrReaperStreamDebugState;
    controller: ReturnType<PrReaperReapingController['getDebugState']>;
    laserActive: boolean;
    laserRemainingSeconds: number;
    lastLaserWorldStart: { x: number; y: number; z: number } | null;
    lastLaserWorldEnd: { x: number; y: number; z: number } | null;
    activeBurstCount: number;
    burstPoolCapacity: number;
    activeBurstDurations: number[];
    activeBurstAges: number[];
    detailParticleCount: number;
  } & PrReaperStreamDebugState;
  dispose(): void;
}

export interface PrReaperInstallationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  detailPolicy?: SceneDetailPolicy;
  seed?: string;
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

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function disposeMesh(mesh: Mesh, disposedResources: Set<unknown>): void {
  if (!disposedResources.has(mesh.geometry)) {
    disposedResources.add(mesh.geometry);
    mesh.geometry.dispose();
  }
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  materials.forEach((material) => {
    if (disposedResources.has(material)) return;
    disposedResources.add(material);
    material.dispose();
  });
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
    circleSegments: Math.max(10, Math.round(36 - policy.detailIndex * 6)),
    particles: [32, 24, 14, 8, 4][policy.detailIndex] ?? 8,
  };
}

export function createPrReaperInstallation(
  options: PrReaperInstallationOptions
): PrReaperInstallationBuild {
  const {
    position,
    orientationRadians = 0,
    detailPolicy = getSceneDetailPolicy('balanced'),
    seed = PR_REAPER_STREAM_DEFAULT_SEED,
  } = options;
  const counts = detailCounts(detailPolicy);
  const stream = createPrReaperStream({ seed });
  const controller = new PrReaperReapingController();
  const burstRandom = createPrReaperSeededRandom(`${seed}:particle-bursts`);
  const activeCandidateSnapshot: PrReaperCircleState[] = Array.from(
    { length: PR_REAPER_PR_CIRCLE_POOL_CAPACITY },
    () => ({
      id: 0,
      type: 'red',
      lifecycle: 'active',
      normalizedX: 0,
      progress: 0,
      center: { x: 0, y: 0, z: PR_REAPER_STREAM_Z },
    })
  );
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
  const laserGunMaterial = new MeshBasicMaterial({
    color: 0x5b676d,
  });
  const green = new MeshBasicMaterial({
    color: 0x4dff8f,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const circleRedMaterial = new MeshBasicMaterial({
    color: 0xff4d5d,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const circleGreenMaterial = new MeshBasicMaterial({
    color: 0x4dff8f,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const circleGeometry = new CircleGeometry(
    PR_REAPER_STREAM_CIRCLE_RADIUS,
    counts.circleSegments
  );

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
  const circlePool: Mesh[] = [];
  for (let i = 0; i < PR_REAPER_PR_CIRCLE_POOL_CAPACITY; i += 1) {
    const circle = addOwned(owned, new Mesh(circleGeometry, circleRedMaterial));
    circle.name = `PrReaperPrCircle-${i}`;
    circle.visible = false;
    circle.renderOrder = 30;
    circle.position.z = PR_REAPER_STREAM_Z;
    circle.userData.lifecycle = 'inactive';
    prRoot.add(circle);
    circlePool.push(circle);
  }

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
  const flange = new Group();
  flange.name = 'PrReaperToolFlange';
  flange.position.set(
    PR_REAPER_TOOL_FLANGE_OFFSET.x,
    PR_REAPER_TOOL_FLANGE_OFFSET.y,
    PR_REAPER_TOOL_FLANGE_OFFSET.z
  );
  pitchJoint.add(flange);
  const flangeHousing = addOwned(
    owned,
    new Mesh(
      new CylinderGeometry(0.14, 0.14, 0.12, counts.cylinder),
      laserGunMaterial
    )
  );
  flangeHousing.name = 'PrReaperToolFlangeHousing';
  flangeHousing.rotation.x = Math.PI / 2;
  flange.add(flangeHousing);
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
    new Mesh(new BoxGeometry(0.16, 0.12, 0.28), laserGunMaterial)
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
  const laserCoreMaterial = new MeshBasicMaterial({
    color: 0x52ff8f,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const laserGlowMaterial = new MeshBasicMaterial({
    color: 0x7dffad,
    transparent: true,
    opacity: detailPolicy.effects.decorativeHalos ? 0.3 : 0.12,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const beamGeometry = new CylinderGeometry(
    1,
    1,
    1,
    Math.max(6, counts.cylinder)
  );
  const laserCore = addOwned(owned, new Mesh(beamGeometry, laserCoreMaterial));
  laserCore.name = 'PrReaperLaserCore';
  laserCore.visible = false;
  emitter.add(laserCore);
  const laserGlow = addOwned(owned, new Mesh(beamGeometry, laserGlowMaterial));
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
  group.add(particles);
  const particleSlots = Array.from(
    { length: PR_REAPER_PARTICLE_BURST_POOL_CAPACITY },
    (_, slot) => {
      const geometry = new BufferGeometry();
      const positions = new Float32Array(counts.particles * 3);
      const velocities = new Float32Array(counts.particles * 3);
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      const material = new PointsMaterial({
        color: 0x7dffad,
        transparent: true,
        opacity: 0,
        size: 0.055,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const points = new Points(geometry, material);
      points.name = `PrReaperParticleBurstPool-${slot}`;
      points.visible = false;
      particles.add(points);
      return {
        points,
        geometry,
        material,
        positions,
        velocities,
        active: false,
        age: 0,
        duration: 0,
      };
    }
  );

  const centerOffsetZ = (PR_REAPER_FRONT_DEPTH - PR_REAPER_REAR_DEPTH) / 2;
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

  const worldStart = new Vector3();
  const worldEnd = new Vector3();
  const localStart = new Vector3();
  const localEnd = new Vector3();
  const midpoint = new Vector3();
  const direction = new Vector3();
  const beamParentMatrix = new Matrix4();
  const beamQuaternion = new Quaternion();
  let laserRemaining = 0;
  let lastLaserWorldStart: { x: number; y: number; z: number } | null = null;
  let lastLaserWorldEnd: { x: number; y: number; z: number } | null = null;

  function setBeamVisible(visible: boolean, flicker: number): void {
    laserCore.visible = visible;
    laserGlow.visible =
      visible && detailPolicy.level !== 'low' && detailPolicy.level !== 'micro';
    laserCoreMaterial.opacity = visible ? 0.62 + 0.3 * flicker : 0;
    laserGlowMaterial.opacity = visible
      ? (detailPolicy.effects.decorativeHalos ? 0.24 : 0.1) * flicker
      : 0;
  }

  function updateBeam(start: Vector3, end: Vector3): void {
    beamParentMatrix.copy(emitter.matrixWorld).invert();
    localStart.copy(start).applyMatrix4(beamParentMatrix);
    localEnd.copy(end).applyMatrix4(beamParentMatrix);
    midpoint.copy(localStart).add(localEnd).multiplyScalar(0.5);
    direction.copy(localEnd).sub(localStart);
    const length = Math.max(0.0001, direction.length());
    beamQuaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.normalize()
    );
    [laserCore, laserGlow].forEach((beam, index) => {
      beam.position.copy(midpoint);
      beam.quaternion.copy(beamQuaternion);
      beam.scale.set(
        index === 0 ? 0.012 : 0.035,
        length,
        index === 0 ? 0.012 : 0.035
      );
    });
  }

  function startBurst(origin: Vector3, flicker: number): void {
    const slot =
      particleSlots.find((candidate) => !candidate.active) ?? particleSlots[0];
    slot.active = true;
    slot.age = 0;
    slot.duration =
      PR_REAPER_PARTICLE_BURST_DURATION_MIN_SECONDS +
      burstRandom() *
        (PR_REAPER_PARTICLE_BURST_DURATION_MAX_SECONDS -
          PR_REAPER_PARTICLE_BURST_DURATION_MIN_SECONDS);
    slot.points.visible = true;
    slot.points.position.copy(origin);
    slot.material.opacity = 0.85 * flicker;
    for (let i = 0; i < counts.particles; i += 1) {
      const offset = i * 3;
      slot.positions[offset] = 0;
      slot.positions[offset + 1] = 0;
      slot.positions[offset + 2] = 0;
      const angle = burstRandom() * Math.PI * 2;
      const speed = 0.25 + burstRandom() * 0.45;
      slot.velocities[offset] = Math.cos(angle) * speed * flicker;
      slot.velocities[offset + 1] = (0.15 + burstRandom() * 0.35) * flicker;
      slot.velocities[offset + 2] = Math.sin(angle) * speed * 0.25 * flicker;
    }
    slot.geometry.getAttribute('position').needsUpdate = true;
  }

  function updateBursts(delta: number): void {
    particleSlots.forEach((slot) => {
      if (!slot.active) return;
      slot.age += delta;
      const t = Math.min(1, slot.age / slot.duration);
      for (let i = 0; i < counts.particles; i += 1) {
        const offset = i * 3;
        slot.positions[offset] = slot.velocities[offset] * slot.age;
        slot.positions[offset + 1] =
          slot.velocities[offset + 1] * slot.age - 0.18 * slot.age * slot.age;
        slot.positions[offset + 2] = slot.velocities[offset + 2] * slot.age;
      }
      slot.material.opacity = 0.8 * (1 - t);
      slot.geometry.getAttribute('position').needsUpdate = true;
      if (slot.age >= slot.duration) {
        slot.active = false;
        slot.points.visible = false;
        slot.material.opacity = 0;
      }
    });
  }

  let disposed = false;
  return {
    group,
    colliders,
    update({ elapsed, delta, emphasis }) {
      stream.advance(delta);
      const pulse = getPulseScale();
      const flicker = getFlickerScale();
      const amount =
        (0.18 + Math.sin(elapsed * 1.7) * 0.04 + emphasis * 0.2) * pulse;
      screenMaterial.opacity = clampOpacity(0.22 + amount);
      edgeMaterial.opacity = clampOpacity(0.62 + amount);
      const activeCandidateCount = stream.writeActiveCandidates(
        activeCandidateSnapshot
      );
      circleRedMaterial.opacity = clampOpacity(
        0.72 + emphasis * 0.18 * flicker
      );
      circleGreenMaterial.opacity = clampOpacity(
        0.72 + emphasis * 0.18 * flicker
      );
      const candidateMeshById = new Map<number, Mesh>();
      for (let i = 0; i < circlePool.length; i += 1) {
        const circle = circlePool[i];
        if (i >= activeCandidateCount) {
          circle.visible = false;
          circle.userData.candidateId = undefined;
          circle.userData.type = undefined;
          circle.userData.lifecycle = 'inactive';
          continue;
        }
        const candidate = activeCandidateSnapshot[i];
        circle.visible = true;
        circle.position.set(
          candidate.center.x,
          candidate.center.y,
          candidate.center.z
        );
        circle.material =
          candidate.type === 'red' ? circleRedMaterial : circleGreenMaterial;
        circle.scale.setScalar(1 + Math.sin(elapsed * 2 + i) * 0.025 * pulse);
        circle.userData.candidateId = candidate.id;
        circle.userData.type = candidate.type;
        circle.userData.lifecycle = candidate.lifecycle;
        candidateMeshById.set(candidate.id, circle);
      }
      const fire = controller.update({
        delta,
        candidates: activeCandidateSnapshot.slice(0, activeCandidateCount),
        rootHeadingRadians: orientationRadians,
      });
      const pose = controller.getPose();
      yawJoint.rotation.y = pose.yaw;
      pitchJoint.rotation.x = pose.pitch;
      if (fire) {
        const targetMesh = candidateMeshById.get(fire.candidateId);
        if (targetMesh?.userData.type === 'red') {
          group.updateMatrixWorld(true);
          emitter.getWorldPosition(worldStart);
          targetMesh.getWorldPosition(worldEnd);
          stream.reapCandidate(fire.candidateId, elapsed);
          targetMesh.visible = false;
          targetMesh.userData.lifecycle = 'reaped';
          laserRemaining = PR_REAPER_LASER_DURATION_SECONDS;
          lastLaserWorldStart = {
            x: worldStart.x,
            y: worldStart.y,
            z: worldStart.z,
          };
          lastLaserWorldEnd = { x: worldEnd.x, y: worldEnd.y, z: worldEnd.z };
          controller.setLastFireWorldPoints(
            lastLaserWorldStart,
            lastLaserWorldEnd
          );
          updateBeam(worldStart, worldEnd);
          startBurst(worldEnd, flicker);
        }
      }
      laserRemaining = Math.max(0, laserRemaining - delta);
      if (laserRemaining > 0 && lastLaserWorldStart && lastLaserWorldEnd) {
        updateBeam(
          worldStart.set(
            lastLaserWorldStart.x,
            lastLaserWorldStart.y,
            lastLaserWorldStart.z
          ),
          worldEnd.set(
            lastLaserWorldEnd.x,
            lastLaserWorldEnd.y,
            lastLaserWorldEnd.z
          )
        );
      }
      setBeamVisible(laserRemaining > 0, flicker);
      updateBursts(delta);
    },
    getDebugState() {
      const streamDebug = stream.getDebugState();
      return {
        detailLevel: detailPolicy.level,
        parkedPose: PR_REAPER_PARKED_POSE,
        screenToEmitterStandoff: PR_REAPER_SCREEN_TO_EMITTER_STANDOFF,
        controller: controller.getDebugState(),
        currentYaw: controller.getDebugState().currentYaw,
        currentPitch: controller.getDebugState().currentPitch,
        targetYaw: controller.getDebugState().targetYaw,
        targetPitch: controller.getDebugState().targetPitch,
        selectedCandidateId: controller.getDebugState().selectedCandidateId,
        selectedCandidateType:
          streamDebug.activeCandidates.find(
            (candidate) =>
              candidate.id === controller.getDebugState().selectedCandidateId
          )?.type ?? null,
        attemptedGreenReaps: streamDebug.attemptedGreenReapCount,
        laserActive: laserRemaining > 0,
        laserRemainingSeconds: laserRemaining,
        lastLaserWorldStart: lastLaserWorldStart
          ? { ...lastLaserWorldStart }
          : null,
        lastLaserWorldEnd: lastLaserWorldEnd ? { ...lastLaserWorldEnd } : null,
        activeBurstCount: particleSlots.filter((slot) => slot.active).length,
        burstPoolCapacity: PR_REAPER_PARTICLE_BURST_POOL_CAPACITY,
        activeBurstDurations: particleSlots
          .filter((slot) => slot.active)
          .map((slot) => slot.duration),
        activeBurstAges: particleSlots
          .filter((slot) => slot.active)
          .map((slot) => slot.age),
        detailParticleCount: counts.particles,
        poolCapacity: PR_REAPER_PR_CIRCLE_POOL_CAPACITY,
        ...streamDebug,
        stream: streamDebug,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const disposedResources = new Set<unknown>();
      owned.forEach((mesh) => disposeMesh(mesh, disposedResources));
      particleSlots.forEach((slot) => {
        slot.geometry.dispose();
        slot.material.dispose();
      });
      [
        circleRedMaterial,
        circleGreenMaterial,
        laserCoreMaterial,
        laserGlowMaterial,
      ].forEach((material) => {
        if (disposedResources.has(material)) return;
        disposedResources.add(material);
        material.dispose();
      });
    },
  };
}

export const createPrReaperConsole = createPrReaperInstallation;
export { PR_REAPER_INTENDED_BOUNDS };
