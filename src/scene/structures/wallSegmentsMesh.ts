import type { Material } from 'three';
import { BoxGeometry, Group, Mesh } from 'three';

import type { WallSegmentInstance } from '../../assets/floorPlan/wallSegments';
import { applyLightmapUv2 } from '../lighting/bakedLightmaps';

export interface WallSegmentMeshOptions {
  /** Instances describing each wall or fence segment to generate. */
  instances: readonly WallSegmentInstance[];
  /** Optional name assigned to the resulting group. */
  groupName?: string;
  /** Resolves the material for a given wall or fence segment. */
  getMaterial(instance: WallSegmentInstance): Material;
}

export interface WallSegmentMeshBuild {
  /** Group containing every generated wall or fence mesh. */
  group: Group;
  /** Array of meshes for additional post-processing hooks. */
  meshes: Mesh[];
}

const DEFAULT_GROUP_NAME = 'WallSegments';
const FENCE_MESH_NAME = 'FenceSegment';
const WALL_MESH_NAME = 'WallSegment';

/**
 * Creates a reusable group of wall and fence meshes with baked lightmap UV2
 * channels. Each segment receives its own geometry so future baking pipelines
 * can unwrap or rebake without sharing buffers between rooms.
 */
export function createWallSegmentMeshes(
  options: WallSegmentMeshOptions
): WallSegmentMeshBuild {
  const group = new Group();
  group.name = options.groupName ?? DEFAULT_GROUP_NAME;
  const meshes: Mesh[] = [];

  for (const instance of options.instances) {
    const geometry = new BoxGeometry(
      instance.dimensions.width,
      instance.dimensions.height,
      instance.dimensions.depth
    );
    applyLightmapUv2(geometry);

    const material = options.getMaterial(instance);
    const mesh = new Mesh(geometry, material);
    mesh.name = instance.isFence ? FENCE_MESH_NAME : WALL_MESH_NAME;
    mesh.position.set(
      instance.center.x,
      instance.center.y,
      instance.center.z
    );

    // Store a compact identifier instead of the full segment object to avoid
    // retaining large or circular references in Three.js metadata.
    mesh.userData.segmentId = instance.segmentId;
    mesh.userData.isFence = instance.isFence;
    mesh.userData.isSharedInterior = instance.isSharedInterior;
    mesh.userData.thickness = instance.thickness;

    group.add(mesh);
    meshes.push(mesh);
  }

  return { group, meshes };
}
