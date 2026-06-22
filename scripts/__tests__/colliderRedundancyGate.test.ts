import { describe, expect, it } from 'vitest';

import {
  evaluateColliderRedundancy,
  parseColliderRedundancyGateArgs,
} from '../colliderRedundancyGate';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const collider = (
  overrides: Partial<RuntimeColliderMetadata>
): RuntimeColliderMetadata => ({
  id: 'A',
  floor: 'ground',
  category: 'wall',
  name: 'Wall',
  sourceId: 'ground.wall.a',
  bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
  ...overrides,
});

describe('parseColliderRedundancyGateArgs', () => {
  it('parses ci bounds, json output, base URL, and strict provenance', () => {
    expect(
      parseColliderRedundancyGateArgs([
        '--json',
        '--max-nodes',
        '3000',
        '--timeout-ms',
        '120000',
        '--base-url',
        'http://127.0.0.1:5173',
        '--fail-on-anonymous',
      ])
    ).toEqual({
      json: true,
      tolerance: 0.05,
      timeoutMs: 120000,
      maxNodes: 3000,
      baseUrl: 'http://127.0.0.1:5173',
      failOnAnonymous: true,
    });
  });
});

describe('evaluateColliderRedundancy', () => {
  const options = {
    tolerance: 0.05,
    maxNodes: 3000,
    timeoutMs: 120000,
    failOnAnonymous: false,
  };

  it('fails on exact duplicate source-backed colliders', () => {
    const report = evaluateColliderRedundancy(
      [collider({ id: 'A' }), collider({ id: 'B' })],
      options
    );

    expect(report.passed).toBe(false);
    expect(report.failures).toMatchObject([
      { kind: 'exact-duplicate', candidate: { id: 'B' } },
    ]);
  });

  it('fails on source-backed contained colliders dominated by a larger collider', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({ id: 'A', bounds: { minX: 0, maxX: 10, minZ: 0, maxZ: 10 } }),
        collider({
          id: 'B',
          sourceId: 'ground.wall.b',
          bounds: { minX: 2, maxX: 3, minZ: 2, maxZ: 3 },
        }),
      ],
      options
    );

    expect(report.passed).toBe(false);
    expect(report.failures).toMatchObject([
      {
        kind: 'fully-contained',
        candidate: { id: 'B' },
        evidence: [{ id: 'A' }],
      },
    ]);
  });

  it('warns but does not fail for anonymous colliders by default', () => {
    const report = evaluateColliderRedundancy(
      [collider({ id: 'anonymous', sourceId: undefined })],
      options
    );

    expect(report.passed).toBe(true);
    expect(report.warnings).toMatchObject([
      { kind: 'anonymous-collider', candidate: { id: 'anonymous' } },
    ]);
  });

  it('supports opt-in strict failures for anonymous colliders', () => {
    const report = evaluateColliderRedundancy(
      [collider({ id: 'anonymous', sourceId: undefined })],
      { ...options, failOnAnonymous: true }
    );

    expect(report.passed).toBe(false);
    expect(report.failures).toMatchObject([
      { kind: 'anonymous-collider', candidate: { id: 'anonymous' } },
    ]);
  });

  it('does not fail intentional secondary backstops', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({ id: 'A' }),
        collider({
          id: 'B',
          sourceId: 'ground.wall.b',
          intent: 'secondary-backstop',
        }),
      ],
      options
    );

    expect(report.passed).toBe(true);
  });

  it('ignores duplicate geometry when source semantics differ', () => {
    const report = evaluateColliderRedundancy(
      [collider({ id: 'A' }), collider({ id: 'B', sourceId: 'ground.wall.b' })],
      options
    );

    expect(
      report.failures.filter((finding) => finding.kind === 'exact-duplicate')
    ).toEqual([]);
  });
});
