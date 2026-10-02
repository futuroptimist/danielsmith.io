import { MeshStandardMaterial } from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { createLightmapBounceAnimator } from '../lightmapBounceAnimator';

function createWallMaterials(cutaway = true) {
  const wall = new MeshStandardMaterial({ lightMapIntensity: 0.68 });
  const clone = wall.clone();
  clone.opacity = cutaway ? 0.18 : 1;
  clone.transparent = cutaway;
  clone.depthWrite = !cutaway;
  const animator = createLightmapBounceAnimator({
    floorMaterial: new MeshStandardMaterial(),
    wallMaterial: wall,
    wallMaterialClones: [clone],
    response: { wall: 1 },
    programs: [
      {
        roomId: 'livingRoom',
        cycleSeconds: 10,
        keyframes: [
          { time: 0, stripMultiplier: 0.8 },
          { time: 0.5, stripMultiplier: 1.2 },
          { time: 1, stripMultiplier: 0.8 },
        ],
      },
    ],
  });
  return { wall, clone, animator };
}

describe('wall lightmap clones', () => {
  afterEach(() => {
    delete document.documentElement.dataset.accessibilityPulseScale;
  });

  it.each([false, true])(
    'matches animated brightness while preserving cutaway state %s',
    (cutaway) => {
      const { wall, clone, animator } = createWallMaterials(cutaway);
      animator.captureBaseline();
      for (const [elapsed, multiplier] of [
        [0, 0.8],
        [5, 1.2],
        [10, 0.8],
      ]) {
        animator.update(elapsed);
        expect(wall.lightMapIntensity).toBeCloseTo(0.68 * multiplier, 6);
        expect(clone.lightMapIntensity).toBe(wall.lightMapIntensity);
        expect(clone.opacity).toBe(cutaway ? 0.18 : 1);
        expect(clone.transparent).toBe(cutaway);
        expect(clone.depthWrite).toBe(!cutaway);
        expect(wall.opacity).toBe(1);
        expect(wall.transparent).toBe(false);
        expect(wall.depthWrite).toBe(true);
      }
    }
  );

  it('follows a recaptured primary baseline instead of retaining clone brightness', () => {
    const { wall, clone, animator } = createWallMaterials();
    wall.lightMapIntensity = 0.5;
    animator.captureBaseline();
    animator.update(5);
    expect(wall.lightMapIntensity).toBeCloseTo(0.6, 6);
    expect(clone.lightMapIntensity).toBe(wall.lightMapIntensity);
    expect(clone.opacity).toBe(0.18);
    expect(clone.transparent).toBe(true);
    expect(clone.depthWrite).toBe(false);
  });

  it('restores the same baseline when accessibility disables pulsing', () => {
    const { wall, clone, animator } = createWallMaterials();
    animator.update(5);
    document.documentElement.dataset.accessibilityPulseScale = '0';
    animator.update(6);
    expect(wall.lightMapIntensity).toBeCloseTo(0.68, 6);
    expect(clone.lightMapIntensity).toBe(wall.lightMapIntensity);
    expect(clone.opacity).toBe(0.18);
    expect(clone.transparent).toBe(true);
    expect(clone.depthWrite).toBe(false);
  });
});
