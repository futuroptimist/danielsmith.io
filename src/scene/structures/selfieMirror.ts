import {
  BoxGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';

import type { RectCollider } from '../collision';

export interface SelfieMirrorOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  width?: number;
  height?: number;
  depth?: number;
  cameraDistance?: number;
}

export interface SelfieMirrorUpdateContext {
  playerPosition: { x: number; y: number; z: number };
  playerRotationY: number;
  playerHeight?: number;
}

export interface SelfieMirrorBuild {
  group: Group;
  collider: RectCollider;
  camera: PerspectiveCamera;
  renderTarget: WebGLRenderTarget;
  update(context: SelfieMirrorUpdateContext): void;
  render(renderer: WebGLRenderer, scene: Scene): void;
  dispose(): void;
}

const DEFAULT_WIDTH = 3.2;
const DEFAULT_HEIGHT = 3.8;
const DEFAULT_DEPTH = 0.42;
const DEFAULT_CAMERA_DISTANCE = 3.1;
const DISPLAY_MARGIN = 0.18;
const BASE_HEIGHT = 0.32;
const BASE_SCALE_X = 1.35;
const BASE_SCALE_Z = 2.1;
const CAMERA_FOV = 34;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 24;
const PLAYER_HEIGHT_FALLBACK = 1.8;
const GLOW_BASE_OPACITY = 0.16;
const GLOW_FOCUS_OPACITY = 0.45;
const GLOW_RADIUS = 5.5;

function createFootprintCollider(
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
    const worldX = center.x + corner.x * cos - corner.z * sin;
    const worldZ = center.z + corner.x * sin + corner.z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  });

  return { minX, maxX, minZ, maxZ };
}

