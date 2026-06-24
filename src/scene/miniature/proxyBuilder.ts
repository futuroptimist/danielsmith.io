import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';

import {
  SCENE_DETAIL_LEVELS,
  type SceneDetailLevel,
} from '../graphics/sceneDetailPolicy';

import type {
  MiniatureBuildContext,
  MiniatureMaterialRole,
  MiniaturePrimitive,
  MiniatureProxyBuildResult,
  MiniatureProxyDefinition,
} from './types';

const roleColors: Record<MiniatureMaterialRole, number> = {
  base: 0x5f6f7a,
  accent: 0x49d7ff,
  screen: 0x102040,
  metal: 0x9aa0a6,
  glass: 0x8fe8ff,
  plant: 0x3baa63,
  cable: 0x151923,
  warning: 0xffd447,
  white: 0xf8f5ee,
};

const materialCache = new Map<string, MeshStandardMaterial>();

function detailIndex(level: SceneDetailLevel) {
  return SCENE_DETAIL_LEVELS.indexOf(level);
}

function includesPrimitive(
  primitive: MiniaturePrimitive,
  level: SceneDetailLevel
) {
  const index = detailIndex(level);
  const min = primitive.minDetail ? detailIndex(primitive.minDetail) : 0;
  const max = primitive.maxDetail
    ? detailIndex(primitive.maxDetail)
    : SCENE_DETAIL_LEVELS.length - 1;
  return index >= min && index <= max;
}

function materialFor(role: MiniatureMaterialRole, color?: number) {
  const actual = color ?? roleColors[role];
  const key = `${role}:${actual}`;
  let material = materialCache.get(key);
  if (!material) {
    material = new MeshStandardMaterial({
      color: new Color(actual),
      roughness: role === 'screen' || role === 'glass' ? 0.36 : 0.72,
      metalness: role === 'metal' ? 0.55 : 0.05,
      ...(role === 'screen' || role === 'glass' ? { side: DoubleSide } : {}),
    });
    materialCache.set(key, material);
  }
  return material;
}

function geometryFor(
  primitive: MiniaturePrimitive,
  context: MiniatureBuildContext
): BufferGeometry {
  const g = context.detailPolicy.geometry;
  switch (primitive.kind) {
    case 'box': {
      const [x, y, z] = primitive.size ?? [1, 1, 1];
      return new BoxGeometry(x, y, z);
    }
    case 'plane': {
      const [x, , z] = primitive.size ?? [1, 0, 1];
      return new PlaneGeometry(x, z);
    }
    case 'cylinder':
      return new CylinderGeometry(
        primitive.radius ?? 0.5,
        primitive.radius ?? 0.5,
        primitive.height ?? 1,
        Math.max(3, g.cylinderSegments)
      );
    case 'sphere':
      return new SphereGeometry(
        primitive.radius ?? 0.5,
        Math.max(3, g.sphereWidthSegments),
        Math.max(2, g.sphereHeightSegments)
      );
    case 'ring':
      return new RingGeometry(
        Math.max(
          0.01,
          (primitive.radius ?? 0.5) - (primitive.tubeRadius ?? 0.04)
        ),
        primitive.radius ?? 0.5,
        Math.max(3, g.ringSegments)
      );
    case 'tube': {
      const points = (
        primitive.points ?? [
          [0, 0, 0],
          [0, 0, 1],
        ]
      ).map(([x, y, z]) => new Vector3(x, y, z));
      return new TubeGeometry(
        new CatmullRomCurve3(points),
        Math.max(1, g.torusTubularSegments),
        primitive.tubeRadius ?? 0.025,
        Math.max(3, g.torusRadialSegments),
        false
      );
    }
  }
}

function applyTransform(
  mesh: Mesh,
  primitive: MiniaturePrimitive,
  offset: readonly [number, number, number]
) {
  const [x, y, z] = primitive.position ?? [0, 0, 0];
  mesh.position.set(x + offset[0], y + offset[1], z + offset[2]);
  const [rx, ry, rz] = primitive.rotation ?? [0, 0, 0];
  mesh.rotation.set(rx, ry, rz);
  const [sx, sy, sz] = primitive.scale ?? [1, 1, 1];
  mesh.scale.set(sx, sy, sz);
}

export function buildMiniatureProxy(
  definition: MiniatureProxyDefinition,
  context: MiniatureBuildContext
): MiniatureProxyBuildResult {
  const root = new Group();
  root.name = `MiniatureProxy:${definition.id}`;
  const semanticNames: string[] = [];

  for (const primitive of definition.primitives) {
    if (!includesPrimitive(primitive, context.detailLevel)) continue;
    const count = primitive.repeat?.count ?? 1;
    const repeatOffset = primitive.repeat?.offset ?? [0, 0, 0];
    for (let index = 0; index < count; index += 1) {
      const geometry = geometryFor(primitive, context);
      const mesh = new Mesh(
        geometry,
        materialFor(primitive.material, primitive.color)
      );
      mesh.name = primitive.repeat?.namePrefix
        ? `${primitive.repeat.namePrefix}-${index + 1}`
        : primitive.name;
      applyTransform(mesh, primitive, [
        repeatOffset[0] * index,
        repeatOffset[1] * index,
        repeatOffset[2] * index,
      ]);
      root.add(mesh);
      semanticNames.push(mesh.name);
    }
  }

  return { root, semanticNames };
}
