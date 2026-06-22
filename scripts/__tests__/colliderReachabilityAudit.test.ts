import { describe, expect, it } from 'vitest';

import { classifyReachabilityEvidence } from '../colliderReachabilityAudit';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const candidate: RuntimeColliderMetadata = {
  id: '1006',
  floor: 'ground',
  category: 'static',
  name: 'BackyardBackFenceBoundary',
  sourceId: 'ground.backyard.perimeter.backFence.boundary',
  sourceType: 'generatedCollider',
  intent: 'physical-boundary',
  role: 'backFenceBoundary',
  purpose: 'preserve the visible back fence as a physical boundary',
  bounds: { minX: -2, maxX: 2, minZ: 4, maxZ: 4.5 },
};

const blocker: RuntimeColliderMetadata = {
  ...candidate,
  id: '2000',
  name: 'EarlierBoundary',
  sourceId: 'ground.test.earlierBoundary',
  bounds: { minX: -2, maxX: 2, minZ: 3, maxZ: 3.4 },
};

describe('classifyReachabilityEvidence', () => {
  it('reports directly-load-bearing when a reachable approach hits the candidate first', () => {
    const result = classifyReachabilityEvidence({
      candidate,
      blockerColliders: [candidate, blocker],
      approaches: [
        {
          direction: 'north',
          target: { x: 0, z: 3.2, floorId: 'ground' },
          reachedApproach: true,
          firstBlockers: [candidate.name],
        },
      ],
    });

    expect(result.classification).toBe('directly-load-bearing');
    expect(result.dominatingColliders).toEqual([]);
  });

  it('reports dominated with stable blocker identities when all reached approaches stop earlier', () => {
    const result = classifyReachabilityEvidence({
      candidate,
      blockerColliders: [candidate, blocker],
      approaches: [
        {
          direction: 'north',
          target: { x: 0, z: 3.2, floorId: 'ground' },
          reachedApproach: true,
          firstBlockers: [blocker.name],
        },
        {
          direction: 'south',
          target: { x: 0, z: 5.2, floorId: 'ground' },
          reachedApproach: true,
          firstBlockers: [blocker.name],
        },
      ],
    });

    expect(result.classification).toBe('dominated');
    expect(result.dominatingColliders).toEqual([
      { id: blocker.id, sourceId: blocker.sourceId, name: blocker.name },
    ]);
  });

  it('keeps unreachable approaches distinct from teleport-only occupancy', () => {
    const result = classifyReachabilityEvidence({
      candidate,
      blockerColliders: [candidate, blocker],
      approaches: [
        {
          direction: 'west',
          target: { x: -2.8, z: 4.25, floorId: 'ground' },
          reachedApproach: false,
          firstBlockers: [],
          note: 'Approach sample is not occupiable.',
        },
      ],
    });

    expect(result.classification).toBe('outside-reachable-navmesh');
  });

  it('preserves explicit secondary-backstop intent before dominance inference', () => {
    const result = classifyReachabilityEvidence({
      candidate: { ...candidate, intent: 'secondary-backstop' },
      blockerColliders: [blocker],
      approaches: [
        {
          direction: 'north',
          target: { x: 0, z: 3.2, floorId: 'ground' },
          reachedApproach: true,
          firstBlockers: [blocker.name],
        },
      ],
    });

    expect(result.classification).toBe('secondary-backstop');
  });
});
