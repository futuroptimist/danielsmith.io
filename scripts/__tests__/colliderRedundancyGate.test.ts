import { describe, expect, it } from 'vitest';

import {
  evaluateColliderRedundancy,
  formatColliderRedundancyGateReport,
  parseColliderRedundancyGateArgs,
} from '../colliderRedundancyGate';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const base = {
  floor: 'ground',
  category: 'wall',
  sourceType: 'wall',
  bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
} satisfies Partial<RuntimeColliderMetadata>;

const collider = (
  input: Partial<RuntimeColliderMetadata> & Pick<RuntimeColliderMetadata, 'id'>
): RuntimeColliderMetadata => ({
  ...base,
  name: input.id,
  floor: base.floor!,
  category: base.category!,
  bounds: base.bounds!,
  debugId: input.id,
  sourceId: `source.${input.id}`,
  ...input,
});

const options = parseColliderRedundancyGateArgs([]);

describe('collider redundancy gate decisions', () => {
  it('fails exact duplicates only when source-backed semantics match', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({ id: 'A', sourceId: 'wall.shared' }),
        collider({ id: 'B', sourceId: 'wall.shared' }),
        collider({ id: 'C', sourceId: 'wall.other' }),
      ],
      options
    );

    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]).toMatchObject({
      classification: 'exact-duplicate',
      candidate: { id: 'A' },
      evidence: [{ collider: { id: 'B' } }],
    });
  });

  it('fails contained source-backed colliders unless the candidate has exception intent', () => {
    const report = evaluateColliderRedundancy(
      [
        collider({
          id: 'INNER',
          bounds: { minX: 1, maxX: 2, minZ: 1, maxZ: 2 },
        }),
        collider({
          id: 'OUTER',
          bounds: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 },
        }),
        collider({
          id: 'BACKSTOP',
          bounds: { minX: 1, maxX: 2, minZ: 1, maxZ: 2 },
          intent: 'secondary-backstop',
        }),
      ],
      options
    );

    expect(report.failures.map((failure) => failure.candidate.id)).toEqual([
      'INNER',
    ]);
    expect(report.failures[0].classification).toBe('fully-contained');
  });

  it('warns on anonymous generated colliders by default', () => {
    const report = evaluateColliderRedundancy(
      [collider({ id: 'GEN', debugId: undefined, sourceId: undefined })],
      options
    );

    expect(report.ok).toBe(true);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0].classification).toBe('anonymous-generated');
  });

  it('can opt in to failing anonymous generated colliders', () => {
    const report = evaluateColliderRedundancy(
      [collider({ id: 'GEN', debugId: undefined, sourceId: undefined })],
      { ...options, failOnAnonymous: true }
    );

    expect(report.ok).toBe(false);
    expect(report.failures[0].classification).toBe('anonymous-generated');
  });

  it('parses bounded CI runtime flags and formats actionable output', () => {
    const parsed = parseColliderRedundancyGateArgs([
      '--json',
      '--max-nodes',
      '3000',
      '--timeout-ms',
      '120000',
      '--fail-on-anonymous',
    ]);
    expect(parsed).toMatchObject({
      json: true,
      maxNodes: 3000,
      timeoutMs: 120000,
      failOnAnonymous: true,
    });

    const output = formatColliderRedundancyGateReport(
      evaluateColliderRedundancy(
        [
          collider({ id: 'A', sourceId: 'wall.shared' }),
          collider({ id: 'B', sourceId: 'wall.shared' }),
        ],
        options
      )
    );
    expect(output).toContain('candidate: A');
    expect(output).toContain('classification: exact-duplicate');
    expect(output).toContain('suggested remediation:');
  });
});
