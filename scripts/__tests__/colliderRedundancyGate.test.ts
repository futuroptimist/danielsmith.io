import { describe, expect, it } from 'vitest';

import { evaluateColliderRedundancy } from '../colliderRedundancyGate';
import type { RuntimeColliderMetadata } from '../colliderRuntimeCollector';

const collider = (
  overrides: Partial<RuntimeColliderMetadata> = {}
): RuntimeColliderMetadata => ({
  id: '1000',
  floor: 'ground',
  category: 'wall',
  name: 'Collider',
  bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
  sourceId: 'ground.test.collider',
  debugId: overrides.id ?? '1000',
  ...overrides,
});

const classifications = (colliders: RuntimeColliderMetadata[]) =>
  evaluateColliderRedundancy(colliders, {
    tolerance: 0.01,
    failOnAnonymous: false,
  }).map((finding) => [
    finding.severity,
    finding.classification,
    finding.candidate.id,
  ]);

describe('evaluateColliderRedundancy', () => {
  it('fails exact duplicate source-backed active colliders', () => {
    expect(
      classifications([
        collider({ id: '1000', sourceId: 'ground.a' }),
        collider({ id: '1001', name: 'Duplicate', sourceId: 'ground.b' }),
      ])
    ).toContainEqual(['failure', 'exact-duplicate', '1000']);
  });

  it('fails contained source-backed colliders dominated by larger source-backed colliders', () => {
    expect(
      classifications([
        collider({ id: '1000', sourceId: 'ground.inner' }),
        collider({
          id: '1001',
          name: 'Outer',
          sourceId: 'ground.outer',
          bounds: { minX: -1, maxX: 2, minZ: -1, maxZ: 2 },
        }),
      ])
    ).toContainEqual(['failure', 'fully-contained-source-backed', '1000']);
  });

  it('does not fail contained colliders emitted by the same source object', () => {
    expect(
      classifications([
        collider({ id: '1000', sourceId: 'ground.object.scene_object' }),
        collider({
          id: '1001',
          name: 'Outer',
          sourceId: 'ground.object.scene_object',
          bounds: { minX: -1, maxX: 2, minZ: -1, maxZ: 2 },
        }),
      ])
    ).toEqual([]);
  });

  it('does not fail source-less colliders by default', () => {
    expect(
      classifications([
        collider({ id: '1000', sourceId: undefined }),
        collider({ id: '1001', name: 'Duplicate', sourceId: 'ground.b' }),
      ])
    ).toEqual([['warning', 'anonymous-generated', '1000']]);
  });

  it('does not fail intentional secondary backstops', () => {
    expect(
      classifications([
        collider({
          id: '1000',
          sourceId: 'ground.a',
          intent: 'secondary-backstop',
        }),
        collider({ id: '1001', name: 'Duplicate', sourceId: 'ground.b' }),
      ])
    ).toEqual([]);
  });

  it('can opt in to failing anonymous generated colliders', () => {
    const findings = evaluateColliderRedundancy(
      [collider({ debugId: 'source-generated-0' })],
      {
        tolerance: 0.01,
        failOnAnonymous: true,
      }
    );

    expect(findings).toMatchObject([
      {
        severity: 'failure',
        classification: 'anonymous-generated',
        candidate: { id: '1000' },
      },
    ]);
  });
});
