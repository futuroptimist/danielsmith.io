import {
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';

import { countPoiModelTriangles } from '../scene/poi/modelTriangles';

const material = new MeshBasicMaterial();

const indexedGeometry = () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
      3
    )
  );
  geometry.setIndex([0, 1, 2, 1, 3, 2]);
  return geometry;
};

const nonIndexedGeometry = (vertices: number) => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(vertices * 3), 3)
  );
  return geometry;
};

describe('countPoiModelTriangles', () => {
  it('counts indexed and non-indexed mesh geometry', () => {
    expect(
      countPoiModelTriangles([new Mesh(indexedGeometry(), material)])
    ).toBe(2);
    expect(
      countPoiModelTriangles([new Mesh(nonIndexedGeometry(9), material)])
    ).toBe(3);
  });

  it('respects finite draw ranges', () => {
    const geometry = indexedGeometry();
    geometry.setDrawRange(3, 3);
    expect(countPoiModelTriangles([new Mesh(geometry, material)])).toBe(1);
  });

  it('multiplies instanced mesh geometry by active instance count', () => {
    const mesh = new InstancedMesh(indexedGeometry(), material, 5);
    mesh.count = 3;
    expect(countPoiModelTriangles([mesh])).toBe(6);
  });

  it('ignores hidden descendants and non-mesh renderables', () => {
    const group = new Group();
    const hidden = new Mesh(indexedGeometry(), material);
    hidden.visible = false;
    group.add(hidden);
    group.add(new Line(indexedGeometry(), new LineBasicMaterial()));
    group.add(new Points(indexedGeometry(), new PointsMaterial()));
    expect(countPoiModelTriangles([group])).toBe(0);
  });

  it('handles malformed geometry safely', () => {
    expect(
      countPoiModelTriangles([new Mesh(new BufferGeometry(), material)])
    ).toBe(0);
  });

  it('counts separate meshes sharing geometry and avoids overlapping-root double counts', () => {
    const geometry = indexedGeometry();
    const parent = new Group();
    const first = new Mesh(geometry, material);
    const second = new Mesh(geometry, material);
    parent.add(first, second);
    expect(countPoiModelTriangles([parent])).toBe(4);
    expect(countPoiModelTriangles([parent, first])).toBe(4);
  });
});
