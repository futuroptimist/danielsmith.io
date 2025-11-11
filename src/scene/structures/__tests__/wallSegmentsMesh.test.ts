import { MeshBasicMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { WallSegmentInstance } from '../../../assets/floorPlan/wallSegments';
import { createWallSegmentMeshes } from '../wallSegmentsMesh';

function createWallInstance(
  overrides: Partial<WallSegmentInstance> = {}
): WallSegmentInstance {
  const base: WallSegmentInstance = {
    segment: {
      orientation: 'horizontal',
      start: { x: 0, z: 0 },
      end: { x: 4, z: 0 },
      rooms: [{ id: 'livingRoom', wall: 'north' }],
    },
    center: { x: 2, y: 3, z: 0 },
    dimensions: { width: 4, height: 6, depth: 0.5 },
    collider: { minX: 0, maxX: 4, minZ: -0.25, maxZ: 0.25 },
    isFence: false,
    isSharedInterior: false,
    thickness: 0.5,
  };
  return { ...base, ...overrides };
}

describe('createWallSegmentMeshes', () => {
  it('creates wall and fence meshes with UV2 coordinates and metadata', () => {
    const wallMaterial = new MeshBasicMaterial({ color: 0xffffff });
    const fenceMaterial = new MeshBasicMaterial({ color: 0x888888 });
    const instances: WallSegmentInstance[] = [
      createWallInstance({
        center: { x: -2, y: 3, z: 1 },
        segment: {
          orientation: 'vertical',
          start: { x: -3, z: 0 },
          end: { x: -3, z: 2 },
          rooms: [{ id: 'kitchen', wall: 'east' }],
        },
        dimensions: { width: 0.5, height: 6, depth: 2 },
        collider: { minX: -3.25, maxX: -2.75, minZ: 0, maxZ: 2 },
      }),
      createWallInstance({
        center: { x: 6, y: 1.2, z: -4 },
        dimensions: { width: 0.28, height: 2.4, depth: 3 },
        isFence: true,
        thickness: 0.28,
        segment: {
          orientation: 'horizontal',
          start: { x: 4.5, z: -5.5 },
          end: { x: 7.5, z: -5.5 },
          rooms: [{ id: 'backyard', wall: 'south' }],
        },
        collider: { minX: 4.86, maxX: 7.14, minZ: -6, maxZ: -3 },
      }),
    ];

    const getMaterial = vi
      .fn<(instance: WallSegmentInstance) => MeshBasicMaterial>()
      .mockImplementation((instance) =>
        instance.isFence ? fenceMaterial : wallMaterial
      );

    const build = createWallSegmentMeshes({
      instances,
      groupName: 'TestWalls',
      getMaterial,
    });

    expect(build.group.name).toBe('TestWalls');
    expect(build.meshes).toHaveLength(instances.length);
    expect(build.group.children).toHaveLength(instances.length);
    expect(getMaterial).toHaveBeenCalledTimes(instances.length);

    build.meshes.forEach((mesh, index) => {
      const uv2 = mesh.geometry.getAttribute('uv2');
      expect(uv2).toBeDefined();
      expect(uv2?.count).toBeGreaterThan(0);
      expect(mesh.userData.isFence).toBe(instances[index]?.isFence ?? false);
      expect(mesh.userData.isSharedInterior).toBe(
        instances[index]?.isSharedInterior ?? false
      );
      expect(mesh.userData.thickness).toBe(instances[index]?.thickness);
      expect(mesh.name).toBe(
        instances[index]?.isFence ? 'FenceSegment' : 'WallSegment'
      );
    });

    wallMaterial.dispose();
    fenceMaterial.dispose();
  });

  it('falls back to the default group name when none is provided', () => {
    const wallMaterial = new MeshBasicMaterial({ color: 0xffffff });
    const instances: WallSegmentInstance[] = [createWallInstance()];

    const build = createWallSegmentMeshes({
      instances,
      getMaterial: () => wallMaterial,
    });

    expect(build.group.name).toBe('WallSegments');
    wallMaterial.dispose();
  });
});
