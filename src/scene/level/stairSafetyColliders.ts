import type { RectCollider } from '../../systems/collision';
import {
  createGroundStairBoundaryColliders,
  type FloorId,
  type StairBehavior,
  type StairGeometry,
  type StairNavigationZones,
} from '../../systems/movement/stairs';
import { splitColliderAroundCorridor } from '../../systems/movement/upperStairLandingGuards';

import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type SafetyColliderCategory = 'stair' | 'landing' | 'void';

export interface LevelSafetyCollider {
  sourceId: LevelSourceId;
  name: string;
  floor: FloorId;
  category: SafetyColliderCategory;
  bounds: RectCollider;
  purpose: string;
}

export interface GroundStairSafetyColliderOptions {
  playerRadius: number;
  guardThickness: number;
}

export interface UpperStairSafetyColliderArgs {
  stairCenterX: number;
  stairHalfWidth: number;
  stairTopZ: number;
  stairTransitionMargin: number;
  stairLandingTriggerMargin: number;
  stairwellMarginX: number;
  playerRadius: number;
  wallThickness: number;
  upperLandingRoomBounds: RectCollider;
  upperStairwellOpening: RectCollider;
  stairNavigationZones: StairNavigationZones;
  stairLayoutDirectionMultiplier: 1 | -1;
  upperStairBannisterThickness: number;
}

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);

export const createGroundStairSafetyColliders = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  options: GroundStairSafetyColliderOptions
): LevelSafetyCollider[] =>
  createGroundStairBoundaryColliders(geometry, behavior, options).map(
    (collider) => {
      if (collider.name === 'GroundStairEastBoundary') {
        return {
          sourceId: sourceId('ground.stairwell.eastBoundary.safetyCollider'),
          name: collider.name,
          floor: 'ground',
          category: 'stair',
          bounds: collider.bounds,
          purpose: 'prevent lower stair side squeeze',
        };
      }

      return {
        sourceId: sourceId('ground.stairwell.lowerCorner.safetyCollider'),
        name: collider.name,
        floor: 'ground',
        category: 'stair',
        bounds: collider.bounds,
        purpose: 'block raw lower-step occupancy',
      };
    }
  );

