import {
  BoxGeometry,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../level/floorElevations';

import { WALL_THICKNESS } from './portfolioSceneLayout';

type FloorId = 'ground' | 'upper';
type WallOrientation = 'north' | 'west';
type FrameVariantId =
  | 'charcoal'
  | 'walnut'
  | 'brass'
  | 'slate'
  | 'copper'
  | 'graphite';

export interface WallPaintingConfig {
  imagePath: string;
  label: string;
  floor: FloorId;
  room: string;
  wall: WallOrientation;
  position: { x: number; z: number };
  size: number;
  frameVariant: FrameVariantId;
}

interface FrameVariant {
  color: number;
  matColor: number;
  thickness: number;
  depth: number;
  matBorder: number;
  roughness: number;
  metalness: number;
}

export interface WallPaintingsBuild {
  group: Group;
  dispose(): void;
}

const toWorldUnits = (value: number): number => value * FLOOR_PLAN_SCALE;

const WALL_PROUD_OFFSET = WALL_THICKNESS / 2 + 0.035;
const IMAGE_INSET_OFFSET = 0.018;

const FRAME_VARIANTS: Record<FrameVariantId, FrameVariant> = {
  charcoal: {
    color: 0x202632,
    matColor: 0xe8dfcf,
    thickness: 0.16,
    depth: 0.16,
    matBorder: 0.17,
    roughness: 0.58,
    metalness: 0.12,
  },
  walnut: {
    color: 0x5d3f2b,
    matColor: 0xf0e5d3,
    thickness: 0.2,
    depth: 0.2,
    matBorder: 0.14,
    roughness: 0.66,
    metalness: 0.04,
  },
  brass: {
    color: 0xb28a45,
    matColor: 0xf6eddc,
    thickness: 0.14,
    depth: 0.14,
    matBorder: 0.2,
    roughness: 0.38,
    metalness: 0.36,
  },
  slate: {
    color: 0x48556a,
    matColor: 0xd9e2e8,
    thickness: 0.18,
    depth: 0.18,
    matBorder: 0.12,
    roughness: 0.62,
    metalness: 0.16,
  },
  copper: {
    color: 0x9c5a37,
    matColor: 0xf2dfca,
    thickness: 0.15,
    depth: 0.22,
    matBorder: 0.18,
    roughness: 0.42,
    metalness: 0.28,
  },
  graphite: {
    color: 0x2f3747,
    matColor: 0xe4e8ec,
    thickness: 0.22,
    depth: 0.17,
    matBorder: 0.13,
    roughness: 0.54,
    metalness: 0.18,
  },
};

export const WALL_PAINTING_CONFIGS: WallPaintingConfig[] = [
  {
    imagePath: '/images/3dprinted_rocket_nosecone.jpg',
    label: 'Rocket nosecone print',
    floor: 'ground',
    room: 'livingRoom',
    wall: 'north',
    position: { x: -12.6, z: -4 },
    size: 1.45,
    frameVariant: 'charcoal',
  },
  {
    imagePath: '/images/3dprinter.jpg',
    label: '3D printer',
    floor: 'ground',
    room: 'kitchen',
    wall: 'west',
    position: { x: -16, z: 3.3 },
    size: 1.3,
    frameVariant: 'walnut',
  },
  {
    imagePath: '/images/hydroponic_lamp.jpg',
    label: 'Hydroponic lamp',
    floor: 'ground',
    room: 'studio',
    wall: 'north',
    position: { x: 12.8, z: 8 },
    size: 1.38,
    frameVariant: 'brass',
  },
  {
    imagePath: '/images/democratizedspace.jpg',
    label: 'Democratized Space',
    floor: 'upper',
    room: 'creatorsStudio',
    wall: 'west',
    position: { x: -10, z: -10.6 },
    size: 1.34,
    frameVariant: 'slate',
  },
  {
    imagePath: '/images/hypercar_grassy.jpg',
    label: 'Hypercar on grass',
    floor: 'upper',
    room: 'loftLibrary',
    wall: 'west',
    position: { x: 2, z: 2.9 },
    size: 1.2,
    frameVariant: 'copper',
  },
  {
    imagePath: '/images/launch.jpg',
    label: 'Launch',
    floor: 'upper',
    room: 'focusPods',
    wall: 'north',
    position: { x: -4.8, z: 14 },
    size: 1.5,
    frameVariant: 'graphite',
  },
];

export function createWallPaintings(
  configs: readonly WallPaintingConfig[] = WALL_PAINTING_CONFIGS
): WallPaintingsBuild {
  const group = new Group();
  group.name = 'WallPaintings';
  const textureLoader = new TextureLoader();
  const textures: Texture[] = [];
  const materials: MeshBasicMaterial[] = [];
  const boxGeometries: BoxGeometry[] = [];
  const frameMaterials = new Map<FrameVariantId, MeshStandardMaterial>();
  const matMaterials = new Map<number, MeshStandardMaterial>();
  const planeGeometry = new PlaneGeometry(1, 1);

  configs.forEach((config) => {
    const painting = createWallPainting({
      config,
      texture: textureLoader.load(config.imagePath),
      frameMaterial: getFrameMaterial(config.frameVariant, frameMaterials),
      matMaterial: getMatMaterial(
        FRAME_VARIANTS[config.frameVariant].matColor,
        matMaterials
      ),
      planeGeometry,
      materials,
      boxGeometries,
      textures,
    });
    group.add(painting);
  });

  return {
    group,
    dispose() {
      planeGeometry.dispose();
      textures.forEach((texture) => texture.dispose());
      boxGeometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      frameMaterials.forEach((material) => material.dispose());
      matMaterials.forEach((material) => material.dispose());
    },
  };
}

function createWallPainting({
  config,
  texture,
  frameMaterial,
  matMaterial,
  planeGeometry,
  materials,
  boxGeometries,
  textures,
}: {
  config: WallPaintingConfig;
  texture: Texture;
  frameMaterial: MeshStandardMaterial;
  matMaterial: MeshStandardMaterial;
  planeGeometry: PlaneGeometry;
  materials: MeshBasicMaterial[];
  boxGeometries: BoxGeometry[];
  textures: Texture[];
}): Group {
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  textures.push(texture);

  const variant = FRAME_VARIANTS[config.frameVariant];
  const group = new Group();
  group.name = `WallPainting:${config.label}`;

  const imageSize = config.size;
  const matSize = imageSize + variant.matBorder * 2;
  const frameSize = matSize + variant.thickness * 2;
  const frameGeometry = new BoxGeometry(frameSize, frameSize, variant.depth);
  const matGeometry = new BoxGeometry(matSize, matSize, variant.depth * 0.34);
  boxGeometries.push(frameGeometry, matGeometry);
  const frame = new Mesh(frameGeometry, frameMaterial);
  const mat = new Mesh(matGeometry, matMaterial);
  const imageMaterial = new MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  const image = new Mesh(planeGeometry, imageMaterial);

  materials.push(imageMaterial);
  frame.name = `${group.name}:Frame`;
  mat.name = `${group.name}:Mat`;
  image.name = `${group.name}:Image`;
  image.scale.set(imageSize, imageSize, 1);
  image.position.z = variant.depth / 2 + IMAGE_INSET_OFFSET;
  mat.position.z = variant.depth * 0.12;
  group.add(frame, mat, image);

  const y =
    (config.floor === 'ground'
      ? GROUND_FLOOR_TOP_ELEVATION
      : UPPER_FLOOR_TOP_ELEVATION) + 3.15;
  group.position.set(
    toWorldUnits(config.position.x),
    y,
    toWorldUnits(config.position.z)
  );

  if (config.wall === 'north') {
    group.position.z += WALL_PROUD_OFFSET;
  } else {
    group.position.x += WALL_PROUD_OFFSET;
    group.rotation.y = Math.PI / 2;
  }

  return group;
}

function getFrameMaterial(
  variantId: FrameVariantId,
  materials: Map<FrameVariantId, MeshStandardMaterial>
): MeshStandardMaterial {
  const existing = materials.get(variantId);
  if (existing) return existing;
  const variant = FRAME_VARIANTS[variantId];
  const material = new MeshStandardMaterial({
    color: variant.color,
    roughness: variant.roughness,
    metalness: variant.metalness,
  });
  materials.set(variantId, material);
  return material;
}

function getMatMaterial(
  color: number,
  materials: Map<number, MeshStandardMaterial>
): MeshStandardMaterial {
  const existing = materials.get(color);
  if (existing) return existing;
  const material = new MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.02,
  });
  materials.set(color, material);
  return material;
}
