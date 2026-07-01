import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  type ColorRepresentation,
  type Material,
  type Texture,
} from 'three';

import { UPPER_FLOOR_TOP_ELEVATION } from '../level/floorElevations';

export type WallPaintingFloor = 'ground' | 'upper';
export type WallPaintingOrientation = 'north' | 'west';

export interface WallPaintingFrameVariant {
  readonly frameColor: ColorRepresentation;
  readonly matColor: ColorRepresentation;
  readonly frameThickness: number;
  readonly frameDepth: number;
  readonly matBorder: number;
  readonly backingDepth?: number;
}

export interface WallPaintingConfig {
  readonly id: string;
  readonly label: string;
  readonly imagePath: `/images/${string}`;
  readonly floor: WallPaintingFloor;
  readonly room: string;
  readonly wallOrientation: WallPaintingOrientation;
  readonly position: { readonly x: number; readonly z: number };
  readonly size: number;
  readonly frame: WallPaintingFrameVariant;
}

export interface WallPaintingsBuild {
  readonly group: Group;
  readonly groundGroup: Group;
  readonly upperGroup: Group;
  readonly configs: readonly WallPaintingConfig[];
  dispose(): void;
}

const WALL_OFFSET = 0.08;
const GROUND_PAINTING_CENTER_Y = 2.35;
const UPPER_PAINTING_CENTER_Y = UPPER_FLOOR_TOP_ELEVATION + 2.2;

export const WALL_PAINTING_CONFIGS: readonly WallPaintingConfig[] = [
  {
    id: 'rocket-nosecone-living-room-west',
    label: '3D printed rocket nosecone',
    imagePath: '/images/3dprinted_rocket_nosecone.jpg',
    floor: 'ground',
    room: 'living room',
    wallOrientation: 'west',
    position: { x: -31.92, z: -20.2 },
    size: 2.15,
    frame: {
      frameColor: 0x4f3528,
      matColor: 0xe8dfcf,
      frameThickness: 0.16,
      frameDepth: 0.16,
      matBorder: 0.18,
    },
  },
  {
    id: 'hydroponic-lamp-kitchen-west',
    label: 'Hydroponic lamp',
    imagePath: '/images/hydroponic_lamp.jpg',
    floor: 'ground',
    room: 'kitchen',
    wallOrientation: 'west',
    position: { x: -31.92, z: 2.7 },
    size: 1.85,
    frame: {
      frameColor: 0x556b4f,
      matColor: 0xf0ead8,
      frameThickness: 0.13,
      frameDepth: 0.2,
      matBorder: 0.14,
    },
  },
  {
    id: 'launch-studio-north',
    label: 'Launch',
    imagePath: '/images/launch.jpg',
    floor: 'ground',
    room: 'studio',
    wallOrientation: 'north',
    position: { x: 5.2, z: -7.92 },
    size: 2.0,
    frame: {
      frameColor: 0x25354f,
      matColor: 0xd9e2ee,
      frameThickness: 0.19,
      frameDepth: 0.14,
      matBorder: 0.12,
      backingDepth: 0.08,
    },
  },
  {
    id: 'democratized-space-creators-studio-west',
    label: 'Democratized space',
    imagePath: '/images/democratizedspace.jpg',
    floor: 'upper',
    room: 'creators studio',
    wallOrientation: 'west',
    position: { x: -19.92, z: -12.2 },
    size: 2.25,
    frame: {
      frameColor: 0x6d4c2f,
      matColor: 0xefe4ca,
      frameThickness: 0.14,
      frameDepth: 0.18,
      matBorder: 0.22,
    },
  },
  {
    id: '3d-printer-loft-library-west',
    label: '3D printer',
    imagePath: '/images/3dprinter.jpg',
    floor: 'upper',
    room: 'loft library',
    wallOrientation: 'west',
    position: { x: 4.08, z: -3.2 },
    size: 1.9,
    frame: {
      frameColor: 0x2f3033,
      matColor: 0xe7e0d2,
      frameThickness: 0.18,
      frameDepth: 0.12,
      matBorder: 0.16,
    },
  },
  {
    id: 'hypercar-focus-pods-north',
    label: 'Hypercar on grass',
    imagePath: '/images/hypercar_grassy.jpg',
    floor: 'upper',
    room: 'focus pods',
    wallOrientation: 'north',
    position: { x: -3.8, z: 27.92 },
    size: 2.1,
    frame: {
      frameColor: 0x6a7258,
      matColor: 0xf2eadb,
      frameThickness: 0.12,
      frameDepth: 0.22,
      matBorder: 0.2,
      backingDepth: 0.1,
    },
  },
] as const;

