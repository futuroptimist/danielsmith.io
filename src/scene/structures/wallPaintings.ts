import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  type ColorRepresentation,
  type Material,
  type Texture,
} from 'three';

export type WallPaintingFloorId = 'ground' | 'upper';
export type WallPaintingOrientation = 'north' | 'west';

export interface WallPaintingConfig {
  id: string;
  label: string;
  imagePath: string;
  floor: WallPaintingFloorId;
  roomId: string;
  wallOrientation: WallPaintingOrientation;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number };
  frameVariant: WallPaintingFrameVariant;
}

interface WallPaintingFrameVariant {
  frameColor: ColorRepresentation;
  matColor: ColorRepresentation;
  thickness: number;
  depth: number;
  matBorder: number;
  backingColor?: ColorRepresentation;
}

export interface WallPaintingsBuild {
  group: Group;
  dispose(): void;
}

export const WALL_PAINTING_CONFIGS: readonly WallPaintingConfig[] = [
  {
    id: 'living-room-rocket-nosecone-painting',
    label: '3D printed rocket nosecone',
    imagePath: '/images/3dprinted_rocket_nosecone.jpg',
    floor: 'ground',
    roomId: 'livingRoom',
    wallOrientation: 'north',
    position: { x: -24.5, y: 1.58, z: -31.72 },
    size: { width: 1.55, height: 1.55 },
    frameVariant: {
      frameColor: 0x4a3427,
      matColor: 0xe8dcc8,
      backingColor: 0x2d2520,
      thickness: 0.16,
      depth: 0.16,
      matBorder: 0.13,
    },
  },
  {
    id: 'kitchen-3d-printer-painting',
    label: '3D printer',
    imagePath: '/images/3dprinter.jpg',
    floor: 'ground',
    roomId: 'kitchen',
    wallOrientation: 'west',
    position: { x: -31.72, y: 1.56, z: 8.0 },
    size: { width: 1.35, height: 1.35 },
    frameVariant: {
      frameColor: 0xc29249,
      matColor: 0x253247,
      backingColor: 0x1c2432,
      thickness: 0.12,
      depth: 0.14,
      matBorder: 0.1,
    },
  },
  {
    id: 'studio-democratized-space-painting',
    label: 'Democratized Space',
    imagePath: '/images/democratizedspace.jpg',
    floor: 'ground',
    roomId: 'studio',
    wallOrientation: 'north',
    position: { x: 24.0, y: 1.62, z: -7.72 },
    size: { width: 1.45, height: 1.45 },
    frameVariant: {
      frameColor: 0x56616f,
      matColor: 0xd8ccb8,
      backingColor: 0x202833,
      thickness: 0.14,
      depth: 0.12,
      matBorder: 0.16,
    },
  },
  {
    id: 'creators-studio-hydroponic-lamp-painting',
    label: 'Hydroponic lamp',
    imagePath: '/images/hydroponic_lamp.jpg',
    floor: 'upper',
    roomId: 'creatorsStudio',
    wallOrientation: 'west',
    position: { x: -19.72, y: 5.18, z: -25.0 },
    size: { width: 1.28, height: 1.28 },
    frameVariant: {
      frameColor: 0x6e9b58,
      matColor: 0x2b3648,
      backingColor: 0x1f2a38,
      thickness: 0.1,
      depth: 0.13,
      matBorder: 0.09,
    },
  },
  {
    id: 'loft-library-hypercar-painting',
    label: 'Hypercar on grass',
    imagePath: '/images/hypercar_grassy.jpg',
    floor: 'upper',
    roomId: 'loftLibrary',
    wallOrientation: 'north',
    position: { x: 20.6, y: 5.2, z: -15.72 },
    size: { width: 1.62, height: 1.62 },
    frameVariant: {
      frameColor: 0x2f3740,
      matColor: 0xe3d6bf,
      backingColor: 0x1f2226,
      thickness: 0.18,
      depth: 0.18,
      matBorder: 0.12,
    },
  },
  {
    id: 'focus-pods-launch-painting',
    label: 'Launch',
    imagePath: '/images/launch.jpg',
    floor: 'upper',
    roomId: 'focusPods',
    wallOrientation: 'north',
    position: { x: -12.0, y: 5.15, z: 12.28 },
    size: { width: 1.5, height: 1.5 },
    frameVariant: {
      frameColor: 0x7d5f8a,
      matColor: 0xf0e6d8,
      backingColor: 0x2b2530,
      thickness: 0.13,
      depth: 0.15,
      matBorder: 0.18,
    },
  },
];

const loader = new TextureLoader();

