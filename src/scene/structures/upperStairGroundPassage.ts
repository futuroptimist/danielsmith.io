import type { RectCollider } from '../../systems/collision';
import { assertDebugColliderId } from '../debug/colliderDebugIds';
import { getDebugHash } from '../debug/debugIds';
import { assertLevelSourceId } from '../level/sourceIds';
import type { LevelSafetyCollider } from '../level/stairSafetyColliders';

import type { StaircaseConfig } from './staircase';

/** Actual tread undersides bound headroom; side safety follows the same elevation. */
export function createUpperStairGroundPassage(
  config: StaircaseConfig,
  {
    connectionId,
    guardThickness,
  }: {
    connectionId: string;
    guardThickness: number;
  }
): LevelSafetyCollider[] {
  const direction = config.direction === 'negativeZ' ? -1 : 1;
  const west = config.basePosition.x - config.step.width / 2;
  const east = config.basePosition.x + config.step.width / 2;
  const result: LevelSafetyCollider[] = [];
  const add = (part: string, bounds: RectCollider, surface = false) => {
    const sourceId = assertLevelSourceId(
      `ground.stairwell.${part}.safetyCollider`
    );
    result.push({
      sourceId,
      sourceType: 'safetyCollider',
      name: `UpperStairGround-${part}`,
      floor: 'ground',
      role: 'stair',
      category: 'stair',
      intent: surface ? 'physical-boundary' : 'safety-guard',
      purpose: surface
        ? 'protect actual stair headroom'
        : 'protect elevated stair sides',
      debugId: assertDebugColliderId(getDebugHash(sourceId)),
      bounds,
    });
  };
  const addSides = (part: string, minZ: number, maxZ: number, minY: number) => {
    add(`${part}.west`, {
      minX: west - guardThickness,
      maxX: west,
      minZ,
      maxZ,
      minY,
    });
    add(`${part}.east`, {
      minX: east,
      maxX: east + guardThickness,
      minZ,
      maxZ,
      minY,
    });
  };
  for (let i = 0; i < config.step.count; i++) {
    const startZ = config.basePosition.z + direction * config.step.run * i;
    const endZ = startZ + direction * config.step.run;
    const minZ = Math.min(startZ, endZ);
    const maxZ = Math.max(startZ, endZ);
    const minY = config.basePosition.y + config.step.rise * i;
    add(
      `step${i + 1}.underside`,
      {
        minX: west,
        maxX: east,
        minZ,
        maxZ,
        minY,
        maxY: minY + config.step.rise,
        traversableConnectionId: connectionId,
      },
      true
    );
    addSides(`step${i + 1}`, minZ, maxZ, minY);
  }
  const landingStartZ =
    config.basePosition.z + direction * config.step.run * config.step.count;
  const landingEndZ = landingStartZ + direction * config.landing.depth;
  const minZ = Math.min(landingStartZ, landingEndZ);
  const maxZ = Math.max(landingStartZ, landingEndZ);
  const minY = config.basePosition.y + config.step.rise * config.step.count;
  add(
    'landing.underside',
    {
      minX: west,
      maxX: east,
      minZ,
      maxZ,
      minY,
      maxY: minY + config.landing.thickness,
      traversableConnectionId: connectionId,
    },
    true
  );
  addSides('landing', minZ, maxZ, minY);
  return result;
}
