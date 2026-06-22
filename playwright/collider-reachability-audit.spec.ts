import { expect, test } from '@playwright/test';

import type { RuntimeColliderMetadata } from '../scripts/colliderRuntimeCollector';
import { createImmersiveModeUrl } from '../src/ui/immersiveUrl';

type PortfolioWindow = Window & {
  portfolio?: {
    debugColliders?: {
      getCollidersBySourceId(sourceId: unknown): RuntimeColliderMetadata[];
    };
  };
};

const classifySmokeEvidence = (
  candidate: RuntimeColliderMetadata | undefined,
  blockers: readonly string[],
  visualOnly = false
) => {
  if (visualOnly) return 'visual-only-by-policy';
  if (blockers.includes(candidate?.name ?? '')) return 'directly-load-bearing';
  return 'ambiguous';
};

test.describe('collider reachability audit smoke', () => {
  test('classifies the backyard back fence semantic boundary as load-bearing', async ({
    page,
    baseURL,
  }) => {
    await page.goto(
      createImmersiveModeUrl(baseURL ?? 'http://127.0.0.1:5173').toString()
    );
    const [candidate] = await page.evaluate(() => {
      const api = (window as PortfolioWindow).portfolio?.debugColliders;
      if (!api) throw new Error('Debug colliders API unavailable');
      return api.getCollidersBySourceId(
        'ground.backyard.perimeter.backFence.boundary'
      );
    });

    expect(candidate?.sourceId).toBe(
      'ground.backyard.perimeter.backFence.boundary'
    );
    expect(classifySmokeEvidence(candidate, [candidate!.name])).toBe(
      'directly-load-bearing'
    );
  });

  test('reports the Futuroptimist media wall as visual-only by source policy', () => {
    expect(classifySmokeEvidence(undefined, [], true)).toBe(
      'visual-only-by-policy'
    );
  });
});
