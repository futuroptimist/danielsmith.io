import { Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createWoveLoom } from '../woveLoom';

describe('createWoveLoom', () => {
  it('builds a loom anchored at the provided position', () => {
    const build = createWoveLoom({
      position: { x: 3, y: 0.5, z: -2 },
      orientationRadians: Math.PI / 6,
    });

    expect(build.group.name).toBe('WoveLoom');
    expect(build.group.position.x).toBeCloseTo(3);
    expect(build.group.position.y).toBeCloseTo(0.5);
    expect(build.group.position.z).toBeCloseTo(-2);
    expect(build.colliders.length).toBeGreaterThan(0);
    build.colliders.forEach((collider) => {
      expect(collider.minX).toBeLessThanOrEqual(collider.maxX);
      expect(collider.minZ).toBeLessThanOrEqual(collider.maxZ);
    });

    expect(build.group.getObjectByName('WoveLoomSpool')).toBeInstanceOf(Mesh);
    expect(build.group.getObjectByName('WoveLoomShuttle')).toBeInstanceOf(Mesh);
    expect(build.group.getObjectByName('WoveLoomWarpThread-0')).toBeInstanceOf(
      Mesh
    );
  });

  it('animates spool rotation, warp weaving, glow intensity, and shuttle motion', () => {
    const build = createWoveLoom({ position: { x: 0, z: 0 } });
    const spool = build.group.getObjectByName('WoveLoomSpool') as Mesh | null;
    const thread = build.group.getObjectByName(
      'WoveLoomWarpThread-0'
    ) as Mesh | null;
    const shuttle = build.group.getObjectByName(
      'WoveLoomShuttle'
    ) as Mesh | null;
    const shuttleGlow = build.group.getObjectByName(
      'WoveLoomShuttleGlow'
    ) as Mesh | null;

    if (!spool || !thread || !shuttle || !shuttleGlow) {
      throw new Error('Expected loom components to be present.');
    }

    const threadMaterial = thread.material as MeshStandardMaterial;
    const shuttleGlowMaterial = shuttleGlow.material as MeshBasicMaterial;
    const initialRotation = spool.rotation.x;

    build.update({ elapsed: 0.6, delta: 0.12, emphasis: 0.1 });
    const rotationAfterLow = spool.rotation.x;
    const intensityAfterLow = threadMaterial.emissiveIntensity;
    const shuttleAfterLow = shuttle.position.x;
    const threadWeaveLow = thread.position.x;
    const threadScaleLow = thread.scale.y;
    const glowOpacityLow = shuttleGlowMaterial.opacity;

    build.update({ elapsed: 1.2, delta: 0.12, emphasis: 0.95 });
    const rotationAfterHigh = spool.rotation.x;
    const intensityAfterHigh = threadMaterial.emissiveIntensity;
    const shuttleAfterHigh = shuttle.position.x;
    const threadWeaveHigh = thread.position.x;
    const threadScaleHigh = thread.scale.y;
    const glowOpacityHigh = shuttleGlowMaterial.opacity;

    const lowDelta = rotationAfterLow - initialRotation;
    const highDelta = rotationAfterHigh - rotationAfterLow;

    expect(lowDelta).toBeGreaterThan(0);
    expect(highDelta).toBeGreaterThan(lowDelta);
    expect(intensityAfterHigh).toBeGreaterThan(intensityAfterLow);
    expect(shuttleAfterHigh).not.toBe(shuttleAfterLow);
    expect(Math.abs(threadWeaveHigh - threadWeaveLow)).toBeGreaterThan(1e-4);
    expect(threadScaleHigh).not.toBe(threadScaleLow);
    expect(glowOpacityHigh).toBeGreaterThan(glowOpacityLow);
  });
});
