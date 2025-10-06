import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

import type { AmbientAudioFalloffCurve } from '../audio/ambientAudio';
import type { RectCollider } from '../collision';
import type { Bounds2D } from '../floorPlan';
import { createGreenhouse } from '../structures/greenhouse';
import { createModelRocket } from '../structures/modelRocket';

export interface BackyardEnvironmentBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number }): void;
  ambientAudioBeds: BackyardAmbientAudioBed[];
}

export interface BackyardAmbientAudioBed {
  id: string;
  center: { x: number; z: number };
  innerRadius: number;
  outerRadius: number;
  baseVolume: number;
  falloffCurve?: AmbientAudioFalloffCurve;
}

function createSignageTexture(title: string, subtitle: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create hologram signage context.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, 'rgba(18, 52, 80, 0.9)');
  gradient.addColorStop(1, 'rgba(35, 95, 135, 0.35)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(102, 212, 255, 0.85)';
  context.shadowColor = 'rgba(125, 235, 255, 0.65)';
  context.shadowBlur = 18;
  context.font = 'bold 48px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  context.fillText(title, canvas.width / 2, canvas.height / 2 - 14);

  context.shadowBlur = 10;
  context.fillStyle = 'rgba(185, 230, 255, 0.85)';
  context.font = '600 26px "Inter", "Segoe UI", sans-serif';
  context.textBaseline = 'top';
  context.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 18);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createBackyardEnvironment(
  bounds: Bounds2D
): BackyardEnvironmentBuild {
  const group = new Group();
  group.name = 'BackyardEnvironment';
  const colliders: RectCollider[] = [];
  const updates: Array<(context: { elapsed: number; delta: number }) => void> =
    [];
  const ambientAudioBeds: BackyardAmbientAudioBed[] = [];

  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  const terrainSegments = 32;
  const terrainGeometry = new PlaneGeometry(
    width,
    depth,
    terrainSegments,
    terrainSegments
  );
  const terrainPositions = terrainGeometry.attributes
    .position as BufferAttribute;
  for (let i = 0; i < terrainPositions.count; i += 1) {
    const x = terrainPositions.getX(i);
    const y = terrainPositions.getY(i);
    const normalizedX = x / width + 0.5;
    const normalizedY = y / depth + 0.5;
    const swell = Math.sin(normalizedY * Math.PI) * 0.38;
    const ripple = Math.cos(normalizedX * Math.PI * 2) * 0.18;
    const microVariation =
      (Math.sin(x * 1.7 + y * 0.9) + Math.cos(x * 0.85 - y * 1.3)) * 0.04;
    terrainPositions.setZ(i, (swell + ripple) * 0.12 + microVariation);
  }
  terrainPositions.needsUpdate = true;
  terrainGeometry.computeVertexNormals();
  terrainGeometry.rotateX(-Math.PI / 2);

  const terrainMaterial = new MeshStandardMaterial({
    color: 0x1d2f22,
    roughness: 0.92,
    metalness: 0.05,
  });
  const terrain = new Mesh(terrainGeometry, terrainMaterial);
  terrain.position.set(centerX, -0.05, centerZ);
  terrain.receiveShadow = false;
  group.add(terrain);

  const pathWidth = width * 0.48;
  const pathDepth = Math.min(6, depth * 0.55);
  const pathGeometry = new BoxGeometry(pathWidth, 0.08, pathDepth);
  const pathMaterial = new MeshStandardMaterial({
    color: 0x515c66,
    roughness: 0.65,
    metalness: 0.2,
  });
  const path = new Mesh(pathGeometry, pathMaterial);
  path.position.set(centerX, 0.04, bounds.minZ + pathDepth / 2 + 0.35);
  group.add(path);

  const rocketBase = new Vector3(
    centerX - width * 0.22,
    0,
    bounds.minZ + pathDepth + Math.min(depth * 0.18, 1.6)
  );
  const rocket = createModelRocket({
    basePosition: rocketBase,
    orientationRadians: -Math.PI / 10,
  });
  group.add(rocket.group);
  colliders.push(rocket.collider);

  const steppingStoneGeometry = new BoxGeometry(pathWidth * 0.32, 0.12, 0.9);
  const steppingStoneMaterial = new MeshStandardMaterial({
    color: 0x676f78,
    roughness: 0.7,
    metalness: 0.18,
  });
  const steppingStoneCount = 4;
  for (let i = 0; i < steppingStoneCount; i += 1) {
    const stone = new Mesh(steppingStoneGeometry, steppingStoneMaterial);
    const offset = (i + 1) / (steppingStoneCount + 1);
    stone.position.set(
      centerX + (i % 2 === 0 ? 0.85 : -0.4),
      0.08,
      bounds.minZ + pathDepth + (depth - pathDepth) * offset
    );
    stone.rotation.y = (i % 2 === 0 ? 1 : -1) * Math.PI * 0.03;
    group.add(stone);
  }

  const greenhouseWidth = Math.min(4.6, width * 0.52);
  const greenhouseDepth = Math.min(3.2, depth * 0.38);
  const greenhouseBase = new Vector3(
    centerX + width * 0.22,
    0,
    bounds.minZ + pathDepth + (depth - pathDepth) * 0.62
  );
  const greenhouse = createGreenhouse({
    basePosition: greenhouseBase,
    width: greenhouseWidth,
    depth: greenhouseDepth,
  });
  group.add(greenhouse.group);
  greenhouse.colliders.forEach((collider) => colliders.push(collider));
  updates.push(greenhouse.update);

  const walkwayWidth = greenhouseWidth * 0.68;
  const walkwayDepth = greenhouseDepth * 0.72;
  const walkwayGeometry = new BoxGeometry(walkwayWidth, 0.06, walkwayDepth);
  const walkwayMaterial = new MeshStandardMaterial({
    color: 0x454f57,
    roughness: 0.58,
    metalness: 0.22,
  });
  const walkway = new Mesh(walkwayGeometry, walkwayMaterial);
  walkway.name = 'BackyardGreenhouseWalkway';
  walkway.position.set(
    greenhouseBase.x,
    0.03,
    greenhouseBase.z - greenhouseDepth * 0.65
  );
  group.add(walkway);

  const walkwayMaxExtent = Math.max(walkwayWidth, walkwayDepth);
  ambientAudioBeds.push({
    id: 'backyard-greenhouse-chimes',
    center: { x: walkway.position.x, z: walkway.position.z },
    innerRadius: Math.max(1, (walkwayMaxExtent / 2) * 0.9),
    outerRadius: Math.max(1.6, walkwayMaxExtent * 1.2 + 1.4),
    baseVolume: 0.42,
    falloffCurve: 'smoothstep',
  });

  interface LanternAnimationTarget {
    glassMaterial: MeshStandardMaterial;
    light: PointLight;
    baseIntensity: number;
    baseLightIntensity: number;
    offset: number;
  }

  const lanternAnimationTargets: LanternAnimationTarget[] = [];
  const lanternGroup = new Group();
  lanternGroup.name = 'BackyardWalkwayLanterns';

  const lanternPostGeometry = new CylinderGeometry(0.08, 0.12, 1.1, 12);
  const lanternCapGeometry = new CylinderGeometry(0.22, 0.22, 0.14, 12);
  const lanternGlassGeometry = new SphereGeometry(0.3, 16, 16);
  const lanternPostMaterial = new MeshStandardMaterial({
    color: 0x1b232b,
    roughness: 0.76,
    metalness: 0.32,
  });
  const lanternCapMaterial = new MeshStandardMaterial({
    color: 0x262f3b,
    roughness: 0.64,
    metalness: 0.4,
  });

  const lateralOffset = walkwayWidth / 2 + 0.32;
  const lanternPairs = 3;
  for (let i = 0; i < lanternPairs; i += 1) {
    const progression = (i + 1) / (lanternPairs + 1);
    const lanternZ =
      walkway.position.z - walkwayDepth / 2 + progression * walkwayDepth;

    [-1, 1].forEach((direction, lateralIndex) => {
      const lanternIndex = i * 2 + lateralIndex;
      const lantern = new Group();
      lantern.name = `BackyardWalkwayLantern-${lanternIndex}`;
      lantern.position.set(
        walkway.position.x + direction * lateralOffset,
        0,
        lanternZ
      );

      const post = new Mesh(lanternPostGeometry, lanternPostMaterial);
      post.position.y = 0.55;
      lantern.add(post);

      const cap = new Mesh(lanternCapGeometry, lanternCapMaterial);
      cap.position.y = 1.15;
      lantern.add(cap);

      const glassMaterial = new MeshStandardMaterial({
        color: 0xfff3d4,
        emissive: new Color(0xffa445),
        emissiveIntensity: 1.18,
        roughness: 0.42,
        metalness: 0.12,
        transparent: true,
        opacity: 0.92,
      });
      const glass = new Mesh(lanternGlassGeometry, glassMaterial);
      glass.name = `BackyardWalkwayLanternGlass-${lanternIndex}`;
      glass.position.y = 1.05;
      lantern.add(glass);

      const light = new PointLight(0xffd9a2, 0.85, 4.4, 2.6);
      light.name = `BackyardWalkwayLanternLight-${lanternIndex}`;
      light.position.y = 1.05;
      lantern.add(light);

      lanternGroup.add(lantern);
      lanternAnimationTargets.push({
        glassMaterial,
        light,
        baseIntensity: glassMaterial.emissiveIntensity,
        baseLightIntensity: light.intensity,
        offset: i * 1.1 + (direction < 0 ? 0 : Math.PI / 3),
      });
    });
  }

  group.add(lanternGroup);

  const shrubGeometry = new SphereGeometry(1.05, 20, 20);
  const shrubMaterial = new MeshStandardMaterial({
    color: 0x2c6b3d,
    roughness: 0.78,
    metalness: 0.08,
  });
  const shrubPositions = [
    new Vector3(bounds.minX + 1.6, 0, bounds.maxZ - 3.2),
    new Vector3(centerX + 0.8, 0, centerZ + depth * 0.28),
    new Vector3(bounds.maxX - 1.4, 0, bounds.maxZ - 5.1),
  ];
  shrubPositions.forEach((position, index) => {
    const shrub = new Mesh(shrubGeometry, shrubMaterial);
    shrub.position.set(position.x, 0.9, position.z);
    const scale = 0.9 + (index % 3) * 0.12;
    shrub.scale.setScalar(scale);
    group.add(shrub);
  });

  const particleGeometry = new BufferGeometry();
  const particleCount = 24;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const px = bounds.minX + Math.random() * width;
    const pz = bounds.minZ + Math.random() * depth;
    const py = 1.6 + Math.random() * 1.4;
    particlePositions[i * 3] = px;
    particlePositions[i * 3 + 1] = py;
    particlePositions[i * 3 + 2] = pz;
  }
  particleGeometry.setAttribute(
    'position',
    new BufferAttribute(particlePositions, 3)
  );
  const particleMaterial = new PointsMaterial({
    color: 0x9ad7ff,
    size: 0.14,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const fireflies = new Points(particleGeometry, particleMaterial);
  fireflies.name = 'BackyardFireflies';
  group.add(fireflies);

  const duskLight = new PointLight(
    0x8fb8ff,
    0.65,
    Math.max(width, depth) * 0.9,
    2.4
  );
  duskLight.position.set(centerX - width * 0.18, 2.6, centerZ + depth * 0.18);
  duskLight.castShadow = false;
  group.add(duskLight);

  const barrierWidth = Math.min(width * 0.68, 6.5);
  const barrierHeight = 2.6;
  const barrierThickness = 0.34;
  const barrierZ = bounds.maxZ - 1.2;

  const barrierMaterial = new MeshStandardMaterial({
    color: 0x66d4ff,
    emissive: new Color(0x0d3245),
    emissiveIntensity: 1.25,
    transparent: true,
    opacity: 0.55,
    roughness: 0.18,
    metalness: 0.04,
  });
  const barrierGeometry = new BoxGeometry(
    barrierWidth,
    barrierHeight,
    barrierThickness
  );
  const barrier = new Mesh(barrierGeometry, barrierMaterial);
  barrier.name = 'BackyardHologramBarrier';
  barrier.position.set(centerX, barrierHeight / 2, barrierZ);
  group.add(barrier);

  const barrierBaseMaterial = new MeshStandardMaterial({
    color: 0x1a2732,
    roughness: 0.82,
    metalness: 0.12,
  });
  const barrierBaseHeight = 0.22;
  const barrierBaseGeometry = new BoxGeometry(
    barrierWidth + 0.8,
    barrierBaseHeight,
    barrierThickness * 2.4
  );
  const barrierBase = new Mesh(barrierBaseGeometry, barrierBaseMaterial);
  barrierBase.name = 'BackyardBarrierBase';
  barrierBase.position.set(centerX, barrierBaseHeight / 2, barrierZ - 0.12);
  group.add(barrierBase);

  const signageTexture = createSignageTexture(
    'Backyard Exhibits Incoming',
    'Hologram gate active while installations finish calibrating.'
  );
  const signageMaterial = new MeshBasicMaterial({
    map: signageTexture,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const signageGeometry = new PlaneGeometry(barrierWidth * 0.72, 0.78);
  const signage = new Mesh(signageGeometry, signageMaterial);
  signage.name = 'BackyardBarrierSignage';
  signage.position.set(centerX, 1.68, barrierZ + 0.08);
  group.add(signage);

  const emitterGeometry = new BufferGeometry();
  const emitterCount = 32;
  const emitterPositions = new Float32Array(emitterCount * 3);
  for (let i = 0; i < emitterCount; i += 1) {
    const ratio = i / emitterCount;
    const px = centerX - barrierWidth / 2 + barrierWidth * ratio;
    const py = 0.8 + Math.random() * (barrierHeight - 0.8);
    emitterPositions[i * 3] = px;
    emitterPositions[i * 3 + 1] = py;
    emitterPositions[i * 3 + 2] = barrierZ + 0.02;
  }
  emitterGeometry.setAttribute(
    'position',
    new BufferAttribute(emitterPositions, 3)
  );
  const emitterMaterial = new PointsMaterial({
    color: 0x9ad7ff,
    size: 0.12,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const barrierEmitters = new Points(emitterGeometry, emitterMaterial);
  barrierEmitters.name = 'BackyardBarrierEmitters';
  group.add(barrierEmitters);

  colliders.push({
    minX: barrier.position.x - barrierWidth / 2,
    maxX: barrier.position.x + barrierWidth / 2,
    minZ: barrier.position.z - barrierThickness / 2,
    maxZ: barrier.position.z + barrierThickness / 2,
  });

  const update = (context: { elapsed: number; delta: number }) => {
    updates.forEach((fn) => fn(context));
  };

  if (lanternAnimationTargets.length > 0) {
    updates.push(({ elapsed }) => {
      const baseWave = Math.sin(elapsed * 0.9) * 0.12;
      lanternAnimationTargets.forEach((target) => {
        const flicker =
          0.84 +
          baseWave +
          Math.sin(elapsed * 1.7 + target.offset) * 0.16 +
          Math.sin(elapsed * 2.4 + target.offset * 0.8) * 0.08;
        const clampedFlicker = Math.max(0.4, flicker);
        target.glassMaterial.emissiveIntensity =
          target.baseIntensity * clampedFlicker;
        target.light.intensity = target.baseLightIntensity * clampedFlicker;
      });
    });
  }

  return { group, colliders, update, ambientAudioBeds };
}
