import type { RectCollider } from '../../systems/collision';
import {
  type StairBehavior,
  type StairGeometry,
  type StairNavigationZones,
  createGroundStairBoundaryColliders,
} from '../../systems/movement/stairs';
import { splitColliderAroundCorridor } from '../../systems/movement/upperStairLandingGuards';
import {
  assertDebugColliderId,
  type DebugColliderId,
} from '../debug/colliderDebugIds';

import type { SourceBackedCollider } from './sourceCollision';
import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type SafetyColliderCategory = 'stair' | 'landing' | 'void';
export type LevelSafetyColliderRole = SafetyColliderCategory;

export interface LevelSafetyCollider
  extends SourceBackedCollider<
    LevelSafetyColliderRole,
    LevelSourceId,
    'safetyCollider'
  > {
  floor: 'ground' | 'upper';
  category: SafetyColliderCategory;
  debugId: DebugColliderId;
}

export interface GroundStairSafetyColliderOptions {
  playerRadius: number;
  guardThickness: number;
}

export interface UpperStairSafetyColliderArgs {
  stairCenterX: number;
  stairHalfWidth: number;
  playerRadius: number;
  wallThickness: number;
  doorwayDepth: number;
  stairwellMarginX: number;
  stairTopZ: number;
  stairLandingTriggerMargin: number;
  stairLayoutDirectionMultiplier: 1 | -1;
  upperLandingRoomBounds: RectCollider;
  upperStairwellOpening: RectCollider;
  stairNavigationZones: StairNavigationZones;
  upperStairBannisterThickness: number;
}

const sourceId = (value: string): LevelSourceId => assertLevelSourceId(value);
const debugId = (value: string): DebugColliderId =>
  assertDebugColliderId(value);

const GROUND_STAIR_SAFETY_COLLIDER_METADATA = {
  GroundStairLowerCornerGuard: {
    sourceId: sourceId('ground.stairwell.lowerCorner.safetyCollider'),
    category: 'stair',
    intent: 'safety-guard',
    purpose: 'block raw lower-step occupancy',
    debugId: debugId('4002'),
  },
} as const satisfies Record<
  string,
  Pick<
    LevelSafetyCollider,
    'sourceId' | 'category' | 'purpose' | 'debugId' | 'intent'
  >
>;

const getGroundStairSafetyColliderMetadata = (
  name: string
): Pick<
  LevelSafetyCollider,
  'sourceId' | 'category' | 'purpose' | 'debugId' | 'intent'
> => {
  const metadata =
    GROUND_STAIR_SAFETY_COLLIDER_METADATA[
      name as keyof typeof GROUND_STAIR_SAFETY_COLLIDER_METADATA
    ];

  if (!metadata) {
    throw new Error(
      `Missing ground stair safety collider metadata for ${name}`
    );
  }

  return metadata;
};

export const createGroundStairSafetyColliders = (
  geometry: StairGeometry,
  behavior: StairBehavior,
  options: GroundStairSafetyColliderOptions
): LevelSafetyCollider[] =>
  createGroundStairBoundaryColliders(geometry, behavior, options).map(
    ({ name, bounds }) => ({
      name,
      floor: 'ground',
      role: 'stair',
      sourceType: 'safetyCollider',
      bounds,
      ...getGroundStairSafetyColliderMetadata(name),
    })
  );

export const createUpperStairSafetyColliders = ({
  stairCenterX,
  stairHalfWidth,
  playerRadius,
  wallThickness,
  doorwayDepth,
  stairwellMarginX,
  stairTopZ,
  stairLandingTriggerMargin,
  stairLayoutDirectionMultiplier,
  upperLandingRoomBounds,
  upperStairwellOpening,
  stairNavigationZones,
  upperStairBannisterThickness,
}: UpperStairSafetyColliderArgs): LevelSafetyCollider[] => {
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
  return [
    {
      name: 'UpperStairEastUpperVoidGuard',
      debugId: debugId('4007'),
      sourceId: sourceId('upper.stairwell.eastUpperVoid.safetyCollider'),
      sourceType: 'safetyCollider',
      floor: 'upper',
      role: 'void',
      category: 'void',
      intent: 'safety-guard',
      purpose: 'guard upper stairwell void edge',
      bounds: {
        minX: stairNavigationZones.explicitDescentCorridor.maxX,
        maxX: stairCenterX + stairHalfWidth + stairwellMarginX,
        minZ: upperStairLandingEntryMaxZ,
        maxZ: upperStairVoidMaxZ,
      },
    },
    ...upperStairTopGapBlockers.map(({ name, bounds }) => ({
      name,
      sourceId: sourceId(
        `upper.stairwell.topGap.${name.endsWith('West') ? 'west' : 'east'}.safetyCollider`
      ),
      sourceType: 'safetyCollider' as const,
      floor: 'upper' as const,
      role: 'void' as const,
      category: 'void' as const,
      intent: 'safety-guard' as const,
      purpose: 'guard upper stairwell void edge',
      debugId: debugId(name.endsWith('West') ? '4003' : '4004'),
      bounds,
    })),
    {
      name: 'UpperStairWestBannisterGuard',
      debugId: debugId('4009'),
      sourceId: sourceId('upper.stairwell.westBannister.safetyCollider'),
      sourceType: 'safetyCollider',
      floor: 'upper',
      role: 'landing',
      category: 'landing',
      intent: 'safety-guard',
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
      debugId: debugId('400A'),
      sourceId: sourceId('upper.stairwell.northBannister.safetyCollider'),
      sourceType: 'safetyCollider',
      floor: 'upper',
      role: 'landing',
      category: 'landing',
      intent: 'safety-guard',
      purpose: 'preserve descent corridor edge',
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