export function createWallPaintings(
  configs: readonly WallPaintingConfig[] = WALL_PAINTING_CONFIGS
): WallPaintingsBuild {
  const group = new Group();
  group.name = 'WallPaintings';
  const disposableTextures: Texture[] = [];
  const disposableMaterials: Material[] = [];
  const disposableGeometries: Array<BoxGeometry | PlaneGeometry> = [];

  configs.forEach((config) => {
    const texture = loader.load(config.imagePath);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    disposableTextures.push(texture);

    const painting = createPaintingMesh(config, texture, {
      disposableMaterials,
      disposableGeometries,
    });
    group.add(painting);
  });

  return {
    group,
    dispose() {
      disposableTextures.forEach((texture) => texture.dispose());
      disposableMaterials.forEach((material) => material.dispose());
      disposableGeometries.forEach((geometry) => geometry.dispose());
    },
  };
}

function createPaintingMesh(
  config: WallPaintingConfig,
  texture: Texture,
  disposables: {
    disposableMaterials: Material[];
    disposableGeometries: Array<BoxGeometry | PlaneGeometry>;
  }
): Group {
  const { width, height } = config.size;
  const { depth, matBorder, thickness } = config.frameVariant;
  const fullWidth = width + matBorder * 2 + thickness * 2;
  const fullHeight = height + matBorder * 2 + thickness * 2;
  const painting = new Group();
  painting.name = `WallPainting:${config.id}`;
  painting.userData = {
    floor: config.floor,
    roomId: config.roomId,
    wallOrientation: config.wallOrientation,
    imagePath: config.imagePath,
    label: config.label,
  };
  painting.position.set(
    config.position.x,
    config.position.y,
    config.position.z
  );
  if (config.wallOrientation === 'west') {
    painting.rotation.y = Math.PI / 2;
  }

  const frameMaterial = new MeshStandardMaterial({
    color: config.frameVariant.frameColor,
    roughness: 0.62,
    metalness: 0.08,
  });
  const matMaterial = new MeshStandardMaterial({
    color: new Color(config.frameVariant.matColor),
    roughness: 0.86,
    metalness: 0.02,
  });
  const backingMaterial = new MeshStandardMaterial({
    color: config.frameVariant.backingColor ?? 0x273142,
    roughness: 0.78,
  });
  const imageMaterial = new MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  disposables.disposableMaterials.push(
    frameMaterial,
    matMaterial,
    backingMaterial,
    imageMaterial
  );

  addPanel(
    painting,
    `${config.id}:backing`,
    fullWidth,
    fullHeight,
    depth * 0.55,
    backingMaterial,
    [0, 0, -depth * 0.1],
    disposables.disposableGeometries
  );
  addPanel(
    painting,
    `${config.id}:mat`,
    width + matBorder * 2,
    height + matBorder * 2,
    depth * 0.28,
    matMaterial,
    [0, 0, depth * 0.12],
    disposables.disposableGeometries
  );

  const railOffsetX = width / 2 + matBorder + thickness / 2;
  const railOffsetY = height / 2 + matBorder + thickness / 2;
  addPanel(
    painting,
    `${config.id}:frameLeft`,
    thickness,
    fullHeight,
    depth,
    frameMaterial,
    [-railOffsetX, 0, depth * 0.2],
    disposables.disposableGeometries
  );
  addPanel(
    painting,
    `${config.id}:frameRight`,
    thickness,
    fullHeight,
    depth,
    frameMaterial,
    [railOffsetX, 0, depth * 0.2],
    disposables.disposableGeometries
  );
  addPanel(
    painting,
    `${config.id}:frameTop`,
    fullWidth,
    thickness,
    depth,
    frameMaterial,
    [0, railOffsetY, depth * 0.2],
    disposables.disposableGeometries
  );
  addPanel(
    painting,
    `${config.id}:frameBottom`,
    fullWidth,
    thickness,
    depth,
    frameMaterial,
    [0, -railOffsetY, depth * 0.2],
    disposables.disposableGeometries
  );

  const imageGeometry = new PlaneGeometry(width, height);
  const image = new Mesh(imageGeometry, imageMaterial);
  image.name = `WallPainting:${config.id}:image`;
  image.position.z = depth * 0.72;
  painting.add(image);
  disposables.disposableGeometries.push(imageGeometry);

  return painting;
}

function addPanel(
  group: Group,
  name: string,
  width: number,
  height: number,
  depth: number,
  material: MeshStandardMaterial,
  position: [number, number, number],
  disposableGeometries: Array<BoxGeometry | PlaneGeometry>
): void {
  const geometry = new BoxGeometry(width, height, depth);
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  group.add(mesh);
  disposableGeometries.push(geometry);
}
