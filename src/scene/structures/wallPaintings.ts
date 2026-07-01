import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
} from 'three';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  GROUND_FLOOR_TOP_ELEVATION,
  UPPER_FLOOR_TOP_ELEVATION,
} from '../level/floorElevations';

export type WallPaintingFloor = 'ground' | 'upper';
export type WallPaintingOrientation = 'north' | 'west';

type WallPaintingVariant =
  | 'walnut'
  | 'brass'
  | 'graphite'
  | 'maple'
  | 'navy'
  | 'copper';

export interface WallPaintingConfig {
  readonly name: string;
  readonly imagePath: string;
  readonly floor: WallPaintingFloor;
  readonly roomId: string;
  readonly wall: WallPaintingOrientation;
  readonly position: { readonly x: number; readonly z: number };
  readonly width: number;
  readonly variant: WallPaintingVariant;
}

interface WallPaintingVariantStyle {
  readonly frameColor: number;
  readonly matColor: number;
  readonly backingColor: number;
  readonly thickness: number;
  readonly depth: number;
  readonly matBorder: number;
  readonly heightScale: number;
  readonly metalness: number;
}

export interface WallPaintingsBuild {
  readonly group: Group;
  dispose(): void;
}

const toWorld = (value: number): number => value * FLOOR_PLAN_SCALE;

const VARIANT_STYLES: Record<WallPaintingVariant, WallPaintingVariantStyle> = {
  walnut: {
    frameColor: 0x4b2d1f,
    matColor: 0xe5decf,
    backingColor: 0x1f2937,
    thickness: 0.16,
    depth: 0.16,
    matBorder: 0.18,
    heightScale: 1,
    metalness: 0.08,
  },
  brass: {
    frameColor: 0xb48636,
    matColor: 0xf1e8d2,
    backingColor: 0x2a3142,
    thickness: 0.12,
    depth: 0.14,
    matBorder: 0.24,
    heightScale: 0.94,
    metalness: 0.38,
  },
  graphite: {
    frameColor: 0x202734,
    matColor: 0xd8e1e8,
    backingColor: 0x111827,
    thickness: 0.2,
    depth: 0.2,
    matBorder: 0.14,
    heightScale: 1.08,
    metalness: 0.18,
  },
  maple: {
    frameColor: 0xc4915d,
    matColor: 0xf4ead9,
    backingColor: 0x334155,
    thickness: 0.14,
    depth: 0.13,
    matBorder: 0.2,
    heightScale: 1.02,
    metalness: 0.04,
  },
  navy: {
    frameColor: 0x1d3557,
    matColor: 0xe6edf3,
    backingColor: 0x172033,
    thickness: 0.18,
    depth: 0.18,
    matBorder: 0.16,
    heightScale: 0.9,
    metalness: 0.14,
  },
  copper: {
    frameColor: 0xa45f3f,
    matColor: 0xeee2d1,
    backingColor: 0x273142,
    thickness: 0.13,
    depth: 0.17,
    matBorder: 0.22,
    heightScale: 1.12,
    metalness: 0.28,
  },
};

export const WALL_PAINTING_CONFIGS: WallPaintingConfig[] = [
  {
    name: 'Rocket Nosecone Painting',
    imagePath: '/images/3dprinted_rocket_nosecone.jpg',
    floor: 'ground',
    roomId: 'livingRoom',
    wall: 'north',
    position: { x: toWorld(1.6), z: toWorld(-4) },
    width: 1.35,
    variant: 'walnut',
  },
  {
    name: '3D Printer Painting',
    imagePath: '/images/3dprinter.jpg',
    floor: 'ground',
    roomId: 'kitchen',
    wall: 'west',
    position: { x: toWorld(-16), z: toWorld(1.8) },
    width: 1.2,
    variant: 'brass',
  },
  {
    name: 'Democratized Space Painting',
    imagePath: '/images/democratizedspace.jpg',
    floor: 'ground',
    roomId: 'studio',
    wall: 'north',
    position: { x: toWorld(11.7), z: toWorld(8) },
    width: 1.28,
    variant: 'graphite',
  },
  {
    name: 'Hydroponic Lamp Painting',
    imagePath: '/images/hydroponic_lamp.jpg',
    floor: 'upper',
    roomId: 'creatorsStudio',
    wall: 'west',
    position: { x: toWorld(-10), z: toWorld(-6.7) },
    width: 1.22,
    variant: 'maple',
  },
  {
    name: 'Hypercar Grassy Painting',
    imagePath: '/images/hypercar_grassy.jpg',
    floor: 'upper',
    roomId: 'loftLibrary',
    wall: 'north',
    position: { x: toWorld(9.8), z: toWorld(6) },
    width: 1.32,
    variant: 'navy',
  },
  {
    name: 'Launch Painting',
    imagePath: '/images/launch.jpg',
    floor: 'upper',
    roomId: 'focusPods',
    wall: 'west',
    position: { x: toWorld(-10), z: toWorld(11.2) },
    width: 1.25,
    variant: 'copper',
  },
];

