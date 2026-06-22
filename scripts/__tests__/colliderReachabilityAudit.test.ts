import { describe, expect, it } from 'vitest';

import {
  classifyReachabilityEvidence,
  collectDominatingColliderEvidence,
  parseColliderReachabilityAuditArgs,
  preferRuntimeApproachResult,
} from '../colliderReachabilityAudit';

const candidate = {
  id: '1006',
  sourceId: 'ground.backyard.perimeter.backFence.boundary',
};

describe('collider reachability audit aggregation', () => {
  it('classifies visual-only source policies before runtime sampling', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        approaches: [],
        visualOnlyRationale: 'wall-mounted visual only',
      })
    ).toBe('visual-only-by-policy');
  });

  it('classifies candidates hit first by any legal approach as directly load-bearing', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        approaches: [
          { status: 'unreachable', blockers: [] },
          { status: 'candidate-first', blockers: ['1006'] },
        ],
      })
    ).toBe('directly-load-bearing');
  });

  it('classifies consistently blocked reachable approaches as dominated', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        approaches: [
          { status: 'blocked-by-other', blockers: ['2001'] },
          { status: 'blocked-by-other', blockers: ['2002'] },
        ],
      })
    ).toBe('dominated');
  });

  it('does not weaken mixed or sampled-limit evidence into a confident result', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        approaches: [
          { status: 'blocked-by-other', blockers: ['2001'] },
          { status: 'unreachable', blockers: [] },
        ],
      })
    ).toBe('ambiguous');
  });

  it('keeps diagnostic blockers on unreached approaches out of confident direct evidence', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        approaches: [
          { status: 'unreachable', blockers: ['1006'] },
          { status: 'unreachable', blockers: ['2001'] },
        ],
      })
    ).toBe('outside-reachable-navmesh');
  });

  it('keeps mixed reachable and unreached evidence ambiguous without a confirmed hit', () => {
    expect(
      classifyReachabilityEvidence({
        candidate,
        approaches: [
          { status: 'blocked-by-other', blockers: ['2001'] },
          { status: 'unreachable', blockers: ['1006'] },
          { status: 'ambiguous', blockers: [] },
        ],
      })
    ).toBe('ambiguous');
  });

  it('reports direction evidence per dominating collider only for dominated results', () => {
    const colliders = [
      { id: '1006', name: 'Candidate', sourceId: candidate.sourceId },
      { id: '2001', name: 'NorthWall', sourceId: 'wall.north' },
      { id: '2002', name: 'SouthWall', sourceId: 'wall.south' },
    ] as never;
    const approaches = [
      {
        direction: 'north',
        status: 'blocked-by-other',
        blockers: ['NorthWall'],
        blockerSourceIds: ['wall.north'],
      },
      {
        direction: 'south',
        status: 'blocked-by-other',
        blockers: ['2002'],
        blockerSourceIds: [],
      },
      {
        direction: 'east',
        status: 'blocked-by-other',
        blockers: ['2001'],
        blockerSourceIds: ['wall.north'],
      },
    ] as const;

    expect(
      collectDominatingColliderEvidence(
        'dominated',
        { ...candidate, name: 'Candidate' },
        colliders,
        approaches
      )
    ).toEqual([
      {
        id: '2001',
        name: 'NorthWall',
        sourceId: 'wall.north',
        blockedDirections: ['north', 'east'],
      },
      {
        id: '2002',
        name: 'SouthWall',
        sourceId: 'wall.south',
        blockedDirections: ['south'],
      },
    ]);

    expect(
      collectDominatingColliderEvidence(
        'ambiguous',
        { ...candidate, name: 'Candidate' },
        colliders,
        approaches
      )
    ).toEqual([]);
  });

  it('keeps dominating evidence when candidate and dominator both omit source IDs', () => {
    const colliders = [
      { id: '1006', name: 'Candidate' },
      { id: '2001', name: 'UnnamedSourceDominator' },
    ] as never;

    expect(
      collectDominatingColliderEvidence(
        'dominated',
        { id: '1006', name: 'Candidate' },
        colliders,
        [
          {
            direction: 'west',
            status: 'blocked-by-other',
            blockers: ['2001'],
            blockerSourceIds: [],
          },
        ]
      )
    ).toEqual([
      {
        id: '2001',
        name: 'UnnamedSourceDominator',
        sourceId: undefined,
        blockedDirections: ['west'],
      },
    ]);
  });

  it('keeps blocked-by-other fallback while scanning for candidate-first evidence', () => {
    const blockedFallback = {
      direction: 'north',
      sample: { x: 0, z: 0, floorId: 'ground' },
      status: 'blocked-by-other',
      blockers: ['2001'],
      blockerSourceIds: [],
      exploredNodes: 8,
      pathLength: 3,
    } as const;
    const ambiguousLater = {
      ...blockedFallback,
      status: 'ambiguous',
      blockers: [],
      exploredNodes: 10,
    } as const;
    const candidateFirstLater = {
      ...blockedFallback,
      status: 'candidate-first',
      blockers: ['1006'],
      exploredNodes: 12,
    } as const;

    expect(preferRuntimeApproachResult(undefined, blockedFallback)).toBe(
      blockedFallback
    );
    expect(preferRuntimeApproachResult(blockedFallback, ambiguousLater)).toBe(
      blockedFallback
    );
    expect(
      preferRuntimeApproachResult(blockedFallback, candidateFirstLater)
    ).toBe(candidateFirstLater);
  });

  it('reports secondary backstops from active source intent', () => {
    expect(
      classifyReachabilityEvidence({
        candidate: { ...candidate, intent: 'secondary-backstop' },
        approaches: [{ status: 'candidate-first', blockers: ['1006'] }],
      })
    ).toBe('secondary-backstop');
  });

  it('parses deterministic runtime limits and json output', () => {
    expect(
      parseColliderReachabilityAuditArgs([
        '--source-id',
        'ground.backyard.perimeter.backFence.boundary',
        '--json',
        '--grid-resolution',
        '0.4',
        '--max-explored-nodes',
        '42',
      ])
    ).toMatchObject({
      query: {
        kind: 'source-id',
        value: 'ground.backyard.perimeter.backFence.boundary',
      },
      json: true,
      gridResolution: 0.4,
      maxExploredNodes: 42,
    });
  });
});
