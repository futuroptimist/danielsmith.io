import {
  AdditiveBlending,
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
import {
  applySeasonalLightingPreset,
  type SeasonalLightingPreset,
  type SeasonalLightingTarget,
} from '../lighting/seasonalPresets';
import { createGreenhouse } from '../structures/greenhouse';
import { createModelRocket } from '../structures/modelRocket';

export interface BackyardEnvironmentBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number }): void;
  ambientAudioBeds: BackyardAmbientAudioBed[];
  applySeasonalPreset(preset: SeasonalLightingPreset | null): void;
}

export interface BackyardAmbientAudioBed {
  id: string;
  center: { x: number; z: number };
  innerRadius: number;
  outerRadius: number;
  baseVolume: number;
  falloffCurve?: AmbientAudioFalloffCurve;
}

interface WalkwayArrowTarget {
  mesh: Mesh;
  baseOpacity: number;
  baseScaleZ: number;
  baseHeight: number;
  phase: number;
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

function createWalkwayGuideTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create walkway guide texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const outerGradient = context.createLinearGradient(
    canvas.width / 2,
    canvas.height * 0.12,
    canvas.width / 2,
    canvas.height * 0.92
  );
  outerGradient.addColorStop(0, 'rgba(95, 210, 255, 0)');
  outerGradient.addColorStop(0.42, 'rgba(95, 210, 255, 0.18)');
  outerGradient.addColorStop(0.72, 'rgba(95, 210, 255, 0.68)');
  outerGradient.addColorStop(1, 'rgba(165, 240, 255, 0.92)');
  context.fillStyle = outerGradient;
  context.beginPath();
  context.moveTo(canvas.width / 2, canvas.height * 0.08);
  context.lineTo(canvas.width * 0.18, canvas.height * 0.92);
  context.lineTo(canvas.width * 0.82, canvas.height * 0.92);
  context.closePath();
  context.fill();

  const innerGradient = context.createLinearGradient(
    canvas.width / 2,
    canvas.height * 0.18,
    canvas.width / 2,
    canvas.height * 0.92
  );
  innerGradient.addColorStop(0, 'rgba(185, 245, 255, 0.05)');
  innerGradient.addColorStop(0.46, 'rgba(185, 245, 255, 0.32)');
  innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.78)');
  context.fillStyle = innerGradient;
  context.beginPath();
  context.moveTo(canvas.width / 2, canvas.height * 0.16);
  context.lineTo(canvas.width * 0.28, canvas.height * 0.88);
  context.lineTo(canvas.width * 0.72, canvas.height * 0.88);
  context.closePath();
  context.fill();

  const trailGradient = context.createLinearGradient(
    canvas.width / 2,
    canvas.height * 0.46,
    canvas.width / 2,
    canvas.height * 0.92
  );
  trailGradient.addColorStop(0, 'rgba(255, 255, 255, 0.62)');
  trailGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = trailGradient;
  context.fillRect(
    canvas.width * 0.46,
    canvas.height * 0.46,
    canvas.width * 0.08,
    canvas.height * 0.46
  );

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
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

export interface BackyardEnvironmentOptions {
  seasonalPreset?: SeasonalLightingPreset | null;
}

