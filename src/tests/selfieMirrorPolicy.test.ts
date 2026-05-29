import { describe, expect, it } from 'vitest';

import { getSelfieMirrorPolicy } from '../scene/structures/selfieMirrorPolicy';

describe('SelfieMirror render policy', () => {
  it('throttles balanced mirror renders and shrinks the target', () => {
    expect(
      getSelfieMirrorPolicy({
        qualityLevel: 'balanced',
        capabilityClass: 'hardware',
        distanceToMirror: 5,
      })
    ).toEqual({ enabled: true, targetSize: 256, updateRate: 8 });
  });

  it('disables mirror renders for software and performance quality', () => {
    expect(
      getSelfieMirrorPolicy({
        qualityLevel: 'balanced',
        capabilityClass: 'software',
        distanceToMirror: 5,
      }).enabled
    ).toBe(false);
    expect(
      getSelfieMirrorPolicy({
        qualityLevel: 'performance',
        capabilityClass: 'hardware',
        distanceToMirror: 5,
      }).enabled
    ).toBe(false);
  });

  it('avoids mirror renders when the player is far away', () => {
    expect(
      getSelfieMirrorPolicy({
        qualityLevel: 'cinematic',
        capabilityClass: 'hardware',
        distanceToMirror: 30,
      }).enabled
    ).toBe(false);
  });
});
