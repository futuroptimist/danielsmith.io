import { Box3, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { createPortfolioMannequin } from '../scene/avatar/mannequin';
import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';

describe('portfolio mannequin detail policy', () => {
  it('preserves height and collision radius while lowering performance geometry segments', () => {
    const balanced = createPortfolioMannequin({ collisionRadius: 0.75 });
    const performance = createPortfolioMannequin({
      collisionRadius: 0.75,
      detailPolicy: getSceneDetailPolicy('performance'),
    });

    const balancedLegs = balanced.group.getObjectByName(
      'PortfolioMannequinLegs'
    ) as Mesh;
    const performanceLegs = performance.group.getObjectByName(
      'PortfolioMannequinLegs'
    ) as Mesh;

    expect(performance.height).toBe(balanced.height);
    expect(performance.collisionRadius).toBe(balanced.collisionRadius);
    expect(performance.group.userData.boundingRadius).toBe(0.75);
    const balancedLegGeometry =
      balancedLegs.geometry as typeof balancedLegs.geometry & {
        parameters: { radialSegments: number };
      };
    const performanceLegGeometry =
      performanceLegs.geometry as typeof performanceLegs.geometry & {
        parameters: { radialSegments: number };
      };
    expect(performanceLegGeometry.parameters.radialSegments).toBeLessThan(
      balancedLegGeometry.parameters.radialSegments / 3
    );

    const balancedBox = new Box3().setFromObject(balanced.group);
    const performanceBox = new Box3().setFromObject(performance.group);
    expect(performanceBox.max.y - performanceBox.min.y).toBeCloseTo(
      balancedBox.max.y - balancedBox.min.y,
      1
    );
  });
});
