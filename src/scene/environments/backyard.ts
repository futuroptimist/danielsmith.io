import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  EquirectangularReflectionMapping,
  Group,
  LightProbe,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  Quaternion,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import type { IUniform } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { AmbientAudioFalloffCurve } from '../../systems/audio/ambientAudio';
import {
  getFlickerScale,
  getPulseScale,
} from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';
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

function createDuskReflectionTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create dusk reflection canvas.');
  }

  const verticalGradient = context.createLinearGradient(0, 0, 0, canvas.height);
  verticalGradient.addColorStop(0, 'rgba(12, 24, 46, 1)');
  verticalGradient.addColorStop(0.52, 'rgba(28, 48, 74, 1)');
  verticalGradient.addColorStop(1, 'rgba(86, 55, 38, 1)');
  context.fillStyle = verticalGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const horizonGlow = context.createLinearGradient(
    0,
    canvas.height * 0.58,
    0,
    canvas.height
  );
  horizonGlow.addColorStop(0, 'rgba(255, 190, 125, 0.45)');
  horizonGlow.addColorStop(1, 'rgba(255, 142, 88, 0)');
  context.fillStyle = horizonGlow;
  context.fillRect(0, canvas.height * 0.58, canvas.width, canvas.height * 0.42);

  const reflectionTexture = new CanvasTexture(canvas);
  reflectionTexture.mapping = EquirectangularReflectionMapping;
  reflectionTexture.colorSpace = SRGBColorSpace;
  reflectionTexture.needsUpdate = true;

  return reflectionTexture;
}