export const createUpperStairSafetyColliders = ({
  stairCenterX,
  stairHalfWidth,
  stairTopZ,
  stairTransitionMargin,
  stairLandingTriggerMargin,
  stairwellMarginX,
  playerRadius,
  wallThickness,
  upperLandingRoomBounds,
  upperStairwellOpening,
  stairNavigationZones,
  stairLayoutDirectionMultiplier,
  upperStairBannisterThickness,
}: UpperStairSafetyColliderArgs): LevelSafetyCollider[] => {
  const upperStairVoidMinZ = upperStairwellOpening.minZ;
  const upperStairVoidMaxZ = upperStairwellOpening.maxZ;
  const doorwayDepth = wallThickness + playerRadius * 2;
  const upperLandingDoorwayClearanceZ =
    upperLandingRoomBounds.maxZ - doorwayDepth / 2 - playerRadius;
  const hiddenStairTopGapBlockerNearZ =
    stairTopZ +
    stairLayoutDirectionMultiplier * (playerRadius + stairLandingTriggerMargin);
  const hiddenStairTopGapBlockerFarZ =
    stairTopZ + stairLayoutDirectionMultiplier * playerRadius;
  const hiddenStairTopGapBlockerMinX = stairCenterX - playerRadius;
  const hiddenStairBlockerStartZ =
    stairTopZ -
    stairLayoutDirectionMultiplier *
      (playerRadius + stairLandingTriggerMargin / 2);
  const upperStairLandingEntryCorridor = {
    minX: upperStairwellOpening.minX,
    maxX: stairNavigationZones.explicitDescentCorridor.maxX + playerRadius,
  };
  const hiddenStairTopGapBlockerMinZ = Math.min(
    hiddenStairTopGapBlockerNearZ,
    hiddenStairTopGapBlockerFarZ
  );
  const hiddenStairTopGapBlockerMaxZ = Math.max(
    hiddenStairTopGapBlockerNearZ,
    hiddenStairTopGapBlockerFarZ
  );
  const upperStairLandingEntryMinZ = Math.max(
    upperStairVoidMinZ,
    hiddenStairTopGapBlockerMinZ - playerRadius
  );
  const upperStairLandingEntryMaxZ = Math.min(
    upperStairVoidMaxZ,
    hiddenStairTopGapBlockerMaxZ + playerRadius
  );
  const hiddenStairTopGapBlockerEdgeMinX = Math.max(
    upperStairwellOpening.minX,
    hiddenStairTopGapBlockerMinX - stairwellMarginX * 0.1
  );
  const upperStairTopGapBlockers = splitColliderAroundCorridor({
    name: 'UpperStairTopGapBlocker',
    bounds: {
      minX: hiddenStairTopGapBlockerEdgeMinX,
      maxX: stairNavigationZones.explicitDescentCorridor.maxX + playerRadius,
      minZ: hiddenStairTopGapBlockerMinZ,
      maxZ: hiddenStairTopGapBlockerMaxZ,
    },
    corridor: upperStairLandingEntryCorridor,
  });

  const upperStairWestBannisterMinX = upperStairwellOpening.minX;
  const upperStairWestBannisterMaxX =
    stairNavigationZones.explicitDescentCorridor.minX - playerRadius - 0.01;
  const upperStairWestBannisterShiftX = 1;
  const upperStairNorthBannisterMinX =
    stairNavigationZones.explicitDescentCorridor.minX +
    upperStairBannisterThickness * 1.5;
  const upperStairNorthBannisterBaseCenterZ =
    upperLandingDoorwayClearanceZ - wallThickness;
  const upperStairNorthBannisterCenterZ =
    upperStairNorthBannisterBaseCenterZ + 2;
  const upperStairWestBannisterSouthZ =
    hiddenStairBlockerStartZ + upperStairBannisterThickness;
  const upperStairNorthBannisterMaxX =
    upperStairwellOpening.maxX - upperStairBannisterThickness;
  const upperStairDescentHandoffFarZ =
    stairTopZ -
    stairLayoutDirectionMultiplier *
      (stairTransitionMargin + stairLandingTriggerMargin);
  const upperStairHiddenRunGuardNearZ =
    upperStairDescentHandoffFarZ -
    stairLayoutDirectionMultiplier * playerRadius;

  const topGapColliders: LevelSafetyCollider[] = upperStairTopGapBlockers.map(
    ({ name, bounds }, index) => ({
      sourceId: sourceId(`upper.stairwell.topGap${index + 1}.safetyCollider`),
      name,
      floor: 'upper',
      category: 'void',
      bounds,
      purpose: 'guard upper stairwell void edge',
    })
  );

  return [
    {
      sourceId: sourceId('upper.stairwell.eastLowerVoid.safetyCollider'),
      name: 'UpperStairEastLowerVoidGuard',
      floor: 'upper',
      category: 'void',
      bounds: {
        minX: stairNavigationZones.explicitDescentCorridor.maxX,
        maxX: stairCenterX + stairHalfWidth + stairwellMarginX,
        minZ: upperStairVoidMinZ,
        maxZ: upperStairLandingEntryMinZ,
      },
      purpose: 'guard upper stairwell void edge',
    },
    {
      sourceId: sourceId('upper.stairwell.eastUpperVoid.safetyCollider'),
      name: 'UpperStairEastUpperVoidGuard',
      floor: 'upper',
      category: 'void',
      bounds: {
        minX: stairNavigationZones.explicitDescentCorridor.maxX,
        maxX: stairCenterX + stairHalfWidth + stairwellMarginX,
        minZ: upperStairLandingEntryMaxZ,
        maxZ: upperStairVoidMaxZ,
      },
      purpose: 'guard upper stairwell void edge',
    },
    ...topGapColliders,
    {
      sourceId: sourceId('upper.stairwell.hiddenRun.safetyCollider'),
      name: 'UpperStairHiddenRunVoidGuard',
      floor: 'upper',
      category: 'void',
      bounds: {
        minX: upperStairwellOpening.minX,
        maxX: upperStairwellOpening.maxX,
        minZ: Math.min(
          upperStairHiddenRunGuardNearZ,
          upperLandingDoorwayClearanceZ
        ),
        maxZ: Math.max(
          upperStairHiddenRunGuardNearZ,
          upperStairNorthBannisterBaseCenterZ -
            upperStairBannisterThickness / 2 -
            playerRadius -
            0.01
        ),
      },
      purpose: 'guard hidden stair run no-floor area',
    },
    {
      sourceId: sourceId('upper.stairwell.westBannister.safetyCollider'),
      name: 'UpperStairWestBannisterGuard',
      floor: 'upper',
      category: 'landing',
      bounds: {
        minX: upperStairWestBannisterMinX + upperStairWestBannisterShiftX,
        maxX: upperStairWestBannisterMaxX + upperStairWestBannisterShiftX,
        minZ: Math.min(
          upperStairNorthBannisterBaseCenterZ,
          upperStairWestBannisterSouthZ
        ),
        maxZ:
          Math.max(
            upperStairNorthBannisterBaseCenterZ,
            upperStairWestBannisterSouthZ
          ) + 2,
      },
      purpose: 'preserve descent corridor edge',
    },
    {
      sourceId: sourceId('upper.stairwell.northBannister.safetyCollider'),
      name: 'UpperStairNorthBannisterGuard',
      floor: 'upper',
      category: 'landing',
      bounds: {
        minX: upperStairNorthBannisterMinX,
        maxX: upperStairNorthBannisterMaxX,
        minZ:
          upperStairNorthBannisterCenterZ - upperStairBannisterThickness / 2,
        maxZ:
          upperStairNorthBannisterCenterZ + upperStairBannisterThickness / 2,
      },
      purpose: 'preserve descent corridor edge',
    },
  ];
};
