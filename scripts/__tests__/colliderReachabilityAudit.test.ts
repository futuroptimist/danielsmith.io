import { describe, expect, it } from 'vitest';

import {
  classifyReachabilityEvidence,
  parseColliderReachabilityAuditArgs,
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
        '--max-nodes',
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
