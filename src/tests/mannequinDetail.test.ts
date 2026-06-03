import { Box3, CylinderGeometry, Mesh, SphereGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT,
  createPortfolioMannequin,
} from '../scene/avatar/mannequin';

function findFirstGeometry<T extends CylinderGeometry | SphereGeometry>(
  root: Mesh | import('three').Object3D,
  predicate: (geometry: unknown) => geometry is T
): T | null {
  let found: T | null = null;
  root.traverse((object) => {
    if (found || !(object instanceof Mesh)) {
      return;
    }
    const geometry = object.geometry;
    if (predicate(geometry)) {
      found = geometry;
    }
  });
  return found;
}

describe('portfolio mannequin scene detail', () => {
  it('keeps collision radius and visual height stable in performance detail', () => {
    const balanced = createPortfolioMannequin({
      collisionRadius: 0.75,
      detailLevel: 'balanced',
    });
    const performance = createPortfolioMannequin({
      collisionRadius: 0.75,
      detailLevel: 'performance',
    });

    const balancedSphere = findFirstGeometry(
      balanced.group,
      (geometry): geometry is SphereGeometry =>
        geometry instanceof SphereGeometry
    );
    const performanceSphere = findFirstGeometry(
      performance.group,
      (geometry): geometry is SphereGeometry =>
        geometry instanceof SphereGeometry
    );
    const balancedBounds = new Box3().setFromObject(balanced.group);
    const performanceBounds = new Box3().setFromObject(performance.group);

    expect(performance.collisionRadius).toBe(balanced.collisionRadius);
    expect(performance.height).toBe(PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT);
    expect(performanceBounds.getSize(new Vector3()).y).toBeCloseTo(
      balancedBounds.getSize(new Vector3()).y,
      1
    );
    expect(performanceSphere?.parameters.widthSegments).toBeLessThan(
      balancedSphere?.parameters.widthSegments ?? 0
    );
  });
});
