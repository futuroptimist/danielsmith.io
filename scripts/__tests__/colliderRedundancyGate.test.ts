import { describe, expect, it } from 'vitest';

import {
  evaluateColliderRedundancy,
  formatColliderRedundancyGateReport,
  parseColliderRedundancyGateArgs,
} from '../colliderRedundancyGate';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const collider = (
  overrides: Partial<RuntimeColliderMetadata>
): RuntimeColliderMetadata => ({
  id: 'A',
  debugId: 'A',
  floor: 'ground',
  category: 'wall',
  name: 'Collider A',
  sourceId: 'ground.wall.a',
  sourceType: 'wall',
  intent: 'physical-boundary',
  role: 'guard',
  purpose: 'blocks the room edge',
  bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
  ...overrides,
});

const options = { tolerance: 0.05, maxNodes: 3000, failOnAnonymous: false };

describe('parseColliderRedundancyGateArgs', () => {
  it('parses CI bounds, JSON, base URL, and optional anonymous strictness', () => {
    expect(
      parseColliderRedundancyGateArgs([
        '--json',
        '--max-nodes',
        '120',
        '--timeout-ms',
        '5000',
        '--tolerance',
        '0.01',
        '--base-url',
        'http://127.0.0.1:5173',
        '--fail-on-anonymous',
      ])
    ).toEqual({
      json: true,
      maxNodes: 120,
      timeoutMs: 5000,
      tolerance: 0.01,
      baseUrl: 'http://127.0.0.1:5173',
      failOnAnonymous: true,
    });
  });

  it('rejects fractional CI bounds before they can floor to unsafe values', () => {
    expect(() =>
      parseColliderRedundancyGateArgs(['--max-nodes', '0.5'])
    ).toThrow('--max-nodes must be a positive integer.');
    expect(() =>
      parseColliderRedundancyGateArgs(['--timeout-ms', '10.5'])
    ).toThrow('--timeout-ms must be a positive integer.');
  });
});

describe('evaluateColliderRedundancy', () => {
  it('fails for exact duplicate source-backed active colliders', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({ id: 'A', debugId: 'A' }),
        collider({ id: 'B', debugId: 'B' }),
      ],
      options
    );

    expect(report.ok).toBe(false);
    expect(report.findings).toMatchObject([
      {
        severity: 'failure',
        classification: 'exact-duplicate',
        collider: { id: 'B' },
      },
    ]);
  });

  it('does not treat distinct source policies as exact duplicates when semantics are omitted', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({
          id: 'ENTRANCE',
          debugId: 'ENTRANCE',
          sourceId: 'policy.entrance',
          sourceType: undefined,
          intent: undefined,
          role: undefined,
          purpose: undefined,
        }),
        collider({
          id: 'EXIT',
          debugId: 'EXIT',
          sourceId: 'policy.exit',
          sourceType: undefined,
          intent: undefined,
          role: undefined,
          purpose: undefined,
        }),
      ],
      options
    );

    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it('fails for source-backed colliders fully contained by a concrete collider', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({
          id: 'OUTER',
          debugId: 'OUTER',
          sourceId: 'ground.wall.outer',
        }),
        collider({
          id: 'INNER',
          debugId: 'INNER',
          sourceId: 'ground.wall.inner',
          bounds: { minX: 1, maxX: 2, minZ: 1, maxZ: 2 },
        }),
      ],
      options
    );

    expect(report.ok).toBe(false);
    expect(report.findings).toMatchObject([
      {
        severity: 'failure',
        classification: 'fully-contained',
        collider: { id: 'INNER' },
        dominatingColliders: [{ id: 'OUTER' }],
      },
    ]);
  });

  it('does not fail ambiguous adjacent, isolated, anonymous, source-backed stable-name, or intentional backstop cases', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({ id: 'A', debugId: 'A' }),
        collider({
          id: 'ADJ',
          debugId: 'ADJ',
          sourceId: 'ground.wall.adjacent',
          bounds: { minX: 4.02, maxX: 5, minZ: 0, maxZ: 4 },
        }),
        collider({
          id: 'ISO',
          debugId: 'ISO',
          sourceId: 'ground.wall.isolated',
          bounds: { minX: 20, maxX: 21, minZ: 20, maxZ: 21 },
        }),
        collider({
          id: 'ANON',
          debugId: undefined,
          sourceId: undefined,
          bounds: { minX: 30, maxX: 31, minZ: 30, maxZ: 31 },
        }),
        collider({
          id: 'STABLE',
          debugId: undefined,
          name: 'GroundWallCollider:ground.wall.generated:segment-a',
          sourceId: 'ground.wall.generated',
          bounds: { minX: 6, maxX: 7, minZ: 0, maxZ: 4 },
        }),
        collider({
          id: 'GEN',
          debugId: undefined,
          name: 'ground-collider-8',
          sourceId: 'ground.wall.generated_name',
          bounds: { minX: 40, maxX: 41, minZ: 40, maxZ: 41 },
        }),
        collider({
          id: 'BACKSTOP',
          debugId: 'BACKSTOP',
          sourceId: 'ground.wall.backstop',
          intent: 'secondary-backstop',
          bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
        }),
      ],
      options
    );

    expect(report.ok).toBe(true);
    expect(report.findings).toMatchObject([
      {
        severity: 'warning',
        classification: 'anonymous-generated',
        collider: { id: 'ANON' },
      },
      {
        severity: 'warning',
        classification: 'anonymous-generated',
        collider: { id: 'GEN' },
      },
    ]);
  });

  it('can opt in to failing anonymous generated colliders', () => {
    const report = evaluateColliderRedundancy(
      [collider({ id: 'ANON', debugId: undefined, sourceId: undefined })],
      { ...options, failOnAnonymous: true }
    );

    expect(report.ok).toBe(false);
    expect(report.findings[0]).toMatchObject({
      severity: 'failure',
      classification: 'anonymous-generated',
    });
  });

  it('formats actionable remediation fields', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({ id: 'A', debugId: 'A' }),
        collider({ id: 'B', debugId: 'B' }),
      ],
      options
    );
    const output = formatColliderRedundancyGateReport(report);

    expect(output).toContain('Collider redundancy gate failed');
    expect(output).toContain('exact-duplicate: B Collider A');
    expect(output).toContain('dominating colliders: A Collider A');
    expect(output).toContain('remediation: Remove the duplicate collider');
  });
});
