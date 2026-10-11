import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { expect, it } from 'vitest';

import { createBasementStaircase } from '../basementStaircase';
import { batchStaticMeshes } from '../batchStaticMeshes';
import { createSugarkubeDeployment } from '../sugarkubeDeployment';

it('batches static Sugarkube pieces without changing geometry, colliders or LED animation', () => {
  const build = createSugarkubeDeployment({
    position: { x: -6.18, z: -12.7 },
    orientationRadians: 1.7,
    wallNetworkEndpoint: { x: -22.5, y: 0.42, z: -12.7 },
  });
  const before = measure(build.group);
  const colliders = structuredClone(build.colliders);
  const led = build.group.getObjectByName('SugarkubePiStatusLed-0-0') as Mesh;
  const material = led.material as MeshStandardMaterial;
  batchStaticMeshes(build.group);
  const after = measure(build.group);
  expect(after.meshes).toBeLessThan(before.meshes / 2);
  expect([...after.materials.keys()].sort()).toEqual(
    [...before.materials.keys()].sort()
  );
  for (const [id, expected] of before.materials) {
    const actual = after.materials.get(id)!;
    expect(actual.triangles).toBe(expected.triangles);
    // Merged Float32 vertices preserve rendered surface bounds within 0.1 mm.
    expect(actual.bounds.min.distanceTo(expected.bounds.min)).toBeLessThan(
      0.0001
    );
    expect(actual.bounds.max.distanceTo(expected.bounds.max)).toBeLessThan(
      0.0001
    );
  }
  expect(build.colliders).toEqual(colliders);
  expect(build.group.getObjectByName(led.name)).toBe(led);
  const intensity = material.emissiveIntensity;
  build.update({ elapsed: 1, delta: 0.016, emphasis: 1 });
  expect(material.emissiveIntensity).not.toBe(intensity);
  expect(build.group.getWorldPosition(new Vector3()).x).toBe(-6.18);
});

function measure(group: Group) {
  group.updateWorldMatrix(true, true);
  const materials = new Map<string, { triangles: number; bounds: Box3 }>();
  let meshes = 0;
  group.traverseVisible((object) => {
    if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
    meshes++;
    const entry = materials.get(object.material.uuid) ?? {
      triangles: 0,
      bounds: new Box3(),
    };
    entry.triangles +=
      (object.geometry.index?.count ??
        object.geometry.attributes.position.count) / 3;
    const position = object.geometry.attributes.position;
    for (let i = 0; i < position.count; i++)
      entry.bounds.expandByPoint(
        new Vector3()
          .fromBufferAttribute(position, i)
          .applyMatrix4(object.matrixWorld)
      );
    materials.set(object.material.uuid, entry);
  });
  return { materials, meshes };
}

it('batches repeated basement parapets while preserving each source and the tread names', () => {
  const build = createBasementStaircase();
  const before = measure(build.group);
  const safety = structuredClone(build.safety);
  batchStaticMeshes(build.group, (mesh) => mesh.name.includes('RampRail'));
  const after = measure(build.group);
  expect(after.meshes).toBeLessThan(before.meshes - 20);
  for (const [id, expected] of before.materials) {
    const actual = after.materials.get(id)!;
    expect(actual.triangles).toBe(expected.triangles);
    expect(actual.bounds.min.distanceTo(expected.bounds.min)).toBeLessThan(
      0.0001
    );
    expect(actual.bounds.max.distanceTo(expected.bounds.max)).toBeLessThan(
      0.0001
    );
  }
  expect(build.safety).toEqual(safety);
  expect(build.group.getObjectByName('StaircaseStep-9')!.visible).toBe(true);
  const sources = new Set<string>();
  build.group.traverseVisible((object) => {
    if (object.name.includes('static-batch'))
      sources.add(object.userData.levelSourceId);
  });
  expect(sources.size).toBe(2);
});
