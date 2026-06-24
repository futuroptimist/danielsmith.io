import {
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedMesh,
  Line,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';

import { countPoiModelTriangles } from '../scene/poi/modelTriangles';

const triangleGeometry = () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
  );
  return geometry;
};

describe('countPoiModelTriangles', () => {
  it('counts indexed geometry from the index count', () => {
    const geometry = triangleGeometry();
    geometry.setIndex([0, 1, 2, 2, 1, 0]);
    expect(countPoiModelTriangles([new Mesh(geometry)])).toBe(2);
  });

  it('counts non-indexed geometry from the position attribute count', () => {
    expect(countPoiModelTriangles([new Mesh(triangleGeometry())])).toBe(1);
  });

  it('multiplies instanced mesh geometry by active instance count', () => {
    const mesh = new InstancedMesh(
      triangleGeometry(),
      new MeshBasicMaterial(),
      4
    );
    mesh.count = 3;
    expect(countPoiModelTriangles([mesh])).toBe(3);
  });

  it('ignores hidden descendants', () => {
    const group = new Group();
    const mesh = new Mesh(triangleGeometry());
    mesh.visible = false;
    group.add(mesh);
    expect(countPoiModelTriangles([group])).toBe(0);
  });

  it('ignores malformed and non-mesh geometry safely', () => {
    const group = new Group();
    group.add(new Mesh(new BufferGeometry()));
    group.add(new Line(triangleGeometry()));
    expect(countPoiModelTriangles([group])).toBe(0);
  });

  it('counts separate meshes sharing a geometry as separate rendered instances', () => {
    const geometry = triangleGeometry();
    expect(
      countPoiModelTriangles([new Mesh(geometry), new Mesh(geometry)])
    ).toBe(2);
  });

  it('avoids double-counting overlapping registered roots', () => {
    const group = new Group();
    const mesh = new Mesh(triangleGeometry());
    group.add(mesh);
    expect(countPoiModelTriangles([group, mesh])).toBe(1);
  });

  it('respects finite draw ranges', () => {
    const geometry = triangleGeometry();
    geometry.setIndex([0, 1, 2, 2, 1, 0]);
    geometry.setDrawRange(0, 3);
    expect(countPoiModelTriangles([new Mesh(geometry)])).toBe(1);
  });
});
