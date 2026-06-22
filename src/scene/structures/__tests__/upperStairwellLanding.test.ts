import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { createColliderDebugId } from '../../debug/colliderVisualizer';
import {
  assertValidSourceCollisionPolicies,
  assertValidSourceCollisionRecords,
} from '../../level/sourceCollisionValidation';
import { assertLevelSourceId } from '../../level/sourceIds';
import {
  UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES,
  type UpperStairwellLandingSegmentPolicy,
  type UpperStairwellLandingSegmentRole,
} from '../../level/upperStairwellLandingSegments';
import { createUpperStairwellLanding } from '../upperStairwellLanding';

const ALL_SEGMENT_ROLES: readonly UpperStairwellLandingSegmentRole[] = [
  'side-west',
  'side-east',
  'far',
  'shoulder-west',
  'shoulder-east',
];

const allSegmentPolicies = (): UpperStairwellLandingSegmentPolicy[] =>
  ALL_SEGMENT_ROLES.map((role) => ({
    role,
    render: true,
    sourceId: assertLevelSourceId(`upper.stairwell.landingGuard.test.${role}`),
    collision: {
      collision: 'active',
      intent: 'safety-guard',
      purpose: `upper stairwell landing test ${role} guard`,
      runtimeName: `UpperStairwellLandingTestGuard-${role}`,
    },
  }));

