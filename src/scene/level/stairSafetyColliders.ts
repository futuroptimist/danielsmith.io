import type { RectCollider } from '../../systems/collision';
import type { StairLayoutResult } from '../../systems/movement/stairLayout';
import type {
  FloorId,
  NamedStairBoundaryCollider,
  StairBehavior,
  StairGeometry,
} from '../../systems/movement/stairs';
import { createGroundStairBoundaryColliders } from '../../systems/movement/stairs';
import { splitColliderAroundCorridor } from '../../systems/movement/upperStairLandingGuards';

import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type LevelSafetyColliderCategory = 'stair' | 'landing' | 'void';

export interface LevelSafetyCollider {
  sourceId: LevelSourceId;
  name: string;
  floor: FloorId;
  category: LevelSafetyColliderCategory;
  bounds: RectCollider;
  purpose: string;
}

export interface CreateGroundStairSafetyCollidersOptions {
  geometry: StairGeometry;
  behavior: StairBehavior;
  playerRadius: number;
  guardThickness: number;
}

export interface CreateUpperStairSafetyCollidersOptions {
  stairGeometry: StairGeometry;
  stairBehavior: StairBehavior;
  stairLayout: StairLayoutResult;
  upperLandingRoomBounds: RectCollider;
  upperStairwellOpening: RectCollider;
  playerRadius: number;
  doorwayDepth: number;
  wallThickness: number;
  stairwellMarginX: number;
  bannisterThickness: number;
}

const safetySourceId = (sourceId: string): LevelSourceId =>
  assertLevelSourceId(sourceId);

const GROUND_STAIR_SOURCE_IDS: Record<
  NamedStairBoundaryCollider['name'],
  LevelSourceId
> = {
  GroundStairEastBoundary: safetySourceId(
    'ground.stairwell.eastBoundary.safetyCollider'
  ),
  GroundStairLowerCornerGuard: safetySourceId(
    'ground.stairwell.lowerCorner.safetyCollider'
  ),
};

const getGroundStairPurpose = (name: string): string => {
  switch (name) {
    case 'GroundStairEastBoundary':
      return 'prevent lower stair side squeeze';
    case 'GroundStairLowerCornerGuard':
      return 'block raw lower-step occupancy';
    default:
      return 'preserve descent corridor edge';
  }
};

export const createGroundStairSafetyColliders = ({
  geometry,
  behavior,
  playerRadius,
  guardThickness,
}: CreateGroundStairSafetyCollidersOptions): LevelSafetyCollider[] =>
  createGroundStairBoundaryColliders(geometry, behavior, {
    playerRadius,
    guardThickness,
  }).map(({ name, bounds }) => ({
    sourceId:
      GROUND_STAIR_SOURCE_IDS[name] ??
      safetySourceId(`ground.stairwell.${name}.safetyCollider`),
    name,
    floor: 'ground',
    category: 'stair',
    bounds,
    purpose: getGroundStairPurpose(name),
  }));

