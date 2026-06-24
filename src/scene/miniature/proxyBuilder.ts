import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';

import {
  ORDERED_SCENE_DETAIL_LEVELS,
  type SceneDetailLevel,
  type SceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';

import type {
  MiniatureBuildResult,
  MiniaturePrimitiveDefinition,
  MiniatureProxyDefinition,
} from './types';

const geometryCache = new Map<string, BufferGeometry>();
const materialCache = new Map<string, MeshBasicMaterial>();

export function clearMiniatureProxyCache() {
  geometryCache.forEach((geometry) => geometry.dispose());
  materialCache.forEach((material) => material.dispose());
  geometryCache.clear();
  materialCache.clear();
}

function detailIndex(level: SceneDetailLevel) {
  return ORDERED_SCENE_DETAIL_LEVELS.indexOf(level);
}

function isIncluded(
  primitive: MiniaturePrimitiveDefinition,
  level: SceneDetailLevel
) {
  const index = detailIndex(level);
  const min = primitive.minDetail ? detailIndex(primitive.minDetail) : 0;
  const max = primitive.maxDetail
    ? detailIndex(primitive.maxDetail)
    : ORDERED_SCENE_DETAIL_LEVELS.length - 1;
  return index >= min && index <= max;
}

function materialFor(primitive: MiniaturePrimitiveDefinition) {
  const color = primitive.color ?? 0x94a3b8;
  const key = `${primitive.role ?? 'base'}:${color}`;
  let material = materialCache.get(key);
  if (!material) {
    material = new MeshBasicMaterial({ color, side: DoubleSide });
    material.name = `miniature-material:${key}`;
    materialCache.set(key, material);
  }
  return material;
}

function geometryFor(
  primitive: MiniaturePrimitiveDefinition,
  policy: SceneDetailPolicy
) {
  const key = JSON.stringify([
    primitive.kind,
    primitive.size,
    primitive.radius,
    primitive.height,
    primitive.tube,
    primitive.points,
    policy.level,
  ]);
  const cached = geometryCache.get(key);
  if (cached) return cached;
  let geometry: BufferGeometry;
  switch (primitive.kind) {
    case 'box': {
      const [x, y, z] = primitive.size ?? [1, 1, 1];
      geometry = new BoxGeometry(x, y, z);
      break;
    }
    case 'plane': {
      const [x, , z] = primitive.size ?? [1, 0, 1];
      geometry = new PlaneGeometry(x, z);
      break;
    }
    case 'cylinder':
      geometry = new CylinderGeometry(
        primitive.radius ?? 0.5,
        primitive.radius ?? 0.5,
        primitive.height ?? 1,
        policy.geometry.cylinderSegments
      );
      break;
    case 'sphere':
      geometry = new SphereGeometry(
        primitive.radius ?? 0.5,
        policy.geometry.sphereWidthSegments,
        policy.geometry.sphereHeightSegments
      );
      break;
    case 'ring':
      geometry = new RingGeometry(
        Math.max(0.01, (primitive.radius ?? 0.5) - (primitive.tube ?? 0.05)),
        primitive.radius ?? 0.5,
        policy.geometry.ringSegments
      );
      break;
    case 'tube': {
      const points = primitive.points ?? [
        [0, 0, 0],
        [0, 0, 1],
      ];
      const curve = new CatmullRomCurve3(
        points.map(([x, y, z]) => new Vector3(x, y, z))
      );
      geometry = new TubeGeometry(
        curve,
        policy.geometry.tubeTubularSegments,
        primitive.radius ?? 0.03,
        policy.geometry.tubeRadialSegments
      );
      break;
    }
  }
  geometry.name = `miniature-geometry:${primitive.name}`;
  geometryCache.set(key, geometry);
  return geometry;
}

function applyTransform(mesh: Mesh, primitive: MiniaturePrimitiveDefinition) {
  const [x, y, z] = primitive.position ?? [0, 0, 0];
  mesh.position.set(x, y, z);
  const [rx, ry, rz] = primitive.rotation ?? [0, 0, 0];
  mesh.rotation.set(rx, ry, rz);
  const [sx, sy, sz] = primitive.scale ?? [1, 1, 1];
  mesh.scale.set(sx, sy, sz);
}

export function buildMiniatureProxy(
  definition: MiniatureProxyDefinition,
  detailPolicy: SceneDetailPolicy
): MiniatureBuildResult {
  const root = new Group();
  root.name = `miniature-proxy:${definition.id}`;
  root.userData.miniatureProxy = true;
  root.userData.syncRevision = definition.syncRevision;
  const semanticNames: string[] = [];
  for (const primitive of definition.primitives) {
    if (!isIncluded(primitive, detailPolicy.level)) continue;
    const repeats = primitive.repeats?.length ? primitive.repeats : [{}];
    repeats.forEach((repeat, index) => {
      const merged = { ...primitive, ...repeat };
      const mesh = new Mesh(
        geometryFor(merged, detailPolicy),
        materialFor(merged)
      );
      mesh.name =
        repeats.length > 1 ? `${primitive.name}:${index}` : primitive.name;
      mesh.userData.semanticName = primitive.name;
      applyTransform(mesh, merged);
      root.add(mesh);
      semanticNames.push(mesh.name);
    });
  }
  return { root, semanticNames };
}