const overlaps = (
  first: { minX: number; maxX: number; minZ: number; maxZ: number },
  second: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean =>
  first.minX < second.maxX &&
  first.maxX > second.minX &&
  first.minZ < second.maxZ &&
  first.maxZ > second.minZ;

describe('createUpperStairwellLanding', () => {
  it('adds guard colliders around sealed stairwell edges but not across the stair path', () => {
    const openingBounds = { minX: -2, maxX: 2, minZ: -8, maxZ: 6 };
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds,
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        material: { color: 0xff0000 },
      },
      segments: allSegmentPolicies(),
    });

    expect(result.group.name).toBe('UpperStairwellLanding');
    expect(result.colliders).toHaveLength(3);
    expect(result.colliders.map(({ bounds }) => bounds)).toContainEqual({
      minX: -2.2,
      maxX: -2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.colliders.map(({ bounds }) => bounds)).toContainEqual({
      minX: 2,
      maxX: 2.2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.colliders.map(({ bounds }) => bounds)).toContainEqual({
      minX: -2,
      maxX: 2,
      minZ: -8,
      maxZ: -7.8,
    });

    const descentPath = { minX: -1.6, maxX: 1.6, minZ: -7.5, maxZ: 6 };
    expect(
      result.colliders.some(({ bounds }) => overlaps(bounds, descentPath))
    ).toBe(false);
  });

  it('fills floorless shoulder strips while leaving the descent corridor open', () => {
    const openingBounds = { minX: -2, maxX: 2, minZ: -8, maxZ: 6 };
    const descentCorridorBounds = {
      minX: -1.2,
      maxX: 1.1,
      minZ: -7.6,
      maxZ: 6,
    };
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds,
      descentCorridorBounds,
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        material: { color: 0xff0000 },
      },
      segments: allSegmentPolicies(),
    });

    expect(result.colliders).toHaveLength(5);
    expect(result.colliders.map(({ bounds }) => bounds)).toContainEqual({
      minX: -2,
      maxX: -1.2,
      minZ: -8,
      maxZ: 6,
    });
    expect(result.colliders.map(({ bounds }) => bounds)).toContainEqual({
      minX: 1.1,
      maxX: 2,
      minZ: -8,
      maxZ: 6,
    });

    const descentPath = { minX: -1.2, maxX: 1.1, minZ: -7.5, maxZ: 6 };
    expect(
      result.colliders.some(({ bounds }) => overlaps(bounds, descentPath))
    ).toBe(false);
  });

  it('renders visual-only production segments but emits only the east shoulder collider', () => {
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds: { minX: -2, maxX: 2, minZ: -8, maxZ: 6 },
      descentCorridorBounds: {
        minX: -1.2,
        maxX: 1.1,
        minZ: -7.6,
        maxZ: 6,
      },
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        material: { color: 0xff0000 },
      },
      segments: UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES,
    });

    expect(result.group.children.map((child) => child.name)).toEqual([
      'UpperStairwellLandingSideGuard-East',
      'UpperStairwellLandingFarGuard',
      'UpperStairwellLandingShoulderGuard-East',
    ]);
    assertValidSourceCollisionPolicies(
      UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES
    );
    assertValidSourceCollisionRecords(result.colliders);

    expect(result.colliders).toEqual([
      {
        role: 'shoulder-east',
        sourceId: 'upper.stairwell.landingGuard.shoulderEast',
        sourceType: 'generatedCollider',
        intent: 'safety-guard',
        purpose: 'upper stairwell landing shoulder-east guard',
        name: 'UpperStairwellLandingGuard-3',
        debugId: '400D',
        bounds: {
          minX: 1.1,
          maxX: 2,
          minZ: -8,
          maxZ: 6,
        },
      },
    ]);
  });

  it('emits source-owned production landing debug IDs unchanged', () => {
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds: { minX: -2, maxX: 2, minZ: -8, maxZ: 6 },
      descentCorridorBounds: {
        minX: -1.2,
        maxX: 1.1,
        minZ: -7.6,
        maxZ: 6,
      },
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        material: { color: 0xff0000 },
      },
      segments: UPPER_STAIRWELL_LANDING_SEGMENT_POLICIES,
    });

    result.colliders.forEach((collider) => {
      if (!collider.debugId) return;
      expect(
        createColliderDebugId({
          floor: 'upper',
          category: 'upper',
          name: collider.name,
          bounds: collider.bounds,
          debugId: collider.debugId,
        })
      ).toBe(collider.debugId);
    });
  });
  it('clamps guard colliders to the landing room when the opening touches an edge', () => {
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -2, maxX: 4, minZ: -6, maxZ: 6 },
      openingBounds: { minX: -2, maxX: 2, minZ: -4, maxZ: 4 },
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.4,
        material: { color: 0xff0000 },
      },
      segments: allSegmentPolicies(),
    });

    expect(result.colliders.map(({ bounds }) => bounds)).not.toContainEqual({
      minX: -2.4,
      maxX: -2,
      minZ: -4,
      maxZ: 4,
    });
    expect(result.colliders).toHaveLength(2);
    for (const { bounds: collider } of result.colliders) {
      expect(collider.minX).toBeGreaterThanOrEqual(-2);
      expect(collider.maxX).toBeLessThanOrEqual(4);
      expect(collider.minZ).toBeGreaterThanOrEqual(-6);
      expect(collider.maxZ).toBeLessThanOrEqual(6);
    }
  });

  it('does not create a landing slab that covers the descent opening', () => {
    const openingBounds = { minX: -2, maxX: 2, minZ: -8, maxZ: 6 };
    const result = createUpperStairwellLanding({
      roomBounds: { minX: -6, maxX: 6, minZ: -10, maxZ: 8 },
      openingBounds,
      elevation: 4,
      guard: {
        height: 0.56,
        thickness: 0.2,
        material: { color: 0xff0000 },
      },
      segments: allSegmentPolicies(),
    });

    const slab = result.group.children.find((child) =>
      child.name.includes('Slab')
    );
    expect(slab).toBeUndefined();

    for (const child of result.group.children) {
      const mesh = child as Mesh;
      const geometry = mesh.geometry as BoxGeometry;
      const bounds = {
        minX: mesh.position.x - geometry.parameters.width / 2,
        maxX: mesh.position.x + geometry.parameters.width / 2,
        minZ: mesh.position.z - geometry.parameters.depth / 2,
        maxZ: mesh.position.z + geometry.parameters.depth / 2,
      };
      expect(
        bounds.minX <= openingBounds.minX &&
          bounds.maxX >= openingBounds.maxX &&
          bounds.minZ <= openingBounds.minZ &&
          bounds.maxZ >= openingBounds.maxZ
      ).toBe(false);
    }
  });
});
