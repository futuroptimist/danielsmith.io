import {
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { describe, expect, it } from 'vitest';

import { countRenderedPoiModelTriangles } from '../scene/poi/modelTriangles';

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

describe('countRenderedPoiModelTriangles', () => {
  it('counts indexed mesh geometry from effective index counts', () => {
    expect(
      countRenderedPoiModelTriangles([new Mesh(indexedGeometry(6), material)])
    ).toBe(2);
  });

  it('counts non-indexed mesh geometry from position attributes', () => {
    expect(
      countRenderedPoiModelTriangles([
        new Mesh(nonIndexedGeometry(9), material),
      ])
    ).toBe(3);
  });

  it('respects finite draw ranges', () => {
    const geometry = indexedGeometry(12);
    geometry.setDrawRange(3, 6);

    expect(countRenderedPoiModelTriangles([new Mesh(geometry, material)])).toBe(
      2
    );
  });

  it('multiplies instanced mesh geometry by the active instance count', () => {
    const mesh = new InstancedMesh(indexedGeometry(6), material, 5);
    mesh.count = 4;

    expect(countRenderedPoiModelTriangles([mesh])).toBe(8);
  });

  it('ignores hidden descendants and non-mesh renderables', () => {
    const root = new Group();
    const hidden = new Mesh(indexedGeometry(6), material);
    hidden.visible = false;
    root.add(hidden);
    root.add(new Line(nonIndexedGeometry(6), new LineBasicMaterial()));

    expect(countRenderedPoiModelTriangles([root])).toBe(0);
  });

  it('handles malformed geometry safely', () => {
    expect(
      countRenderedPoiModelTriangles([new Mesh(new BufferGeometry(), material)])
    ).toBe(0);
  });

  it('counts separate meshes that share the same geometry', () => {
    const geometry = indexedGeometry(6);

    expect(
      countRenderedPoiModelTriangles([
        new Mesh(geometry, material),
        new Mesh(geometry, material),
      ])
    ).toBe(4);
  });

  it('does not double-count the same object through overlapping roots', () => {
    const parent = new Group();
    const childRoot = new Object3D();
    const mesh = new Mesh(indexedGeometry(6), material);
    childRoot.add(mesh);
    parent.add(childRoot);

    expect(countRenderedPoiModelTriangles([parent, childRoot])).toBe(2);
  });
});
