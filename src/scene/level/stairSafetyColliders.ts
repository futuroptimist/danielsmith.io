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

import type { ActiveSourceBackedCollider } from './sourceBackedColliders';
import { assertLevelSourceId, type LevelSourceId } from './sourceIds';

export type SafetyColliderCategory = 'stair' | 'landing' | 'void';

export type LevelSafetyCollider = ActiveSourceBackedCollider<
  'stair-safety',
  {
    sourceType: 'safetyCollider';
    floor: 'ground' | 'upper';
    category: SafetyColliderCategory;
    debugId: DebugColliderId;
  }
>;

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
      role: 'stair-safety',
      name,
      sourceType: 'safetyCollider',
      floor: 'ground',
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
      role: 'stair-safety',
      name: 'UpperStairEastUpperVoidGuard',
      sourceType: 'safetyCollider',
      intent: 'safety-guard',
      debugId: debugId('4007'),
      sourceId: sourceId('upper.stairwell.eastUpperVoid.safetyCollider'),
      floor: 'upper',
      category: 'void',
      purpose: 'guard upper stairwell void edge',
      bounds: {
        minX: stairNavigationZones.explicitDescentCorridor.maxX,
        maxX: stairCenterX + stairHalfWidth + stairwellMarginX,
        minZ: upperStairLandingEntryMaxZ,
        maxZ: upperStairVoidMaxZ,
      },
    },
    ...upperStairTopGapBlockers.map(({ name, bounds }) => ({
      role: 'stair-safety' as const,
      name,
      sourceType: 'safetyCollider' as const,
      intent: 'safety-guard' as const,
      sourceId: sourceId(
        `upper.stairwell.topGap.${name.endsWith('West') ? 'west' : 'east'}.safetyCollider`
      ),
      floor: 'upper' as const,
      category: 'void' as const,
      purpose: 'guard upper stairwell void edge',
      debugId: debugId(name.endsWith('West') ? '4003' : '4004'),
      bounds,
    })),
    {
      role: 'stair-safety',
      name: 'UpperStairWestBannisterGuard',
      sourceType: 'safetyCollider',
      intent: 'secondary-backstop',
      debugId: debugId('4009'),
      sourceId: sourceId('upper.stairwell.westBannister.safetyCollider'),
      floor: 'upper',
      category: 'landing',
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
      role: 'stair-safety',
      name: 'UpperStairNorthBannisterGuard',
      sourceType: 'safetyCollider',
      intent: 'secondary-backstop',
      debugId: debugId('400A'),
      sourceId: sourceId('upper.stairwell.northBannister.safetyCollider'),
      floor: 'upper',
      category: 'landing',
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