export function createWallPaintings(
  floor?: WallPaintingFloor
): WallPaintingsBuild {
  const group = new Group();
  group.name = 'WallPaintings';

  const textureLoader = new TextureLoader();
  const ownedGeometries = new Set<BoxGeometry | PlaneGeometry>();
  const ownedMaterials = new Set<MeshBasicMaterial | MeshStandardMaterial>();
  const imageMaterials: MeshBasicMaterial[] = [];

  WALL_PAINTING_CONFIGS.filter(
    (config) => !floor || config.floor === floor
  ).forEach((config) => {
    const style = VARIANT_STYLES[config.variant];
    const painting = createPainting(config, style, textureLoader);
    painting.traverse((object) => {
      if (object instanceof Mesh) {
        ownedGeometries.add(object.geometry as BoxGeometry | PlaneGeometry);
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (
            material instanceof MeshBasicMaterial ||
            material instanceof MeshStandardMaterial
          ) {
            ownedMaterials.add(material);
            if (material instanceof MeshBasicMaterial)
              imageMaterials.push(material);
          }
        });
      }
    });
    group.add(painting);
  });

  return {
    group,
    dispose() {
      imageMaterials.forEach((material) => material.map?.dispose());
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
    },
  };
}

function createPainting(
  config: WallPaintingConfig,
  style: WallPaintingVariantStyle,
  textureLoader: TextureLoader
): Group {
  const root = new Group();
  root.name = config.name;
  root.userData.floor = config.floor;
  root.userData.roomId = config.roomId;
  root.userData.wall = config.wall;

  const width = config.width;
  const height = width * style.heightScale;
  const matWidth = width + style.matBorder * 2;
  const matHeight = height + style.matBorder * 2;
  const outerWidth = matWidth + style.thickness * 2;
  const outerHeight = matHeight + style.thickness * 2;

  const backing = new Mesh(
    new BoxGeometry(outerWidth, outerHeight, style.depth),
    new MeshStandardMaterial({
      color: style.backingColor,
      roughness: 0.72,
      metalness: 0.05,
    })
  );
  backing.name = `${config.name} Backing`;
  backing.position.z = -style.depth / 2;
  root.add(backing);

  const mat = new Mesh(
    new BoxGeometry(matWidth, matHeight, style.depth * 0.38),
    new MeshStandardMaterial({
      color: style.matColor,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  mat.name = `${config.name} Mat`;
  mat.position.z = 0.015;
  root.add(mat);

  const texture = textureLoader.load(config.imagePath);
  texture.colorSpace = SRGBColorSpace;
  const image = new Mesh(
    new PlaneGeometry(width, height),
    new MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  image.name = `${config.name} Image`;
  image.position.z = 0.04;
  root.add(image);

  const frameMaterial = new MeshStandardMaterial({
    color: new Color(style.frameColor),
    roughness: 0.48,
    metalness: style.metalness,
  });
  const horizontalFrame = new BoxGeometry(
    outerWidth,
    style.thickness,
    style.depth * 1.25
  );
  const verticalFrame = new BoxGeometry(
    style.thickness,
    outerHeight,
    style.depth * 1.25
  );
  const top = new Mesh(horizontalFrame, frameMaterial);
  top.name = `${config.name} Top Frame`;
  top.position.set(0, outerHeight / 2 - style.thickness / 2, 0.035);
  root.add(top);
  const bottom = new Mesh(horizontalFrame.clone(), frameMaterial);
  bottom.name = `${config.name} Bottom Frame`;
  bottom.position.set(0, -outerHeight / 2 + style.thickness / 2, 0.035);
  root.add(bottom);
  const left = new Mesh(verticalFrame, frameMaterial);
  left.name = `${config.name} Left Frame`;
  left.position.set(-outerWidth / 2 + style.thickness / 2, 0, 0.035);
  root.add(left);
  const right = new Mesh(verticalFrame.clone(), frameMaterial);
  right.name = `${config.name} Right Frame`;
  right.position.set(outerWidth / 2 - style.thickness / 2, 0, 0.035);
  root.add(right);

  root.position.set(
    config.position.x,
    getMountHeight(config.floor),
    config.position.z
  );
  if (config.wall === 'north') {
    root.position.z -= 0.31;
  } else {
    root.position.x += 0.31;
    root.rotation.y = Math.PI / 2;
  }

  return root;
}

function getMountHeight(floor: WallPaintingFloor): number {
  const baseElevation =
    floor === 'upper' ? UPPER_FLOOR_TOP_ELEVATION : GROUND_FLOOR_TOP_ELEVATION;
  return baseElevation + 3.45;
}
