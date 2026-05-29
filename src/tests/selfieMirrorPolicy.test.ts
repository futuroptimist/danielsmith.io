import { describe, expect, it } from 'vitest';

import { getSelfieMirrorPolicy } from '../scene/structures/selfieMirrorPolicy';

describe('selfie mirror render policy', () => {
  it('renders cinematic mirror at a throttled rate while nearby', () => {
    expect(
      getSelfieMirrorPolicy({
        qualityLevel: 'cinematic',
        distanceToPlayer: 4,
        elapsedMs: 1000,
        lastRenderMs: 900,
      })
    ).toMatchObject({
      shouldRender: true,
      updateRate: 15,
      renderTargetSize: 512,
    });
  });

  it('skips rendering when the interval has not elapsed', () => {
    expect(
      getSelfieMirrorPolicy({
        qualityLevel: 'balanced',
        distanceToPlayer: 4,
        elapsedMs: 1000,
        lastRenderMs: 900,
      })
    ).toMatchObject({
      shouldRender: false,
      reason: 'throttled',
      updateRate: 6,
    });
  });

  it('disables the mirror on performance or adaptive disable paths', () => {
    expect(
      getSelfieMirrorPolicy({
        qualityLevel: 'performance',
        distanceToPlayer: 4,
        elapsedMs: 1000,
        lastRenderMs: null,
      })
    ).toMatchObject({ shouldRender: false, reason: 'disabled' });
    expect(
      getSelfieMirrorPolicy({
        qualityLevel: 'balanced',
        adaptiveState: { throttleMirror: true, disableMirror: true },
        distanceToPlayer: 4,
        elapsedMs: 1000,
        lastRenderMs: null,
      })
    ).toMatchObject({ shouldRender: false, reason: 'disabled' });
  });
});
