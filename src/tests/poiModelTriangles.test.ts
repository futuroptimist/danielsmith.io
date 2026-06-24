import {
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedMesh,
  Line,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { describe, expect, it } from 'vitest';

import { countPoiModelTriangles } from '../scene/poi/modelTriangles';

const material = new MeshBasicMaterial();

function nonIndexedGeometry(vertexCount: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(vertexCount * 3), 3)
  );
  return geometry;
}

function indexedGeometry(indexCount: number): BufferGeometry {
  const geometry = nonIndexedGeometry(indexCount);
  geometry.setIndex(Array.from({ length: indexCount }, (_, index) => index));
  return geometry;
}

describe('countPoiModelTriangles', () => {
  it('counts indexed mesh triangles from index count', () => {
    expect(
      countPoiModelTriangles([new Mesh(indexedGeometry(6), material)])
    ).toBe(2);
  });

  it('counts non-indexed mesh triangles from position count', () => {
    expect(
      countPoiModelTriangles([new Mesh(nonIndexedGeometry(9), material)])
    ).toBe(3);
  });

  it('multiplies instanced mesh triangles by active instance count', () => {
    const mesh = new InstancedMesh(indexedGeometry(6), material, 5);
    mesh.count = 3;
    expect(countPoiModelTriangles([mesh])).toBe(6);
  });

  it('skips hidden descendants', () => {
    const group = new Group();
    const visible = new Mesh(nonIndexedGeometry(3), material);
    const hidden = new Mesh(nonIndexedGeometry(6), material);
    hidden.visible = false;
    group.add(visible, hidden);
    expect(countPoiModelTriangles([group])).toBe(1);
  });

  it('ignores malformed geometry safely', () => {
    expect(
      countPoiModelTriangles([new Mesh(new BufferGeometry(), material)])
    ).toBe(0);
  });

  it('counts separate meshes that share geometry', () => {
    const geometry = nonIndexedGeometry(3);
    const group = new Group();
    group.add(new Mesh(geometry, material), new Mesh(geometry, material));
    expect(countPoiModelTriangles([group])).toBe(2);
  });

  it('does not double-count overlapping registered roots', () => {
    const group = new Group();
    const mesh = new Mesh(nonIndexedGeometry(6), material);
    group.add(mesh);
    expect(countPoiModelTriangles([group, mesh])).toBe(2);
  });

  it('respects finite draw ranges and ignores non-mesh objects', () => {
    const geometry = nonIndexedGeometry(12);
    geometry.setDrawRange(3, 6);
    const group = new Group();
    group.add(new Line(nonIndexedGeometry(6), material), new Object3D());
    group.add(new Mesh(geometry, material));
    expect(countPoiModelTriangles([group])).toBe(2);
  });
});