export function createWallPaintings(
  configs: readonly WallPaintingConfig[] = WALL_PAINTING_CONFIGS
): WallPaintingsBuild {
  const group = new Group();
  group.name = 'WallPaintings';
  const groundGroup = new Group();
  groundGroup.name = 'GroundWallPaintings';
  const upperGroup = new Group();
  upperGroup.name = 'UpperWallPaintings';
  group.add(groundGroup, upperGroup);

  const textureLoader = new TextureLoader();
  const textures: Texture[] = [];
  const materials: Material[] = [];
  const geometries: Array<BoxGeometry | PlaneGeometry> = [];

  configs.forEach((config) => {
    const painting = createWallPainting(
      config,
      textureLoader,
      textures,
      materials,
      geometries
    );
    const floorGroup = config.floor === 'upper' ? upperGroup : groundGroup;
    floorGroup.add(painting);
  });

  return {
    group,
    groundGroup,
    upperGroup,
    configs,
    dispose() {
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      geometries.forEach((geometry) => geometry.dispose());
    },
  };
}

function createWallPainting(
  config: WallPaintingConfig,
  textureLoader: TextureLoader,
  textures: Texture[],
  materials: Material[],
  geometries: Array<BoxGeometry | PlaneGeometry>
): Group {
  const group = new Group();
  group.name = `WallPainting:${config.id}`;

  const imageTexture = textureLoader.load(config.imagePath);
  imageTexture.colorSpace = SRGBColorSpace;
  imageTexture.name = `WallPaintingTexture:${config.id}`;
  textures.push(imageTexture);

  const imageMaterial = new MeshBasicMaterial({
    map: imageTexture,
    toneMapped: false,
  });
  const matMaterial = new MeshStandardMaterial({
    color: config.frame.matColor,
    roughness: 0.72,
  });
  const frameMaterial = new MeshStandardMaterial({
    color: config.frame.frameColor,
    roughness: 0.58,
    metalness: 0.08,
  });
  const backingMaterial = new MeshStandardMaterial({
    color: 0x2d2b29,
    roughness: 0.84,
  });
  materials.push(imageMaterial, matMaterial, frameMaterial, backingMaterial);

  const imageSize = config.size;
  const matSize = imageSize + config.frame.matBorder * 2;
  const frameSize = matSize + config.frame.frameThickness * 2;
  const backingDepth = config.frame.backingDepth ?? 0.06;

  const backingGeometry = new BoxGeometry(frameSize, frameSize, backingDepth);
  const matGeometry = new PlaneGeometry(matSize, matSize);
  const imageGeometry = new PlaneGeometry(imageSize, imageSize);
  geometries.push(backingGeometry, matGeometry, imageGeometry);

  const backing = new Mesh(backingGeometry, backingMaterial);
  backing.name = `${group.name}:backing`;
  group.add(backing);

  const mat = new Mesh(matGeometry, matMaterial);
  mat.name = `${group.name}:mat`;
  mat.position.z = backingDepth / 2 + 0.006;
  group.add(mat);

  const image = new Mesh(imageGeometry, imageMaterial);
  image.name = `${group.name}:image`;
  image.position.z = mat.position.z + 0.006;
  group.add(image);

  addFrameRails(
    group,
    frameSize,
    matSize,
    config.frame,
    frameMaterial,
    geometries
  );
  placeOnWall(group, config);

  return group;
}

function addFrameRails(
  group: Group,
  frameSize: number,
  matSize: number,
  frame: WallPaintingFrameVariant,
  material: MeshStandardMaterial,
  geometries: Array<BoxGeometry | PlaneGeometry>
): void {
  const railDepth = frame.frameDepth;
  const railThickness = frame.frameThickness;
  const sideRailGeometry = new BoxGeometry(railThickness, frameSize, railDepth);
  const topRailGeometry = new BoxGeometry(matSize, railThickness, railDepth);
  geometries.push(sideRailGeometry, topRailGeometry);

  const halfOffset = matSize / 2 + railThickness / 2;
  const rails = [
    { name: 'left-rail', x: -halfOffset, y: 0, geometry: sideRailGeometry },
    { name: 'right-rail', x: halfOffset, y: 0, geometry: sideRailGeometry },
    { name: 'top-rail', x: 0, y: halfOffset, geometry: topRailGeometry },
    { name: 'bottom-rail', x: 0, y: -halfOffset, geometry: topRailGeometry },
  ];

  rails.forEach((rail) => {
    const mesh = new Mesh(rail.geometry, material);
    mesh.name = `${group.name}:${rail.name}`;
    mesh.position.set(rail.x, rail.y, railDepth / 2);
    group.add(mesh);
  });
}

function placeOnWall(group: Group, config: WallPaintingConfig): void {
  const centerY =
    config.floor === 'upper'
      ? UPPER_PAINTING_CENTER_Y
      : GROUND_PAINTING_CENTER_Y;
  const wallOffset = WALL_OFFSET + config.frame.frameDepth / 2;

  if (config.wallOrientation === 'west') {
    group.position.set(
      config.position.x + wallOffset,
      centerY,
      config.position.z
    );
    group.rotation.y = Math.PI / 2;
    return;
  }

  group.position.set(
    config.position.x,
    centerY,
    config.position.z + wallOffset
  );
}
