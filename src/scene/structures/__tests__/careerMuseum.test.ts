import {
  Box3,
  BufferGeometry,
  InstancedMesh,
  Material,
  Mesh,
  Vector3,
} from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTestCareerPois } from '../../poi/__tests__/helpers/careerFixtures';
import { createCareerMuseum } from '../careerMuseum';
import { countObjectTriangles } from '../triangleCount';

import { mockCareerCanvas } from './helpers/careerCanvas';

describe('original career museum geometry', () => {
  beforeEach(() => {
    mockCareerCanvas();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('uses a small shared resource set with explicitly separated solid and decorative batches', () => {
    const build = createCareerMuseum(getTestCareerPois());
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    let drawCalls = 0;
    build.group.traverse((object) => {
      if (!(object instanceof InstancedMesh)) return;
      drawCalls += 1;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material);
      expect(['solid', 'decorativeNoCollision']).toContain(
        object.userData.collisionPolicy
      );
      expect(object.userData.collisionRationale.length).toBeGreaterThan(10);
      expect(object.userData.nonPhysicalCollider).toBe(
        object.userData.collisionPolicy === 'decorativeNoCollision'
      );
      expect(object.userData.partNames).toHaveLength(object.count);
    });
    expect(geometries.size).toBeLessThanOrEqual(3);
    expect(materials.size).toBeLessThanOrEqual(10);
    expect(drawCalls).toBeLessThanOrEqual(35);
    expect(countObjectTriangles(build.group)).toBeLessThan(4000);
    expect(build.resourceCounts.textures).toBe(4);
    build.dispose();
  });

  it('provides the four reviewed generic treatments without branding or internal information', () => {
    const build = createCareerMuseum(getTestCareerPois());
    const byId = new Map(
      build.exhibits.map((exhibit) => [exhibit.id, exhibit])
    );
    const mobile = byId.get('career-southern-mississippi')!;
    expect(
      mobile.parts.filter((part) => /^(phone|tablet).*case/.test(part.name))
    ).toHaveLength(4);
    expect(
      mobile.parts.some((part) => part.name === 'phone-simulator-screen')
    ).toBe(true);
    expect(mobile.parts.some((part) => part.palette === 'gold')).toBe(true);
    expect(mobile.parts.some((part) => part.palette === 'black')).toBe(true);
    const aquarium = byId.get('career-naval-research')!;
    expect(
      aquarium.parts.find((part) => part.name === 'solid-aquarium-base')
        ?.collision
    ).toBe('solid');
    expect(
      aquarium.parts.find((part) => part.name === 'inert-mine-shaped-prop')
        ?.collision
    ).toBe('decorativeNoCollision');
    expect(
      aquarium.parts.find((part) => part.name === 'water-surface')?.collision
    ).toBe('decorativeNoCollision');
    expect(
      byId
        .get('career-youtube')!
        .parts.some((part) => part.name.startsWith('illustrative-status-bar'))
    ).toBe(true);
    expect(
      byId
        .get('career-muon-space')!
        .parts.some((part) => part.name === 'generic-cubesat-body')
    ).toBe(true);
    expect(
      JSON.stringify(build.exhibits.map((entry) => entry.parts))
    ).not.toMatch(/logo|mascot|wordmark|proprietary|dashboard/i);
    build.dispose();
  });

  it('keeps anchors at avatar height beyond the solid stand and derives exact collision extents', () => {
    const build = createCareerMuseum(getTestCareerPois());
    for (const exhibit of build.exhibits) {
      expect(exhibit.interactionAnchor.y).toBe(-4.25);
      expect(exhibit.interactionAnchor.z - exhibit.collider.maxZ).toBeCloseTo(
        1
      );
      const renderedSolid = new Box3();
      exhibit.group.updateWorldMatrix(true, true);
      exhibit.group.traverse((object) => {
        if (
          !(object instanceof InstancedMesh) ||
          object.userData.collisionPolicy !== 'solid'
        )
          return;
        renderedSolid.union(new Box3().setFromObject(object));
      });
      expect(exhibit.collider.minX).toBeCloseTo(renderedSolid.min.x);
      expect(exhibit.collider.maxX).toBeCloseTo(renderedSolid.max.x);
      expect(exhibit.collider.minZ).toBeCloseTo(renderedSolid.min.z);
      expect(exhibit.collider.maxZ).toBeCloseTo(renderedSolid.max.z);
      expect(
        new Box3().setFromObject(exhibit.group).getSize(new Vector3()).y
      ).toBeLessThan(3.7);
    }
    build.dispose();
  });

  it('disposes each shared resource and instanced allocation exactly once', () => {
    const build = createCareerMuseum(getTestCareerPois());
    const disposables = new Set<{ dispose(): void }>();
    build.group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object instanceof InstancedMesh) disposables.add(object);
      disposables.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        disposables.add(material);
    });
    const spies = [...disposables].map((resource) =>
      vi.spyOn(resource, 'dispose')
    );
    const created = build.getResourceLifecycle().created;
    expect(created.geometries).toBe(4);
    expect(created.materials).toBe(19);
    expect(created.textures).toBe(4);
    build.dispose();
    build.dispose();
    expect(build.getResourceLifecycle()).toEqual({
      created,
      disposed: created,
      isDisposed: true,
    });
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
    expect(build.group.children).toHaveLength(0);
    const next = createCareerMuseum(getTestCareerPois());
    const nextGeometries = new Set<BufferGeometry>();
    next.group.traverse((object) => {
      if (object instanceof InstancedMesh) nextGeometries.add(object.geometry);
    });
    expect(
      [...nextGeometries].every((geometry) => !disposables.has(geometry))
    ).toBe(true);
    next.dispose();
  });
  it('shares the same resource pool with solid furniture and decorative gallery details', () => {
    const build = createCareerMuseum(getTestCareerPois(), [
      {
        id: 'museum-central-table',
        kind: 'table',
        position: { x: 0, y: -5, z: 2 },
      },
      {
        id: 'museum-west-bench',
        kind: 'bench',
        position: { x: -6, y: -5, z: 8 },
      },
      {
        id: 'museum-east-bench',
        kind: 'bench',
        position: { x: 6, y: -5, z: 8 },
      },
      {
        id: 'museum-west-planter',
        kind: 'planter',
        position: { x: -28, y: -5, z: 10 },
      },
      {
        id: 'museum-east-planter',
        kind: 'planter',
        position: { x: 28, y: -5, z: 10 },
      },
      {
        id: 'museum-west-art',
        kind: 'wall-art',
        position: { x: -18, y: -5, z: -35.6 },
      },
      {
        id: 'museum-east-art',
        kind: 'wall-art',
        position: { x: 20, y: -5, z: -35.6 },
      },
    ]);
    expect(build.furnishings.filter((entry) => entry.collider)).toHaveLength(5);
    expect(
      build.furnishings.filter(
        (entry) => entry.collision === 'decorativeNoCollision'
      )
    ).toHaveLength(2);
    const geometries = new Set<BufferGeometry>();
    let calls = 0;
    build.group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      calls += 1;
    });
    expect(geometries.size).toBe(4);
    expect(calls).toBeLessThan(75);
    expect(countObjectTriangles(build.group)).toBeLessThan(5500);
    expect(build.resourceCounts.textures).toBe(4);
    build.dispose();
  });

  it('keeps static plaques readable while selection uses nonblocking display targets', () => {
    const build = createCareerMuseum(getTestCareerPois());
    for (const exhibit of build.exhibits) {
      expect(exhibit.plaque.material.map).toBeDefined();
      expect(exhibit.plaque.visible).toBe(true);
      expect(build.poiOverrides[exhibit.id]?.mode).toBe('display');
      expect(
        build.poiOverrides[exhibit.id]?.hitArea.userData.nonPhysicalCollider
      ).toBe(true);
      expect(
        build.poiOverrides[exhibit.id]?.highlight.focusOpacity
      ).toBeGreaterThan(build.poiOverrides[exhibit.id]!.highlight.baseOpacity);
    }
    const previousTextures = build.exhibits.map(
      (exhibit) => exhibit.plaque.material.map!
    );
    const spies = previousTextures.map((texture) =>
      vi.spyOn(texture, 'dispose')
    );
    build.updateDefinitions(getTestCareerPois('en-x-pseudo'));
    build.exhibits.forEach((exhibit, index) => {
      expect(exhibit.plaque.material.map).not.toBe(previousTextures[index]);
      expect(spies[index]).toHaveBeenCalledTimes(1);
    });
    build.dispose();
    const lifecycle = build.getResourceLifecycle();
    expect(lifecycle.created.textures).toBe(8);
    expect(lifecycle.disposed).toEqual(lifecycle.created);
    spies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  });
});
