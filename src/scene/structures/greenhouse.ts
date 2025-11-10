import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Texture,
  Vector3,
  type IUniform,
} from 'three';

import {
  getFlickerScale,
  getPulseScale,
} from '../../ui/accessibility/animationPreferences';
import type { RectCollider } from '../collision';

export interface GreenhouseConfig {
  basePosition: Vector3;
  orientationRadians?: number;
  width?: number;
  depth?: number;
  environmentMap?: Texture | null;
  environmentIntensity?: number;
}

export interface GreenhouseBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number }): void;
}

const DEFAULT_WIDTH = 4.6;
const DEFAULT_DEPTH = 3.2;
const FRAME_HEIGHT = 2.6;
const ROOF_PEAK_HEIGHT = 0.9;
const FRAME_THICKNESS = 0.12;
const GLASS_THICKNESS = 0.04;
const BASE_HEIGHT = 0.18;
const SOLAR_BASE_TILT = -MathUtils.degToRad(18);

export function createGreenhouse(config: GreenhouseConfig): GreenhouseBuild {
  const width = config.width ?? DEFAULT_WIDTH;
  const depth = config.depth ?? DEFAULT_DEPTH;
  const orientation = config.orientationRadians ?? 0;
  const basePosition = config.basePosition.clone();
  const environmentMap = config.environmentMap ?? null;
  const environmentIntensity = config.environmentIntensity ?? 0.5;

  const applyEnvironmentMap = (
    material: MeshStandardMaterial | MeshPhysicalMaterial
  ) => {
    if (!environmentMap) {
      return;
    }
    material.envMap = environmentMap;
    material.envMapIntensity = environmentIntensity;
    material.needsUpdate = true;
  };

  const group = new Group();
  group.name = 'BackyardGreenhouse';
  group.position.copy(basePosition);
  group.rotation.y = orientation;

  const colliders: RectCollider[] = [
    {
      minX: basePosition.x - width / 2 - 0.08,
      maxX: basePosition.x + width / 2 + 0.08,
      minZ: basePosition.z - depth / 2 - 0.12,
      maxZ: basePosition.z + depth / 2 + 0.12,
    },
  ];

  const baseGeometry = new BoxGeometry(width + 0.3, BASE_HEIGHT, depth + 0.3);
  const baseMaterial = new MeshStandardMaterial({
    color: new Color(0x293238),
    roughness: 0.58,
    metalness: 0.22,
  });
  applyEnvironmentMap(baseMaterial);
  const base = new Mesh(baseGeometry, baseMaterial);
  base.name = 'BackyardGreenhouseBase';
  base.position.y = BASE_HEIGHT / 2 - 0.02;
  group.add(base);

  const floorGeometry = new BoxGeometry(width, 0.08, depth);
  const floorMaterial = new MeshStandardMaterial({
    color: new Color(0x3f4a30),
    roughness: 0.62,
    metalness: 0.14,
  });
  applyEnvironmentMap(floorMaterial);
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.name = 'BackyardGreenhouseFloor';
  floor.position.y = BASE_HEIGHT;
  group.add(floor);

  const frameGroup = new Group();
  frameGroup.name = 'BackyardGreenhouseFrame';
  frameGroup.position.y = BASE_HEIGHT;
  group.add(frameGroup);

  const postGeometry = new BoxGeometry(
    FRAME_THICKNESS,
    FRAME_HEIGHT,
    FRAME_THICKNESS
  );
  const frameMaterial = new MeshStandardMaterial({
    color: new Color(0xc1d1d9),
    roughness: 0.32,
    metalness: 0.78,
  });
  applyEnvironmentMap(frameMaterial);
  const postOffsets: [number, number][] = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [-width / 2, depth / 2],
    [width / 2, depth / 2],
  ];
  postOffsets.forEach(([offsetX, offsetZ], index) => {
    const post = new Mesh(postGeometry, frameMaterial);
    post.name = `BackyardGreenhousePost-${index}`;
    post.position.set(offsetX, FRAME_HEIGHT / 2, offsetZ);
    frameGroup.add(post);
  });

  const lintelGeometry = new BoxGeometry(
    width - FRAME_THICKNESS,
    FRAME_THICKNESS,
    FRAME_THICKNESS
  );
  const lintelDepthGeometry = new BoxGeometry(
    FRAME_THICKNESS,
    FRAME_THICKNESS,
    depth - FRAME_THICKNESS
  );

  const frontLintel = new Mesh(lintelGeometry, frameMaterial);
  frontLintel.name = 'BackyardGreenhouseFrontLintel';
  frontLintel.position.set(0, FRAME_HEIGHT, -depth / 2 + FRAME_THICKNESS / 2);
  frameGroup.add(frontLintel);

  const backLintel = frontLintel.clone();
  backLintel.name = 'BackyardGreenhouseBackLintel';
  backLintel.position.z = depth / 2 - FRAME_THICKNESS / 2;
  frameGroup.add(backLintel);

  const leftLintel = new Mesh(lintelDepthGeometry, frameMaterial);
  leftLintel.name = 'BackyardGreenhouseLeftLintel';
  leftLintel.position.set(-width / 2 + FRAME_THICKNESS / 2, FRAME_HEIGHT, 0);
  frameGroup.add(leftLintel);

  const rightLintel = leftLintel.clone();
  rightLintel.name = 'BackyardGreenhouseRightLintel';
  rightLintel.position.x = width / 2 - FRAME_THICKNESS / 2;
  frameGroup.add(rightLintel);

  const roofRidgeGeometry = new BoxGeometry(
    FRAME_THICKNESS,
    ROOF_PEAK_HEIGHT,
    depth - FRAME_THICKNESS
  );
  const roofRidge = new Mesh(roofRidgeGeometry, frameMaterial);
  roofRidge.name = 'BackyardGreenhouseRoofRidge';
  roofRidge.position.set(0, FRAME_HEIGHT + ROOF_PEAK_HEIGHT / 2, 0);
  frameGroup.add(roofRidge);

  const roofBeamGeometry = new BoxGeometry(
    width - FRAME_THICKNESS,
    FRAME_THICKNESS,
    FRAME_THICKNESS
  );
  const roofBeamLeft = new Mesh(roofBeamGeometry, frameMaterial);
  roofBeamLeft.name = 'BackyardGreenhouseRoofBeamLeft';
  roofBeamLeft.position.set(
    0,
    FRAME_HEIGHT + ROOF_PEAK_HEIGHT / 2,
    -depth / 2 + FRAME_THICKNESS / 2
  );
  roofBeamLeft.rotation.z = MathUtils.degToRad(32);
  frameGroup.add(roofBeamLeft);

  const roofBeamRight = roofBeamLeft.clone();
  roofBeamRight.name = 'BackyardGreenhouseRoofBeamRight';
  roofBeamRight.position.z = depth / 2 - FRAME_THICKNESS / 2;
  roofBeamRight.rotation.z = -roofBeamLeft.rotation.z;
  frameGroup.add(roofBeamRight);

  const glassMaterial = new MeshPhysicalMaterial({
    color: new Color(0x9cd6ff),
    transparent: true,
    opacity: 0.28,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.86,
    thickness: 0.18,
  });
  applyEnvironmentMap(glassMaterial);

  const wallGeometry = new PlaneGeometry(
    width - FRAME_THICKNESS,
    FRAME_HEIGHT - 0.1
  );
  const frontWall = new Mesh(wallGeometry, glassMaterial);
  frontWall.name = 'BackyardGreenhouseGlassFront';
  frontWall.position.set(0, FRAME_HEIGHT / 2, -depth / 2 + GLASS_THICKNESS);
  frontWall.rotation.y = Math.PI;
  frameGroup.add(frontWall);

  const backWall = frontWall.clone();
  backWall.name = 'BackyardGreenhouseGlassBack';
  backWall.position.z = depth / 2 - GLASS_THICKNESS;
  backWall.rotation.y = 0;
  frameGroup.add(backWall);

  const sideGeometry = new PlaneGeometry(
    depth - FRAME_THICKNESS,
    FRAME_HEIGHT - 0.1
  );
  const leftWall = new Mesh(sideGeometry, glassMaterial);
  leftWall.name = 'BackyardGreenhouseGlassLeft';
  leftWall.position.set(-width / 2 + GLASS_THICKNESS, FRAME_HEIGHT / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  frameGroup.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.name = 'BackyardGreenhouseGlassRight';
  rightWall.position.x = width / 2 - GLASS_THICKNESS;
  rightWall.rotation.y = -Math.PI / 2;
  frameGroup.add(rightWall);

  const roofGeometry = new PlaneGeometry(depth - FRAME_THICKNESS, width);
  const roofLeft = new Mesh(roofGeometry, glassMaterial);
  roofLeft.name = 'BackyardGreenhouseRoofLeft';
  roofLeft.position.set(0, FRAME_HEIGHT + ROOF_PEAK_HEIGHT / 2, 0);
  roofLeft.rotation.set(MathUtils.degToRad(58), 0, Math.PI / 2);
  frameGroup.add(roofLeft);

  const roofRight = roofLeft.clone();
  roofRight.name = 'BackyardGreenhouseRoofRight';
  roofRight.rotation.x = -roofLeft.rotation.x;
  frameGroup.add(roofRight);

  const planterGeometry = new BoxGeometry(width * 0.36, 0.24, depth * 0.32);
  const planterMaterial = new MeshStandardMaterial({
    color: new Color(0x5c4736),
    roughness: 0.64,
    metalness: 0.12,
  });
  const plantMaterial = new MeshStandardMaterial({
    color: new Color(0x5dbb63),
    roughness: 0.48,
    metalness: 0.08,
  });

  const planterOffsets: number[] = [-width * 0.22, width * 0.22];
  planterOffsets.forEach((offsetX, index) => {
    const planter = new Mesh(planterGeometry, planterMaterial);
    planter.name = `BackyardGreenhousePlanter-${index}`;
    planter.position.set(offsetX, BASE_HEIGHT + 0.12, 0);
    group.add(planter);

    const foliageWidth = planterGeometry.parameters.width * 0.84;
    const foliageDepth = planterGeometry.parameters.depth * 0.9;
    const foliageGeometry = new BoxGeometry(foliageWidth, 0.4, foliageDepth);
    const foliage = new Mesh(foliageGeometry, plantMaterial);
    foliage.name = `BackyardGreenhouseFoliage-${index}`;
    foliage.position.set(offsetX, BASE_HEIGHT + 0.42, 0);
    group.add(foliage);
  });

  const pondPlinthRadius = depth * 0.24;
  const pondPlinthHeight = 0.16;
  const pondPlinthGeometry = new CylinderGeometry(
    pondPlinthRadius,
    pondPlinthRadius,
    pondPlinthHeight,
    40
  );
  const pondPlinthMaterial = new MeshStandardMaterial({
    color: new Color(0x2b343c),
    roughness: 0.6,
    metalness: 0.22,
  });
  applyEnvironmentMap(pondPlinthMaterial);
  const pondPlinth = new Mesh(pondPlinthGeometry, pondPlinthMaterial);
  pondPlinth.name = 'BackyardGreenhousePondPlinth';
  pondPlinth.position.set(
    0,
    BASE_HEIGHT + pondPlinthHeight / 2 - 0.02,
    depth * 0.18
  );
  group.add(pondPlinth);

  const pondGeometry = new CylinderGeometry(
    depth * 0.17,
    depth * 0.17,
    0.12,
    32
  );
  const pondMaterial = new MeshStandardMaterial({
    color: new Color(0x1a4a5e),
    roughness: 0.18,
    metalness: 0.32,
    emissive: new Color(0x0c95d4),
    emissiveIntensity: 0.26,
  });
  applyEnvironmentMap(pondMaterial);
  const pond = new Mesh(pondGeometry, pondMaterial);
  pond.name = 'BackyardGreenhousePond';
  pond.position.set(0, BASE_HEIGHT + 0.06, depth * 0.18);
  pond.rotation.x = Math.PI / 2;
  group.add(pond);

  const pondRippleUniforms: {
    time: IUniform<number>;
    amplitude: IUniform<number>;
    brightness: IUniform<number>;
    sparkle: IUniform<number>;
    calm: IUniform<number>;
    innerColor: IUniform<Color>;
    outerColor: IUniform<Color>;
  } = {
    time: { value: 0 },
    amplitude: { value: 0.38 },
    brightness: { value: 0.22 },
    sparkle: { value: 0.18 },
    calm: { value: 1 },
    innerColor: { value: new Color(0x33cff5) },
    outerColor: { value: new Color(0x082b3e) },
  };

  const pondRippleMaterial = new ShaderMaterial({
    uniforms: pondRippleUniforms,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float amplitude;
      uniform float brightness;
      uniform float sparkle;
      uniform float calm;
      uniform vec3 innerColor;
      uniform vec3 outerColor;
      varying vec2 vUv;

      float ripple(vec2 offset, float frequency, float phase) {
        float dist = length(offset);
        return sin((dist - phase) * frequency);
      }

      void main() {
        vec2 centered = vUv - 0.5;
        float dist = length(centered);

        float wavePrimary = ripple(centered, 22.0, time * 0.35);
        float waveSecondary = ripple(centered + vec2(0.08, -0.04), 14.0, time * 0.22);
        float swirl = sin((centered.x + centered.y) * 6.5 + time * 0.8);
        float koiWake = sin(centered.y * 9.5 - time * 1.4 + sin(time * 0.6) * 0.3);
        float combined = mix(wavePrimary, waveSecondary, 0.45);
        float shimmer = combined * 0.6 + swirl * 0.25 + koiWake * 0.15;

        float rimFade = 1.0 - smoothstep(0.22, 0.52, dist);
        rimFade = pow(rimFade, 1.4);
        float alpha = clamp(0.25 + amplitude * 0.45 * calm, 0.0, 1.0) * rimFade;

        float depthBlend = smoothstep(0.0, 0.46, dist);
        vec3 baseColor = mix(outerColor, innerColor, 1.0 - depthBlend);
        baseColor += combined * brightness * amplitude;

        float sparkleMask = 1.0 - smoothstep(0.18, 0.48, dist);
        float sparkleWave = max(0.0, shimmer);
        float sparkleStrength = pow(sparkleWave, 2.0) * sparkleMask * sparkle;
        vec3 causticColor = mix(vec3(1.0, 0.96, 0.78), innerColor, 0.6);
        baseColor = mix(baseColor, causticColor, clamp(sparkleStrength * 1.4, 0.0, 1.0));

        gl_FragColor = vec4(baseColor, alpha);
      }
    `,
  });

  const pondRipple = new Mesh(
    new PlaneGeometry(depth * 0.36, depth * 0.36),
    pondRippleMaterial
  );
  pondRipple.name = 'BackyardGreenhousePondRipple';
  pondRipple.position.set(
    pond.position.x,
    pond.position.y + 0.01,
    pond.position.z
  );
  pondRipple.rotation.x = -Math.PI / 2;
  pondRipple.renderOrder = 6;
  group.add(pondRipple);

  const solarPanelPivot = new Group();
  solarPanelPivot.name = 'BackyardGreenhouseSolarPanels';
  solarPanelPivot.position.set(0, FRAME_HEIGHT + ROOF_PEAK_HEIGHT * 0.72, 0);
  solarPanelPivot.rotation.x = SOLAR_BASE_TILT;
  group.add(solarPanelPivot);

  const solarPanelGeometry = new BoxGeometry(width * 0.42, 0.06, depth * 0.9);
  const solarMaterial = new MeshStandardMaterial({
    color: new Color(0x1e2f4b),
    emissive: new Color(0x0f7ad9),
    emissiveIntensity: 0.35,
    roughness: 0.22,
    metalness: 0.78,
  });
  const solarStrutMaterial = new MeshStandardMaterial({
    color: new Color(0x9ca9b8),
    roughness: 0.44,
    metalness: 0.66,
  });

  const solarSpacing = width * 0.46;
  [-solarSpacing / 2, solarSpacing / 2].forEach((offsetX, index) => {
    const panel = new Mesh(solarPanelGeometry, solarMaterial);
    panel.name = `BackyardGreenhouseSolarPanel-${index}`;
    panel.position.set(offsetX, 0, 0);
    solarPanelPivot.add(panel);

    const strut = new Mesh(
      new BoxGeometry(0.08, FRAME_HEIGHT * 0.6, 0.12),
      solarStrutMaterial
    );
    strut.name = `BackyardGreenhouseSolarStrut-${index}`;
    strut.position.set(offsetX, -FRAME_HEIGHT * 0.3, -depth * 0.22);
    solarPanelPivot.add(strut);
  });

  const growLightMaterials: MeshStandardMaterial[] = [];
  const growLightGeometry = new CylinderGeometry(0.05, 0.05, width * 0.32, 12);
  const growLightSpacing = depth * 0.38;
  [-growLightSpacing, 0, growLightSpacing].forEach((offsetZ, index) => {
    const lightMaterial = new MeshStandardMaterial({
      color: new Color(0xfff0d0),
      emissive: new Color(0xffa64d),
      emissiveIntensity: 0.85,
      roughness: 0.42,
      metalness: 0.18,
    });
    const light = new Mesh(growLightGeometry, lightMaterial);
    light.name = `BackyardGreenhouseGrowLight-${index}`;
    light.rotation.z = Math.PI / 2;
    light.position.set(0, FRAME_HEIGHT + BASE_HEIGHT - 0.28, offsetZ / 2);
    group.add(light);
    growLightMaterials.push(lightMaterial);
  });

  const update = ({ elapsed }: { elapsed: number; delta: number }) => {
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const flickerScale = MathUtils.clamp(getFlickerScale(), 0, 1);
    const calmScale = Math.min(pulseScale, flickerScale);
    const swayAmplitude = MathUtils.lerp(0.8, 6, pulseScale);
    const sway = Math.sin(elapsed * 0.4) * MathUtils.degToRad(swayAmplitude);
    solarPanelPivot.rotation.x = SOLAR_BASE_TILT + sway;

    growLightMaterials.forEach((material, index) => {
      const phase = index * 0.6;
      const pulse = (Math.sin(elapsed * 1.3 + phase) + 1) / 2;
      const safePulse = MathUtils.lerp(0.25, pulse, pulseScale);
      const minIntensity = MathUtils.lerp(0.68, 0.72, pulseScale);
      const maxIntensity = MathUtils.lerp(1.1, 1.65, pulseScale);
      material.emissiveIntensity = MathUtils.lerp(
        minIntensity,
        maxIntensity,
        safePulse
      );
    });

    const rippleSpeed = MathUtils.lerp(0.2, 0.52, pulseScale);
    pondRippleUniforms.time.value = elapsed * rippleSpeed;
    pondRippleUniforms.amplitude.value = MathUtils.lerp(0.18, 0.72, calmScale);
    pondRippleUniforms.brightness.value = MathUtils.lerp(0.12, 0.3, pulseScale);
    pondRippleUniforms.sparkle.value = MathUtils.lerp(0.05, 0.24, flickerScale);
    pondRippleUniforms.calm.value = MathUtils.lerp(0.55, 1, calmScale);
  };

  return { group, colliders, update };
}