export function createBackyardEnvironment(
  bounds: Bounds2D,
  { seasonalPreset = null }: BackyardEnvironmentOptions = {}
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

  const walkwayArrowTexture = createWalkwayGuideTexture();
  const walkwayArrowGeometry = new PlaneGeometry(1, 1, 1, 1);
  walkwayArrowGeometry.rotateX(-Math.PI / 2);
  const walkwayArrowGroup = new Group();
  walkwayArrowGroup.name = 'BackyardWalkwayArrows';
  const walkwayArrowTargets: WalkwayArrowTarget[] = [];
  const walkwayArrowCount = 3;
  const arrowBaseWidth = walkwayWidth * 0.26;
  const arrowBaseLength = walkwayDepth * 0.28;
  for (let i = 0; i < walkwayArrowCount; i += 1) {
    const material = new MeshBasicMaterial({
      map: walkwayArrowTexture,
      transparent: true,
      opacity: 0.68,
      color: new Color(0x81d8ff),
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const arrow = new Mesh(walkwayArrowGeometry, material);
    arrow.name = `BackyardWalkwayArrow-${i}`;
    const ratio = (i + 1) / (walkwayArrowCount + 1);
    arrow.position.set(
      walkway.position.x,
      walkway.position.y + 0.04 + Math.sin((i + 1) * 0.6) * 0.01,
      walkway.position.z - walkwayDepth / 2 + walkwayDepth * ratio
    );
    const widthScale = arrowBaseWidth * (0.9 + ratio * 0.2);
    const lengthScale =
      arrowBaseLength * (0.84 + Math.cos(ratio * Math.PI) * 0.12);
    arrow.scale.set(widthScale, 1, lengthScale);
    walkwayArrowGroup.add(arrow);
    walkwayArrowTargets.push({
      mesh: arrow,
      baseOpacity: material.opacity ?? 0.68,
      baseScaleZ: lengthScale,
      baseHeight: arrow.position.y,
      phase: ratio * Math.PI * 1.2,
    });
  }
  group.add(walkwayArrowGroup);

  const walkwayMoteCount = 36;
  const walkwayMoteGeometry = new BufferGeometry();
  const walkwayMotePositions = new Float32Array(walkwayMoteCount * 3);
  const walkwayMoteBasePositions = new Float32Array(walkwayMoteCount * 3);
  const walkwayMoteOrbitRadii = new Float32Array(walkwayMoteCount);
  const walkwayMoteVerticalAmplitudes = new Float32Array(walkwayMoteCount);
  const walkwayMoteSpeeds = new Float32Array(walkwayMoteCount);
  const walkwayMotePhaseOffsets = new Float32Array(walkwayMoteCount);
  const walkwayMotePhaseStates = new Float32Array(walkwayMoteCount);
  for (let i = 0; i < walkwayMoteCount; i += 1) {
    const ratio = (i + 0.5) / walkwayMoteCount;
    const baseIndex = i * 3;
    const baseX =
      walkway.position.x +
      (Math.sin(ratio * Math.PI * 1.1 + i * 0.18) * walkwayWidth) / 3.6;
    const baseZ =
      walkway.position.z - walkwayDepth * 0.48 + walkwayDepth * 0.96 * ratio;
    const baseY = walkway.position.y + 0.42 + Math.sin(ratio * Math.PI) * 0.26;
    walkwayMoteBasePositions[baseIndex] = baseX;
    walkwayMoteBasePositions[baseIndex + 1] = baseY;
    walkwayMoteBasePositions[baseIndex + 2] = baseZ;
    walkwayMotePositions[baseIndex] = baseX;
    walkwayMotePositions[baseIndex + 1] = baseY;
    walkwayMotePositions[baseIndex + 2] = baseZ;
    walkwayMoteOrbitRadii[i] =
      walkwayWidth * 0.18 * (0.68 + Math.cos(ratio * Math.PI * 1.2) * 0.22);
    walkwayMoteVerticalAmplitudes[i] = 0.12 + Math.sin(ratio * Math.PI) * 0.16;
    walkwayMoteSpeeds[i] = 0.85 + ratio * 0.75;
    const phaseOffset = ratio * Math.PI * 2.6 + i * 0.12;
    walkwayMotePhaseOffsets[i] = phaseOffset;
    walkwayMotePhaseStates[i] = phaseOffset;
  }
  const walkwayMotePositionsAttribute = new BufferAttribute(
    walkwayMotePositions,
    3
  );
  walkwayMoteGeometry.setAttribute('position', walkwayMotePositionsAttribute);
  const walkwayMoteMaterial = new PointsMaterial({
    color: 0xffe5bf,
    size: 0.12,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    sizeAttenuation: true,
    blending: AdditiveBlending,
  });
  const walkwayMotes = new Points(walkwayMoteGeometry, walkwayMoteMaterial);
  walkwayMotes.name = 'BackyardWalkwayMotes';
  walkwayMotes.renderOrder = 7;
  group.add(walkwayMotes);
  const baseWalkwayMoteOpacity = walkwayMoteMaterial.opacity;
  const baseWalkwayMoteSize = walkwayMoteMaterial.size;
  const walkwayMoteBaseColor = walkwayMoteMaterial.color.clone();
  const walkwayMoteTintColor = new Color();

  const pollenCount = 42;
  const pollenGeometry = new BufferGeometry();
  const pollenPositions = new Float32Array(pollenCount * 3);
  const pollenBasePositions = new Float32Array(pollenCount * 3);
  const pollenOrbitRadii = new Float32Array(pollenCount);
  const pollenVerticalAmplitudes = new Float32Array(pollenCount);
  const pollenSpeeds = new Float32Array(pollenCount);
  const pollenPhaseOffsets = new Float32Array(pollenCount);
  const pollenPhaseStates = new Float32Array(pollenCount);
  for (let i = 0; i < pollenCount; i += 1) {
    const ratio = (i + 0.5) / pollenCount;
    const layer = Math.floor(ratio * 3);
    const layerRatio = ratio * 3 - layer;
    const baseIndex = i * 3;
    const baseX =
      walkway.position.x +
      (Math.cos(ratio * Math.PI * 1.4 + layer * 0.35) * walkwayWidth) / 3.4;
    const baseZ =
      walkway.position.z -
      walkwayDepth * 0.5 +
      walkwayDepth * ratio +
      layer * 0.12;
    const baseY =
      walkway.position.y +
      0.62 +
      layer * 0.22 +
      Math.sin((layerRatio + ratio) * Math.PI) * 0.28;
    pollenBasePositions[baseIndex] = baseX;
    pollenBasePositions[baseIndex + 1] = baseY;
    pollenBasePositions[baseIndex + 2] = baseZ;
    pollenPositions[baseIndex] = baseX;
    pollenPositions[baseIndex + 1] = baseY;
    pollenPositions[baseIndex + 2] = baseZ;
    pollenOrbitRadii[i] =
      walkwayWidth * 0.14 * (0.55 + Math.sin(ratio * Math.PI * 1.6) * 0.35);
    pollenVerticalAmplitudes[i] =
      0.18 + Math.sin(ratio * Math.PI) * 0.22 + layer * 0.04;
    pollenSpeeds[i] = 0.52 + ratio * 0.48 + layer * 0.05;
    const phaseOffset = ratio * Math.PI * 2.2 + layer * 0.9;
    pollenPhaseOffsets[i] = phaseOffset;
    pollenPhaseStates[i] = phaseOffset;
  }
  const pollenPositionsAttribute = new BufferAttribute(pollenPositions, 3);
  pollenGeometry.setAttribute('position', pollenPositionsAttribute);
  const pollenMaterial = new PointsMaterial({
    color: 0xffcda4,
    size: 0.085,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    sizeAttenuation: true,
    blending: AdditiveBlending,
  });
  const pollenMotes = new Points(pollenGeometry, pollenMaterial);
  pollenMotes.name = 'BackyardPollenMotes';
  pollenMotes.renderOrder = 8;
  group.add(pollenMotes);
  const basePollenOpacity = pollenMaterial.opacity;
  const basePollenSize = pollenMaterial.size;
  const pollenBaseColor = pollenMaterial.color.clone();

  const clamp01 = (value: number | undefined, fallback = 0): number => {
    const source = Number.isFinite(value) ? (value as number) : fallback;
    if (!Number.isFinite(source)) {
      return 0;
    }
    if (source <= 0) {
      return 0;
    }
    if (source >= 1) {
      return 1;
    }
    return source;
  };

  const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/;

  const applyWalkwayMoteSeasonalTint = (
    preset: SeasonalLightingPreset | null
  ) => {
    walkwayMoteMaterial.color.copy(walkwayMoteBaseColor);
    pollenMaterial.color.copy(pollenBaseColor);
    if (!preset) {
      walkwayMoteMaterial.needsUpdate = true;
      pollenMaterial.needsUpdate = true;
      return;
    }

    const override = preset.roomOverrides?.backyard;
    const tintStrength = clamp01(
      override?.tintStrength,
      preset.tintStrength ?? 0
    );
    if (tintStrength <= 0) {
      walkwayMoteMaterial.needsUpdate = true;
      pollenMaterial.needsUpdate = true;
      return;
    }

    const tintHex = override?.tintHex ?? preset.tintHex;
    if (!tintHex || !HEX_COLOR_PATTERN.test(tintHex)) {
      walkwayMoteMaterial.needsUpdate = true;
      pollenMaterial.needsUpdate = true;
      return;
    }

    const normalizedTint = tintHex.startsWith('#') ? tintHex : `#${tintHex}`;
    walkwayMoteTintColor.set(normalizedTint);
    walkwayMoteMaterial.color.lerpColors(
      walkwayMoteBaseColor,
      walkwayMoteTintColor,
      tintStrength
    );
    pollenMaterial.color.lerpColors(
      pollenBaseColor,
      walkwayMoteTintColor,
      tintStrength
    );
    walkwayMoteMaterial.needsUpdate = true;
    pollenMaterial.needsUpdate = true;
  };

  updates.push(({ delta }) => {
    const flickerScale = MathUtils.clamp(getFlickerScale(), 0, 1);
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const motionPreference = Math.min(flickerScale, Math.max(pulseScale, 0.35));
    const swirlMotionScale = MathUtils.lerp(0.2, 1, motionPreference);
    const speedScale = MathUtils.lerp(0.35, 1, motionPreference);
    let swirlAccumulator = 0;

    for (let i = 0; i < walkwayMoteCount; i += 1) {
      const baseIndex = i * 3;
      const offset = walkwayMotePhaseOffsets[i];
      const speed = walkwayMoteSpeeds[i] * speedScale;
      const nextPhase = walkwayMotePhaseStates[i] + delta * speed;
      walkwayMotePhaseStates[i] = MathUtils.euclideanModulo(
        nextPhase,
        Math.PI * 2
      );
      const phase = walkwayMotePhaseStates[i];
      const swirl = Math.sin(phase);
      const wrapAngle = phase * 0.6 * swirlMotionScale + offset * 0.45;
      const baseX = walkwayMoteBasePositions[baseIndex];
      const baseY = walkwayMoteBasePositions[baseIndex + 1];
      const baseZ = walkwayMoteBasePositions[baseIndex + 2];
      const radius = walkwayMoteOrbitRadii[i] * swirlMotionScale;
      const verticalAmplitude =
        walkwayMoteVerticalAmplitudes[i] * swirlMotionScale;
      const x =
        baseX +
        Math.cos(wrapAngle) * radius +
        Math.sin(phase * 0.42 + offset) * radius * 0.18 * swirlMotionScale;
      const y =
        baseY +
        Math.sin(phase * 1.18 + offset * 0.8) * verticalAmplitude +
        Math.cos(phase * 0.34 + offset) * 0.05 * swirlMotionScale;
      const z =
        baseZ +
        Math.sin(wrapAngle) * radius * 0.58 +
        Math.sin(phase * 0.72 + offset * 0.5) *
          radius *
          0.24 *
          swirlMotionScale;
      walkwayMotePositionsAttribute.setXYZ(i, x, y, z);
      const swirlContribution = MathUtils.clamp(
        0.5 + swirl * 0.5 * swirlMotionScale,
        0.1,
        0.98
      );
      swirlAccumulator += swirlContribution;
    }

    walkwayMotePositionsAttribute.needsUpdate = true;

    const swirlAverage = MathUtils.clamp(
      swirlAccumulator / walkwayMoteCount,
      0.2,
      0.98
    );
    const opacityTarget = MathUtils.lerp(0.55, 1.12, swirlAverage);
    walkwayMoteMaterial.opacity = MathUtils.lerp(
      baseWalkwayMoteOpacity * 0.62,
      baseWalkwayMoteOpacity * opacityTarget,
      flickerScale
    );
    const sizeTarget = MathUtils.lerp(0.9, 1.18, swirlAverage);
    walkwayMoteMaterial.size = MathUtils.lerp(
      baseWalkwayMoteSize * 0.84,
      baseWalkwayMoteSize * sizeTarget,
      pulseScale
    );
  });

  updates.push(({ delta }) => {
    const flickerScale = MathUtils.clamp(getFlickerScale(), 0, 1);
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const motionPreference = Math.min(flickerScale, Math.max(pulseScale, 0.35));
    const swirlMotionScale = MathUtils.lerp(0.3, 1, motionPreference);
    const motionScale = MathUtils.lerp(0.22, 1, motionPreference);
    const speedScale = MathUtils.lerp(0.4, 1, motionPreference);

    let swirlAccumulator = 0;

    for (let i = 0; i < pollenCount; i += 1) {
      const baseIndex = i * 3;
      const offset = pollenPhaseOffsets[i];
      const nextPhase =
        pollenPhaseStates[i] + delta * pollenSpeeds[i] * speedScale;
      const phase = MathUtils.euclideanModulo(nextPhase, Math.PI * 2);
      pollenPhaseStates[i] = phase;

      const baseX = pollenBasePositions[baseIndex];
      const baseY = pollenBasePositions[baseIndex + 1];
      const baseZ = pollenBasePositions[baseIndex + 2];

      const radius = pollenOrbitRadii[i] * motionScale;
      const verticalAmplitude = pollenVerticalAmplitudes[i] * motionScale;
      const swirl = Math.sin(phase * 0.9 + offset * 0.6);
      const drift = Math.cos(phase * 0.45 + offset * 0.35);

      const x =
        baseX +
        Math.cos(phase + offset * 0.55) * radius * 0.75 +
        drift * radius * 0.25 * swirlMotionScale;
      const y =
        baseY +
        Math.sin(phase * 1.25 + offset * 0.5) * verticalAmplitude +
        Math.cos(phase * 0.62 + offset * 0.3) * 0.04 * swirlMotionScale;
      const z =
        baseZ +
        Math.sin(phase * 0.8 + offset * 0.4) * radius * 0.62 +
        Math.cos(phase * 0.52 + offset * 0.25) *
          radius *
          0.18 *
          swirlMotionScale;

      pollenPositionsAttribute.setXYZ(i, x, y, z);

      const swirlContribution = MathUtils.clamp(
        0.45 + swirl * 0.35 * swirlMotionScale,
        0.12,
        0.95
      );
      swirlAccumulator += swirlContribution;
    }

    pollenPositionsAttribute.needsUpdate = true;

    const swirlAverage = MathUtils.clamp(
      swirlAccumulator / pollenCount,
      0.18,
      0.92
    );
    const opacityTarget = MathUtils.lerp(0.9, 1.18, swirlAverage);
    pollenMaterial.opacity = MathUtils.lerp(
      basePollenOpacity * 0.6,
      basePollenOpacity * opacityTarget,
      flickerScale
    );
    const sizeTarget = MathUtils.lerp(0.88, 1.16, swirlAverage);
    pollenMaterial.size = MathUtils.lerp(
      basePollenSize * 0.8,
      basePollenSize * sizeTarget,
      pulseScale
    );
    pollenMaterial.needsUpdate = true;
  });

  if (walkwayArrowTargets.length > 0) {
    updates.push(({ elapsed }) => {
      const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
      const flickerScale = MathUtils.clamp(getFlickerScale(), 0, 1);
      walkwayArrowTargets.forEach((target) => {
        if (pulseScale === 0 && flickerScale === 0) {
          target.mesh.scale.z = target.baseScaleZ;
          target.mesh.position.y = target.baseHeight;
          const material = target.mesh.material as MeshBasicMaterial;
          material.opacity = target.baseOpacity;
          return;
        }
        const cycle = elapsed * 0.9 + target.phase;
        const lengthPulse = 1 + Math.sin(cycle) * 0.28 * pulseScale;
        target.mesh.scale.z = target.baseScaleZ * lengthPulse;
        target.mesh.position.y =
          target.baseHeight + Math.sin(cycle * 1.6) * 0.012 * pulseScale;
        const shimmer = MathUtils.clamp(
          0.64 +
            (Math.sin(cycle * 1.8) * 0.22 + Math.cos(cycle * 0.78) * 0.16) *
              pulseScale *
              (0.6 + 0.4 * flickerScale),
          0.2,
          1.6
        );
        const material = target.mesh.material as MeshBasicMaterial;
        material.opacity = MathUtils.clamp(target.baseOpacity * shimmer, 0, 1);
      });
    });
  }

  interface WalkwayFiberAnimationTarget {
    material: MeshStandardMaterial;
    baseEmissiveIntensity: number;
    baseOpacity: number;
    offset: number;
  }

  const walkwayFiberAnimationTargets: WalkwayFiberAnimationTarget[] = [];
  const walkwayFiberSeasonalTargets: SeasonalLightingTarget[] = [];
  const walkwayFiberGroup = new Group();
  walkwayFiberGroup.name = 'BackyardWalkwayFiberGuides';

  const walkwayFiberSegments = 8;
  const walkwayFiberWidth = Math.min(0.1, walkwayWidth * 0.08);
  const walkwayFiberHeight = 0.012;
  const walkwayFiberDepth =
    walkwayFiberSegments > 0
      ? (walkwayDepth / walkwayFiberSegments) * 0.9
      : walkwayDepth * 0.9;
  const walkwayFiberGeometry = new BoxGeometry(
    walkwayFiberWidth,
    walkwayFiberHeight,
    walkwayFiberDepth
  );
  const walkwayFiberEdgeInset = Math.max(walkwayWidth * 0.12, 0.08);
  const walkwayFiberBaseZ = walkway.position.z - walkwayDepth / 2;
  const walkwayFiberSides: Array<{
    label: 'Left' | 'Right';
    direction: -1 | 1;
  }> = [
    { label: 'Left', direction: -1 },
    { label: 'Right', direction: 1 },
  ];

  for (
    let segmentIndex = 0;
    segmentIndex < walkwayFiberSegments;
    segmentIndex += 1
  ) {
    const segmentCenterZ =
      walkwayFiberBaseZ +
      walkwayFiberDepth / 2 +
      segmentIndex * walkwayFiberDepth * 1.02;

    walkwayFiberSides.forEach(({ label, direction }) => {
      const material = new MeshStandardMaterial({
        color: new Color(0x0f1720),
        emissive: new Color(0x5ae0ff),
        emissiveIntensity: 1.1,
        roughness: 0.28,
        metalness: 0.62,
        transparent: true,
        opacity: 0.72,
      });
      material.depthWrite = false;

      const segment = new Mesh(walkwayFiberGeometry, material);
      segment.name = `BackyardWalkwayFiberSegment-${label}-${segmentIndex}`;
      segment.position.set(
        walkway.position.x +
          direction *
            (walkwayWidth / 2 - walkwayFiberEdgeInset - walkwayFiberWidth / 2),
        walkway.position.y + walkwayFiberHeight / 2 + 0.018,
        segmentCenterZ
      );
      segment.castShadow = false;
      segment.receiveShadow = false;
      segment.renderOrder = 7;
      walkwayFiberGroup.add(segment);

      walkwayFiberAnimationTargets.push({
        material,
        baseEmissiveIntensity: material.emissiveIntensity,
        baseOpacity: material.opacity ?? 1,
        offset: segmentIndex * 0.8 + (direction > 0 ? 0.35 : 0),
      });

      walkwayFiberSeasonalTargets.push({
        roomId: 'backyard',
        material,
        baseEmissiveColor: material.emissive.clone(),
        baseEmissiveIntensity: material.emissiveIntensity,
        fillLights: [],
      });
    });
  }

  if (walkwayFiberGroup.children.length > 0) {
    group.add(walkwayFiberGroup);
  }

  if (walkwayFiberAnimationTargets.length > 0) {
    updates.push(({ elapsed }) => {
      const flickerScale = getFlickerScale();
      const pulseScale = getPulseScale();

      walkwayFiberAnimationTargets.forEach((target) => {
        const travel = MathUtils.euclideanModulo(
          elapsed * 0.55 + target.offset,
          Math.PI * 2
        );
        const pulse = Math.max(0, Math.sin(travel));
        const envelope = Math.pow(pulse, 1.4);

        const intensityBaseline = MathUtils.lerp(
          target.baseEmissiveIntensity * 0.45,
          target.baseEmissiveIntensity * (1.05 + envelope * 0.85),
          flickerScale
        );
        target.material.emissiveIntensity = MathUtils.clamp(
          intensityBaseline,
          0,
          target.baseEmissiveIntensity * 2.1
        );

        const opacityTarget = MathUtils.lerp(
          target.baseOpacity * 0.45,
          target.baseOpacity * (0.82 + envelope * 0.48),
          pulseScale
        );
        target.material.opacity = MathUtils.clamp(opacityTarget, 0, 1);
        target.material.needsUpdate = true;
      });
    });
  }

  interface WalkwayGuideAnimationTarget {
    material: MeshStandardMaterial;
    baseEmissiveIntensity: number;
    baseOpacity: number;
    offset: number;
  }

  const walkwayGuideAnimationTargets: WalkwayGuideAnimationTarget[] = [];
  const walkwayGuideSeasonalTargets: SeasonalLightingTarget[] = [];
  const walkwayGuideGroup = new Group();
  walkwayGuideGroup.name = 'BackyardWalkwayGuides';

  const walkwayGuideSegments = 5;
  const walkwayGuideWidth = Math.min(0.22, walkwayWidth * 0.16);
  const walkwayGuideHeight = 0.02;
  const walkwayGuideDepth =
    walkwayGuideSegments > 0
      ? (walkwayDepth / walkwayGuideSegments) * 0.86
      : walkwayDepth * 0.86;
  const walkwayGuideGeometry = new BoxGeometry(
    walkwayGuideWidth,
    walkwayGuideHeight,
    walkwayGuideDepth
  );
  const walkwayGuideEdgeInset = Math.max(walkwayWidth * 0.08, 0.06);
  const walkwayGuideBaseZ = walkway.position.z - walkwayDepth / 2;
  const walkwayGuideSides: Array<{
    label: 'Left' | 'Right';
    direction: -1 | 1;
  }> = [
    { label: 'Left', direction: -1 },
    { label: 'Right', direction: 1 },
  ];

  for (
    let segmentIndex = 0;
    segmentIndex < walkwayGuideSegments;
    segmentIndex += 1
  ) {
    const segmentCenterZ =
      walkwayGuideBaseZ +
      walkwayGuideDepth / 2 +
      segmentIndex * walkwayGuideDepth * 1.08;

    walkwayGuideSides.forEach(({ label, direction }) => {
      const material = new MeshStandardMaterial({
        color: new Color(0x152330),
        emissive: new Color(0x5cd4ff),
        emissiveIntensity: 0.9,
        roughness: 0.42,
        metalness: 0.58,
        transparent: true,
        opacity: 0.58,
      });
      material.depthWrite = false;

      const guide = new Mesh(walkwayGuideGeometry, material);
      guide.name = `BackyardWalkwayGuide-${label}-${segmentIndex}`;
      guide.position.set(
        walkway.position.x +
          direction *
            (walkwayWidth / 2 - walkwayGuideEdgeInset - walkwayGuideWidth / 2),
        walkway.position.y + walkwayGuideHeight / 2 + 0.01,
        segmentCenterZ
      );
      guide.castShadow = false;
      guide.receiveShadow = false;
      guide.renderOrder = 6;
      walkwayGuideGroup.add(guide);

      walkwayGuideAnimationTargets.push({
        material,
        baseEmissiveIntensity: material.emissiveIntensity,
        baseOpacity: material.opacity ?? 1,
        offset: segmentIndex * 0.85 + (direction > 0 ? 0.4 : 0),
      });

      walkwayGuideSeasonalTargets.push({
        roomId: 'backyard',
        material,
        baseEmissiveColor: material.emissive.clone(),
        baseEmissiveIntensity: material.emissiveIntensity,
        fillLights: [],
      });
    });
  }

  if (walkwayGuideGroup.children.length > 0) {
    group.add(walkwayGuideGroup);
  }

  if (walkwayGuideAnimationTargets.length > 0) {
    updates.push(({ elapsed }) => {
      const flickerScale = getFlickerScale();
      const pulseScale = getPulseScale();

      walkwayGuideAnimationTargets.forEach((target) => {
        const wave = Math.sin(elapsed * 1.35 + target.offset);
        const sparkle = Math.sin(elapsed * 2.8 + target.offset * 1.4) * 0.24;
        const baseline = Math.max(
          target.baseEmissiveIntensity * 0.55,
          target.baseEmissiveIntensity * (0.85 + wave * 0.35 + sparkle * 0.18)
        );
        const intensity = MathUtils.lerp(
          target.baseEmissiveIntensity * 0.55,
          baseline,
          flickerScale
        );
        target.material.emissiveIntensity = MathUtils.clamp(
          intensity,
          0,
          target.baseEmissiveIntensity * 1.75
        );

        const opacityWave = Math.sin(elapsed * 0.85 + target.offset * 0.9);
        const opacityTarget = MathUtils.clamp(
          target.baseOpacity * (0.7 + opacityWave * 0.4),
          target.baseOpacity * 0.35,
          1
        );
        target.material.opacity = MathUtils.lerp(
          target.baseOpacity * 0.55,
          opacityTarget,
          pulseScale
        );
        target.material.needsUpdate = true;
      });
    });
  }

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
  const lanternSeasonalTargets: SeasonalLightingTarget[] = [];
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
      lanternSeasonalTargets.push({
        roomId: 'backyard',
        material: glassMaterial,
        baseEmissiveColor: glassMaterial.emissive.clone(),
        baseEmissiveIntensity: glassMaterial.emissiveIntensity,
        fillLights: [
          {
            light,
            baseIntensity: light.intensity,
          },
        ],
      });
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

  const applyBackyardSeasonalPreset: (
    preset: SeasonalLightingPreset | null
  ) => void =
    lanternSeasonalTargets.length > 0 ||
    walkwayGuideSeasonalTargets.length > 0 ||
    walkwayFiberSeasonalTargets.length > 0
      ? (preset) => {
          if (lanternSeasonalTargets.length > 0) {
            applySeasonalLightingPreset({
              preset,
              targets: lanternSeasonalTargets,
            });
            lanternSeasonalTargets.forEach((target, index) => {
              const animationTarget = lanternAnimationTargets[index];
              if (!animationTarget) {
                return;
              }
              animationTarget.baseIntensity = target.material.emissiveIntensity;
              const firstLight = target.fillLights[0]?.light;
              if (firstLight) {
                animationTarget.baseLightIntensity = firstLight.intensity;
              }
            });
          }

          if (walkwayGuideSeasonalTargets.length > 0) {
            applySeasonalLightingPreset({
              preset,
              targets: walkwayGuideSeasonalTargets,
            });
            walkwayGuideSeasonalTargets.forEach((target, index) => {
              const animationTarget = walkwayGuideAnimationTargets[index];
              if (!animationTarget) {
                return;
              }
              animationTarget.baseEmissiveIntensity =
                target.material.emissiveIntensity;
              target.material.opacity = animationTarget.baseOpacity;
              target.material.needsUpdate = true;
            });
          }

          if (walkwayFiberSeasonalTargets.length > 0) {
            applySeasonalLightingPreset({
              preset,
              targets: walkwayFiberSeasonalTargets,
            });
            walkwayFiberSeasonalTargets.forEach((target, index) => {
              const animationTarget = walkwayFiberAnimationTargets[index];
              if (!animationTarget) {
                return;
              }
              animationTarget.baseEmissiveIntensity =
                target.material.emissiveIntensity;
              animationTarget.baseOpacity =
                target.material.opacity ?? animationTarget.baseOpacity;
              target.material.needsUpdate = true;
            });
          }

          applyWalkwayMoteSeasonalTint(preset);
        }
      : (preset) => {
          applyWalkwayMoteSeasonalTint(preset);
        };

  applyBackyardSeasonalPreset(seasonalPreset ?? null);

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

  const fireflyCount = 18;
  const fireflyGeometry = new BufferGeometry();
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflyBasePositions = new Float32Array(fireflyCount * 3);
  const fireflyXAxisAmplitudes = new Float32Array(fireflyCount);
  const fireflyYAxisAmplitudes = new Float32Array(fireflyCount);
  const fireflyZAxisAmplitudes = new Float32Array(fireflyCount);
  const fireflySpeeds = new Float32Array(fireflyCount);
  const fireflyPhaseOffsets = new Float32Array(fireflyCount);
  for (let i = 0; i < fireflyCount; i += 1) {
    const ratio = (i + 0.5) / fireflyCount;
    const baseX = walkway.position.x + (ratio - 0.5) * walkwayWidth * 0.6;
    const baseZ =
      walkway.position.z - walkwayDepth * 0.4 + walkwayDepth * 0.85 * ratio;
    const baseY = 1.05 + Math.sin(ratio * Math.PI) * 0.55;
    const baseIndex = i * 3;
    fireflyBasePositions[baseIndex] = baseX;
    fireflyBasePositions[baseIndex + 1] = baseY;
    fireflyBasePositions[baseIndex + 2] = baseZ;
    fireflyPositions[baseIndex] = baseX;
    fireflyPositions[baseIndex + 1] = baseY;
    fireflyPositions[baseIndex + 2] = baseZ;
    fireflyXAxisAmplitudes[i] =
      walkwayWidth * 0.18 * (0.6 + Math.sin(ratio * Math.PI * 2) * 0.25);
    fireflyYAxisAmplitudes[i] = 0.18 + Math.sin(ratio * Math.PI) * 0.22;
    fireflyZAxisAmplitudes[i] =
      walkwayDepth * 0.16 * (0.7 + Math.cos(ratio * Math.PI * 1.5) * 0.2);
    fireflySpeeds[i] = 0.65 + ratio * 0.9;
    fireflyPhaseOffsets[i] = ratio * Math.PI * 2;
  }
  const fireflyPositionsAttribute = new BufferAttribute(fireflyPositions, 3);
  fireflyGeometry.setAttribute('position', fireflyPositionsAttribute);
  const fireflyMaterial = new PointsMaterial({
    color: 0xffcfa6,
    size: 0.18,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    sizeAttenuation: true,
    blending: AdditiveBlending,
  });
  const fireflies = new Points(fireflyGeometry, fireflyMaterial);
  fireflies.name = 'BackyardFireflies';
  group.add(fireflies);
  const baseFireflyOpacity = fireflyMaterial.opacity;
  const baseFireflySize = fireflyMaterial.size;

  updates.push(({ elapsed }) => {
    const flickerScale = MathUtils.clamp(getFlickerScale(), 0, 1);
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const motionPreference = Math.min(flickerScale, pulseScale);
    const amplitudeScale = MathUtils.lerp(0.4, 1, motionPreference);
    const swirlScale = MathUtils.lerp(0.38, 1, pulseScale);
    const verticalScale = MathUtils.lerp(
      0.55,
      1,
      Math.max(pulseScale, flickerScale * 0.5)
    );
    const twinkleInfluence = MathUtils.lerp(
      0.18,
      0.38,
      Math.max(flickerScale, 0.1)
    );
    let twinkleSum = 0;

    for (let i = 0; i < fireflyCount; i += 1) {
      const baseIndex = i * 3;
      const offset = fireflyPhaseOffsets[i];
      const speed = fireflySpeeds[i];
      const phase = elapsed * speed + offset;
      const sinPhase = Math.sin(phase);
      const cosPhase = Math.cos(phase * 0.92 + offset * 0.4);
      const baseX = fireflyBasePositions[baseIndex];
      const baseY = fireflyBasePositions[baseIndex + 1];
      const baseZ = fireflyBasePositions[baseIndex + 2];
      const x =
        baseX +
        sinPhase * fireflyXAxisAmplitudes[i] * amplitudeScale +
        Math.sin(phase * 0.35 + offset) *
          fireflyXAxisAmplitudes[i] *
          0.18 *
          amplitudeScale *
          swirlScale;
      const y =
        baseY +
        Math.sin(phase * 1.6 + offset * 0.5) *
          fireflyYAxisAmplitudes[i] *
          verticalScale +
        Math.sin(phase * 0.45 + offset) * 0.06 * verticalScale * swirlScale;
      const z = baseZ + cosPhase * fireflyZAxisAmplitudes[i] * amplitudeScale;
      fireflyPositionsAttribute.setXYZ(i, x, y, z);
      const localTwinkle =
        0.72 + Math.sin(phase * 1.7 + offset * 0.6) * twinkleInfluence;
      twinkleSum += localTwinkle;
    }

    fireflyPositionsAttribute.needsUpdate = true;

    const averageTwinkle = MathUtils.clamp(
      twinkleSum / fireflyCount,
      0.45,
      1.25
    );
    const brightnessScale = MathUtils.clamp(
      averageTwinkle * MathUtils.lerp(0.6, 1, flickerScale),
      0.35,
      1.1
    );
    const opacityFloor = MathUtils.lerp(0.4, 0.68, flickerScale);
    fireflyMaterial.opacity =
      baseFireflyOpacity * Math.min(1, Math.max(opacityFloor, brightnessScale));

    const sizeFloor = MathUtils.lerp(0.8, 0.96, pulseScale);
    const sizeDriver = MathUtils.clamp(
      averageTwinkle * MathUtils.lerp(0.72, 1, pulseScale),
      0.45,
      1.1
    );
    const sizeTarget = MathUtils.lerp(
      sizeFloor,
      MathUtils.lerp(0.82, 1.16, sizeDriver),
      Math.max(pulseScale, 0.25)
    );
    fireflyMaterial.size = baseFireflySize * sizeTarget;
  });

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

  return {
    group,
    colliders,
    update,
    ambientAudioBeds,
    applySeasonalPreset: applyBackyardSeasonalPreset,
  };
}