function createDuskLightProbe(): LightProbe {
  const probe = new LightProbe();
  probe.name = 'BackyardDuskLightProbe';
  const coefficients = probe.sh.coefficients;
  for (let i = 0; i < coefficients.length; i += 1) {
    coefficients[i].set(0, 0, 0);
  }
  const skyColor = new Color(0x1a2c45).multiplyScalar(Math.PI);
  coefficients[0].set(skyColor.r, skyColor.g, skyColor.b);
  const warmColor = new Color(0x533621).multiplyScalar(Math.PI * 0.45);
  coefficients[3].set(warmColor.r, warmColor.g, warmColor.b);
  probe.intensity = 0.118;
  return probe;
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

  const duskReflectionMap = createDuskReflectionTexture();

  const duskLightProbe = createDuskLightProbe();
  duskLightProbe.position.set(centerX, 2.2, centerZ);
  group.add(duskLightProbe);

  const skyRadius = Math.max(width, depth) * 1.32;
  const skyGeometry = new SphereGeometry(skyRadius, 48, 48);
  skyGeometry.scale(1, 0.62, 1);
  const verticalExtent = skyRadius * 0.62;

  const baseHorizonColor = new Color(0x7fa4d9);
  const baseHorizonHsl = { h: 0, s: 0, l: 0 };
  baseHorizonColor.getHSL(baseHorizonHsl);

  const skyUniforms: {
    topColor: IUniform<Color>;
    midColor: IUniform<Color>;
    horizonColor: IUniform<Color>;
    time: IUniform<number>;
    verticalExtent: IUniform<number>;
  } = {
    topColor: { value: new Color(0x051024) },
    midColor: { value: new Color(0x102132) },
    horizonColor: { value: baseHorizonColor },
    time: { value: 0 },
    verticalExtent: { value: verticalExtent },
  };

  const skyMaterial = new ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      uniform float verticalExtent;
      varying float vHeight;

      void main() {
        vHeight = clamp((position.y / verticalExtent + 1.0) * 0.5, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform float time;
      varying float vHeight;

      void main() {
        float horizonBlend = smoothstep(0.18, 0.68, vHeight);
        float zenithBlend = smoothstep(0.4, 1.0, vHeight);
        vec3 base = mix(midColor, topColor, zenithBlend);
        base = mix(horizonColor, base, horizonBlend);
        float shimmer = 0.003 * (sin(time * 0.17 + vHeight * 6.0) + sin(time * 0.23 + vHeight * 5.0));
        base += vec3(shimmer);
        base = clamp(base, 0.0, 1.0);
        gl_FragColor = vec4(base, 1.0);
      }
    `,
    side: BackSide,
    depthWrite: false,
  });

  const skyDome = new Mesh(skyGeometry, skyMaterial);
  skyDome.name = 'BackyardSkyDome';
  skyDome.position.set(centerX, -0.6, centerZ);
  group.add(skyDome);

  updates.push(({ elapsed }) => {
    skyUniforms.time.value = elapsed;
    const pulseScale = getPulseScale();
    const duskAmplitude = MathUtils.lerp(0.015, 0.08, pulseScale);
    const duskWave = Math.sin(elapsed * 0.12) * duskAmplitude;
    const adjustedLightness = Math.min(
      1,
      Math.max(0, baseHorizonHsl.l + duskWave * 0.6)
    );
    skyUniforms.horizonColor.value.setHSL(
      baseHorizonHsl.h,
      baseHorizonHsl.s,
      adjustedLightness
    );
  });

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
    envMap: duskReflectionMap,
    envMapIntensity: 0.18,
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
    roughness: 0.58,
    metalness: 0.32,
    envMap: duskReflectionMap,
    envMapIntensity: 0.38,
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
  updates.push(rocket.update);

  const steppingStoneGeometry = new BoxGeometry(pathWidth * 0.32, 0.12, 0.9);
  const steppingStoneMaterial = new MeshStandardMaterial({
    color: 0x676f78,
    roughness: 0.64,
    metalness: 0.26,
    envMap: duskReflectionMap,
    envMapIntensity: 0.35,
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
    environmentMap: duskReflectionMap,
    environmentIntensity: 0.62,
  });
  group.add(greenhouse.group);
  greenhouse.colliders.forEach((collider) => colliders.push(collider));
  updates.push(greenhouse.update);

  const walkwayWidth = greenhouseWidth * 0.68;
  const walkwayDepth = greenhouseDepth * 0.72;
  const walkwayGeometry = new BoxGeometry(walkwayWidth, 0.06, walkwayDepth);
  const walkwayMaterial = new MeshStandardMaterial({
    color: 0x454f57,
    roughness: 0.52,
    metalness: 0.28,
    envMap: duskReflectionMap,
    envMapIntensity: 0.42,
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

  const barrierZ = bounds.maxZ - 1.2;

  const fenceGroup = new Group();
  fenceGroup.name = 'BackyardPerimeterFence';
  const fenceHeight = 1.5;
  const fenceInsetX = 0.35;
  const fenceFrontPadding = 0.9;
  const fenceBackGap = 0.6;
  const fenceFrontZ = bounds.minZ + fenceFrontPadding;
  const fenceBackZ = barrierZ - fenceBackGap;

  const fencePostGeometry = new CylinderGeometry(0.07, 0.09, fenceHeight, 10);
  const fenceRailGeometry = new BoxGeometry(1, 0.08, 0.12);
  const fencePostMaterial = new MeshStandardMaterial({
    color: 0x2a333a,
    roughness: 0.68,
    metalness: 0.28,
    envMap: duskReflectionMap,
    envMapIntensity: 0.22,
  });
  const fenceRailMaterial = new MeshStandardMaterial({
    color: 0x3e4a54,
    roughness: 0.52,
    metalness: 0.22,
    envMap: duskReflectionMap,
    envMapIntensity: 0.2,
  });

  const addFenceRun = (runIndex: number, start: Vector3, end: Vector3) => {
    const runGroup = new Group();
    runGroup.name = `BackyardFenceRun-${runIndex}`;
    const direction = new Vector3().subVectors(end, start);
    const runLength = direction.length();
    const normalizedDirection = direction.clone().normalize();
    const segmentCount = Math.max(1, Math.round(runLength / 1.6));
    const segmentDistance = runLength / segmentCount;
    const orientation = new Quaternion().setFromUnitVectors(
      new Vector3(1, 0, 0),
      normalizedDirection
    );

    for (let postIndex = 0; postIndex <= segmentCount; postIndex += 1) {
      const ratio = postIndex / segmentCount;
      const position = new Vector3()
        .copy(start)
        .add(normalizedDirection.clone().multiplyScalar(runLength * ratio));
      const post = new Mesh(fencePostGeometry, fencePostMaterial);
      post.name = `BackyardFencePost-${runIndex}-${postIndex}`;
      post.position.set(position.x, fenceHeight / 2, position.z);
      runGroup.add(post);
    }

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const center = new Vector3()
        .copy(start)
        .add(
          normalizedDirection
            .clone()
            .multiplyScalar(segmentDistance * (segmentIndex + 0.5))
        );

      const createRail = (tier: 'Top' | 'Mid', height: number) => {
        const rail = new Mesh(fenceRailGeometry, fenceRailMaterial);
        rail.name = `BackyardFenceRail-${tier}-${runIndex}-${segmentIndex}`;
        rail.scale.x = segmentDistance;
        rail.position.set(center.x, height, center.z);
        rail.quaternion.copy(orientation);
        runGroup.add(rail);
      };

      createRail('Top', fenceHeight - 0.18);
      createRail('Mid', fenceHeight * 0.52);
    }

    fenceGroup.add(runGroup);
  };

  const fenceRuns = [
    {
      start: new Vector3(bounds.minX + fenceInsetX, 0, fenceFrontZ),
      end: new Vector3(bounds.minX + fenceInsetX, 0, fenceBackZ),
    },
    {
      start: new Vector3(bounds.maxX - fenceInsetX, 0, fenceFrontZ),
      end: new Vector3(bounds.maxX - fenceInsetX, 0, fenceBackZ),
    },
    {
      start: new Vector3(bounds.minX + fenceInsetX, 0, fenceBackZ),
      end: new Vector3(bounds.maxX - fenceInsetX, 0, fenceBackZ),
    },
  ];

  fenceRuns.forEach(({ start, end }, index) => addFenceRun(index, start, end));
  group.add(fenceGroup);

  const fenceColliders: RectCollider[] = [
    {
      minX: bounds.minX + fenceInsetX - 0.12,
      maxX: bounds.minX + fenceInsetX + 0.18,
      minZ: fenceFrontZ - 0.3,
      maxZ: fenceBackZ + 0.3,
    },
    {
      minX: bounds.maxX - fenceInsetX - 0.18,
      maxX: bounds.maxX - fenceInsetX + 0.12,
      minZ: fenceFrontZ - 0.3,
      maxZ: fenceBackZ + 0.3,
    },
    {
      minX: bounds.minX + fenceInsetX - 0.3,
      maxX: bounds.maxX - fenceInsetX + 0.3,
      minZ: fenceBackZ - 0.18,
      maxZ: fenceBackZ + 0.18,
    },
  ];
  fenceColliders.forEach((collider) => colliders.push(collider));

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
    envMap: duskReflectionMap,
    envMapIntensity: 0.16,
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
    0.065,
    Math.max(width, depth) * 0.9,
    2.4
  );
  duskLight.position.set(centerX - width * 0.18, 2.6, centerZ + depth * 0.18);
  duskLight.castShadow = false;
  group.add(duskLight);

  const barrierWidth = Math.min(width * 0.68, 6.5);
  const barrierHeight = 2.6;
  const barrierThickness = 0.34;

  const barrierMaterial = new MeshStandardMaterial({
    color: 0x66d4ff,
    emissive: new Color(0x0d3245),
    emissiveIntensity: 1.25,
    transparent: true,
    opacity: 0.55,
    roughness: 0.18,
    metalness: 0.04,
  });
  const baseBarrierEmissive = barrierMaterial.emissiveIntensity;
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
    opacity: 0.78,
  });
  const baseSignageOpacity = signageMaterial.opacity;
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
  const baseEmitterOpacity = emitterMaterial.opacity;
  const baseEmitterSize = emitterMaterial.size;

  colliders.push({
    minX: barrier.position.x - barrierWidth / 2,
    maxX: barrier.position.x + barrierWidth / 2,
    minZ: barrier.position.z - barrierThickness / 2,
    maxZ: barrier.position.z + barrierThickness / 2,
  });

  updates.push(({ elapsed }) => {
    const flickerScale = getFlickerScale();
    const pulseScale = getPulseScale();

    const emissiveTarget =
      baseBarrierEmissive * (1.05 + Math.sin(elapsed * 1.8) * 0.22);
    barrierMaterial.emissiveIntensity = Math.max(
      baseBarrierEmissive * 0.68,
      MathUtils.lerp(baseBarrierEmissive, emissiveTarget, flickerScale)
    );

    const signageTarget = Math.min(
      1,
      baseSignageOpacity + Math.abs(Math.sin(elapsed * 0.9)) * 0.32
    );
    signageMaterial.opacity = MathUtils.lerp(
      baseSignageOpacity,
      signageTarget,
      pulseScale
    );
    signageMaterial.needsUpdate = true;

    emitterMaterial.opacity = MathUtils.lerp(
      baseEmitterOpacity,
      Math.min(1, baseEmitterOpacity + 0.35 + Math.sin(elapsed * 1.6) * 0.18),
      pulseScale
    );
    emitterMaterial.size = MathUtils.lerp(
      baseEmitterSize,
      baseEmitterSize * (1.08 + Math.sin(elapsed * 1.2) * 0.16),
      pulseScale
    );
  });

  const update = (context: { elapsed: number; delta: number }) => {
    updates.forEach((fn) => fn(context));
  };

  if (lanternAnimationTargets.length > 0) {
    updates.push(({ elapsed }) => {
      const baseWave = Math.sin(elapsed * 0.9) * 0.12;
      const flickerScale = getFlickerScale();
      const pulseScale = getPulseScale();
      const steadyBase = MathUtils.lerp(0.6, 1, flickerScale);
      const rotationScale = MathUtils.lerp(0.2, 1, pulseScale);
      lanternAnimationTargets.forEach((target) => {
        const flicker =
          0.84 +
          baseWave +
          Math.sin(elapsed * 1.7 + target.offset) * 0.16 +
          Math.sin(elapsed * 2.4 + target.offset * 0.8) * 0.08;
        const clampedFlicker = Math.max(0.4, flicker);
        const intensityScale = MathUtils.lerp(
          steadyBase,
          clampedFlicker,
          flickerScale
        );
        target.glassMaterial.emissiveIntensity =
          target.baseIntensity * intensityScale;
        target.light.intensity = target.baseLightIntensity * intensityScale;
        target.light.distance = 4.4 * MathUtils.lerp(0.7, 1, rotationScale);
      });
    });
  }

  return { group, colliders, update, ambientAudioBeds };
}
