import { describe, expect, it } from 'vitest';

import { classifyReachabilityEvidence } from '../colliderReachabilityAudit';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const candidate: RuntimeColliderMetadata = {
  id: '400D',
  floor: 'ground',
  category: 'wall',
  name: 'BackFenceBoundary',
  bounds: { minX: -1, maxX: 1, minZ: 3, maxZ: 3.2 },
  sourceId: 'ground.backyard.perimeter.backFence.boundary',
  intent: 'physical-boundary',
};

describe('classifyReachabilityEvidence', () => {
  it('marks a collider directly load-bearing when a reachable approach hits it first', () => {
    expect(
      classifyReachabilityEvidence(candidate, [
        {
          direction: 'south',
          target: { x: 0, z: 2.5, floorId: 'ground' },
          reachable: true,
          firstBlockers: ['BackFenceBoundary'],
        },
      ]).classification
    ).toBe('directly-load-bearing');
  });

  it('keeps unreachable approach regions distinct from teleport occupancy', () => {
    expect(
      classifyReachabilityEvidence(candidate, [
        {
          direction: 'north',
          target: { x: 0, z: 3.7, floorId: 'ground' },
          reachable: false,
          firstBlockers: [],
        },
      ]).classification
    ).toBe('outside-reachable-navmesh');
  });

  it('reports visual-only source intent before looking for runtime blockers', () => {
    expect(
      classifyReachabilityEvidence(undefined, [], {
        sourceId: 'ground.livingRoom.mediaWall.futuroptimist',
        rationale: 'visual only',
      }).classification
    ).toBe('visual-only-by-policy');
  });

  it('honors explicit secondary backstop intent', () => {
    expect(
      classifyReachabilityEvidence(
        { ...candidate, intent: 'secondary-backstop' },
        [
          {
            direction: 'south',
            target: { x: 0, z: 2.5, floorId: 'ground' },
            reachable: true,
            firstBlockers: ['OtherBoundary'],
          },
        ]
      ).classification
    ).toBe('secondary-backstop');
  });

  it('uses dominated only when every reachable approach has another first blocker', () => {
    expect(
      classifyReachabilityEvidence(candidate, [
        {
          direction: 'south',
          target: { x: 0, z: 2.5, floorId: 'ground' },
          reachable: true,
          firstBlockers: ['OtherBoundary'],
        },
      ]).classification
    ).toBe('dominated');
  });
});