export function createSelfieMirror(
  options: SelfieMirrorOptions
): SelfieMirrorBuild {
  const width = Math.max(1.6, options.width ?? DEFAULT_WIDTH);
  const height = Math.max(2.4, options.height ?? DEFAULT_HEIGHT);
  const depth = Math.max(0.2, options.depth ?? DEFAULT_DEPTH);
  const cameraDistance = Math.max(1.4, options.cameraDistance ?? DEFAULT_CAMERA_DISTANCE);
  const basePosition = new Vector3(
    options.position.x,
    options.position.y ?? 0,
    options.position.z
  );
  const orientation = options.orientationRadians ?? 0;

  const group = new Group();
  group.name = 'SelfieMirror';
  group.position.copy(basePosition);
  group.rotation.y = orientation;

  const baseMaterial = new MeshStandardMaterial({
    color: new Color(0x101827),
    roughness: 0.62,
    metalness: 0.18,
  });
  const base = new Mesh(
    new BoxGeometry(width * BASE_SCALE_X, BASE_HEIGHT, depth * BASE_SCALE_Z),
    baseMaterial
  );
  base.name = 'SelfieMirrorBase';
  base.position.set(0, BASE_HEIGHT / 2, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const pillarMaterial = new MeshStandardMaterial({
    color: new Color(0x19273a),
    roughness: 0.48,
    metalness: 0.24,
  });
  const pillar = new Mesh(new BoxGeometry(width, height, depth), pillarMaterial);
  pillar.name = 'SelfieMirrorFrame';
  pillar.position.set(0, BASE_HEIGHT + height / 2, 0);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  group.add(pillar);

  const accentMaterial = new MeshStandardMaterial({
    color: new Color(0x233750),
    emissive: new Color(0x5ad2ff),
    emissiveIntensity: 0.55,
    roughness: 0.42,
    metalness: 0.28,
  });
  const accent = new Mesh(
    new BoxGeometry(width * 0.64, 0.14, depth * 0.8),
    accentMaterial
  );
  accent.name = 'SelfieMirrorAccent';
  accent.position.set(0, BASE_HEIGHT + height - 0.28, depth * -0.08);
  group.add(accent);

  const renderTarget = new WebGLRenderTarget(512, 512, {
    generateMipmaps: false,
  });
  renderTarget.texture.colorSpace = SRGBColorSpace;

  const displayMaterial = new MeshBasicMaterial({
    map: renderTarget.texture,
    toneMapped: false,
  });
  const display = new Mesh(
    new PlaneGeometry(width - DISPLAY_MARGIN, height - DISPLAY_MARGIN),
    displayMaterial
  );
  display.name = 'SelfieMirrorDisplay';
  display.position.set(0, BASE_HEIGHT + height / 2, depth / 2 + 0.005);
  display.renderOrder = 2;
  group.add(display);

  const glowMaterial = new MeshBasicMaterial({
    color: new Color(0x7be4ff),
    transparent: true,
    opacity: GLOW_BASE_OPACITY,
    toneMapped: false,
  });
  const glow = new Mesh(
    new PlaneGeometry(width - DISPLAY_MARGIN * 0.4, height - DISPLAY_MARGIN * 0.4),
    glowMaterial
  );
  glow.name = 'SelfieMirrorGlow';
  glow.position.set(0, display.position.y, display.position.z + 0.01);
  glow.renderOrder = 1;
  group.add(glow);

  const camera = new PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  camera.name = 'SelfieMirrorCamera';

  const collider = createFootprintCollider(
    basePosition,
    width * BASE_SCALE_X,
    depth * BASE_SCALE_Z,
    orientation
  );

  const lookTarget = new Vector3();
  const cameraPosition = new Vector3();
  const planarOffset = new Vector3();

  const update = ({
    playerPosition,
    playerRotationY,
    playerHeight,
  }: SelfieMirrorUpdateContext) => {
    const heightTarget = playerHeight ?? PLAYER_HEIGHT_FALLBACK;
    const focusHeight = heightTarget * 0.62;
    lookTarget.set(playerPosition.x, playerPosition.y + focusHeight, playerPosition.z);

    const forwardX = Math.sin(playerRotationY);
    const forwardZ = Math.cos(playerRotationY);
    cameraPosition.set(
      lookTarget.x + forwardX * cameraDistance,
      lookTarget.y + heightTarget * 0.08,
      lookTarget.z + forwardZ * cameraDistance
    );
    camera.position.copy(cameraPosition);
    camera.lookAt(lookTarget);

    planarOffset.set(
      playerPosition.x - basePosition.x,
      0,
      playerPosition.z - basePosition.z
    );
    const planarDistance = planarOffset.length();
    const emphasis = MathUtils.clamp(1 - planarDistance / GLOW_RADIUS, 0, 1);
    glowMaterial.opacity = MathUtils.lerp(
      GLOW_BASE_OPACITY,
      GLOW_FOCUS_OPACITY,
      emphasis
    );
  };

  const render = (renderer: WebGLRenderer, scene: Scene) => {
    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    renderer.setRenderTarget(renderTarget);
    renderer.autoClear = true;
    const previousBaseVisible = base.visible;
    const previousPillarVisible = pillar.visible;
    const previousAccentVisible = accent.visible;
    const previousDisplayVisible = display.visible;
    const previousGlowVisible = glow.visible;
    base.visible = false;
    pillar.visible = false;
    accent.visible = false;
    display.visible = false;
    glow.visible = false;
    renderer.render(scene, camera);
    base.visible = previousBaseVisible;
    pillar.visible = previousPillarVisible;
    accent.visible = previousAccentVisible;
    display.visible = previousDisplayVisible;
    glow.visible = previousGlowVisible;
    renderer.setRenderTarget(previousTarget);
    renderer.autoClear = previousAutoClear;
  };

  const dispose = () => {
    renderTarget.dispose();
    display.geometry.dispose();
    (display.material as MeshBasicMaterial).dispose();
    glow.geometry.dispose();
    glowMaterial.dispose();
    pillar.geometry.dispose();
    pillarMaterial.dispose();
    base.geometry.dispose();
    baseMaterial.dispose();
    accent.geometry.dispose();
    accentMaterial.dispose();
  };

  return {
    group,
    collider,
    camera,
    renderTarget,
    update,
    render,
    dispose,
  };
}
