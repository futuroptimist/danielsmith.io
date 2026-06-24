import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../assets/floorPlan';
import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import { countObjectTriangles } from '../scene/graphics/triangleCount';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';

describe('POI model triangle reporting helpers', () => {
  it('counts the selected Sugarkube deployment variant rather than greenhouse geometry', () => {
    const livingRoom = FLOOR_PLAN.rooms.find(
      (room) => room.id === 'livingRoom'
    )!;
    const balanced = createSugarkubeDeployment({
      position: { x: -8.74, y: 0, z: -22.92 },
      orientationRadians: Math.PI * 0.55,
      detailPolicy: getSceneDetailPolicy('balanced'),
      wallEndpoint: {
        x: -8.74,
        y: 0,
        z: livingRoom.bounds.minZ + 0.06,
        orientationRadians: 0,
      },
    });

    expect(balanced.group.name).toBe('SugarkubeDeployment');
    expect(
      balanced.group.getObjectByName('SugarkubeWallPlateRJ45')
    ).toBeTruthy();
    expect(balanced.group.getObjectByName('GreenhouseFrame')).toBeUndefined();
    expect(countObjectTriangles(balanced.group)).toBe(2800);
  });
});
