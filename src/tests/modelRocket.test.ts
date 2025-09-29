import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { createModelRocket } from '../structures/modelRocket';

describe('createModelRocket', () => {
  it('builds a rocket group with expected child components', () => {
    const basePosition = new Vector3(4.2, 0, -3.1);
    const orientation = Math.PI / 6;

    const { group, collider } = createModelRocket({
      basePosition,
      orientationRadians: orientation,
    });

    expect(group.name).toBe('BackyardModelRocket');
    expect(group.position.x).toBeCloseTo(basePosition.x);
    expect(group.position.y).toBeCloseTo(basePosition.y);
    expect(group.position.z).toBeCloseTo(basePosition.z);
    expect(group.rotation.y).toBeCloseTo(orientation);

    const childNames = group.children.map((child) => child.name);
    expect(childNames).toContain('ModelRocketStand');
    expect(childNames).toContain('ModelRocketBody');
    expect(childNames).toContain('ModelRocketNose');
    expect(childNames).toContain('ModelRocketThruster');
    expect(childNames).toContain('ModelRocketSafetyRing');

    const finNames = childNames.filter((name) =>
      name.startsWith('ModelRocketFin-')
    );
    expect(finNames.length).toBeGreaterThanOrEqual(3);

    const footprintHalf = (collider.maxX - collider.minX) / 2;
    expect(footprintHalf).toBeGreaterThan(1);
    expect(collider.minX).toBeCloseTo(basePosition.x - footprintHalf);
    expect(collider.maxX).toBeCloseTo(basePosition.x + footprintHalf);
    expect(collider.minZ).toBeCloseTo(basePosition.z - footprintHalf);
    expect(collider.maxZ).toBeCloseTo(basePosition.z + footprintHalf);
  });
});
