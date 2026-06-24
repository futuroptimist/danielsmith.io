import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  LineCurve3,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';

import {
  getSceneDetailPolicy,
  SCENE_DETAIL_LEVELS,
  type SceneDetailLevel,
} from '../graphics/sceneDetailPolicy';
import { countObjectTriangles } from '../structures/triangleCount';

import type {
  MiniatureBuiltProxy,
  MiniaturePrimitive,
  MiniatureProxyDefinition,
} from './types';

const materialColors = {
  base: 0x64748b,
  accent: 0x38bdf8,
  screen: 0x0f172a,
  glass: 0x93c5fd,
  wood: 0x8b5a2b,
  metal: 0x94a3b8,
  plant: 0x22c55e,
  warning: 0xfacc15,
  white: 0xf8fafc,
} as const;
const materials = new Map<string, MeshStandardMaterial>();
function material(part: MiniaturePrimitive) {
  const color = part.color ?? materialColors[part.material ?? 'base'];
  const key = `${part.material ?? 'base'}:${color}`;
  let cached = materials.get(key);
  if (!cached) {
    cached = new MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: part.material === 'metal' ? 0.25 : 0,
    });
    materials.set(key, cached);
  }
  return cached;
}
function allowed(part: MiniaturePrimitive, level: SceneDetailLevel) {
  const index = SCENE_DETAIL_LEVELS.indexOf(level);
  const from = part.includeFrom
    ? SCENE_DETAIL_LEVELS.indexOf(part.includeFrom)
    : 0;
  const until = part.includeUntil
    ? SCENE_DETAIL_LEVELS.indexOf(part.includeUntil)
    : SCENE_DETAIL_LEVELS.length - 1;
  return index >= from && index <= until;
}
function geometry(
  part: MiniaturePrimitive,
  level: SceneDetailLevel
): BufferGeometry {
  const p = getSceneDetailPolicy(level);
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
        part.radius ?? 0.25,
        part.radius ?? 0.25,
        part.height ?? 1,
        p.geometry.cylinderSegments
      );
    case 'sphere':
      return new SphereGeometry(
        part.radius ?? 0.25,
        p.geometry.sphereWidthSegments,
        p.geometry.sphereHeightSegments
      );
    case 'ring':
      return new RingGeometry(
        part.innerRadius ?? 0.2,
        part.outerRadius ?? 0.3,
        p.geometry.ringSegments
      );
    case 'tube': {
      const pts = part.points ?? [
        [0, 0, 0],
        [0, 0.1, 0.5],
      ];
      return new TubeGeometry(
        new LineCurve3(
          new Vector3(...pts[0]),
          new Vector3(...pts[pts.length - 1])
        ),
        1,
        part.radius ?? 0.03,
        p.geometry.cylinderSegments
      );
    }
  }
}
export function buildMiniatureProxy(
  definition: MiniatureProxyDefinition,
  options: { detailLevel: SceneDetailLevel }
): MiniatureBuiltProxy {
  const root = new Group();
  root.name = definition.semanticName;
  for (const part of definition.parts) {
    if (!allowed(part, options.detailLevel)) continue;
    const count = part.repeat?.count ?? 1;
    for (let i = 0; i < count; i += 1) {
      const mesh = new Mesh(
        geometry(part, options.detailLevel),
        material(part)
      );
      mesh.name = count > 1 ? `${part.name}-${i}` : part.name;
      const pos = part.position ?? [0, 0, 0];
      const off = part.repeat?.offset ?? [0, 0, 0];
      mesh.position.set(
        pos[0] + off[0] * i,
        pos[1] + off[1] * i,
        pos[2] + off[2] * i
      );
      if (part.rotation) mesh.rotation.set(...part.rotation);
      if (part.scale) mesh.scale.set(...part.scale);
      root.add(mesh);
    }
  }
  return {
    root,
    detailBearingTriangles: countObjectTriangles(root),
    structuralBaselineTriangles: 0,
  };
}
