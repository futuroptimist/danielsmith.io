import type { RectCollider } from '../../systems/collision';
import {
  createGroundStairBoundaryColliders,
  type GroundStairBoundaryColliderOptions,
  type StairBehavior,
  type StairGeometry,
  type StairNavigationZones,
} from '../../systems/movement/stairs';
import { splitColliderAroundCorridor } from '../../systems/movement/upperStairLandingGuards';

import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type LevelSafetyColliderCategory = 'stair' | 'landing' | 'void';
export type LevelSafetyColliderFloor = 'ground' | 'upper';

export interface LevelSafetyCollider {
  sourceId: LevelSourceId;
  name: string;
  floor: LevelSafetyColliderFloor;
  category: LevelSafetyColliderCategory;
  bounds: RectCollider;
  purpose: string;
}

export interface UpperStairSafetyColliderArgs {
  stairCenterX: number;
  stairHalfWidth: number;
  stairTopZ: number;
  stairwellMarginX: number;
  doorwayDepth: number;
  playerRadius: number;
  stairLandingTriggerMargin: number;
  stairTransitionMargin: number;
  wallThickness: number;
  upperLandingRoomBounds: RectCollider;
  upperStairwellOpening: RectCollider;
  stairNavigationZones: Pick<StairNavigationZones, 'explicitDescentCorridor'>;
  stairLayoutDirectionMultiplier: 1 | -1;
  upperStairBannisterThickness: number;
}

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);

export const createGroundStairSafetyColliders = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  options: GroundStairBoundaryColliderOptions
): LevelSafetyCollider[] =>
  createGroundStairBoundaryColliders(geometry, behavior, options).map(
    (collider): LevelSafetyCollider => ({
      ...collider,
      floor: 'ground',
      category: 'stair',
      sourceId:
        collider.name === 'GroundStairLowerCornerGuard'
          ? sourceId('ground.stair.lowerCorner.safetyCollider')
          : sourceId('ground.stair.eastBoundary.safetyCollider'),
      purpose:
        collider.name === 'GroundStairLowerCornerGuard'
          ? 'block raw lower-step occupancy'
          : 'prevent lower stair side squeeze',
    })
  );

export const createUpperStairSafetyColliders = ({
  stairCenterX,
  stairHalfWidth,
  stairTopZ,
  stairwellMarginX,
  doorwayDepth,
  playerRadius,
  stairLandingTriggerMargin,
  stairTransitionMargin,
  wallThickness,
  upperLandingRoomBounds,
  upperStairwellOpening,
  stairNavigationZones,
  stairLayoutDirectionMultiplier,
  upperStairBannisterThickness,
}: UpperStairSafetyColliderArgs): LevelSafetyCollider[] => {
  const upperStairVoidMinZ = upperStairwellOpening.minZ;
  const upperStairVoidMaxZ = upperStairwellOpening.maxZ;
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

  return [
    {
      name: 'UpperStairEastLowerVoidGuard',
      floor: 'upper',
      category: 'void',
      sourceId: sourceId('upper.stairwell.eastLowerVoid.safetyCollider'),
      purpose: 'guard upper stairwell void edge',
      bounds: {
        minX: stairNavigationZones.explicitDescentCorridor.maxX,
        maxX: stairCenterX + stairHalfWidth + stairwellMarginX,
        minZ: upperStairVoidMinZ,
        maxZ: upperStairLandingEntryMinZ,
      },
    },
    {
      name: 'UpperStairEastUpperVoidGuard',
      floor: 'upper',
      category: 'void',
      sourceId: sourceId('upper.stairwell.eastUpperVoid.safetyCollider'),
      purpose: 'guard upper stairwell void edge',
      bounds: {
        minX: stairNavigationZones.explicitDescentCorridor.maxX,
        maxX: stairCenterX + stairHalfWidth + stairwellMarginX,
        minZ: upperStairLandingEntryMaxZ,
        maxZ: upperStairVoidMaxZ,
      },
    },
    ...upperStairTopGapBlockers.map(
      (collider, index): LevelSafetyCollider => ({
        ...collider,
        floor: 'upper',
        category: 'landing',
        sourceId: sourceId(`upper.stairwell.topGap${index + 1}.safetyCollider`),
        purpose: 'preserve descent corridor edge',
      })
    ),
    {
      name: 'UpperStairHiddenRunVoidGuard',
      floor: 'upper',
      category: 'void',
      sourceId: sourceId('upper.stairwell.hiddenRun.safetyCollider'),
      purpose: 'guard hidden stair run no-floor area',
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
    },
    {
      name: 'UpperStairWestBannisterGuard',
      floor: 'upper',
      category: 'stair',
      sourceId: sourceId('upper.stairwell.westBannister.safetyCollider'),
      purpose: 'preserve descent corridor edge',
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
    },
    {
      name: 'UpperStairNorthBannisterGuard',
      floor: 'upper',
      category: 'stair',
      sourceId: sourceId('upper.stairwell.northBannister.safetyCollider'),
      purpose: 'block raw lower-step occupancy',
      bounds: {
        minX: upperStairNorthBannisterMinX,
        maxX: upperStairNorthBannisterMaxX,
        minZ:
          upperStairNorthBannisterCenterZ - upperStairBannisterThickness / 2,
        maxZ:
          upperStairNorthBannisterCenterZ + upperStairBannisterThickness / 2,
      },
    },
  ];
};
