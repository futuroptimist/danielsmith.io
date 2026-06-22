import { describe, expect, it } from 'vitest';

import {
  classifyReachabilityEvidence,
  parseColliderReachabilityAuditArgs,
} from '../colliderReachabilityAudit';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const candidate: RuntimeColliderMetadata = {
  id: '400D',
  floor: 'upper',
  category: 'stair',
  name: 'UpperStairwellLandingGuard-3',
  sourceId: 'upper.stairwell.landingGuard.shoulderEast',
  intent: 'safety-guard',
  bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
};

const attempt = (firstBlockers: string[], reachable = true) => ({
  direction: 'north' as const,
  target: { x: 0, z: 0, floorId: 'upper' as const },
  reachable,
  confirmed: firstBlockers.length === 0,
  firstBlockers,
});

describe('parseColliderReachabilityAuditArgs', () => {
  it('parses source selectors, json, and explicit limits', () => {
    expect(
      parseColliderReachabilityAuditArgs([
        '--source-id',
        'upper.stairwell.landingGuard.shoulderEast',
        '--json',
        '--grid-resolution',
        '0.25',
        '--max-explored-nodes',
        '100',
      ])
    ).toEqual({
      query: {
        kind: 'source-id',
        value: 'upper.stairwell.landingGuard.shoulderEast',
      },
      json: true,
      gridResolution: 0.25,
      maxExploredNodes: 100,
    });
  });
});

describe('classifyReachabilityEvidence', () => {
  it('classifies candidates first hit by runtime movement as directly load-bearing', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        attempts: [attempt(['UpperStairwellLandingGuard-3'])],
        exploredNodes: 4,
        nodeLimitHit: false,
      })
    ).toBe('directly-load-bearing');
  });

  it('classifies reachable approaches blocked first by other colliders as dominated', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        attempts: [attempt(['OtherBoundary']), attempt(['OtherBoundary'])],
        exploredNodes: 8,
        nodeLimitHit: false,
      })
    ).toBe('dominated');
  });

  it('keeps unreachable candidates distinct from dominance', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        attempts: [attempt([], false)],
        exploredNodes: 8,
        nodeLimitHit: false,
      })
    ).toBe('outside-reachable-navmesh');
  });

  it('honors explicit source intent for visual-only and secondary backstops', () => {
    expect(
      classifyReachabilityEvidence({
        sourcePolicy: { collision: 'none', rationale: 'visual component' },
        attempts: [],
        exploredNodes: 0,
        nodeLimitHit: false,
      })
    ).toBe('visual-only-by-policy');

    expect(
      classifyReachabilityEvidence({
        candidate: { ...candidate, intent: 'secondary-backstop' },
        attempts: [attempt(['OtherBoundary'])],
        exploredNodes: 2,
        nodeLimitHit: false,
      })
    ).toBe('secondary-backstop');
  });

  it('does not silently weaken node-limit uncertainty into a confident result', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        attempts: [attempt([], false)],
        exploredNodes: 100,
        nodeLimitHit: true,
      })
    ).toBe('ambiguous');
  });
});