export const createUpperStairSafetyColliders = ({
  stairGeometry,
  stairBehavior,
  stairLayout,
  upperLandingRoomBounds,
  upperStairwellOpening,
  playerRadius,
  doorwayDepth,
  wallThickness,
  stairwellMarginX,
  bannisterThickness,
}: CreateUpperStairSafetyCollidersOptions): LevelSafetyCollider[] => {
  const upperStairVoidMinZ = upperStairwellOpening.minZ;
  const upperStairVoidMaxZ = upperStairwellOpening.maxZ;
  const upperLandingDoorwayClearanceZ =
    upperLandingRoomBounds.maxZ - doorwayDepth / 2 - playerRadius;
  const hiddenStairTopGapBlockerNearZ =
    stairGeometry.topZ +
    stairLayout.directionMultiplier *
      (playerRadius + stairBehavior.landingTriggerMargin);
  const hiddenStairTopGapBlockerFarZ =
    stairGeometry.topZ + stairLayout.directionMultiplier * playerRadius;
  const hiddenStairTopGapBlockerMinX = stairGeometry.centerX - playerRadius;
  const hiddenStairBlockerStartZ =
    stairGeometry.topZ -
    stairLayout.directionMultiplier *
      (playerRadius + stairBehavior.landingTriggerMargin / 2);
  const upperStairLandingEntryCorridor = {
    minX: upperStairwellOpening.minX,
    maxX: stairBehavior.descentCorridorInset
      ? stairGeometry.centerX +
        Math.max(
          stairGeometry.halfWidth - stairBehavior.descentCorridorInset,
          stairGeometry.halfWidth * 0.55
        ) +
        playerRadius
      : stairGeometry.centerX + stairGeometry.halfWidth + playerRadius,
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
      maxX: upperStairLandingEntryCorridor.maxX,
      minZ: hiddenStairTopGapBlockerMinZ,
      maxZ: hiddenStairTopGapBlockerMaxZ,
    },
    corridor: upperStairLandingEntryCorridor,
  });

  const upperStairWestBannisterMinX = upperStairwellOpening.minX;
  const descentCorridorHalfWidth = Math.max(
    stairGeometry.halfWidth -
      (stairBehavior.descentCorridorInset ??
        stairBehavior.transitionMargin * 0.25),
    stairGeometry.halfWidth * 0.55
  );
  const descentCorridorMinX = stairGeometry.centerX - descentCorridorHalfWidth;
  const descentCorridorMaxX = stairGeometry.centerX + descentCorridorHalfWidth;
  const upperStairWestBannisterMaxX = descentCorridorMinX - playerRadius - 0.01;
  const upperStairWestBannisterShiftX = 1;
  const upperStairNorthBannisterMinX =
    descentCorridorMinX + bannisterThickness * 1.5;
  const upperStairNorthBannisterBaseCenterZ =
    upperLandingDoorwayClearanceZ - wallThickness;
  const upperStairNorthBannisterCenterZ =
    upperStairNorthBannisterBaseCenterZ + 2;
  const upperStairWestBannisterSouthZ =
    hiddenStairBlockerStartZ + bannisterThickness;
  const upperStairNorthBannisterMaxX =
    upperStairwellOpening.maxX - bannisterThickness;
  const upperStairDescentHandoffFarZ =
    stairGeometry.topZ -
    stairLayout.directionMultiplier *
      (stairBehavior.transitionMargin + stairBehavior.landingTriggerMargin);
  const upperStairHiddenRunGuardNearZ =
    upperStairDescentHandoffFarZ -
    stairLayout.directionMultiplier * playerRadius;

  const colliders: LevelSafetyCollider[] = [
    {
      sourceId: safetySourceId('upper.stairwell.eastLowerVoid.safetyCollider'),
      name: 'UpperStairEastLowerVoidGuard',
      floor: 'upper',
      category: 'void',
      bounds: {
        minX: descentCorridorMaxX,
        maxX:
          stairGeometry.centerX + stairGeometry.halfWidth + stairwellMarginX,
        minZ: upperStairVoidMinZ,
        maxZ: upperStairLandingEntryMinZ,
      },
      purpose: 'guard upper stairwell void edge',
    },
    {
      sourceId: safetySourceId('upper.stairwell.eastUpperVoid.safetyCollider'),
      name: 'UpperStairEastUpperVoidGuard',
      floor: 'upper',
      category: 'void',
      bounds: {
        minX: descentCorridorMaxX,
        maxX:
          stairGeometry.centerX + stairGeometry.halfWidth + stairwellMarginX,
        minZ: upperStairLandingEntryMaxZ,
        maxZ: upperStairVoidMaxZ,
      },
      purpose: 'guard upper stairwell void edge',
    },
    ...upperStairTopGapBlockers.map(({ name, bounds }) => ({
      sourceId: safetySourceId(
        `upper.stairwell.${name === 'UpperStairTopGapBlockerWest' ? 'topGapWest' : 'topGapEast'}.safetyCollider`
      ),
      name,
      floor: 'upper' as const,
      category: 'landing' as const,
      bounds,
      purpose: 'preserve descent corridor edge',
    })),
    {
      sourceId: safetySourceId('upper.stairwell.hiddenRun.safetyCollider'),
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
            bannisterThickness / 2 -
            playerRadius -
            0.01
        ),
      },
      purpose: 'guard hidden stair run no-floor area',
    },
    {
      sourceId: safetySourceId('upper.stairwell.westBannister.safetyCollider'),
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
      sourceId: safetySourceId('upper.stairwell.northBannister.safetyCollider'),
      name: 'UpperStairNorthBannisterGuard',
      floor: 'upper',
      category: 'landing',
      bounds: {
        minX: upperStairNorthBannisterMinX,
        maxX: upperStairNorthBannisterMaxX,
        minZ: upperStairNorthBannisterCenterZ - bannisterThickness / 2,
        maxZ: upperStairNorthBannisterCenterZ + bannisterThickness / 2,
      },
      purpose: 'preserve descent corridor edge',
    },
  ];

  return colliders;
};
