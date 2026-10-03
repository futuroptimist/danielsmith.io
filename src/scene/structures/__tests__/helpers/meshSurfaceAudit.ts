import { BackSide, DoubleSide, Mesh, Vector2, Vector3 } from 'three';
import type { Material, Object3D } from 'three';

interface RenderedTriangle {
  mesh: Mesh;
  sourceId: string;
  material: Material;
  triangleIndex: number;
  vertices: [Vector3, Vector3, Vector3];
  normal: Vector3;
}

export interface MeshSurfaceOverlap {
  a: RenderedTriangle;
  b: RenderedTriangle;
  planeDistance: number;
  overlapArea: number;
}

interface MeshSurfaceAuditOptions {
  /** Maximum world-space distance between nearly coplanar triangles. */
  planeTolerance?: number;
  /** Maximum deviation of the dot product of unit surface normals from one. */
  normalTolerance?: number;
  /** Positive surface area, excluding seams and point contacts. */
  minOverlapArea?: number;
}

const cross = (a: Vector2, b: Vector2, c: Vector2) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const project = (point: Vector3, axis: 'x' | 'y' | 'z'): Vector2 => {
  if (axis === 'x') return new Vector2(point.y, point.z);
  if (axis === 'y') return new Vector2(point.z, point.x);
  return new Vector2(point.x, point.y);
};

/** Clip the actual triangles, rather than treating their bounds as solid faces. */
const intersectionArea = (a: RenderedTriangle, b: RenderedTriangle): number => {
  const axis = (['x', 'y', 'z'] as const).reduce((best, candidate) =>
    Math.abs(a.normal[candidate]) > Math.abs(a.normal[best]) ? candidate : best
  );
  let polygon = a.vertices.map((point) => project(point, axis));
  const clip = b.vertices.map((point) =>
    project(
      point
        .clone()
        .addScaledVector(
          a.normal,
          -a.normal.dot(point.clone().sub(a.vertices[0]))
        ),
      axis
    )
  );
  const winding = Math.sign(cross(clip[0], clip[1], clip[2]));
  for (let edge = 0; edge < 3 && polygon.length > 0; edge += 1) {
    const start = clip[edge];
    const end = clip[(edge + 1) % 3];
    const input = polygon;
    polygon = [];
    for (let index = 0; index < input.length; index += 1) {
      const previous = input[(index + input.length - 1) % input.length];
      const current = input[index];
      const previousDistance = winding * cross(start, end, previous);
      const currentDistance = winding * cross(start, end, current);
      const previousInside = previousDistance >= 0;
      const currentInside = currentDistance >= 0;
      if (previousInside !== currentInside) {
        polygon.push(
          previous
            .clone()
            .lerp(
              current,
              previousDistance / (previousDistance - currentDistance)
            )
        );
      }
      if (currentInside) polygon.push(current);
    }
  }
  if (polygon.length < 3) return 0;
  const twiceArea = polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(twiceArea) / (2 * Math.abs(a.normal[axis]));
};

const collectTriangles = (root: Object3D): RenderedTriangle[] => {
  const triangles: RenderedTriangle[] = [];
  root.updateWorldMatrix(true, true);
  let ancestor: Object3D | null = root;
  while (ancestor) {
    if (!ancestor.visible) return triangles;
    ancestor = ancestor.parent;
  }
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    // This audit is for static authored meshes, not GPU-instanced/deformed geometry.
    if ('isInstancedMesh' in object || 'isSkinnedMesh' in object) return;
    const geometry = object.geometry;
    const positions = geometry.getAttribute('position');
    if (!positions) return;
    const index = geometry.getIndex();
    const count = index?.count ?? positions.count;
    const start = geometry.drawRange.start;
    const end = Math.min(count, start + geometry.drawRange.count);
    for (let offset = start; offset + 2 < end; offset += 3) {
      const group = geometry.groups.find(
        (entry) =>
          offset >= entry.start && offset + 2 < entry.start + entry.count
      );
      const material = Array.isArray(object.material)
        ? group && object.material[group.materialIndex ?? 0]
        : object.material;
      if (
        !material ||
        !material.visible ||
        material.opacity <= 0 ||
        !material.depthTest ||
        !material.depthWrite
      )
        continue;
      const vertices = [0, 1, 2].map((corner) =>
        new Vector3()
          .fromBufferAttribute(
            positions,
            index?.getX(offset + corner) ?? offset + corner
          )
          .applyMatrix4(object.matrixWorld)
      ) as [Vector3, Vector3, Vector3];
      const normal = vertices[1]
        .clone()
        .sub(vertices[0])
        .cross(vertices[2].clone().sub(vertices[0]));
      if (normal.lengthSq() === 0) continue;
      normal.normalize();
      // Three.js reverses front-face winding for mirrored object transforms.
      if (object.matrixWorld.determinant() < 0) normal.negate();
      if (material.side === BackSide) normal.negate();
      triangles.push({
        mesh: object,
        sourceId: object.userData.levelSourceId ?? 'unattributed',
        material,
        triangleIndex: offset / 3,
        vertices,
        normal,
      });
    }
  });
  return triangles;
};

/**
 * Candidate detector for overlapping, equally facing, nearly coplanar static
 * mesh triangles. It respects transforms, material sides and visible ancestors.
 * It is not a renderer/depth-buffer simulation: occlusion, shader displacement,
 * polygon offset, camera distance and hardware precision still need visual QA.
 * Pass a focused scene assembly, not an unfiltered full production scene.
 */
export function findMeshSurfaceOverlaps(
  root: Object3D,
  options: MeshSurfaceAuditOptions = {}
): MeshSurfaceOverlap[] {
  const {
    planeTolerance = 0.0005,
    normalTolerance = 0.000001,
    minOverlapArea = 0.0001,
  } = options;
  const triangles = collectTriangles(root);
  const findings: MeshSurfaceOverlap[] = [];
  for (let i = 0; i < triangles.length; i += 1) {
    const a = triangles[i];
    for (let j = i + 1; j < triangles.length; j += 1) {
      const b = triangles[j];
      if (a.mesh === b.mesh || !a.mesh.layers.test(b.mesh.layers)) continue;
      const dot = a.normal.dot(b.normal);
      const canFaceTogether =
        dot >= 1 - normalTolerance ||
        ((a.material.side === DoubleSide || b.material.side === DoubleSide) &&
          dot <= -1 + normalTolerance);
      if (!canFaceTogether) continue;
      const planeDistance = Math.max(
        ...b.vertices.map((point) =>
          Math.abs(a.normal.dot(point.clone().sub(a.vertices[0])))
        ),
        ...a.vertices.map((point) =>
          Math.abs(b.normal.dot(point.clone().sub(b.vertices[0])))
        )
      );
      if (planeDistance > planeTolerance) continue;
      const overlapArea = intersectionArea(a, b);
      if (overlapArea >= minOverlapArea) {
        findings.push({ a, b, planeDistance, overlapArea });
      }
    }
  }
  return findings;
}

export const formatMeshSurfaceOverlaps = (
  findings: readonly MeshSurfaceOverlap[]
) =>
  findings
    .map(
      ({ a, b, planeDistance, overlapArea }) =>
        `${a.mesh.name} [${a.sourceId}] triangle ${a.triangleIndex} / ` +
        `${b.mesh.name} [${b.sourceId}] triangle ${b.triangleIndex}; ` +
        `plane gap=${planeDistance.toFixed(6)}; overlap area=${overlapArea.toFixed(6)}`
    )
    .join('\n');
