import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  LineCurve3,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { SCENE_DETAIL_LEVELS } from '../graphics/sceneDetailPolicy';
import type {
  MiniaturePart,
  MiniatureProxyDefinition,
  MiniatureBuildOptions,
} from './types';

const materials = new Map<string, MeshBasicMaterial>();
function material(role: string, color = 0xdddddd) {
  const key = `${role}:${color}`;
  const cached = materials.get(key);
  if (cached) return cached;
  const mat = new MeshBasicMaterial({ color });
  mat.name = `miniature-material-${role}`;
  materials.set(key, mat);
  return mat;
}

function included(part: MiniaturePart, level: string) {
  const i = SCENE_DETAIL_LEVELS.indexOf(level as never);
  const min = part.minDetail ? SCENE_DETAIL_LEVELS.indexOf(part.minDetail) : 0;
  const max = part.maxDetail
    ? SCENE_DETAIL_LEVELS.indexOf(part.maxDetail)
    : SCENE_DETAIL_LEVELS.length - 1;
  return i >= min && i <= max;
}

function geometry(part: MiniaturePart, seg: number): BufferGeometry {
  switch (part.kind) {
    case 'box':
      return new BoxGeometry(...(part.size ?? [1, 1, 1]));
    case 'plane':
      return new PlaneGeometry(
        part.size?.[0] ?? 1,
        part.size?.[2] ?? part.size?.[1] ?? 1
      );
    case 'cylinder':
      return new CylinderGeometry(
        part.radius ?? 0.2,
        part.radius ?? 0.2,
        part.height ?? 1,
        Math.max(3, seg)
      );
    case 'sphere':
      return new SphereGeometry(
        part.radius ?? 0.2,
        Math.max(4, seg),
        Math.max(3, Math.ceil(seg / 2))
      );
    case 'ring':
      return new RingGeometry(
        part.innerRadius ?? 0.2,
        part.outerRadius ?? 0.3,
        Math.max(3, seg)
      );
    case 'tube': {
      const pts = (
        part.points ?? [
          [0, 0, 0],
          [0, 0, 1],
        ]
      ).map((p) => new Vector3(...p));
      return new TubeGeometry(
        new LineCurve3(pts[0], pts[pts.length - 1]),
        Math.max(1, Math.floor(seg / 2)),
        part.radius ?? 0.025,
        Math.max(3, Math.floor(seg / 2)),
        false
      );
    }
  }
}

export function buildMiniatureProxy(
  definition: MiniatureProxyDefinition,
  options: MiniatureBuildOptions
): Group {
  const group = new Group();
  group.name = `miniature-poi-${definition.id}`;
  group.userData.miniatureProxyId = definition.id;
  group.userData.recursionBoundary = definition.recursionBoundary === true;
  const level = options.detailPolicy.level;
  const seg = Math.max(
    3,
    Math.round(48 * options.detailPolicy.modelDetailScale)
  );
  for (const part of definition.parts) {
    if (!included(part, level)) continue;
    const count = part.repeat?.count ?? 1;
    for (let index = 0; index < count; index += 1) {
      const mesh = new Mesh(
        geometry(part, seg),
        material(part.material, Number(part.color ?? 0xdddddd))
      );
      mesh.name = count > 1 ? `${part.name}-${index + 1}` : part.name;
      const p = part.position ?? [0, 0, 0];
      const o = part.repeat?.offset ?? [0, 0, 0];
      mesh.position.set(
        p[0] + o[0] * index,
        p[1] + o[1] * index,
        p[2] + o[2] * index
      );
      if (part.rotation) mesh.rotation.set(...part.rotation);
      group.add(mesh);
    }
  }
  return group;
}
