import type { MeshStandardMaterialParameters } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { Bounds2D } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';

export interface UpperLandingGuardConfig {
  /** Height of the guard rail measured from the landing surface. */
  height: number;
  /** Thickness of the guard rail along the Z axis. */
  thickness: number;
  /** Inset applied to both sides of the guard rail along the X axis. */
  inset: number;
  /** Optional material overrides for the guard rail. */
  material?: MeshStandardMaterialParameters;
}

export interface UpperLandingStubConfig {
  /** World-space bounds of the upper landing room. */
  bounds: Bounds2D;
  /** World-space Z coordinate where the stair landing ends (south edge). */
  landingMaxZ: number;
  /** Height of the landing surface measured from world origin. */
  elevation: number;
  /** Thickness of the landing slab. */
  thickness: number;
  /** Gap maintained between the landing slab and the stair landing. */
  landingClearance: number;
  /** Material applied to the landing stub. */
  material: MeshStandardMaterialParameters;
  /** Optional guard rail configuration. */
  guard?: UpperLandingGuardConfig;
}

export interface UpperLandingStubBuild {
  group: Group;
  colliders: RectCollider[];
}

const GROUP_NAME = 'UpperLandingStub';
const SLAB_NAME = 'UpperLandingStubSlab';
const GUARD_NAME = 'UpperLandingStubGuard';

/**
 * Builds a placeholder upper landing slab that bridges the stair landing to the
 * future second-floor layout. The geometry is intentionally minimal so future
 * automation can reshape or reskin it without rewriting scene wiring.
 */
export function createUpperLandingStub(
  config: UpperLandingStubConfig
): UpperLandingStubBuild {
  const group = new Group();
  group.name = GROUP_NAME;
  const colliders: RectCollider[] = [];

  const width = config.bounds.maxX - config.bounds.minX;
  if (width <= 0) {
    throw new Error('Upper landing bounds must have a positive width.');
  }

  const startZ = Math.max(
    config.bounds.minZ,
    config.landingMaxZ + config.landingClearance
  );
  const depth = config.bounds.maxZ - startZ;
  if (depth <= 0) {
    throw new Error('Upper landing bounds must extend beyond the stair landing.');
  }

  const slabMaterial = new MeshStandardMaterial(config.material);
  const slabGeometry = new BoxGeometry(width, config.thickness, depth);
  const slab = new Mesh(slabGeometry, slabMaterial);
  slab.name = SLAB_NAME;
  slab.position.set(
    config.bounds.minX + width / 2,
    config.elevation - config.thickness / 2,
    startZ + depth / 2
  );
  group.add(slab);

  if (config.guard) {
    const guardMaterial = new MeshStandardMaterial(
      config.guard.material ?? config.material
    );
    const guardLength = Math.max(0, width - config.guard.inset * 2);
    if (guardLength > 0 && config.guard.thickness > 0 && config.guard.height > 0) {
      const guardGeometry = new BoxGeometry(
        guardLength,
        config.guard.height,
        config.guard.thickness
      );
      const guard = new Mesh(guardGeometry, guardMaterial);
      guard.name = GUARD_NAME;
      guard.position.set(
        config.bounds.minX + config.guard.inset + guardLength / 2,
        config.elevation + config.guard.height / 2,
        config.bounds.maxZ - config.guard.thickness / 2
      );
      group.add(guard);

      colliders.push({
        minX: guard.position.x - guardLength / 2,
        maxX: guard.position.x + guardLength / 2,
        minZ: guard.position.z - config.guard.thickness / 2,
        maxZ: guard.position.z + config.guard.thickness / 2,
      });
    }
  }

  return { group, colliders };
}
